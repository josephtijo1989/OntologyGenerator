import re
from typing import List, Dict, Any
import networkx as nx
from app.utilities.logger import logger

def to_upper_snake_case(name: str) -> str:
    """Converts camelCase, PascalCase, or mixed-case string into standard UPPER_SNAKE_CASE."""
    if not name:
        return "RELATES_TO"
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1)
    clean = re.sub(r'[^a-zA-Z0-9]+', '_', s2)
    result = re.sub(r'_+', '_', clean).strip('_').upper()
    return result or "RELATES_TO"

def infer_foreign_key_relationship(source_table: str, col_name: str, target_table: str) -> str:
    """Infers meaningful, human-readable enterprise semantic relationship name for FK / inferred connections."""
    c_clean = (col_name or "").lower().replace("_", "")
    t_clean = (target_table or "").lower().replace("_", "")
    s_clean = (source_table or "").lower().replace("_", "")

    # Domain specific semantic rules
    if "customer" in t_clean or "customer" in c_clean:
        return "PLACED_BY_CUSTOMER" if ("order" in s_clean or "sale" in s_clean) else "HAS_CUSTOMER"
    if "supplier" in t_clean or "vendor" in c_clean or "supplier" in c_clean:
        return "SUPPLIED_BY"
    if "product" in t_clean or "item" in c_clean:
        return "INCLUDES_PRODUCT" if ("order" in s_clean or "line" in s_clean or "detail" in s_clean) else "HAS_PRODUCT"
    if "employee" in t_clean or "staff" in c_clean:
        if "manager" in c_clean or "supervisor" in c_clean:
            return "MANAGED_BY"
        return "ASSIGNED_TO_EMPLOYEE"
    if "category" in t_clean or "category" in c_clean:
        return "CLASSIFIED_UNDER"
    if "location" in t_clean or "address" in c_clean or "city" in c_clean or "country" in c_clean or "region" in c_clean:
        return "LOCATED_IN"
    if "department" in t_clean or "dept" in c_clean:
        return "BELONGS_TO_DEPARTMENT"
    if "shipper" in t_clean or "carrier" in c_clean:
        return "SHIPPED_VIA"
    if "order" in t_clean and ("detail" in s_clean or "item" in s_clean or "line" in s_clean):
        return "BELONGS_TO_ORDER"

    # Default clean fallback based on column name or target table name
    col_base = re.sub(r'(_?id|_?code|_?key|_?fk)$', '', col_name or "", flags=re.IGNORECASE)
    if col_base and col_base.lower() != source_table.lower():
        return to_upper_snake_case(f"HAS_{col_base}")
    return to_upper_snake_case(f"BELONGS_TO_{target_table}")


