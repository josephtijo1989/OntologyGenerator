import re
import urllib.parse
from typing import List, Dict, Any
from rdflib import Graph, URIRef, Literal, Namespace, RDF, RDFS, OWL, XSD
from app.utilities.logger import logger

def make_safe_uriref(uri_str: str) -> URIRef:
    """Ensures URI string is properly URL-encoded for RDFLib Turtle / N3 serialization."""
    encoded = urllib.parse.quote(str(uri_str), safe=":/#?=&_-")
    return URIRef(encoded)


class OntologyGenerator:
    """
    Automated Semantic Web Ontology Generator using RDFLib.
    Translates relational database metadata catalogs and graph structures into W3C OWL/RDF ontologies.
    """
    def generate_ontology(
        self,
        metadata_catalogs: List[Dict[str, Any]],
        rules: List[Dict[str, Any]] = None,
        base_iri: str = "http://enterprise.org/ontology#",
        prefix: str = "eonto"
    ) -> Dict[str, Any]:
        rules = rules or []
        logger.info(f"Generating OWL ontology for {len(metadata_catalogs)} tables and {len(rules)} business rules using base IRI {base_iri}")
        g = Graph()
        ONTO = Namespace(base_iri)
        g.bind(prefix, ONTO)
        g.bind("owl", OWL)
        g.bind("rdfs", RDFS)

        ontology_uri = make_safe_uriref(base_iri.rstrip("#"))
        g.add((ontology_uri, RDF.type, OWL.Ontology))

        classes = []
        properties = []

        for cat in metadata_catalogs:
            table_name = cat.get("table_name")
            default_class_name = "".join([part.capitalize() for part in table_name.split("_")])
            class_name = cat.get("custom_class_label") or default_class_name
            uri_safe_class_name = urllib.parse.quote(class_name.replace(" ", "_"), safe=":-_")
            class_uri = make_safe_uriref(f"{base_iri}{uri_safe_class_name}")

            subclass = cat.get("custom_subclass_of") or "owl:Thing"
            comment = cat.get("custom_comment") or f"Class representing {table_name}"

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
                    # Global rule not tied to a specific entity - do not attach to random classes
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
            g.add((class_uri, RDFS.label, Literal(class_name)))
            g.add((class_uri, RDFS.comment, Literal(comment)))

            # Connect Parent Class / Superclass (rdfs:subClassOf)
            subclass_clean = str(subclass).strip()
            if subclass_clean.lower() in ["owl:thing", "thing", ""]:
                g.add((class_uri, RDFS.subClassOf, OWL.Thing))
            elif subclass_clean.startswith("http"):
                g.add((class_uri, RDFS.subClassOf, make_safe_uriref(subclass_clean)))
            else:
                p_cname = subclass_clean.split(":")[-1] if ":" in subclass_clean else subclass_clean
                p_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(p_cname.replace(' ', '_'), safe=':-_')}")
                g.add((class_uri, RDFS.subClassOf, p_uri))

            # Incorporate Business Rules as W3C RDF Class Annotations & Axioms
            for r in applicable_rules:
                r_name = r.get("name", "BusinessRule")
                r_plain_def = r.get("rule_definition") or (r.get("definition_json") if isinstance(r.get("definition_json"), str) else "") or "Enterprise Rule"
                r_attr = r.get("target_attribute") or ""
                rule_ann_uri = make_safe_uriref(f"{base_iri}hasBusinessRule")
                attr_info = f" (Attribute: {r_attr})" if r_attr else ""
                g.add((class_uri, rule_ann_uri, Literal(f"{r_name}{attr_info}: {r_plain_def}")))
                g.add((class_uri, RDFS.comment, Literal(f"Incorporated Business Rule: {r_name} - {r_plain_def}")))

            primary_keys = cat.get("primary_keys") or cat.get("primary_keys_json") or []

            classes.append({
                "iri": str(class_uri),
                "label": class_name,
                "comment": comment,
                "subclass_of": [subclass],
                "parent_class": subclass,
                "primary_keys": primary_keys,
                "business_rules": applicable_rules,
                "annotations": {
                    "table_name": table_name,
                    "domain_type": cat.get("inferred_domain_type", "Transactional"),
                    "parent_class": subclass,
                    "primary_keys": primary_keys,
                    "business_rules_count": len(applicable_rules)
                }
            })

            custom_props = cat.get("custom_properties_json")
            if custom_props and isinstance(custom_props, list):
                for p in custom_props:
                    p_name = p.get("label") or p.get("name")
                    if not p_name:
                        continue
                    p_type = p.get("property_type") or "DatatypeProperty"
                    p_range = p.get("range") or "xsd:string"
                    uri_safe_p_name = urllib.parse.quote(p_name.replace(" ", "_"), safe=":-_")
                    p_uri = make_safe_uriref(f"{base_iri}{uri_safe_p_name}")
                    is_pk = p.get("is_primary_key", False)

                    if p_type == "ObjectProperty":
                        g.add((p_uri, RDF.type, OWL.ObjectProperty))
                        g.add((p_uri, RDFS.domain, class_uri))
                        target_ref = make_safe_uriref(f"{base_iri}{urllib.parse.quote(p_range, safe=':-_')}") if not p_range.startswith("http") else make_safe_uriref(p_range)
                        g.add((p_uri, RDFS.range, target_ref))
                        properties.append({
                            "iri": str(p_uri),
                            "label": p_name,
                            "property_type": "ObjectProperty",
                            "domain": str(class_uri),
                            "table_name": table_name,
                            "range": p_range,
                            "is_primary_key": False,
                            "comment": p.get("comment") or f"Custom object property {p_name}"
                        })
                    else:
                        g.add((p_uri, RDF.type, OWL.DatatypeProperty))
                        g.add((p_uri, RDFS.domain, class_uri))
                        g.add((p_uri, RDFS.label, Literal(p_name)))
                        if is_pk:
                            g.add((class_uri, OWL.hasKey, p_uri))
                            g.add((p_uri, RDF.type, OWL.InverseFunctionalProperty))
                        properties.append({
                            "iri": str(p_uri),
                            "label": p_name,
                            "property_type": "DatatypeProperty",
                            "domain": str(class_uri),
                            "table_name": table_name,
                            "range": p_range,
                            "is_primary_key": is_pk,
                            "comment": p.get("comment") or f"{'[PRIMARY KEY] ' if is_pk else ''}Custom datatype property {p_name}"
                        })
            else:
                # Define Datatype Properties for Columns
                for col in cat.get("columns_json", []):
                    col_name = col.get("name")
                    prop_name = f"has{col_name.capitalize()}"
                    uri_safe_prop_name = urllib.parse.quote(prop_name.replace(" ", "_"), safe=":-_")
                    prop_uri = make_safe_uriref(f"{base_iri}{uri_safe_prop_name}")

                    is_pk = (col_name in primary_keys) or col.get("primary_key", False)

                    g.add((prop_uri, RDF.type, OWL.DatatypeProperty))
                    g.add((prop_uri, RDFS.domain, class_uri))
                    g.add((prop_uri, RDFS.label, Literal(col_name)))
                    if is_pk:
                        g.add((class_uri, OWL.hasKey, prop_uri))
                        g.add((prop_uri, RDF.type, OWL.InverseFunctionalProperty))

                    # Datatype mapping
                    col_type = str(col.get("type")).upper()
                    xsd_range = "xsd:string"
                    if "INT" in col_type:
                        g.add((prop_uri, RDFS.range, XSD.integer))
                        xsd_range = "xsd:integer"
                    elif "DECIMAL" in col_type or "FLOAT" in col_type or "NUMERIC" in col_type or "DOUBLE" in col_type:
                        g.add((prop_uri, RDFS.range, XSD.decimal))
                        xsd_range = "xsd:decimal"
                    elif "DATE" in col_type or "TIME" in col_type:
                        g.add((prop_uri, RDFS.range, XSD.dateTime))
                        xsd_range = "xsd:dateTime"
                    elif "BOOL" in col_type:
                        g.add((prop_uri, RDFS.range, XSD.boolean))
                        xsd_range = "xsd:boolean"
                    else:
                        g.add((prop_uri, RDFS.range, XSD.string))

                    properties.append({
                        "iri": str(prop_uri),
                        "label": prop_name,
                        "property_type": "DatatypeProperty",
                        "domain": str(class_uri),
                        "table_name": table_name,
                        "range": xsd_range,
                        "is_primary_key": is_pk,
                        "comment": f"{'[PRIMARY KEY] ' if is_pk else ''}Datatype property for column {col_name} ({col_type})"
                    })

                # Define Object Properties for Explicit & Inferred Foreign Key relationships
                fks = cat.get("foreign_keys_json") or []
                added_fk_targets = set()

                for fk in fks:
                    target_table = fk.get("foreign_table")
                    if not target_table or target_table in added_fk_targets:
                        continue
                    added_fk_targets.add(target_table)

                    target_class_name = "".join([part.capitalize() for part in target_table.split("_")])
                    obj_prop_name = f"relatesTo{target_class_name}"
                    obj_prop_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(obj_prop_name, safe=':-_')}")
                    target_class_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(target_class_name, safe=':-_')}")

                    g.add((obj_prop_uri, RDF.type, OWL.ObjectProperty))
                    g.add((obj_prop_uri, RDFS.domain, class_uri))
                    g.add((obj_prop_uri, RDFS.range, target_class_uri))

                    properties.append({
                        "iri": str(obj_prop_uri),
                        "label": obj_prop_name,
                        "property_type": "ObjectProperty",
                        "domain": str(class_uri),
                        "table_name": table_name,
                        "range": str(target_class_uri),
                        "comment": f"Object property linking {table_name} to {target_table}"
                    })

                # Infer implicit foreign key relationships if no explicit FKs present
                if not fks:
                    all_tables = [c.get("table_name") for c in metadata_catalogs if c.get("table_name") != table_name]
                    for col in cat.get("columns_json", []):
                        c_name = col.get("name", "").lower()
                        if c_name.endswith("_id") and len(c_name) > 3:
                            possible_target = c_name[:-3]
                            matching = [t for t in all_tables if t.lower() == possible_target or possible_target in t.lower()]
                            if matching and matching[0] not in added_fk_targets:
                                target_tbl = matching[0]
                                added_fk_targets.add(target_tbl)
                                target_cname = "".join([part.capitalize() for part in target_tbl.split("_")])
                                obj_prop_name = f"relatesTo{target_cname}"
                                obj_prop_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(obj_prop_name, safe=':-_')}")
                                target_c_uri = make_safe_uriref(f"{base_iri}{urllib.parse.quote(target_cname, safe=':-_')}")

                                g.add((obj_prop_uri, RDF.type, OWL.ObjectProperty))
                                g.add((obj_prop_uri, RDFS.domain, class_uri))
                                g.add((obj_prop_uri, RDFS.range, target_c_uri))

                                properties.append({
                                    "iri": str(obj_prop_uri),
                                    "label": obj_prop_name,
                                    "property_type": "ObjectProperty",
                                    "domain": str(class_uri),
                                    "table_name": table_name,
                                    "range": str(target_c_uri),
                                    "comment": f"Inferred object property linking {table_name} to {target_tbl}"
                                })

        return {
            "graph": g,
            "classes": classes,
            "properties": properties
        }
