import re
import urllib.parse
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from rdflib import Graph, URIRef, Literal, Namespace, RDF, RDFS, OWL, XSD, BNode
from rdflib.collection import Collection
from app.utilities.logger import logger


def make_safe_uriref(uri_str: str) -> URIRef:
    """Ensures URI string is properly URL-encoded for RDFLib Turtle / N3 serialization."""
    encoded = urllib.parse.quote(str(uri_str), safe=":/#?=&_-")
    return URIRef(encoded)


def to_singular(word: str) -> str:
    """Converts a plural English noun to its singular form."""
    if not word:
        return ""
    w = str(word).strip()
    w_lower = w.lower()

    # Exceptions & invariant words
    if w_lower in ["status", "news", "series", "species", "data", "metadata", "analytics", "basis", "analysis"]:
        return w
    if w_lower.endswith("ies") and len(w_lower) > 3 and w_lower[-4] not in "aeiou":
        return w[:-3] + ("y" if w[-1].islower() else "Y")
    if (w_lower.endswith("ses") or w_lower.endswith("xes") or w_lower.endswith("shes") or w_lower.endswith("ches")) and len(w_lower) > 3:
        return w[:-2]
    if w_lower.endswith("s") and len(w_lower) > 2 and not w_lower.endswith("ss") and not w_lower.endswith("us") and not w_lower.endswith("is"):
        return w[:-1]
    return w


def to_pascal_case_singular(text: str) -> str:
    """Converts snake_case, kebab-case, or spaced strings to singular PascalCase (e.g. customer_profiles -> CustomerProfile)."""
    if not text:
        return ""
    raw_words = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\b|\d)|[0-9]+', str(text).strip())
    if not raw_words:
        raw_words = re.split(r"[\s_\-]+", str(text).strip())

    clean_words = [w for w in raw_words if w]
    if not clean_words:
        return ""

    # Singularize the final noun token
    clean_words[-1] = to_singular(clean_words[-1])
    return "".join(w.capitalize() for w in clean_words)


def to_camel_case(text: str) -> str:
    """Converts snake_case, kebab-case, or spaced strings to camelCase (e.g. order_date -> orderDate, customer_id -> customerId)."""
    if not text:
        return ""
    raw_words = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\b|\d)|[0-9]+', str(text).strip())
    if not raw_words:
        raw_words = re.split(r"[\s_\-]+", str(text).strip())
    clean_words = [w for w in raw_words if w]
    if not clean_words:
        return ""

    first = clean_words[0].lower()
    rest = "".join(w.capitalize() for w in clean_words[1:])
    return first + rest


def to_human_label(text: str) -> str:
    """Converts camelCase, PascalCase, or snake_case identifiers to human-readable spaced labels."""
    if not text:
        return ""
    words = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\b|\d)|[0-9]+', str(text).strip())
    if not words:
        words = re.split(r"[\s_\-]+", str(text).strip())
    return " ".join(w.capitalize() for w in words if w)


def map_sql_to_xsd(sql_type: str) -> str:
    """Maps SQL data type strings to standard W3C XSD datatype strings."""
    t = str(sql_type or "VARCHAR").upper()
    if any(k in t for k in ["INT", "SERIAL", "BIT", "TINYINT", "SMALLINT", "BIGINT"]):
        return "xsd:integer"
    elif any(k in t for k in ["DECIMAL", "NUMERIC", "FLOAT", "DOUBLE", "REAL", "MONEY"]):
        return "xsd:decimal"
    elif any(k in t for k in ["DATE", "TIME", "TIMESTAMP"]):
        return "xsd:dateTime"
    elif any(k in t for k in ["BOOL"]):
        return "xsd:boolean"
    elif any(k in t for k in ["BINARY", "VARBINARY", "BLOB", "BYTEA"]):
        return "xsd:hexBinary"
    return "xsd:string"


def get_xsd_uriref(xsd_range_str: str) -> URIRef:
    """Maps XSD datatype string to rdflib XSD URIRef."""
    r_lower = str(xsd_range_str).lower()
    if "int" in r_lower:
        return XSD.integer
    elif "dec" in r_lower or "float" in r_lower or "double" in r_lower or "num" in r_lower:
        return XSD.decimal
    elif "date" in r_lower or "time" in r_lower:
        return XSD.dateTime
    elif "bool" in r_lower:
        return XSD.boolean
    elif "hex" in r_lower or "binary" in r_lower or "blob" in r_lower:
        return XSD.hexBinary
    return XSD.string


