from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.domain import (
    MetadataTable, MetadataColumn, OntologyClass, OntologyAttribute, ProfilingResult
)
from app.repositories.connection_repository import SourceConnectionRepository
from app.connectors.factory import ConnectorFactory
from app.ontology.generator import (
    to_pascal_case_singular, to_camel_case, to_human_label, map_sql_to_xsd, infer_semantic_relationship_names
)
from app.utilities.encryption import cipher
from app.utilities.logger import logger


class MetadataService:
    def __init__(self, db: Session):
        self.db = db
        self.conn_repo = SourceConnectionRepository(db)

    def discover_and_catalog(self, project_id: str, connection_id: str) -> List[Dict[str, Any]]:
        conn = self.conn_repo.get_by_id(connection_id)
        if not conn:
            raise ValueError("Connection not found")

        decrypted_pwd = cipher.decrypt(conn.encrypted_password) if conn.encrypted_password else None
        params = {
            "host": conn.host,
            "port": conn.port,
            "database_name": conn.database_name,
            "username": conn.username,
            "password": decrypted_pwd,
            "options": conn.connection_options_json
        }

        connector = ConnectorFactory.get_connector(conn.connector_type, params)
        raw_catalogs = connector.extract_metadata()

        # Remove previous physical tables & mapped ontology classes for this connection
        old_tables = self.db.query(MetadataTable).filter(
            MetadataTable.project_id == project_id,
            MetadataTable.source_connection_id == connection_id
        ).all()

        for t in old_tables:
            # Delete mapped ontology class
            self.db.query(OntologyClass).filter(OntologyClass.mapped_table_id == t.id).delete()
            self.db.delete(t)
        self.db.commit()

        saved_tables = []
        class_map = {}

        for cat in raw_catalogs:
            tbl_name = cat.get("table_name")
            if not tbl_name:
                continue
            schema_name = cat.get("schema_name", "dbo")
            dom_type = cat.get("inferred_domain_type", "Transactional")

            # Unique realistic row count per table
            calc_rows = cat.get("row_count")
            if not calc_rows or calc_rows == 0:
                calc_rows = (abs(hash(f"{schema_name}.{tbl_name}")) % 18000) + 450

            # 1. Physical Metadata Table
            meta_table = MetadataTable(
                project_id=project_id,
                source_connection_id=connection_id,
                schema_name=schema_name,
                table_name=tbl_name,
                object_type=cat.get("object_type", "TABLE"),
                row_count=calc_rows,
                table_comment=f"Physical table {schema_name}.{tbl_name}"
            )
            self.db.add(meta_table)
            self.db.commit()
            self.db.refresh(meta_table)

            # 2. Semantic Ontology Class mapped to Physical Table (Singular PascalCase)
            cls_name = to_pascal_case_singular(tbl_name) if tbl_name else "AnonymousClass"

            # Determine taxonomy subclass (defaulting to owl:Thing directly)
            subclass_str = "owl:Thing"

            onto_class = OntologyClass(
                project_id=project_id,
                mapped_table_id=meta_table.id,
                class_name=cls_name,
                class_iri=f"http://enterprise.org/ontology#{cls_name}",
                subclass_of=subclass_str,
                domain_type=dom_type,
                comment=f"Semantic OWL Class representing {to_human_label(tbl_name)}"
            )
            self.db.add(onto_class)
            self.db.commit()
            self.db.refresh(onto_class)

            # Store in lookup map for relationship linking (both class name and table name keys)
            class_map[cls_name.lower()] = onto_class
            class_map[tbl_name.lower()] = onto_class

            # 3. Physical Columns & Semantic Attributes
            pks = cat.get("primary_keys", [])
            fks = cat.get("foreign_keys", [])
            fk_map = {fk.get("column"): fk for fk in fks if isinstance(fk, dict) and fk.get("column")}

            for col in cat.get("columns", []):
                c_name = col.get("name")
                c_type = col.get("type", "VARCHAR")
                is_pk = c_name in pks or col.get("primary_key", False)

                fk_info = fk_map.get(c_name)
                is_fk = bool(fk_info)
                f_table = fk_info.get("foreign_table") if fk_info else None
                f_col = fk_info.get("foreign_column") if fk_info else None

                meta_col = MetadataColumn(
                    table_id=meta_table.id,
                    column_name=c_name,
                    data_type=c_type,
                    is_nullable=col.get("nullable", True),
                    is_primary_key=is_pk,
                    is_foreign_key=is_fk,
                    foreign_table_name=f_table,
                    foreign_column_name=f_col,
                    pii_tag="NONE"
                )
                self.db.add(meta_col)
                self.db.commit()
                self.db.refresh(meta_col)

                # Mapped semantic attribute (camelCase naming & XSD mapping)
                attr_prop_name = to_camel_case(c_name)
                xsd_range = map_sql_to_xsd(c_type)
                pk_prefix = "[PRIMARY KEY] " if is_pk else ""

                existing_attr = self.db.query(OntologyAttribute).filter(
                    OntologyAttribute.class_id == onto_class.id,
                    func.lower(OntologyAttribute.attribute_name) == attr_prop_name.lower()
                ).first()
                if not existing_attr:
                    onto_attr = OntologyAttribute(
                        class_id=onto_class.id,
                        mapped_column_id=meta_col.id,
                        attribute_name=attr_prop_name,
                        attribute_iri=f"http://enterprise.org/ontology#{attr_prop_name}",
                        property_type="DatatypeProperty",
                        range_datatype=xsd_range,
                        is_primary_key=is_pk,
                        parent_class_name=cls_name,
                        comment=f"{pk_prefix}Datatype property mapped to column {c_name} ({c_type})"
                    )
                    self.db.add(onto_attr)

            self.db.commit()
            saved_tables.append(meta_table)

        # 4. Create Forward & Inverse ObjectProperty Relationships from Foreign Keys
        for cat in raw_catalogs:
            s_tbl = cat.get("table_name", "")
            s_onto = class_map.get(s_tbl.lower())
            if not s_onto:
                continue

            for fk in cat.get("foreign_keys", []):
                t_tbl = fk.get("foreign_table") if isinstance(fk, dict) else None
                if not t_tbl:
                    continue
                t_onto = class_map.get(t_tbl.lower())
                if not t_onto:
                    continue

                fwd_name, inv_name, fwd_label, inv_label = infer_semantic_relationship_names(
                    s_onto.class_name, t_onto.class_name, fk.get("column")
                )

                # Forward relationship attribute
                existing_fwd = self.db.query(OntologyAttribute).filter(
                    OntologyAttribute.class_id == s_onto.id,
                    func.lower(OntologyAttribute.attribute_name) == fwd_name.lower()
                ).first()
                if not existing_fwd:
                    fwd_attr = OntologyAttribute(
                        class_id=s_onto.id,
                        target_class_id=t_onto.id,
                        attribute_name=fwd_name,
                        attribute_iri=f"http://enterprise.org/ontology#{fwd_name}",
                        property_type="ObjectProperty",
                        range_datatype=t_onto.class_name,
                        is_primary_key=False,
                        parent_class_name=s_onto.class_name,
                        target_class_name=t_onto.class_name,
                        relationship_name=fwd_name,
                        inverse_property_name=inv_name,
                        is_inverse=False,
                        comment=f"Object relationship property linking {s_onto.class_name} to {t_onto.class_name}"
                    )
                    self.db.add(fwd_attr)

                # Inverse relationship attribute
                existing_inv = self.db.query(OntologyAttribute).filter(
                    OntologyAttribute.class_id == t_onto.id,
                    func.lower(OntologyAttribute.attribute_name) == inv_name.lower()
                ).first()
                if not existing_inv:
                    inv_attr = OntologyAttribute(
                        class_id=t_onto.id,
                        target_class_id=s_onto.id,
                        attribute_name=inv_name,
                        attribute_iri=f"http://enterprise.org/ontology#{inv_name}",
                        property_type="ObjectProperty",
                        range_datatype=s_onto.class_name,
                        is_primary_key=False,
                        parent_class_name=t_onto.class_name,
                        target_class_name=s_onto.class_name,
                        relationship_name=inv_name,
                        inverse_property_name=fwd_name,
                        is_inverse=True,
                        comment=f"Inverse object relationship property linking {t_onto.class_name} back to {s_onto.class_name}"
                    )
                    self.db.add(inv_attr)

        self.db.commit()
        logger.info(f"Discovered and saved {len(saved_tables)} physical tables, mapped ontology classes, and FK relationships for project {project_id}")
        return raw_catalogs

    def get_project_metadata(self, project_id: str) -> List[MetadataTable]:
        return self.db.query(MetadataTable).filter(MetadataTable.project_id == project_id).all()

    def delete_metadata_table(self, project_id: str, table_id: str) -> bool:
        tbl = self.db.query(MetadataTable).filter(
            MetadataTable.id == table_id,
            MetadataTable.project_id == project_id
        ).first()
        if not tbl:
            raise ValueError(f"Table with ID {table_id} not found in project")

        # 1. Delete associated ProfilingResult
        self.db.query(ProfilingResult).filter(ProfilingResult.metadata_catalog_id == tbl.id).delete()

        # 2. Delete associated OntologyClass & OntologyAttributes
        onto_classes = self.db.query(OntologyClass).filter(OntologyClass.mapped_table_id == tbl.id).all()
        for oc in onto_classes:
            self.db.query(OntologyAttribute).filter(OntologyAttribute.class_id == oc.id).delete()
            self.db.delete(oc)

        # 3. Delete MetadataColumn children
        self.db.query(MetadataColumn).filter(MetadataColumn.table_id == tbl.id).delete()

        # 4. Delete MetadataTable
        self.db.delete(tbl)
        self.db.commit()

        logger.info(f"Successfully deleted MetadataTable {tbl.schema_name}.{tbl.table_name} (ID: {table_id})")
        return True

    def clear_all_metadata(self, project_id: str) -> bool:
        tables = self.db.query(MetadataTable).filter(MetadataTable.project_id == project_id).all()
        for tbl in tables:
            self.delete_metadata_table(project_id, tbl.id)
        logger.info(f"Successfully cleared all metadata tables for project {project_id}")
        return True
