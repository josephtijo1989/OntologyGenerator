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
                        "parent_class": attr.parent_class_name or c.class_name,
                        "target_class": attr.target_class_name,
                        "relationship_name": attr.relationship_name or attr.attribute_name,
                        "inverse_property": attr.inverse_property_name,
                        "is_inverse": attr.is_inverse,
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
            matched_attr = self.db.query(OntologyAttribute).filter(
                (func.lower(OntologyAttribute.attribute_name) == prop_schema["label"].lower()) |
                (func.lower(OntologyAttribute.relationship_name) == prop_schema["label"].lower())
            ).first()
            if matched_attr:
                prop_schema["id"] = matched_attr.id
                if matched_attr.mapped_column:
                    prop_schema["mapped_column_name"] = matched_attr.mapped_column.column_name
                if matched_attr.parent_class_name:
                    prop_schema["parent_class"] = matched_attr.parent_class_name
                if matched_attr.target_class_name:
                    prop_schema["target_class"] = matched_attr.target_class_name
                if matched_attr.relationship_name:
                    prop_schema["relationship_name"] = matched_attr.relationship_name
                if matched_attr.inverse_property_name:
                    prop_schema["inverse_property"] = matched_attr.inverse_property_name
                prop_schema["is_inverse"] = matched_attr.is_inverse
                prop_schema["is_primary_key"] = matched_attr.is_primary_key

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
                    rel_name = p.get("relationship_name") or p_name
                    parent_cls = p.get("parent_class") or matched_c.class_name
                    target_cls = p.get("target_class") or (p_range.split("#")[-1] if "#" in str(p_range) else str(p_range))
                    inv_name = p.get("inverse_property") or p.get("inverse_property_name")
                    is_inv = bool(p.get("is_inverse", False))

                    mapped_col_id = None
                    if matched_c.mapped_table:
                        raw_col_lookup = p_name.replace("has", "").lower()
                        m_col = self.db.query(MetadataColumn).filter(
                            MetadataColumn.table_id == matched_c.mapped_table.id,
                            func.lower(MetadataColumn.column_name) == raw_col_lookup
                        ).first()
                        if m_col:
                            mapped_col_id = m_col.id

                    target_class_obj = None
                    if p_type == "ObjectProperty" and target_cls:
                        target_class_obj = self.db.query(OntologyClass).filter(
                            OntologyClass.project_id == project_id,
                            func.lower(OntologyClass.class_name) == target_cls.lower()
                        ).first()

                    attr_obj = OntologyAttribute(
                        class_id=matched_c.id,
                        target_class_id=target_class_obj.id if target_class_obj else None,
                        attribute_name=p_name,
                        attribute_iri=f"{base_iri}{p_name}",
                        property_type=p_type,
                        range_datatype=p_range,
                        is_primary_key=is_pk,
                        parent_class_name=parent_cls,
                        target_class_name=target_cls,
                        relationship_name=rel_name,
                        inverse_property_name=inv_name,
                        is_inverse=is_inv,
                        mapped_column_id=mapped_col_id,
                        comment=p_comment
                    )
                    self.db.add(attr_obj)

                    # If inverse relationship is specified and target class exists, create/update inverse on target class if not already there
                    if p_type == "ObjectProperty" and target_class_obj and inv_name:
                        existing_inv = self.db.query(OntologyAttribute).filter(
                            OntologyAttribute.class_id == target_class_obj.id,
                            func.lower(OntologyAttribute.attribute_name) == inv_name.lower()
                        ).first()
                        if not existing_inv:
                            inv_attr = OntologyAttribute(
                                class_id=target_class_obj.id,
                                target_class_id=matched_c.id,
                                attribute_name=inv_name,
                                attribute_iri=f"{base_iri}{inv_name}",
                                property_type="ObjectProperty",
                                range_datatype=matched_c.class_name,
                                is_primary_key=False,
                                parent_class_name=target_class_obj.class_name,
                                target_class_name=matched_c.class_name,
                                relationship_name=inv_name,
                                inverse_property_name=rel_name,
                                is_inverse=True,
                                comment=f"Inverse relationship linking {target_class_obj.class_name} back to {matched_c.class_name}"
                            )
                            self.db.add(inv_attr)

            self.db.commit()
            self.db.refresh(matched_c)
            logger.info(f"Updated OntologyClass {class_name} and associated attributes in database.")

        return self.generate_ontology(project_id)

    def create_class(self, project_id: str, create_data: Dict[str, Any]) -> OntologyModelResponse:
        class_name = (create_data.get("class_name") or create_data.get("label") or "").strip()
        if not class_name:
            raise ValueError("Class name / label is required.")

        # Check for existing class with this name in this project
        existing = self.db.query(OntologyClass).filter(
            OntologyClass.project_id == project_id,
            func.lower(OntologyClass.class_name) == class_name.lower()
        ).first()
        if existing:
            raise ValueError(f"Ontology class with name '{class_name}' already exists in this project.")

        subclass_of = create_data.get("subclass_of", "owl:Thing")
        if isinstance(subclass_of, list):
            subclass_of = subclass_of[0] if len(subclass_of) > 0 else "owl:Thing"

        domain_type = create_data.get("domain_type", "Dimension")
        comment = create_data.get("comment") or f"Class representing {class_name}"

        onto_config = self.onto_config_repo.get_by_project(project_id)
        base_iri = onto_config.base_iri if onto_config else "http://enterprise.org/ontology#"

        new_class = OntologyClass(
            project_id=project_id,
            class_name=class_name,
            class_iri=f"{base_iri}{class_name}",
            subclass_of=str(subclass_of),
            domain_type=domain_type,
            comment=comment
        )
        self.db.add(new_class)
        self.db.flush()

        # Add initial properties if provided
        properties = create_data.get("properties") or []
        for p in properties:
            p_name = p.get("label") or p.get("name")
            if not p_name:
                continue
            p_type = p.get("property_type") or "DatatypeProperty"
            p_range = p.get("range") or "xsd:string"
            is_pk = bool(p.get("is_primary_key", False))
            p_comment = p.get("comment") or f"{p_type} for {p_name}"
            rel_name = p.get("relationship_name") or p_name
            parent_cls = p.get("parent_class") or class_name
            target_cls = p.get("target_class") or (p_range.split("#")[-1] if "#" in str(p_range) else str(p_range))
            inv_name = p.get("inverse_property") or p.get("inverse_property_name")
            is_inv = bool(p.get("is_inverse", False))

            target_class_obj = None
            if p_type == "ObjectProperty" and target_cls:
                target_class_obj = self.db.query(OntologyClass).filter(
                    OntologyClass.project_id == project_id,
                    func.lower(OntologyClass.class_name) == target_cls.lower()
                ).first()

            attr_obj = OntologyAttribute(
                class_id=new_class.id,
                target_class_id=target_class_obj.id if target_class_obj else None,
                attribute_name=p_name,
                attribute_iri=f"{base_iri}{p_name}",
                property_type=p_type,
                range_datatype=p_range,
                is_primary_key=is_pk,
                parent_class_name=parent_cls,
                target_class_name=target_cls,
                relationship_name=rel_name,
                inverse_property_name=inv_name,
                is_inverse=is_inv,
                comment=p_comment
            )
            self.db.add(attr_obj)

            if p_type == "ObjectProperty" and target_class_obj and inv_name:
                existing_inv = self.db.query(OntologyAttribute).filter(
                    OntologyAttribute.class_id == target_class_obj.id,
                    func.lower(OntologyAttribute.attribute_name) == inv_name.lower()
                ).first()
                if not existing_inv:
                    inv_attr = OntologyAttribute(
                        class_id=target_class_obj.id,
                        target_class_id=new_class.id,
                        attribute_name=inv_name,
                        attribute_iri=f"{base_iri}{inv_name}",
                        property_type="ObjectProperty",
                        range_datatype=new_class.class_name,
                        is_primary_key=False,
                        parent_class_name=target_class_obj.class_name,
                        target_class_name=new_class.class_name,
                        relationship_name=inv_name,
                        inverse_property_name=rel_name,
                        is_inverse=True,
                        comment=f"Inverse relationship linking {target_class_obj.class_name} back to {new_class.class_name}"
                    )
                    self.db.add(inv_attr)

        self.db.commit()
        self.db.refresh(new_class)
        logger.info(f"Created new OntologyClass '{class_name}' with parent '{subclass_of}' in project {project_id}.")
        return self.generate_ontology(project_id)

    def export_ontology(self, project_id: str, format_str: str) -> str:
        onto_config = self.onto_config_repo.get_by_project(project_id)
        base_iri = onto_config.base_iri if onto_config else "http://enterprise.org/ontology#"
        prefix = onto_config.prefix if onto_config else "eonto"

        classes = self.db.query(OntologyClass).filter(OntologyClass.project_id == project_id).all()
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
                        "parent_class": attr.parent_class_name or c.class_name,
                        "target_class": attr.target_class_name,
                        "relationship_name": attr.relationship_name or attr.attribute_name,
                        "inverse_property": attr.inverse_property_name,
                        "is_inverse": attr.is_inverse,
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
        return self.exporter.export(onto_result["graph"], format_str=format_str)