def resolve_class_name(raw_custom_label: Optional[str], table_name: Optional[str]) -> str:
    """
    Resolves the semantic class name:
    - If explicit custom_class_label is provided:
        - If it already has mixed case / uppercase / custom identifiers (e.g. 'Customer', 'PremiumCustomer_123', 'MyClass'), preserve it.
        - If it is lowercase/snake_case (e.g. 'customer_profiles', 'orders'), convert to singular PascalCase.
    - Else fallback to table_name converted to singular PascalCase.
    """
    if raw_custom_label and str(raw_custom_label).strip():
        lbl = str(raw_custom_label).strip()
        has_upper = any(c.isupper() for c in lbl)
        has_lower = any(c.islower() for c in lbl)
        if has_upper and has_lower and not lbl.startswith("eonto:"):
            return lbl
        elif has_upper and not has_lower and "_" not in lbl:
            return to_pascal_case_singular(lbl)
        elif "_" in lbl and not (has_upper and has_lower):
            return to_pascal_case_singular(lbl)
        elif not has_upper:
            return to_pascal_case_singular(lbl)
        return lbl

    if table_name and str(table_name).strip():
        return to_pascal_case_singular(table_name)

    return "AnonymousClass"


def infer_semantic_relationship_names(source_cls: str, target_cls: str, fk_col: Optional[str] = None) -> tuple:
    """
    Infers clean, domain-accurate active/passive or symmetric relationship names
    without generic 'relatesTo' prefixes or synthetic 'List' suffixes.
    Returns: (forward_name, inverse_name, forward_label, inverse_label)
    """
    s_clean = to_pascal_case_singular(source_cls)
    t_clean = to_pascal_case_singular(target_cls)
    s_lower = s_clean.lower()
    t_lower = t_clean.lower()
    fk_lower = str(fk_col or "").lower()

    # Explicit Foreign Key Column clues
    if "parent" in fk_lower:
        return (f"hasParent{t_clean}", f"hasSub{s_clean}", f"has parent {t_clean.lower()}", f"has sub {s_clean.lower()}")
    if "created_by" in fk_lower or "creator" in fk_lower:
        return ("createdBy", f"created{s_clean}", "created by", f"created {s_clean.lower()}")
    if "updated_by" in fk_lower or "modified_by" in fk_lower:
        return ("lastModifiedBy", f"modified{s_clean}", "last modified by", f"modified {s_clean.lower()}")
    if "manager" in fk_lower:
        return ("reportsToManager", f"supervises{s_clean}", "reports to manager", f"supervises {s_clean.lower()}")

    # Domain specific high-frequency semantic patterns
    if ("order" in s_lower and "item" in s_lower) or ("line" in s_lower and "item" in s_lower) or ("order" in s_lower and "detail" in s_lower):
        if "order" in t_lower:
            return ("belongsToOrder", "hasOrderItem", "belongs to order", "has order item")
        elif "product" in t_lower or "item" in t_lower:
            return ("referencesProduct", "referencedInOrderItem", "references product", "referenced in order item")

    if "order" in s_lower and ("customer" in t_lower or "user" in t_lower or "client" in t_lower or "account" in t_lower or "profile" in t_lower):
        return ("placedBy", "hasOrder", "placed by", "has order")

    if "invoice" in s_lower and ("customer" in t_lower or "account" in t_lower):
        return ("billedToCustomer", "hasInvoice", "billed to customer", "has invoice")

    if "invoice" in s_lower and "order" in t_lower:
        return ("settlesOrder", "invoicedIn", "settles order", "invoiced in")

    if ("invoice" in s_lower and "item" in s_lower) or ("invoice" in s_lower and "detail" in s_lower):
        if "invoice" in t_lower:
            return ("belongsToInvoice", "hasInvoiceItem", "belongs to invoice", "has invoice item")
        elif "product" in t_lower or "item" in t_lower:
            return ("billsProduct", "billedInInvoiceItem", "bills product", "billed in invoice item")

    if "payment" in s_lower and ("order" in t_lower or "invoice" in t_lower):
        return ("paysForOrder", "hasPayment", "pays for order", "has payment")

    if ("assay" in s_lower and "biotarget" in s_lower) or ("map" in s_lower):
        if "assay" in t_lower:
            return ("mapsAssay", "mappedInAssayBiotargetMap", "maps assay", "mapped in assay biotarget map")
        elif "target" in t_lower:
            return ("mapsBiologicalTarget", "mappedInAssayBiotargetMap", "maps biological target", "mapped in assay biotarget map")

    if "assay" in s_lower and "target" in t_lower:
        return ("targetsBiologicalEntity", "targetedInAssay", "targets biological entity", "targeted in assay")

    if ("protein" in s_lower or "target" in s_lower) and ("compound" in t_lower or "molecule" in t_lower or "chemical" in t_lower):
        return ("bindsCompound", "boundByProtein", "binds compound", "bound by protein")

    if ("product" in s_lower or "item" in s_lower) and ("category" in t_lower or "type" in t_lower):
        return ("hasCategory", "categorizesProduct", "has category", "categorizes product")

    if ("product" in s_lower or "item" in s_lower) and ("supplier" in t_lower or "vendor" in t_lower):
        return ("suppliedByVendor", "suppliesProduct", "supplied by vendor", "supplies product")

    if "employee" in s_lower and "department" in t_lower:
        return ("worksInDepartment", "hasEmployee", "works in department", "has employee")

    # Standard clean enterprise default
    fwd_name = f"has{t_clean}"
    inv_name = f"is{t_clean}Of"
    fwd_label = f"has {t_clean.lower()}"
    inv_label = f"is {t_clean.lower()} of"
    return (fwd_name, inv_name, fwd_label, inv_label)


