from typing import List, Dict, Any
from app.utilities.logger import logger


class MetadataAnalyzer:
    """
    Analyzes discovered relational metadata catalogs to classify entities (Fact, Dimension, Lookup, Bridge, SCD)
    and automatically infers missing foreign key relationships based on naming patterns and metadata profiling.
    """
    def analyze_domain_entities(self, catalogs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        logger.info(f"Analyzing {len(catalogs)} database tables for domain classification & implicit relationships")
        analyzed_catalogs = []

        table_names = {cat.get("table_name").lower(): cat for cat in catalogs}

        for cat in catalogs:
            table_name = cat.get("table_name")
            table_name_lower = table_name.lower()
            cols = cat.get("columns_json", [])
            fks = cat.get("foreign_keys_json") or []
            pk_count = sum(1 for c in cols if c.get("primary_key"))

            # Entity Classification Logic
            domain_type = "Transactional"
            if table_name_lower.startswith("dim_") or table_name_lower.endswith("_dim") or table_name_lower.endswith("master"):
                domain_type = "Dimension"
            elif table_name_lower.startswith("fact_") or table_name_lower.endswith("_fact") or len(fks) >= 2:
                domain_type = "Fact"
            elif table_name_lower.startswith("lkp_") or table_name_lower.endswith("_lookup") or len(cols) <= 4:
                domain_type = "Lookup"
            elif pk_count >= 2 or len(fks) >= 2:
                domain_type = "Bridge"
            elif any("effective" in c.get("name").lower() or "valid_to" in c.get("name").lower() for c in cols):
                domain_type = "SlowlyChangingDimension"

            cat["inferred_domain_type"] = domain_type

            # Inferred Foreign Key Detection (e.g. customer_id matching Customer table without explicit FK constraint)
            inferred_fks = []
            for col in cols:
                col_name_lower = col.get("name").lower()
                if col_name_lower.endswith("_id") and not col.get("primary_key"):
                    entity_prefix = col_name_lower[:-3]  # e.g., 'customer' from 'customer_id'
                    # Check plural or singular match
                    matched_table = None
                    matched_schema = "dbo"
                    for t_name in table_names:
                        if t_name in (entity_prefix, entity_prefix + "s", entity_prefix + "es"):
                            matched_table = table_names[t_name].get("table_name")
                            matched_schema = table_names[t_name].get("schema_name", "dbo")
                            break


                    if matched_table and matched_table != table_name:
                        inferred_fks.append({
                            "constraint_name": f"INF_FK_{table_name}_{col.get('name')}",
                            "column": col.get("name"),
                            "foreign_schema": matched_schema,
                            "foreign_table": matched_table,
                            "foreign_column": col.get("name"),
                            "inferred": True
                        })

            existing_fks = cat.get("foreign_keys_json") or []
            existing_fk_cols = {fk.get("column") for fk in existing_fks}
            for inf_fk in inferred_fks:
                if inf_fk.get("column") not in existing_fk_cols:
                    existing_fks.append(inf_fk)

            cat["foreign_keys_json"] = existing_fks
            analyzed_catalogs.append(cat)

        return analyzed_catalogs
