import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.domain import Base, Project, OntologyClass, OntologyAttribute
from app.services.llm_insight_service import LLMInsightService

def test_where_generation():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Create dummy project
    proj = Project(name="Test Project", code="TEST_001", owner_id="admin")
    db.add(proj)
    db.commit()
    db.refresh(proj)

    # Add Ontology Classes & Attributes
    c_inv = OntologyClass(project_id=proj.id, class_name="Invoice")
    c_ven = OntologyClass(project_id=proj.id, class_name="Vendor")
    c_po = OntologyClass(project_id=proj.id, class_name="PurchaseOrder")
    db.add_all([c_inv, c_ven, c_po])
    db.commit()

    a1 = OntologyAttribute(class_id=c_inv.id, attribute_name="discountAmount", property_type="DatatypeProperty")
    a2 = OntologyAttribute(class_id=c_inv.id, attribute_name="dueDate", property_type="DatatypeProperty")
    a3 = OntologyAttribute(class_id=c_inv.id, attribute_name="totalAmount", property_type="DatatypeProperty")
    a4 = OntologyAttribute(class_id=c_inv.id, attribute_name="status", property_type="DatatypeProperty")
    a5 = OntologyAttribute(class_id=c_po.id, attribute_name="priority", property_type="DatatypeProperty")
    a6 = OntologyAttribute(class_id=c_po.id, attribute_name="amount", property_type="DatatypeProperty")
    db.add_all([a1, a2, a3, a4, a5, a6])
    db.commit()

    svc = LLMInsightService(db)

    test_prompts = [
        ("Which invoices have a discount available and are approaching their due date or have significant outstanding amounts", ["WHERE", "discountAmount", "dueDate", "totalAmount"]),
        ("Find all invoices where totalAmount >= 5000 AND status = 'Pending'", ["WHERE", "totalAmount >= 5000", "status = 'Pending'"]),
        ("Show top 5 priority purchase orders", ["WHERE", "priority = 'HIGH'", "amount"]),
        ("How many total invoices are in the database?", ["count(i) AS Total_Invoices"]),
    ]

    all_passed = True
    print("=== DYNAMIC CYPHER WHERE CLAUSE GENERATION VERIFICATION ===")

    for i, (prompt, expected_keywords) in enumerate(test_prompts, 1):
        cypher = svc._generate_ontology_referencing_cypher(
            prompt,
            ["Invoice", "Vendor", "PurchaseOrder"],
            {
                "Invoice": ["discountAmount", "dueDate", "totalAmount", "status"],
                "Vendor": ["taxId", "compliance"],
                "PurchaseOrder": ["priority", "amount"]
            },
            []
        )
        pruned_cypher = svc.validate_and_prune_cypher_with_target_db(proj.id, cypher)
        
        print(f"\n[Test #{i}] Prompt: \"{prompt}\"")
        print(f"Generated Cypher:\n{pruned_cypher}")

        missing = [kw for kw in expected_keywords if kw.lower() not in pruned_cypher.lower()]
        if missing:
            print(f"FAILED: Missing keywords {missing}")
            all_passed = False
        else:
            print("PASSED: All expected keywords present.")

    if all_passed:
        print("\nSUCCESS: All Cypher WHERE clause generation tests passed successfully!")
    else:
        print("\nFAILURE: Some test cases failed.")

if __name__ == "__main__":
    test_where_generation()