class OntologyGenerator:
    """
    Automated Semantic Web Ontology Generator using RDFLib.
    Translates relational database metadata catalogs and graph structures into W3C OWL 2.0 DL ontologies
    with rich ObjectProperty relationships, bidirectional inverse relationships (owl:inverseOf),
    standard taxonomy hierarchies, and valid OWL 2 RDF List primary key articulation (owl:hasKey).
    """
    def generate_ontology(
        self,
        metadata_catalogs: List[Dict[str, Any]],
        rules: Optional[List[Dict[str, Any]]] = None,
        base_iri: str = "http://enterprise.org/ontology#",
        prefix: str = "eonto"
    ) -> Dict[str, Any]:

        rules = rules or []
        logger.info(f"Generating Enterprise OWL 2.0 DL ontology for {len(metadata_catalogs)} tables and {len(rules)} business rules using base IRI {base_iri}")
        g = Graph()
        ONTO = Namespace(base_iri)
        SKOS = Namespace("http://www.w3.org/2004/02/skos/core#")
        DC = Namespace("http://purl.org/dc/elements/1.1/")
        DCTERMS = Namespace("http://purl.org/dc/terms/")

        g.bind(prefix, ONTO)
        g.bind("owl", OWL)
        g.bind("rdfs", RDFS)
        g.bind("xsd", XSD)
        g.bind("skos", SKOS)
        g.bind("dc", DC)
        g.bind("dcterms", DCTERMS)

        ontology_uri = make_safe_uriref(base_iri.rstrip("#"))
        g.add((ontology_uri, RDF.type, OWL.Ontology))
        g.add((ontology_uri, RDFS.label, Literal("Enterprise Knowledge Graph Ontology")))
        g.add((ontology_uri, DC.title, Literal("Enterprise Semantic Domain Ontology")))
        g.add((ontology_uri, DC.description, Literal("W3C OWL 2.0 DL compliant enterprise domain ontology generated from relational metadata catalogs with semantic object properties and validated key axioms.")))
        g.add((ontology_uri, RDFS.comment, Literal("Auto-generated W3C OWL 2.0 DL ontology with rich relationship properties, inverseOf axioms, and articulated primary keys.")))
        g.add((ontology_uri, OWL.versionInfo, Literal("2.0.0")))
        g.add((ontology_uri, DC.date, Literal(datetime.now(timezone.utc).isoformat(), datatype=XSD.dateTime)))

        # Define custom annotation properties for primary key and rule metadata
        g.add((ONTO.isPrimaryKey, RDF.type, OWL.AnnotationProperty))
        g.add((ONTO.isPrimaryKey, RDFS.label, Literal("isPrimaryKey")))
        g.add((ONTO.isPrimaryKey, RDFS.comment, Literal("Indicates whether this property represents a relational primary key.")))

        g.add((ONTO.hasPrimaryKey, RDF.type, OWL.AnnotationProperty))
        g.add((ONTO.hasPrimaryKey, RDFS.label, Literal("hasPrimaryKey")))
        g.add((ONTO.hasPrimaryKey, RDFS.comment, Literal("Articulates the primary key attribute for this class.")))

        g.add((ONTO.hasBusinessRule, RDF.type, OWL.AnnotationProperty))
        g.add((ONTO.hasBusinessRule, RDFS.label, Literal("hasBusinessRule")))
        g.add((ONTO.hasBusinessRule, RDFS.comment, Literal("Articulates an active business rule constraint applied to this class.")))

        classes = []
        properties = []
        registered_prop_iris = set()

        for cat in metadata_catalogs:
            table_name = cat.get("table_name") or ""
            raw_custom_label = cat.get("custom_class_label")
            class_name = resolve_class_name(raw_custom_label, table_name)

            uri_safe_class_name = urllib.parse.quote(class_name.replace(" ", "_"), safe=":-_")
            class_uri = make_safe_uriref(f"{base_iri}{uri_safe_class_name}")

            domain_type = cat.get("inferred_domain_type", "Transactional")
            subclass = cat.get("custom_subclass_of")

            # Determine appropriate taxonomy parent if default
            if not subclass or str(subclass).strip().lower() in ["owl:thing", "thing", "", "eonto:masterentity", "eonto:transactionalentity", "eonto:referenceentity", "eonto:associativeentity"]:
                subclass_uri = OWL.Thing
                subclass_str = "owl:Thing"
            else:
                subclass_clean = str(subclass).strip()
                if subclass_clean.startswith("http"):
                    subclass_uri = make_safe_uriref(subclass_clean)
                    subclass_str = subclass_clean
                elif ":" in subclass_clean and not subclass_clean.startswith("eonto:"):
                    subclass_uri = OWL.Thing
                    subclass_str = "owl:Thing"
                else:
                    p_cname = subclass_clean.split(":")[-1] if ":" in subclass_clean else subclass_clean
                    p_cname_pascal = resolve_class_name(p_cname, p_cname)
                    subclass_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(p_cname_pascal.replace(' ', '_'), safe=':-_')}")
                    subclass_str = f"eonto:{p_cname_pascal}" if subclass_clean.startswith("eonto:") else p_cname_pascal

            comment = cat.get("custom_comment") or f"Semantic OWL Class representing {to_human_label(table_name or class_name)}"

            # Match Business Rules applicable to this table/class
            applicable_rules = []
            tbl_lower = (table_name or "").strip().lower()
            schema_name = (cat.get("schema_name") or "").strip().lower()
            schema_tbl = f"{schema_name}.{tbl_lower}" if schema_name else tbl_lower
            cls_lower = (class_name or "").strip().lower()
            cls_norm = cls_lower.replace("_", "").replace(" ", "")
            tbl_norm = tbl_lower.replace("_", "").replace(" ", "")

            for r in rules:
                rule_tgt_entity = (r.get("target_entity") or "").strip().lower()
                def_json = r.get("definition_json") or {}
                if isinstance(def_json, str):
                    import json
                    try:
                        def_json = json.loads(def_json)
                    except Exception:
                        def_json = {}
                rule_tgt_table = (def_json.get("target_table") or "").strip().lower()
                rule_tgt_class = (def_json.get("target_class") or "").strip().lower()

                targets = [t for t in [rule_tgt_entity, rule_tgt_table, rule_tgt_class] if t]
                if not targets:
                    continue

                matched = False
                for tgt in targets:
                    tgt_table_only = tgt.split(".")[-1].strip()
                    tgt_norm = tgt.replace("_", "").replace(" ", "")
                    tgt_table_norm = tgt_table_only.replace("_", "").replace(" ", "")

                    if (tgt == tbl_lower or 
                        tgt == schema_tbl or 
                        tgt_table_only == tbl_lower or 
                        tgt == cls_lower or 
                        tgt_norm == tbl_norm or 
                        tgt_norm == cls_norm or
                        tgt_table_norm == tbl_norm):
                        matched = True
                        break

                if matched:
                    applicable_rules.append(r)

            # Define OWL Class & Superclass Taxonomy
            g.add((class_uri, RDF.type, OWL.Class))
            g.add((class_uri, RDFS.label, Literal(to_human_label(class_name))))
            g.add((class_uri, SKOS.prefLabel, Literal(class_name)))
            g.add((class_uri, RDFS.comment, Literal(comment)))
            g.add((class_uri, RDFS.isDefinedBy, ontology_uri))
            g.add((class_uri, RDFS.subClassOf, subclass_uri))

            # Incorporate Business Rules as W3C RDF Class Annotations & Axioms
            for r in applicable_rules:
                r_name = r.get("name", "BusinessRule")
                r_plain_def = r.get("rule_definition") or (r.get("definition_json") if isinstance(r.get("definition_json"), str) else "") or "Enterprise Rule"
                r_attr = r.get("target_attribute") or ""
                attr_info = f" (Attribute: {r_attr})" if r_attr else ""
                g.add((class_uri, ONTO.hasBusinessRule, Literal(f"{r_name}{attr_info}: {r_plain_def}")))
                g.add((class_uri, RDFS.comment, Literal(f"Incorporated Business Rule: {r_name} - {r_plain_def}")))

            primary_keys = cat.get("primary_keys") or cat.get("primary_keys_json") or []
            for pk in primary_keys:
                clean_pk = to_camel_case(pk)
                g.add((class_uri, ONTO.hasPrimaryKey, Literal(clean_pk)))

            classes.append({
                "iri": str(class_uri),
                "label": class_name,
                "name": class_name,
                "comment": comment,
                "subclass_of": [subclass_str],
                "parent_class": subclass_str,
                "primary_keys": primary_keys,
                "business_rules": applicable_rules,
                "annotations": {
                    "table_name": table_name,
                    "domain_type": domain_type,
                    "parent_class": subclass_str,
                    "primary_keys": primary_keys,
                    "business_rules_count": len(applicable_rules)
                }
            })

            pk_prop_uris = []

            custom_props = cat.get("custom_properties_json")
            if custom_props and isinstance(custom_props, list):
                for p in custom_props:
                    raw_p_name = p.get("label") or p.get("name")
                    if not raw_p_name:
                        continue
                    p_type = p.get("property_type") or "DatatypeProperty"
                    p_range = p.get("range") or "xsd:string"
                    p_name = to_camel_case(raw_p_name)

                    parent_cls = resolve_class_name(p.get("parent_class"), class_name)
                    target_cls = resolve_class_name(p.get("target_class") or (p_range.split("#")[-1] if "#" in str(p_range) else (p_range.split(":")[-1] if ":" in str(p_range) else str(p_range))), "")
                    
                    inv_name_raw = p.get("inverse_property") or p.get("inverse_property_name")
                    inv_name = to_camel_case(inv_name_raw) if inv_name_raw else None
                    is_inv = bool(p.get("is_inverse", False))
                    is_pk = bool(p.get("is_primary_key", False))

                    uri_safe_p_name = urllib.parse.quote(p_name.replace(" ", "_"), safe=":-_")
                    p_uri = make_safe_uriref(f"{base_iri}{uri_safe_p_name}")

                    if p_type == "ObjectProperty":
                        target_ref = make_safe_uriref(f"{base_iri}{urllib.parse.quote(target_cls.replace(' ', '_'), safe=':-_')}") if not str(p_range).startswith("http") else make_safe_uriref(p_range)
                        
                        g.add((p_uri, RDF.type, OWL.ObjectProperty))
                        if not is_inv:
                            g.add((p_uri, RDF.type, OWL.FunctionalProperty))
                        g.add((p_uri, RDFS.domain, class_uri))
                        g.add((p_uri, RDFS.range, target_ref))
                        g.add((p_uri, RDFS.label, Literal(to_human_label(p_name))))
                        g.add((p_uri, SKOS.prefLabel, Literal(p_name)))
                        g.add((p_uri, RDFS.comment, Literal(p.get("comment") or f"Object property linking {class_name} to {target_cls}")))
                        g.add((p_uri, RDFS.isDefinedBy, ontology_uri))

                        if inv_name:
                            uri_safe_inv_name = urllib.parse.quote(inv_name.replace(" ", "_"), safe=":-_")
                            inv_uri = make_safe_uriref(f"{base_iri}{uri_safe_inv_name}")

                            g.add((inv_uri, RDF.type, OWL.ObjectProperty))
                            g.add((inv_uri, RDFS.domain, target_ref))
                            g.add((inv_uri, RDFS.range, class_uri))
                            g.add((inv_uri, RDFS.label, Literal(to_human_label(inv_name))))
                            g.add((inv_uri, SKOS.prefLabel, Literal(inv_name)))
                            g.add((inv_uri, RDFS.comment, Literal(f"Inverse relationship linking {target_cls} back to {class_name}")))
                            g.add((inv_uri, RDFS.isDefinedBy, ontology_uri))

                            # Bidirectional W3C inverseOf axioms
                            g.add((p_uri, OWL.inverseOf, inv_uri))
                            g.add((inv_uri, OWL.inverseOf, p_uri))

                        properties.append({
                            "iri": str(p_uri),
                            "label": p_name,
                            "name": p_name,
                            "relationship_name": p_name,
                            "property_type": "ObjectProperty",
                            "domain": str(class_uri),
                            "range": str(target_ref),
                            "parent_class": parent_cls,
                            "target_class": target_cls,
                            "inverse_property": inv_name,
                            "is_inverse": is_inv,
                            "is_primary_key": False,
                            "table_name": table_name,
                            "comment": p.get("comment") or f"Object property linking {class_name} to {target_cls}"
                        })
                        registered_prop_iris.add(str(p_uri))
                    else:
                        # Datatype Property with Primary Key Articulation
                        g.add((p_uri, RDF.type, OWL.DatatypeProperty))
                        g.add((p_uri, RDFS.domain, class_uri))
                        g.add((p_uri, RDFS.range, get_xsd_uriref(p_range)))
                        g.add((p_uri, RDFS.label, Literal(to_human_label(p_name))))
                        g.add((p_uri, SKOS.prefLabel, Literal(p_name)))
                        g.add((p_uri, RDFS.isDefinedBy, ontology_uri))

                        # Articulate Primary Key in W3C OWL 2 DL (FunctionalProperty + hasKey list)
                        if is_pk:
                            pk_prop_uris.append(p_uri)
                            g.add((p_uri, RDF.type, OWL.FunctionalProperty))
                            g.add((p_uri, ONTO.isPrimaryKey, Literal(True, datatype=XSD.boolean)))
                            g.add((class_uri, ONTO.hasPrimaryKey, Literal(p_name)))
                            g.add((p_uri, RDFS.comment, Literal(f"[PRIMARY KEY] Unique key identifier property for {class_name}")))
                        else:
                            g.add((p_uri, RDFS.comment, Literal(p.get("comment") or f"Datatype property {p_name}")))

                        properties.append({
                            "iri": str(p_uri),
                            "label": p_name,
                            "name": p_name,
                            "property_type": "DatatypeProperty",
                            "domain": str(class_uri),
                            "parent_class": class_name,
                            "table_name": table_name,
                            "range": p_range,
                            "is_primary_key": is_pk,
                            "comment": p.get("comment") or f"{'[PRIMARY KEY] ' if is_pk else ''}Custom datatype property {p_name}"
                        })
                        registered_prop_iris.add(str(p_uri))
            else:
                # Define Datatype Properties for Columns with explicit Primary Key Articulation
                for col in cat.get("columns_json", []):
                    col_name = col.get("name")
                    prop_name = to_camel_case(col_name)
                    uri_safe_prop_name = urllib.parse.quote(prop_name.replace(" ", "_"), safe=":-_")
                    prop_uri = make_safe_uriref(f"{base_iri}{uri_safe_prop_name}")

                    is_pk = (col_name in primary_keys) or col.get("primary_key", False)
                    col_type = str(col.get("type", "VARCHAR"))
                    xsd_range = map_sql_to_xsd(col_type)

                    g.add((prop_uri, RDF.type, OWL.DatatypeProperty))
                    g.add((prop_uri, RDFS.domain, class_uri))
                    g.add((prop_uri, RDFS.range, get_xsd_uriref(xsd_range)))
                    g.add((prop_uri, RDFS.label, Literal(to_human_label(col_name))))
                    g.add((prop_uri, SKOS.prefLabel, Literal(prop_name)))
                    g.add((prop_uri, RDFS.isDefinedBy, ontology_uri))

                    # Articulate Primary Key in W3C OWL 2 DL
                    if is_pk:
                        pk_prop_uris.append(prop_uri)
                        g.add((prop_uri, RDF.type, OWL.FunctionalProperty))
                        g.add((prop_uri, ONTO.isPrimaryKey, Literal(True, datatype=XSD.boolean)))
                        g.add((class_uri, ONTO.hasPrimaryKey, Literal(prop_name)))
                        g.add((prop_uri, RDFS.comment, Literal(f"[PRIMARY KEY] Unique key identifier property for {class_name} ({col_type})")))
                    else:
                        g.add((prop_uri, RDFS.comment, Literal(f"Datatype property for column {col_name} ({col_type})")))

                    properties.append({
                        "iri": str(prop_uri),
                        "label": prop_name,
                        "name": prop_name,
                        "property_type": "DatatypeProperty",
                        "domain": str(class_uri),
                        "parent_class": class_name,
                        "table_name": table_name,
                        "range": xsd_range,
                        "is_primary_key": is_pk,
                        "comment": f"{'[PRIMARY KEY] ' if is_pk else ''}Datatype property for column {col_name} ({col_type})"
                    })
                    registered_prop_iris.add(str(prop_uri))

                # Define Object Properties & Inverse Relationships for Explicit Foreign Keys
                fks = cat.get("foreign_keys_json") or []
                added_fk_targets = set()

                for fk in fks:
                    target_table = fk.get("foreign_table")
                    if not target_table or target_table in added_fk_targets:
                        continue
                    added_fk_targets.add(target_table)

                    target_class_name = to_pascal_case_singular(target_table)
                    target_class_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(target_class_name, safe=':-_')}")

                    fwd_rel_name, inv_rel_name, fwd_label, inv_label = infer_semantic_relationship_names(class_name, target_class_name, fk.get("column"))

                    fwd_prop_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(fwd_rel_name, safe=':-_')}")
                    inv_prop_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(inv_rel_name, safe=':-_')}")

                    # 1. Forward ObjectProperty (Functional N:1 relationship)
                    g.add((fwd_prop_uri, RDF.type, OWL.ObjectProperty))
                    g.add((fwd_prop_uri, RDF.type, OWL.FunctionalProperty))
                    g.add((fwd_prop_uri, RDFS.domain, class_uri))
                    g.add((fwd_prop_uri, RDFS.range, target_class_uri))
                    g.add((fwd_prop_uri, RDFS.label, Literal(fwd_label)))
                    g.add((fwd_prop_uri, SKOS.prefLabel, Literal(fwd_rel_name)))
                    g.add((fwd_prop_uri, RDFS.comment, Literal(f"Relationship property linking {class_name} to {target_class_name}")))
                    g.add((fwd_prop_uri, RDFS.isDefinedBy, ontology_uri))

                    # 2. Inverse ObjectProperty
                    g.add((inv_prop_uri, RDF.type, OWL.ObjectProperty))
                    g.add((inv_prop_uri, RDFS.domain, target_class_uri))
                    g.add((inv_prop_uri, RDFS.range, class_uri))
                    g.add((inv_prop_uri, RDFS.label, Literal(inv_label)))
                    g.add((inv_prop_uri, SKOS.prefLabel, Literal(inv_rel_name)))
                    g.add((inv_prop_uri, RDFS.comment, Literal(f"Inverse relationship property linking {target_class_name} back to {class_name}")))
                    g.add((inv_prop_uri, RDFS.isDefinedBy, ontology_uri))

                    # 3. W3C OWL inverseOf Axioms
                    g.add((fwd_prop_uri, OWL.inverseOf, inv_prop_uri))
                    g.add((inv_prop_uri, OWL.inverseOf, fwd_prop_uri))

                    # Append Forward Property
                    if str(fwd_prop_uri) not in registered_prop_iris:
                        properties.append({
                            "iri": str(fwd_prop_uri),
                            "label": fwd_rel_name,
                            "name": fwd_rel_name,
                            "relationship_name": fwd_rel_name,
                            "property_type": "ObjectProperty",
                            "domain": str(class_uri),
                            "range": str(target_class_uri),
                            "parent_class": class_name,
                            "target_class": target_class_name,
                            "inverse_property": inv_rel_name,
                            "is_inverse": False,
                            "is_primary_key": False,
                            "table_name": table_name,
                            "comment": f"Relationship property linking {class_name} to {target_class_name}"
                        })
                        registered_prop_iris.add(str(fwd_prop_uri))

                    # Append Inverse Property
                    if str(inv_prop_uri) not in registered_prop_iris:
                        properties.append({
                            "iri": str(inv_prop_uri),
                            "label": inv_rel_name,
                            "name": inv_rel_name,
                            "relationship_name": inv_rel_name,
                            "property_type": "ObjectProperty",
                            "domain": str(target_class_uri),
                            "range": str(class_uri),
                            "parent_class": target_class_name,
                            "target_class": class_name,
                            "inverse_property": fwd_rel_name,
                            "is_inverse": True,
                            "is_primary_key": False,
                            "table_name": target_table,
                            "comment": f"Inverse relationship property linking {target_class_name} back to {class_name}"
                        })
                        registered_prop_iris.add(str(inv_prop_uri))

                # Infer implicit foreign key relationships if no explicit FKs present
                if not fks:
                    all_tables = [c.get("table_name") for c in metadata_catalogs if c.get("table_name") and c.get("table_name") != table_name]
                    for col in cat.get("columns_json", []):
                        c_name = col.get("name", "").lower()
                        if c_name.endswith("_id") and len(c_name) > 3:
                            possible_target = c_name[:-3]
                            matching = [t for t in all_tables if t and (t.lower() == possible_target or possible_target in t.lower())]
                            if matching and matching[0] not in added_fk_targets:
                                target_tbl = str(matching[0])
                                added_fk_targets.add(target_tbl)
                                target_cname = to_pascal_case_singular(target_tbl)
                                target_c_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(target_cname, safe=':-_')}")

                                fwd_rel_name, inv_rel_name, fwd_label, inv_label = infer_semantic_relationship_names(class_name, target_cname, col.get("name"))

                                fwd_prop_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(fwd_rel_name, safe=':-_')}")
                                inv_prop_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(inv_rel_name, safe=':-_')}")

                                g.add((fwd_prop_uri, RDF.type, OWL.ObjectProperty))
                                g.add((fwd_prop_uri, RDF.type, OWL.FunctionalProperty))
                                g.add((fwd_prop_uri, RDFS.domain, class_uri))
                                g.add((fwd_prop_uri, RDFS.range, target_c_uri))
                                g.add((fwd_prop_uri, RDFS.label, Literal(fwd_label)))
                                g.add((fwd_prop_uri, SKOS.prefLabel, Literal(fwd_rel_name)))
                                g.add((fwd_prop_uri, RDFS.comment, Literal(f"Relationship property linking {class_name} to {target_cname}")))
                                g.add((fwd_prop_uri, RDFS.isDefinedBy, ontology_uri))

                                g.add((inv_prop_uri, RDF.type, OWL.ObjectProperty))
                                g.add((inv_prop_uri, RDFS.domain, target_c_uri))
                                g.add((inv_prop_uri, RDFS.range, class_uri))
                                g.add((inv_prop_uri, RDFS.label, Literal(inv_label)))
                                g.add((inv_prop_uri, SKOS.prefLabel, Literal(inv_rel_name)))
                                g.add((inv_prop_uri, RDFS.comment, Literal(f"Inverse relationship property linking {target_cname} back to {class_name}")))
                                g.add((inv_prop_uri, RDFS.isDefinedBy, ontology_uri))

                                g.add((fwd_prop_uri, OWL.inverseOf, inv_prop_uri))
                                g.add((inv_prop_uri, OWL.inverseOf, fwd_prop_uri))

                                if str(fwd_prop_uri) not in registered_prop_iris:
                                    properties.append({
                                        "iri": str(fwd_prop_uri),
                                        "label": fwd_rel_name,
                                        "name": fwd_rel_name,
                                        "relationship_name": fwd_rel_name,
                                        "property_type": "ObjectProperty",
                                        "domain": str(class_uri),
                                        "range": str(target_c_uri),
                                        "parent_class": class_name,
                                        "target_class": target_cname,
                                        "inverse_property": inv_rel_name,
                                        "is_inverse": False,
                                        "is_primary_key": False,
                                        "table_name": table_name,
                                        "comment": f"Inferred relationship property linking {class_name} to {target_cname}"
                                    })
                                    registered_prop_iris.add(str(fwd_prop_uri))

                                if str(inv_prop_uri) not in registered_prop_iris:
                                    properties.append({
                                        "iri": str(inv_prop_uri),
                                        "label": inv_rel_name,
                                        "name": inv_rel_name,
                                        "relationship_name": inv_rel_name,
                                        "property_type": "ObjectProperty",
                                        "domain": str(target_c_uri),
                                        "range": str(class_uri),
                                        "parent_class": target_cname,
                                        "target_class": class_name,
                                        "inverse_property": fwd_rel_name,
                                        "is_inverse": True,
                                        "is_primary_key": False,
                                        "table_name": target_tbl,
                                        "comment": f"Inferred inverse relationship property linking {target_cname} back to {class_name}"
                                    })
                                    registered_prop_iris.add(str(inv_prop_uri))

            # Build standard W3C OWL 2 owl:hasKey RDF List collection
            if pk_prop_uris:
                key_list_node = BNode()
                Collection(g, key_list_node, pk_prop_uris)
                g.add((class_uri, OWL.hasKey, key_list_node))

        # Deduplicate properties before return to guarantee no attribute duplication
        unique_properties = []
        seen_keys = set()
        for p in properties:
            p_name = (p.get("name") or p.get("label") or "").lower()
            p_parent = (p.get("parent_class") or p.get("domain") or "").lower()
            p_type = (p.get("property_type") or "DatatypeProperty").lower()
            key = (p_parent, p_name, p_type)
            if key not in seen_keys:
                seen_keys.add(key)
                unique_properties.append(p)

        return {
            "graph": g,
            "classes": classes,
            "properties": unique_properties
        }

