import urllib.parse
from typing import Dict, Any, List, Optional
from rdflib import Graph, RDF, RDFS, OWL, XSD, URIRef, Literal, BNode
from app.utilities.logger import logger


def extract_local_name(uri: Any) -> str:
    """Extracts a clean, human-readable local name from a URI or Literal."""
    if not uri:
        return ""
    uri_str = str(uri)
    if "#" in uri_str:
        return uri_str.split("#")[-1]
    elif "/" in uri_str:
        return uri_str.rstrip("/").split("/")[-1]
    elif ":" in uri_str:
        return uri_str.split(":")[-1]
    return uri_str


class OntologyParser:
    """
    Stateless parser that ingests OWL 2.0 / RDF ontology files
    (Turtle, OWL/XML, RDF/XML, JSON-LD, N-Triples) and extracts
    structured classes, datatype attributes, and object relationships
    for in-memory viewing and graphical exploration without database persistence.
    """

    SUPPORTED_FORMATS = ["turtle", "xml", "json-ld", "nt", "n3"]

    def parse_ontology(
        self,
        content: str,
        filename: Optional[str] = None,
        format_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        g = Graph()
        formats_to_try = []

        if format_hint and format_hint.lower() != "auto":
            formats_to_try.append(format_hint.lower())

        if filename:
            fn_lower = filename.lower()
            if fn_lower.endswith(".ttl"):
                formats_to_try.extend(["turtle", "n3", "xml"])
            elif fn_lower.endswith(".owl") or fn_lower.endswith(".rdf") or fn_lower.endswith(".xml"):
                formats_to_try.extend(["xml", "turtle"])
            elif fn_lower.endswith(".jsonld") or fn_lower.endswith(".json"):
                formats_to_try.extend(["json-ld", "turtle", "xml"])
            elif fn_lower.endswith(".nt"):
                formats_to_try.extend(["nt", "turtle", "xml"])

        formats_to_try.extend(self.SUPPORTED_FORMATS)
        unique_formats = list(dict.fromkeys(formats_to_try))

        parsed = False
        last_error = None
        detected_format = "unknown"

        for fmt in unique_formats:
            try:
                g.parse(data=content, format=fmt)
                parsed = True
                detected_format = fmt
                break
            except Exception as e:
                last_error = e
                continue

        if not parsed:
            raise ValueError(
                f"Failed to parse ontology. Supported formats include Turtle (.ttl), OWL/XML (.owl, .rdf, .xml), "
                f"JSON-LD (.jsonld), and N-Triples (.nt). Parser error: {last_error}"
            )

        triples_count = len(g)
        logger.info(f"Successfully parsed ontology graph with {triples_count} triples (Format: {detected_format}).")

        # 1. Discover Ontology Header & Base IRI
        ontology_uri = None
        ontology_name = "UploadedOntology"
        for s in g.subjects(RDF.type, OWL.Ontology):
            ontology_uri = str(s)
            label = g.value(s, RDFS.label)
            if label:
                ontology_name = str(label)
            else:
                ontology_name = extract_local_name(s)
            break

        base_iri = ontology_uri or "http://uploaded.ontology/schema#"
        if not base_iri.endswith("#") and not base_iri.endswith("/"):
            base_iri = f"{base_iri}#"

        # 2. Extract Classes
        class_subjects = set()
        for s in g.subjects(RDF.type, OWL.Class):
            if not isinstance(s, BNode):
                class_subjects.add(s)
        for s in g.subjects(RDF.type, RDFS.Class):
            if not isinstance(s, BNode):
                class_subjects.add(s)

        # Also collect referenced classes from domains and ranges to guarantee no orphaned relations
        for p in g.subjects(RDF.type, OWL.ObjectProperty):
            dom = g.value(p, RDFS.domain)
            rng = g.value(p, RDFS.range)
            if dom and isinstance(dom, URIRef) and dom != OWL.Thing:
                class_subjects.add(dom)
            if rng and isinstance(rng, URIRef) and rng != OWL.Thing:
                class_subjects.add(rng)

        classes: List[Dict[str, Any]] = []
        class_iri_to_label: Dict[str, str] = {}

        for cls_uri in class_subjects:
            cls_str = str(cls_uri)
            raw_label = g.value(cls_uri, RDFS.label)
            class_name = str(raw_label) if raw_label else extract_local_name(cls_uri)
            class_iri_to_label[cls_str] = class_name
            class_iri_to_label[class_name.lower()] = class_name

            raw_comment = g.value(cls_uri, RDFS.comment)
            comment = str(raw_comment) if raw_comment else f"OWL Class {class_name}"

            # Superclasses
            subclasses = []
            for sc in g.objects(cls_uri, RDFS.subClassOf):
                if isinstance(sc, URIRef):
                    sc_name = "owl:Thing" if sc == OWL.Thing else extract_local_name(sc)
                    subclasses.append(sc_name)

            parent_class = subclasses[0] if subclasses else "owl:Thing"
            if not subclasses:
                subclasses = ["owl:Thing"]

            # Primary Keys / Keys articulation
            pkeys = []
            for k in g.objects(cls_uri, OWL.hasKey):
                pkeys.append(extract_local_name(k))
            for k in g.objects(cls_uri, URIRef(f"{base_iri}hasPrimaryKey")):
                pkeys.append(str(k))

            # Domain type classification heuristic
            domain_type = "Transactional"
            lower_name = class_name.lower()
            if any(term in lower_name for term in ["lookup", "status", "type", "code", "ref", "unit", "category"]):
                domain_type = "Lookup"
            elif any(term in lower_name for term in ["fact", "metric", "transaction", "log", "measurement", "event"]):
                domain_type = "Fact"
            elif any(term in lower_name for term in ["dimension", "dim", "master", "customer", "product", "protein", "chemical"]):
                domain_type = "Dimension"

            # Check for business rule annotations
            rules = []
            for o in g.objects(cls_uri, URIRef(f"{base_iri}hasBusinessRule")):
                rules.append({"name": "Annotated Rule", "definition": str(o)})

            classes.append({
                "id": cls_str,
                "iri": cls_str,
                "label": class_name,
                "name": class_name,
                "comment": comment,
                "subclass_of": subclasses,
                "parent_class": parent_class,
                "primary_keys": pkeys,
                "business_rules": rules,
                "annotations": {
                    "domain_type": domain_type,
                    "table_name": class_name,
                    "primary_keys": pkeys,
                    "is_uploaded": True
                }
            })

        # Sort classes alphabetically
        classes.sort(key=lambda c: c["label"].lower())

        # 3. Extract Datatype & Object Properties
        properties: List[Dict[str, Any]] = []

        # Datatype Properties
        datatype_prop_subjects = set(g.subjects(RDF.type, OWL.DatatypeProperty))
        for p_uri in datatype_prop_subjects:
            if isinstance(p_uri, BNode):
                continue
            p_str = str(p_uri)
            p_label = g.value(p_uri, RDFS.label)
            prop_name = str(p_label) if p_label else extract_local_name(p_uri)
            p_comment = g.value(p_uri, RDFS.comment) or f"Datatype property {prop_name}"

            # Domain
            dom_uri = g.value(p_uri, RDFS.domain)
            dom_str = str(dom_uri) if dom_uri else ""
            parent_cls = class_iri_to_label.get(dom_str, extract_local_name(dom_uri))

            # Range
            rng_uri = g.value(p_uri, RDFS.range)
            range_datatype = extract_local_name(rng_uri) if rng_uri else "xsd:string"
            if not range_datatype.startswith("xsd:"):
                range_datatype = f"xsd:{range_datatype}"

            # PK detection
            is_pk = (
                (p_uri, RDF.type, OWL.InverseFunctionalProperty) in g or
                (p_uri, URIRef(f"{base_iri}isPrimaryKey"), Literal(True)) in g or
                (p_uri, URIRef(f"{base_iri}isPrimaryKey"), Literal(True, datatype=XSD.boolean)) in g or
                prop_name.lower().endswith("id") or
                prop_name.lower().startswith("pk_") or
                "primary" in str(p_comment).lower()
            )

            properties.append({
                "id": p_str,
                "iri": p_str,
                "name": prop_name,
                "label": prop_name,
                "property_type": "DatatypeProperty",
                "domain": dom_str,
                "parent_class": parent_cls,
                "table_name": parent_cls,
                "range": range_datatype,
                "is_primary_key": is_pk,
                "comment": str(p_comment)
            })

        # Object Properties & Inverse Relationships
        object_prop_subjects = set(g.subjects(RDF.type, OWL.ObjectProperty))
        object_prop_subjects.update(g.subjects(RDF.type, OWL.TransitiveProperty))
        object_prop_subjects.update(g.subjects(RDF.type, OWL.SymmetricProperty))

        for p_uri in object_prop_subjects:
            if isinstance(p_uri, BNode):
                continue
            p_str = str(p_uri)
            p_label = g.value(p_uri, RDFS.label)
            rel_name = str(p_label) if p_label else extract_local_name(p_uri)
            p_comment = g.value(p_uri, RDFS.comment) or f"Object property {rel_name}"

            # Domain & Range
            dom_uri = g.value(p_uri, RDFS.domain)
            rng_uri = g.value(p_uri, RDFS.range)
            dom_str = str(dom_uri) if dom_uri else ""
            rng_str = str(rng_uri) if rng_uri else ""

            parent_cls = class_iri_to_label.get(dom_str, extract_local_name(dom_uri))
            target_cls = class_iri_to_label.get(rng_str, extract_local_name(rng_uri))

            # Inverse property
            inv_uri = g.value(p_uri, OWL.inverseOf)
            inv_name = extract_local_name(inv_uri) if inv_uri else None

            properties.append({
                "id": p_str,
                "iri": p_str,
                "name": rel_name,
                "label": rel_name,
                "relationship_name": rel_name,
                "property_type": "ObjectProperty",
                "domain": dom_str,
                "range": rng_str,
                "parent_class": parent_cls,
                "target_class": target_cls,
                "inverse_property": inv_name,
                "is_inverse": False,
                "is_primary_key": False,
                "table_name": parent_cls,
                "comment": str(p_comment)
            })

        # Sort properties
        properties.sort(key=lambda p: (p["property_type"], p["label"].lower()))

        datatype_props_count = len([p for p in properties if p["property_type"] == "DatatypeProperty"])
        object_props_count = len([p for p in properties if p["property_type"] == "ObjectProperty"])

        # 4. Generate Graph Representation (Nodes & Edges for Cytoscape / D3)
        graph_nodes = []
        graph_edges = []
        node_ids = set()

        for c in classes:
            c_name = c["label"]
            node_ids.add(c_name)
            # Find all datatype properties belonging to this class
            class_attrs = [
                {
                    "name": p["name"],
                    "range": p["range"],
                    "is_primary_key": p.get("is_primary_key", False)
                }
                for p in properties
                if p["property_type"] == "DatatypeProperty" and p.get("parent_class") == c_name
            ]
            graph_nodes.append({
                "id": c_name,
                "label": c_name,
                "type": "Class",
                "iri": c["iri"],
                "domain_type": c.get("annotations", {}).get("domain_type", "Dimension"),
                "comment": c["comment"],
                "primary_keys": c.get("primary_keys", []),
                "attributes": class_attrs,
                "properties": {
                    "type": "Class",
                    "domain_type": c.get("annotations", {}).get("domain_type", "Dimension"),
                    "subclass_of": c.get("subclass_of", []),
                    "comment": c["comment"]
                }
            })

        # Add subclass edges
        for c in classes:
            c_name = c["label"]
            for sc in c.get("subclass_of", []):
                if sc and sc != "owl:Thing":
                    if sc not in node_ids:
                        node_ids.add(sc)
                        graph_nodes.append({
                            "id": sc,
                            "label": sc,
                            "type": "SuperClass",
                            "iri": f"{base_iri}{sc}",
                            "domain_type": "Hierarchy",
                            "comment": f"Parent class {sc}",
                            "attributes": [],
                            "properties": {"type": "SuperClass"}
                        })
                    graph_edges.append({
                        "id": f"sub_{c_name}_{sc}",
                        "source": c_name,
                        "target": sc,
                        "label": "subClassOf",
                        "type": "subClassOf",
                        "relationship_type": "INHERITANCE"
                    })

        # Add ObjectProperty edges
        for p in properties:
            if p["property_type"] == "ObjectProperty":
                src = p.get("parent_class")
                tgt = p.get("target_class")
                if src and tgt:
                    # If target node is not in node_ids, create virtual node
                    if tgt not in node_ids:
                        node_ids.add(tgt)
                        graph_nodes.append({
                            "id": tgt,
                            "label": tgt,
                            "type": "Class",
                            "iri": p.get("range", f"{base_iri}{tgt}"),
                            "domain_type": "External",
                            "comment": f"Target class {tgt}",
                            "attributes": [],
                            "properties": {"type": "Class"}
                        })
                    if src not in node_ids:
                        node_ids.add(src)
                        graph_nodes.append({
                            "id": src,
                            "label": src,
                            "type": "Class",
                            "iri": p.get("domain", f"{base_iri}{src}"),
                            "domain_type": "External",
                            "comment": f"Source class {src}",
                            "attributes": [],
                            "properties": {"type": "Class"}
                        })
                    edge_id = f"rel_{src}_{p['name']}_{tgt}"
                    graph_edges.append({
                        "id": edge_id,
                        "source": src,
                        "target": tgt,
                        "label": p["name"],
                        "type": "ObjectProperty",
                        "relationship_type": "OBJECT_PROPERTY",
                        "inverse_property": p.get("inverse_property"),
                        "comment": p.get("comment", "")
                    })

        # Also serialize cleanly formatted Turtle representation for source preview
        try:
            turtle_preview = g.serialize(format="turtle")
        except Exception:
            turtle_preview = content[:2000]

        return {
            "status": "SUCCESS",
            "ontology_name": ontology_name,
            "base_iri": base_iri,
            "detected_format": detected_format.upper(),
            "classes": classes,
            "properties": properties,
            "turtle_preview": turtle_preview,
            "stats": {
                "classes_count": len(classes),
                "datatype_properties_count": datatype_props_count,
                "object_properties_count": object_props_count,
                "total_triples_count": triples_count
            },
            "graph": {
                "nodes": graph_nodes,
                "edges": graph_edges,
                "node_count": len(graph_nodes),
                "edge_count": len(graph_edges)
            }
        }
