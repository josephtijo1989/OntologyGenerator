from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.domain import OntologyClass, OntologyAttribute, MetadataTable, MetadataColumn
from app.repositories.connection_repository import OntologyConfigRepository
from app.ontology.generator import OntologyGenerator
from app.ontology.exporter import OntologyExporter
from app.schemas.ontology import OntologyModelResponse
from app.utilities.logger import logger


class OntologyService:
    def __init__(self, db: Session):
        self.db = db
        self.onto_config_repo = OntologyConfigRepository(db)
        self.generator = OntologyGenerator()
        self.exporter = OntologyExporter()

    def generate_ontology(self, project_id: str) -> OntologyModelResponse:
        onto_config = self.onto_config_repo.get_by_project(project_id)
        base_iri = onto_config.base_iri if onto_config else "http://enterprise.org/ontology#"
        prefix = onto_config.prefix if onto_config else "eonto"
        onto_name = onto_config.ontology_name if onto_config else "EnterpriseOntology"

        classes = self.db.query(OntologyClass).filter(OntologyClass.project_id == project_id).all()
        if not classes:
            return OntologyModelResponse(
                ontology_name=onto_name,
                base_iri=base_iri,
                classes=[],
                properties=[]
            )

        # Get business rules
        from app.repositories.rule_repository import BusinessRuleRepository
        rule_repo = BusinessRuleRepository(self.db)
        rules = rule_repo.get_by_project(project_id)
        raw_rules = []
        for r in rules:
            if r.is_active:
                raw_rules.append({
                    "id": r.id,
                    "name": r.name,
                    "rule_type": r.rule_type.value if hasattr(r.rule_type, "value") else str(r.rule_type or "BUSINESS"),
                    "rule_definition": r.rule_definition or "",
                    "target_entity": r.target_entity or "",
                    "target_attribute": r.target_attribute or "",
                    "definition_json": r.definition_json
                })

        raw_catalogs = []
        for c in classes:
            mapped_tbl_name = c.mapped_table.table_name if c.mapped_table else c.class_name
            schema_name = c.mapped_table.schema_name if c.mapped_table else "dbo"

            cols = []
            pks = []
            if c.mapped_table:
                for col in c.mapped_table.columns:
                    cols.append({"name": col.column_name, "type": col.data_type, "nullable": col.is_nullable})
                    if col.is_primary_key:
                        pks.append(col.column_name)

            custom_props = []
            if c.attributes:
                for attr in c.attributes:
                    custom_props.append({
                        "name": attr.attribute_name,
                        "label": attr.attribute_name,
                        "property_type": attr.property_type,
                        "range": attr.range_datatype,
                        "is_primary_key": attr.is_primary_key,
                        "comment": attr.comment
                    })

            raw_catalogs.append({
                "schema_name": schema_name,
                "table_name": mapped_tbl_name,
                "columns_json": cols,
                "primary_keys_json": pks,
                "inferred_domain_type": c.domain_type,
                "custom_class_label": c.class_name,
                "custom_subclass_of": c.subclass_of,
                "custom_comment": c.comment,
                "custom_properties_json": custom_props if custom_props else None
            })

        onto_result = self.generator.generate_ontology(raw_catalogs, rules=raw_rules, base_iri=base_iri, prefix=prefix)

        # Add physical table & column mapping badges safely
        for cls_schema in onto_result["classes"]:
            matched_c = next((c for c in classes if c.class_name.lower() == cls_schema["label"].lower()), None)
            if matched_c:
                cls_schema["id"] = matched_c.id
                cls_schema["mapped_table_name"] = matched_c.mapped_table.table_name if matched_c.mapped_table else None

        for prop_schema in onto_result["properties"]:
            matched_attr = self.db.query(OntologyAttribute).filter(func.lower(OntologyAttribute.attribute_name) == prop_schema["label"].lower()).first()
            if matched_attr and matched_attr.mapped_column:
                prop_schema["id"] = matched_attr.id
                prop_schema["mapped_column_name"] = matched_attr.mapped_column.column_name

        return OntologyModelResponse(
            ontology_name=onto_name,
            base_iri=base_iri,
            classes=onto_result["classes"],
            properties=onto_result["properties"]
        )

    def update_class_details(self, project_id: str, class_name: str, update_data: Dict[str, Any]) -> OntologyModelResponse:
        matched_c = self.db.query(OntologyClass).join(MetadataTable, OntologyClass.mapped_table_id == MetadataTable.id, isouter=True).filter(
            OntologyClass.project_id == project_id,
            (func.lower(OntologyClass.class_name) == class_name.lower()) |
            (func.lower(MetadataTable.table_name) == class_name.lower())
        ).first()

        if matched_c:
            if "label" in update_data and update_data["label"]:
                matched_c.class_name = update_data["label"]
            if "domain_type" in update_data and update_data["domain_type"]:
                matched_c.domain_type = update_data["domain_type"]
            if "subclass_of" in update_data and update_data["subclass_of"]:
                s_val = update_data["subclass_of"]
                if isinstance(s_val, list):
                    s_val = s_val[0] if len(s_val) > 0 else "owl:Thing"
                matched_c.subclass_of = str(s_val)
            if "comment" in update_data and update_data["comment"]:
                matched_c.comment = update_data["comment"]

            # Save updated properties if provided
            if "properties" in update_data and isinstance(update_data["properties"], list):
                onto_config = self.onto_config_repo.get_by_project(project_id)
                base_iri = onto_config.base_iri if onto_config else "http://enterprise.org/ontology#"

                self.db.query(OntologyAttribute).filter(OntologyAttribute.class_id == matched_c.id).delete()
                for p in update_data["properties"]:
                    p_name = p.get("label") or p.get("name")
                    if not p_name:
                        continue
                    p_type = p.get("property_type") or "DatatypeProperty"
                    p_range = p.get("range") or "xsd:string"
                    is_pk = bool(p.get("is_primary_key", False))
                    p_comment = p.get("comment") or f"{p_type} for {p_name}"

                    mapped_col_id = None
                    if matched_c.mapped_table:
                        raw_col_lookup = p_name.replace("has", "").lower()
                        m_col = self.db.query(MetadataColumn).filter(
                            MetadataColumn.table_id == matched_c.mapped_table.id,
                            func.lower(MetadataColumn.column_name) == raw_col_lookup
                        ).first()
                        if m_col:
                            mapped_col_id = m_col.id

                    attr_obj = OntologyAttribute(
                        class_id=matched_c.id,
                        attribute_name=p_name,
                        attribute_iri=f"{base_iri}{p_name}",
                        property_type=p_type,
                        range_datatype=p_range,
                        is_primary_key=is_pk,
                        mapped_column_id=mapped_col_id,
                        comment=p_comment
                    )
                    self.db.add(attr_obj)

            self.db.commit()
            self.db.refresh(matched_c)
            logger.info(f"Updated OntologyClass {class_name} and associated attributes in database.")

        return self.generate_ontology(project_id)

    def export_ontology(self, project_id: str, format_str: str) -> str:
        res = self.generate_ontology(project_id)
        onto_config = self.onto_config_repo.get_by_project(project_id)
        base_iri = onto_config.base_iri if onto_config else "http://enterprise.org/ontology#"
        prefix = onto_config.prefix if onto_config else "eonto"

        raw_catalogs = []
        for c in res.classes:
            raw_catalogs.append({
                "schema_name": "dbo",
                "table_name": c.mapped_table_name or c.label,
                "columns_json": [],
                "inferred_domain_type": c.annotations.get("domain_type", "Transactional"),
                "custom_class_label": c.label,
                "custom_subclass_of": c.subclass_of[0] if c.subclass_of else "owl:Thing",
                "custom_comment": c.comment
            })

        onto_result = self.generator.generate_ontology(raw_catalogs, base_iri=base_iri, prefix=prefix)
        return self.exporter.export(onto_result["graph"], format_str=format_str)