class RelationalToGraphConverter:
    """
    Core engine converting Relational Metadata Catalogs into Enterprise Knowledge Graph models using NetworkX.
    Preserves complete end-to-end data lineage and infers implicit relationships.
    """
    def convert(self, metadata_catalogs: List[Dict[str, Any]]) -> Dict[str, Any]:
        logger.info(f"Converting {len(metadata_catalogs)} relational metadata catalogs to Enterprise Knowledge Graph")
        G = nx.DiGraph()

        # Build class lookup map: lower(class_label) & lower(table_name) -> (table_node_id, orig_table_name, class_label)
        class_lookup = {}
        for cat in metadata_catalogs:
            s_name = cat.get("schema_name", "dbo")
            t_name = cat.get("table_name")
            if not t_name:
                continue
            default_label = "".join([part.capitalize() for part in t_name.split("_")])
            c_label = cat.get("custom_class_label") or default_label
            node_id = f"table:{s_name}.{t_name}"

            class_lookup[t_name.lower()] = (node_id, t_name, c_label)
            class_lookup[c_label.lower()] = (node_id, t_name, c_label)
            class_lookup[default_label.lower()] = (node_id, t_name, c_label)

        # Phase 1: Build Table & Column Nodes from Catalogs and Ontology
        for cat in metadata_catalogs:
            schema_name = cat.get("schema_name", "dbo")
            table_name = cat.get("table_name")
            if not table_name:
                continue

            default_label = "".join([part.capitalize() for part in table_name.split("_")])
            class_label = cat.get("custom_class_label") or default_label
            table_node_id = f"table:{schema_name}.{table_name}"
            p_keys = cat.get("primary_keys") or cat.get("primary_keys_json") or []
            pk_str = ", ".join(p_keys) if isinstance(p_keys, list) else str(p_keys)

            # Table Node (representing W3C OWL Class)
            G.add_node(
                table_node_id,
                label=class_label,
                type="Table",
                table_name=table_name,
                schema=schema_name,
                primary_keys=p_keys,
                primary_key=pk_str,
                domain_type=cat.get("inferred_domain_type", "Transactional"),
                subclass_of=cat.get("custom_subclass_of", "owl:Thing"),
                comment=cat.get("custom_comment", f"Class representing {class_label}")
            )

            # Column Nodes and HAS_COLUMN relationships
            columns = cat.get("columns_json", [])
            for col in columns:
                col_name = col.get("name")
                if not col_name:
                    continue
                col_node_id = f"column:{schema_name}.{table_name}.{col_name}"
                G.add_node(
                    col_node_id,
                    label=col_name,
                    type="Column",
                    data_type=col.get("type"),
                    nullable=col.get("nullable"),
                    primary_key=col.get("primary_key", False)
                )
                G.add_edge(table_node_id, col_node_id, relationship="HAS_COLUMN")

                # Infer implicit table-to-table relationships based on column naming conventions (e.g. assay_id -> assay table)
                c_lower = col_name.lower()
                for target_tname, (target_node_id, target_tname_orig, target_clabel) in class_lookup.items():
                    if target_node_id != table_node_id:
                        if c_lower in [f"{target_tname}id", f"{target_tname}_id", f"{target_tname}code", f"{target_tname}_code"]:
                            if not G.has_edge(table_node_id, target_node_id):
                                rel_name = infer_foreign_key_relationship(table_name, col_name, target_tname_orig)
                                G.add_edge(
                                    table_node_id,
                                    target_node_id,
                                    relationship=rel_name,
                                    column=col_name
                                )

            # Custom Properties defined in Ontology
            custom_props = cat.get("custom_properties_json") or []
            for p in custom_props:
                p_label = p.get("label")
                p_type = p.get("property_type", "DatatypeProperty")
                p_range = p.get("range", "xsd:string")

                if p_type == "ObjectProperty" and p_range:
                    range_clean = p_range.split("#")[-1].lower().replace("_", "").replace(" ", "").replace("-", "")
                    for key_name, (target_id, target_tname_orig, target_clabel) in class_lookup.items():
                        k_clean = key_name.lower().replace("_", "").replace(" ", "").replace("-", "")
                        if k_clean == range_clean and target_id != table_node_id:
                            if not G.has_edge(table_node_id, target_id):
                                rel_name = to_upper_snake_case(p_label) if p_label else "RELATES_TO"
                                G.add_edge(
                                    table_node_id,
                                    target_id,
                                    relationship=rel_name,
                                    property_name=p_label
                                )
                            break
                elif p_type == "DatatypeProperty" and p_label:
                    prop_node_id = f"property:{schema_name}.{table_name}.{p_label}"
                    if not G.has_node(prop_node_id):
                        G.add_node(
                            prop_node_id,
                            label=p_label,
                            type="Property",
                            range=p_range
                        )
                        G.add_edge(table_node_id, prop_node_id, relationship="HAS_PROPERTY")

            # Explicit Foreign Key relationships (REFERENCES)
            fks = cat.get("foreign_keys_json") or []
            for fk in fks:
                target_table = fk.get("foreign_table")
                if target_table:
                    target_schema = fk.get("foreign_schema", schema_name)
                    target_node_id = f"table:{target_schema}.{target_table}"
                    if not G.has_edge(table_node_id, target_node_id):
                        fk_col = fk.get("column", "")
                        rel_name = infer_foreign_key_relationship(table_name, fk_col, target_table)
                        G.add_edge(
                            table_node_id,
                            target_node_id,
                            relationship=rel_name,
                            constraint_name=fk.get("constraint_name"),
                            column=fk_col,
                            target_column=fk.get("foreign_column")
                        )

        # Format output for frontend Cytoscape.js & D3.js visualizers
        nodes = []
        for n, data in G.nodes(data=True):
            nodes.append({
                "id": n,
                "label": data.get("label", n),
                "properties": data,
                "source_table": data.get("schema", "") + "." + data.get("label", "") if data.get("type") == "Table" else None
            })

        edges = []
        edge_id_counter = 1
        for u, v, data in G.edges(data=True):
            edges.append({
                "id": f"e{edge_id_counter}",
                "source_id": u,
                "target_id": v,
                "relationship": data.get("relationship", "CONNECTED_TO"),
                "properties": data
            })
            edge_id_counter += 1

        return {
            "nodes": nodes,
            "edges": edges,
            "node_count": len(nodes),
            "relationship_count": len(edges)
        }
