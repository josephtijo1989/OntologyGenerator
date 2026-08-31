import io
import re
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from sqlalchemy.orm import Session
from app.models.domain import (
    Project, OntologyClass, OntologyAttribute,
    TargetGraphNode, TargetGraphAttribute, TargetGraphRelationship
)
from app.graph.converter import to_upper_snake_case
from app.utilities.logger import logger


class ExcelImportService:
    def __init__(self, db: Session):
        self.db = db

    def parse_excel_workbook(self, file_bytes: bytes) -> Dict[str, Any]:
        """
        Parses an Excel file (.xlsx, .xls) containing Classes, Attributes, and Relationships.
        Supports multi-sheet format (sheets: Classes, Attributes, Relationships)
        and fallback single flat sheet format.
        """
        excel_io = io.BytesIO(file_bytes)
        xls = pd.ExcelFile(excel_io)
        sheet_names = [s.strip().lower() for s in xls.sheet_names]
        
        parsed_classes: List[Dict[str, Any]] = []
        parsed_attributes: List[Dict[str, Any]] = []
        parsed_relationships: List[Dict[str, Any]] = []

        class_sheet = next((s for s in xls.sheet_names if s.strip().lower() in ["classes", "nodes", "concepts", "class"]), None)
        attr_sheet = next((s for s in xls.sheet_names if s.strip().lower() in ["attributes", "properties", "fields", "props", "attribute"]), None)
        rel_sheet = next((s for s in xls.sheet_names if s.strip().lower() in ["relationships", "edges", "links", "relations", "relationship"]), None)

        if class_sheet or attr_sheet or rel_sheet:
            # Multi-sheet parsing
            if class_sheet:
                df_cls = pd.read_excel(xls, sheet_name=class_sheet).dropna(how='all')
                parsed_classes = self._parse_classes_df(df_cls)

            if attr_sheet:
                df_attr = pd.read_excel(xls, sheet_name=attr_sheet).dropna(how='all')
                parsed_attributes = self._parse_attributes_df(df_attr)

            if rel_sheet:
                df_rel = pd.read_excel(xls, sheet_name=rel_sheet).dropna(how='all')
                parsed_relationships = self._parse_relationships_df(df_rel)
        else:
            # Single sheet fallback parsing
            df_single = pd.read_excel(xls, sheet_name=xls.sheet_names[0]).dropna(how='all')
            parsed_classes, parsed_attributes, parsed_relationships = self._parse_single_flat_df(df_single)

        # Infer missing classes from attributes and relationships
        explicit_class_names = {c["class_name"] for c in parsed_classes}
        for a in parsed_attributes:
            c_name = a.get("class_name")
            if c_name and c_name not in explicit_class_names:
                parsed_classes.append({
                    "class_name": c_name,
                    "subclass_of": "owl:Thing",
                    "domain_type": "Transactional",
                    "comment": "Inferred from uploaded attributes"
                })
                explicit_class_names.add(c_name)

        for r in parsed_relationships:
            src = r.get("source_class")
            tgt = r.get("target_class")
            if src and src not in explicit_class_names:
                parsed_classes.append({
                    "class_name": src,
                    "subclass_of": "owl:Thing",
                    "domain_type": "Transactional",
                    "comment": "Inferred from relationship source"
                })
                explicit_class_names.add(src)
            if tgt and tgt not in explicit_class_names:
                parsed_classes.append({
                    "class_name": tgt,
                    "subclass_of": "owl:Thing",
                    "domain_type": "Transactional",
                    "comment": "Inferred from relationship target"
                })
                explicit_class_names.add(tgt)

        return {
            "classes": parsed_classes,
            "attributes": parsed_attributes,
            "relationships": parsed_relationships,
            "summary": {
                "total_classes": len(parsed_classes),
                "total_attributes": len(parsed_attributes),
                "total_relationships": len(parsed_relationships)
            }
        }

    def _parse_classes_df(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        classes = []
        col_map = {str(c).strip().lower(): c for c in df.columns}
        c_col = next((col_map[k] for k in ["class_name", "classname", "class", "concept", "node_label", "label"] if k in col_map), None)
        sub_col = next((col_map[k] for k in ["subclass_of", "subclassof", "superclass", "parent_class", "parent"] if k in col_map), None)
        dom_col = next((col_map[k] for k in ["domain_type", "domaintype", "domain", "type"] if k in col_map), None)
        rem_col = next((col_map[k] for k in ["comment", "description", "remarks", "notes"] if k in col_map), None)

        if not c_col:
            return classes

        for _, row in df.iterrows():
            raw_name = str(row.get(c_col, '')).strip()
            if not raw_name or raw_name.lower() == 'nan':
                continue
            
            clean_name = self._clean_identifier(raw_name)
            subclass = str(row.get(sub_col, 'owl:Thing')).strip() if sub_col and pd.notna(row.get(sub_col)) else "owl:Thing"
            domain = str(row.get(dom_col, 'Transactional')).strip() if dom_col and pd.notna(row.get(dom_col)) else "Transactional"
            comment = str(row.get(rem_col, '')).strip() if rem_col and pd.notna(row.get(rem_col)) else f"Ontology concept class {clean_name}"

            if not subclass or subclass.lower() in ['nan', 'none']:
                subclass = "owl:Thing"

            classes.append({
                "class_name": clean_name,
                "subclass_of": subclass,
                "domain_type": domain.capitalize() if domain else "Transactional",
                "comment": comment
            })

        return classes

    def _parse_attributes_df(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        attrs = []
        col_map = {str(c).strip().lower(): c for c in df.columns}
        c_col = next((col_map[k] for k in ["class_name", "classname", "class", "concept", "entity"] if k in col_map), None)
        a_col = next((col_map[k] for k in ["attribute_name", "attributename", "attribute", "property", "field", "prop"] if k in col_map), None)
        t_col = next((col_map[k] for k in ["data_type", "datatype", "type", "range", "range_datatype"] if k in col_map), None)
        pk_col = next((col_map[k] for k in ["is_primary_key", "isprimarykey", "is_pk", "primary_key", "pk"] if k in col_map), None)
        rem_col = next((col_map[k] for k in ["comment", "description", "remarks", "notes"] if k in col_map), None)

        if not a_col:
            return attrs

        for _, row in df.iterrows():
            raw_attr = str(row.get(a_col, '')).strip()
            if not raw_attr or raw_attr.lower() == 'nan':
                continue

            clean_attr = self._clean_identifier(raw_attr, is_attribute=True)
            raw_class = str(row.get(c_col, '')).strip() if c_col and pd.notna(row.get(c_col)) else "Entity"
            clean_class = self._clean_identifier(raw_class) if raw_class and raw_class.lower() != 'nan' else "Entity"

            dtype = str(row.get(t_col, 'xsd:string')).strip() if t_col and pd.notna(row.get(t_col)) else "xsd:string"
            if not dtype or dtype.lower() in ['nan', 'none']:
                dtype = "xsd:string"

            is_pk = False
            if pk_col and pd.notna(row.get(pk_col)):
                val = str(row.get(pk_col)).strip().lower()
                is_pk = val in ['true', '1', 'yes', 'y', 'pk']

            comment = str(row.get(rem_col, '')).strip() if rem_col and pd.notna(row.get(rem_col)) else f"Attribute {clean_attr} for {clean_class}"

            attrs.append({
                "class_name": clean_class,
                "attribute_name": clean_attr,
                "data_type": dtype,
                "is_primary_key": is_pk,
                "comment": comment
            })

        return attrs

    def _parse_relationships_df(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        rels = []
        col_map = {str(c).strip().lower(): c for c in df.columns}
        s_col = next((col_map[k] for k in ["source_class", "sourceclass", "source", "from_class", "from", "domain"] if k in col_map), None)
        r_col = next((col_map[k] for k in ["relationship_name", "relationshipname", "relationship", "relation", "edge", "type"] if k in col_map), None)
        t_col = next((col_map[k] for k in ["target_class", "targetclass", "target", "to_class", "to", "range"] if k in col_map), None)
        rem_col = next((col_map[k] for k in ["comment", "description", "remarks", "notes"] if k in col_map), None)

        if not (s_col and r_col and t_col):
            return rels

        for _, row in df.iterrows():
            raw_s = str(row.get(s_col, '')).strip()
            raw_r = str(row.get(r_col, '')).strip()
            raw_t = str(row.get(t_col, '')).strip()

            if not raw_s or not raw_r or not raw_t or any(v.lower() == 'nan' for v in [raw_s, raw_r, raw_t]):
                continue

            clean_s = self._clean_identifier(raw_s)
            clean_r = to_upper_snake_case(raw_r)
            clean_t = self._clean_identifier(raw_t)
            comment = str(row.get(rem_col, '')).strip() if rem_col and pd.notna(row.get(rem_col)) else f"Relationship {clean_s} -[{clean_r}]-> {clean_t}"

            rels.append({
                "source_class": clean_s,
                "relationship_name": clean_r,
                "target_class": clean_t,
                "comment": comment
            })

        return rels

    def _parse_single_flat_df(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        classes = []
        attrs = []
        rels = []

        col_map = {str(c).strip().lower(): c for c in df.columns}

        c_col = next((col_map[k] for k in ["class_name", "classname", "class", "concept", "entity"] if k in col_map), None)
        a_col = next((col_map[k] for k in ["attribute_name", "attributename", "attribute", "property", "field"] if k in col_map), None)
        t_col = next((col_map[k] for k in ["data_type", "datatype", "type", "range"] if k in col_map), None)
        pk_col = next((col_map[k] for k in ["is_primary_key", "isprimarykey", "is_pk", "pk"] if k in col_map), None)
        r_col = next((col_map[k] for k in ["relationship_name", "relationshipname", "relationship", "relation", "edge"] if k in col_map), None)
        tgt_col = next((col_map[k] for k in ["target_class", "targetclass", "target", "to_class"] if k in col_map), None)
        rem_col = next((col_map[k] for k in ["comment", "description", "remarks", "notes"] if k in col_map), None)

        seen_classes = set()

        for _, row in df.iterrows():
            c_val = str(row.get(c_col, '')).strip() if c_col and pd.notna(row.get(c_col)) else ""
            a_val = str(row.get(a_col, '')).strip() if a_col and pd.notna(row.get(a_col)) else ""
            r_val = str(row.get(r_col, '')).strip() if r_col and pd.notna(row.get(r_col)) else ""
            tgt_val = str(row.get(tgt_col, '')).strip() if tgt_col and pd.notna(row.get(tgt_col)) else ""
            rem_val = str(row.get(rem_col, '')).strip() if rem_col and pd.notna(row.get(rem_col)) else ""

            if c_val and c_val.lower() != 'nan':
                clean_c = self._clean_identifier(c_val)
                if clean_c not in seen_classes:
                    seen_classes.add(clean_c)
                    classes.append({
                        "class_name": clean_c,
                        "subclass_of": "owl:Thing",
                        "domain_type": "Transactional",
                        "comment": rem_val or f"Ontology class {clean_c}"
                    })

                if a_val and a_val.lower() != 'nan':
                    clean_a = self._clean_identifier(a_val, is_attribute=True)
                    dtype = str(row.get(t_col, 'xsd:string')).strip() if t_col and pd.notna(row.get(t_col)) else "xsd:string"
                    is_pk = False
                    if pk_col and pd.notna(row.get(pk_col)):
                        is_pk = str(row.get(pk_col)).strip().lower() in ['true', '1', 'yes', 'y', 'pk']
                    attrs.append({
                        "class_name": clean_c,
                        "attribute_name": clean_a,
                        "data_type": dtype if dtype.lower() != 'nan' else "xsd:string",
                        "is_primary_key": is_pk,
                        "comment": rem_val or f"Attribute {clean_a} for {clean_c}"
                    })

                if r_val and tgt_val and r_val.lower() != 'nan' and tgt_val.lower() != 'nan':
                    clean_r = to_upper_snake_case(r_val)
                    clean_tgt = self._clean_identifier(tgt_val)
                    rels.append({
                        "source_class": clean_c,
                        "relationship_name": clean_r,
                        "target_class": clean_tgt,
                        "comment": rem_val or f"Relationship {clean_c} -[{clean_r}]-> {clean_tgt}"
                    })

        return classes, attrs, rels

    def import_excel_to_project(self, project_id: str, file_bytes: bytes, mode: str = "merge") -> Dict[str, Any]:
        """
        Imports parsed Excel concepts into SQLite local application DB for the specified project.
        Populates both Semantic Ontology Layer (OntologyClass, OntologyAttribute)
        and Target Graph DB Layer (TargetGraphNode, TargetGraphAttribute, TargetGraphRelationship).
        """
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with ID '{project_id}' not found.")

        parsed = self.parse_excel_workbook(file_bytes)
        parsed_classes = parsed["classes"]
        parsed_attributes = parsed["attributes"]
        parsed_relationships = parsed["relationships"]

        if not parsed_classes and not parsed_attributes and not parsed_relationships:
            raise ValueError("No valid classes, attributes, or relationships found in the uploaded Excel file.")

        if mode == "overwrite":
            # Clear existing ontology and target graph records for this project
            self.db.query(OntologyAttribute).filter(
                OntologyAttribute.class_id.in_(
                    self.db.query(OntologyClass.id).filter(OntologyClass.project_id == project_id)
                )
            ).delete(synchronize_session=False)
            self.db.query(OntologyClass).filter(OntologyClass.project_id == project_id).delete(synchronize_session=False)
            
            tg_node_ids = [n.id for n in self.db.query(TargetGraphNode).filter(TargetGraphNode.project_id == project_id).all()]
            if tg_node_ids:
                self.db.query(TargetGraphAttribute).filter(TargetGraphAttribute.node_id.in_(tg_node_ids)).delete(synchronize_session=False)
            self.db.query(TargetGraphNode).filter(TargetGraphNode.project_id == project_id).delete(synchronize_session=False)
            self.db.query(TargetGraphRelationship).filter(TargetGraphRelationship.project_id == project_id).delete(synchronize_session=False)
            self.db.commit()

        # 1. Process OntologyClasses & TargetGraphNodes
        class_map: Dict[str, OntologyClass] = {}
        tg_node_map: Dict[str, TargetGraphNode] = {}

        existing_classes = self.db.query(OntologyClass).filter(OntologyClass.project_id == project_id).all()
        for ec in existing_classes:
            class_map[ec.class_name.lower()] = ec

        existing_tg_nodes = self.db.query(TargetGraphNode).filter(TargetGraphNode.project_id == project_id).all()
        for tn in existing_tg_nodes:
            tg_node_map[tn.node_label.lower()] = tn

        classes_created = 0
        classes_updated = 0

        for c in parsed_classes:
            c_name = c["class_name"]
            c_key = c_name.lower()
            
            if c_key in class_map:
                o_cls = class_map[c_key]
                o_cls.subclass_of = c.get("subclass_of") or o_cls.subclass_of
                o_cls.domain_type = c.get("domain_type") or o_cls.domain_type
                if c.get("comment"):
                    o_cls.comment = c["comment"]
                classes_updated += 1
            else:
                o_cls = OntologyClass(
                    project_id=project_id,
                    class_name=c_name,
                    class_iri=f"http://enterprise.org/ontology#{c_name}",
                    subclass_of=c.get("subclass_of", "owl:Thing"),
                    domain_type=c.get("domain_type", "Transactional"),
                    comment=c.get("comment", f"Ontology concept class {c_name}")
                )
                self.db.add(o_cls)
                self.db.flush()
                class_map[c_key] = o_cls
                classes_created += 1

            if c_key in tg_node_map:
                tg_node = tg_node_map[c_key]
                tg_node.ontology_class_id = o_cls.id
            else:
                tg_node = TargetGraphNode(
                    project_id=project_id,
                    node_label=c_name,
                    node_count=0,
                    ontology_class_id=o_cls.id
                )
                self.db.add(tg_node)
                self.db.flush()
                tg_node_map[c_key] = tg_node

        # 2. Process Datatype Attributes
        attributes_created = 0
        for a in parsed_attributes:
            c_name = a["class_name"]
            attr_name = a["attribute_name"]
            o_cls = class_map.get(c_name.lower())
            if not o_cls:
                continue

            existing_attr = self.db.query(OntologyAttribute).filter(
                OntologyAttribute.class_id == o_cls.id,
                OntologyAttribute.attribute_name == attr_name,
                OntologyAttribute.property_type == "DatatypeProperty"
            ).first()

            if not existing_attr:
                new_attr = OntologyAttribute(
                    class_id=o_cls.id,
                    attribute_name=attr_name,
                    attribute_iri=f"http://enterprise.org/ontology#{attr_name}",
                    property_type="DatatypeProperty",
                    range_datatype=a.get("data_type", "xsd:string"),
                    is_primary_key=a.get("is_primary_key", False),
                    comment=a.get("comment", f"Attribute {attr_name}")
                )
                self.db.add(new_attr)
                self.db.flush()
                attributes_created += 1
                o_attr_id = new_attr.id
            else:
                o_attr_id = existing_attr.id

            # Sync to TargetGraphAttribute
            tg_node = tg_node_map.get(c_name.lower())
            if tg_node:
                existing_tg_attr = self.db.query(TargetGraphAttribute).filter(
                    TargetGraphAttribute.node_id == tg_node.id,
                    TargetGraphAttribute.attribute_name == attr_name
                ).first()

                if not existing_tg_attr:
                    new_tg_attr = TargetGraphAttribute(
                        node_id=tg_node.id,
                        attribute_name=attr_name,
                        data_type=a.get("data_type", "xsd:string"),
                        is_primary_key=a.get("is_primary_key", False),
                        ontology_attribute_id=o_attr_id
                    )
                    self.db.add(new_tg_attr)

        # 3. Process Object Properties / Relationships
        relationships_created = 0
        for r in parsed_relationships:
            s_name = r["source_class"]
            rel_name = r["relationship_name"]
            t_name = r["target_class"]

            s_cls = class_map.get(s_name.lower())
            t_cls = class_map.get(t_name.lower())
            if not s_cls or not t_cls:
                continue

            existing_rel_attr = self.db.query(OntologyAttribute).filter(
                OntologyAttribute.class_id == s_cls.id,
                OntologyAttribute.relationship_name == rel_name,
                OntologyAttribute.target_class_id == t_cls.id,
                OntologyAttribute.property_type == "ObjectProperty"
            ).first()

            if not existing_rel_attr:
                new_rel_attr = OntologyAttribute(
                    class_id=s_cls.id,
                    attribute_name=rel_name.lower(),
                    attribute_iri=f"http://enterprise.org/ontology#{rel_name}",
                    property_type="ObjectProperty",
                    range_datatype=f"eonto:{t_name}",
                    parent_class_name=s_name,
                    target_class_id=t_cls.id,
                    target_class_name=t_name,
                    relationship_name=rel_name,
                    comment=r.get("comment", f"Relationship {s_name} -[{rel_name}]-> {t_name}")
                )
                self.db.add(new_rel_attr)
                self.db.flush()
                relationships_created += 1
                o_rel_id = new_rel_attr.id
            else:
                o_rel_id = existing_rel_attr.id

            # Sync to TargetGraphRelationship
            s_tg = tg_node_map.get(s_name.lower())
            t_tg = tg_node_map.get(t_name.lower())

            existing_tg_rel = self.db.query(TargetGraphRelationship).filter(
                TargetGraphRelationship.project_id == project_id,
                TargetGraphRelationship.source_label == s_name,
                TargetGraphRelationship.relationship_type == rel_name,
                TargetGraphRelationship.target_label == t_name
            ).first()

            if not existing_tg_rel:
                new_tg_rel = TargetGraphRelationship(
                    project_id=project_id,
                    source_node_id=s_tg.id if s_tg else None,
                    source_label=s_name,
                    relationship_type=rel_name,
                    target_node_id=t_tg.id if t_tg else None,
                    target_label=t_name,
                    edge_count=0,
                    ontology_attribute_id=o_rel_id
                )
                self.db.add(new_tg_rel)

        self.db.commit()
        logger.info(f"Excel Model Import successful for project {project_id}: {classes_created} classes created, {attributes_created} attributes, {relationships_created} relationships.")

        return {
            "success": True,
            "project_id": project_id,
            "mode": mode,
            "classes_created": classes_created,
            "classes_updated": classes_updated,
            "attributes_created": attributes_created,
            "relationships_created": relationships_created,
            "total_classes_in_project": len(class_map),
            "summary_message": f"Successfully imported {classes_created} new classes, {attributes_created} attributes, and {relationships_created} relationships into Project DB."
        }

    def generate_sample_template(self) -> io.BytesIO:
        """
        Generates a standard sample Excel template workbook with pre-populated sheets:
        Classes, Attributes, and Relationships.
        """
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Classes Sheet
            df_classes = pd.DataFrame([
                {"ClassName": "Vendor", "SubclassOf": "owl:Thing", "DomainType": "Dimension", "Comment": "Legal business vendor entity"},
                {"ClassName": "Contract", "SubclassOf": "owl:Thing", "DomainType": "Transactional", "Comment": "Legal binding agreement document"},
                {"ClassName": "Invoice", "SubclassOf": "owl:Thing", "DomainType": "Transactional", "Comment": "Invoice billing and payment document"},
                {"ClassName": "User", "SubclassOf": "owl:Thing", "DomainType": "Dimension", "Comment": "Enterprise user and approval actor"},
                {"ClassName": "PurchaseOrder", "SubclassOf": "owl:Thing", "DomainType": "Transactional", "Comment": "Approved purchase order requisition"}
            ])
            df_classes.to_excel(writer, sheet_name="Classes", index=False)

            # Attributes Sheet
            df_attrs = pd.DataFrame([
                {"ClassName": "Vendor", "AttributeName": "vendorId", "DataType": "xsd:string", "IsPrimaryKey": True, "Comment": "Unique vendor identifier"},
                {"ClassName": "Vendor", "AttributeName": "vendorName", "DataType": "xsd:string", "IsPrimaryKey": False, "Comment": "Legal vendor business name"},
                {"ClassName": "Vendor", "AttributeName": "taxId", "DataType": "xsd:string", "IsPrimaryKey": False, "Comment": "Tax identification number"},
                {"ClassName": "Contract", "AttributeName": "contractId", "DataType": "xsd:string", "IsPrimaryKey": True, "Comment": "Contract reference number"},
                {"ClassName": "Contract", "AttributeName": "totalValue", "DataType": "xsd:decimal", "IsPrimaryKey": False, "Comment": "Total monetary contract value"},
                {"ClassName": "Contract", "AttributeName": "effectiveDate", "DataType": "xsd:date", "IsPrimaryKey": False, "Comment": "Contract start effective date"},
                {"ClassName": "Invoice", "AttributeName": "invoiceId", "DataType": "xsd:string", "IsPrimaryKey": True, "Comment": "Invoice number"},
                {"ClassName": "Invoice", "AttributeName": "totalAmount", "DataType": "xsd:decimal", "IsPrimaryKey": False, "Comment": "Gross total invoice amount"},
                {"ClassName": "Invoice", "AttributeName": "dueDate", "DataType": "xsd:date", "IsPrimaryKey": False, "Comment": "Payment due date"},
                {"ClassName": "Invoice", "AttributeName": "status", "DataType": "xsd:string", "IsPrimaryKey": False, "Comment": "Invoice processing status"},
                {"ClassName": "User", "AttributeName": "userId", "DataType": "xsd:string", "IsPrimaryKey": True, "Comment": "User account ID"},
                {"ClassName": "User", "AttributeName": "userName", "DataType": "xsd:string", "IsPrimaryKey": False, "Comment": "Full user display name"},
                {"ClassName": "User", "AttributeName": "email", "DataType": "xsd:string", "IsPrimaryKey": False, "Comment": "Corporate email address"}
            ])
            df_attrs.to_excel(writer, sheet_name="Attributes", index=False)

            # Relationships Sheet
            df_rels = pd.DataFrame([
                {"SourceClass": "Contract", "RelationshipName": "HAS_VENDOR", "TargetClass": "Vendor", "Comment": "Contract bound to vendor"},
                {"SourceClass": "Invoice", "RelationshipName": "BILL_TO_VENDOR", "TargetClass": "Vendor", "Comment": "Invoice billed to vendor"},
                {"SourceClass": "Invoice", "RelationshipName": "APPROVED_BY", "TargetClass": "User", "Comment": "Invoice approved by enterprise user"},
                {"SourceClass": "PurchaseOrder", "RelationshipName": "ISSUED_TO_VENDOR", "TargetClass": "Vendor", "Comment": "Purchase order issued to vendor"},
                {"SourceClass": "Invoice", "RelationshipName": "ASSOCIATED_WITH_PO", "TargetClass": "PurchaseOrder", "Comment": "Invoice against purchase order"}
            ])
            df_rels.to_excel(writer, sheet_name="Relationships", index=False)

        output.seek(0)
        return output

    @staticmethod
    def _clean_identifier(val: str, is_attribute: bool = False) -> str:
        s = re.sub(r'[^a-zA-Z0-9_]', '', str(val).strip())
        if not s:
            return "Item"
        if is_attribute:
            # camelCase for attribute names
            words = re.findall(r'[a-zA-Z0-9]+', s)
            if not words:
                return "attr"
            return words[0].lower() + "".join(w.capitalize() for w in words[1:])
        else:
            # PascalCase for Class names
            words = re.findall(r'[a-zA-Z0-9]+', s)
            if not words:
                return "Concept"
            return "".join(w.capitalize() for w in words)
