import uuid
import httpx

BASE_URL = "http://127.0.0.1:8000"

def run_10_chatbot_tests():
    # 1. Create a test project
    code = f"CB_{uuid.uuid4().hex[:8]}"
    res_proj = httpx.post(f"{BASE_URL}/api/v1/projects", json={
        "name": "Chatbot 10-Case Verification Project",
        "code": code,
        "description": "Comprehensive verification of Chatbot LLM Cypher synthesis"
    })

    if res_proj.status_code not in [200, 201]:
        print("[FAIL] Failed to create project:", res_proj.text)
        return

    project_id = res_proj.json()["id"]
    print(f"[OK] Created verification project ID: {project_id}\n")

    # 10 Test Cases representing real-world Streamlit Chatbot prompts
    test_cases = [
        {
            "id": 1,
            "category": "Multi-Condition Filter (Discount & Due Date / Outstanding Amount)",
            "prompt": "Which invoices have a discount available and are approaching their due date or have significant outstanding amounts\nInvoice\nInvoiceDiscount\ndiscountAmount\ndueDate\ntotalAmount\nAgingReportData\ninvoiceDueDate\ninvoiceDueAmount",
            "expected_cypher_contains": ["MATCH (i:Invoice)", "WHERE", "discountAmount", "dueDate", "totalAmount"]
        },
        {
            "id": 2,
            "category": "Financial Aggregation & Ranking",
            "prompt": "Which vendors have the highest total invoice value?",
            "expected_cypher_contains": ["MATCH (v:Vendor)", "sum(", "ORDER BY", "DESC", "LIMIT 15"]
        },
        {
            "id": 3,
            "category": "Node Count Query",
            "prompt": "How many total invoices are in the database?",
            "expected_cypher_contains": ["MATCH (i:Invoice)", "count(i) AS Total_Invoices"]
        },
        {
            "id": 4,
            "category": "Single Entity Listing with Property Hints",
            "prompt": "List all vendor names with their taxId and compliance status.",
            "expected_cypher_contains": ["MATCH (v:Vendor)", "RETURN", "taxId", "compliance"]
        },
        {
            "id": 5,
            "category": "Multi-Entity Relationship Traversal",
            "prompt": "Show all contracts associated with vendor Acme Corp.",
            "expected_cypher_contains": ["(c:Contract)", "(v:Vendor)", "RETURN"]
        },
        {
            "id": 6,
            "category": "Explicit Comparison Operator Filter",
            "prompt": "Find all invoices where totalAmount >= 5000 AND status = 'Pending'",
            "expected_cypher_contains": ["MATCH (i:Invoice)", "WHERE", "totalAmount >= 5000", "status = 'Pending'"]
        },
        {
            "id": 7,
            "category": "Product & Sales Ranking",
            "prompt": "Which products have the top sales revenue?",
            "expected_cypher_contains": ["MATCH (p:Product)", "sum(", "ORDER BY", "DESC"]
        },
        {
            "id": 8,
            "category": "Direct Raw Cypher Pass-Through",
            "prompt": "MATCH (n:Customer)-[r:PURCHASED]->(p:Product) RETURN n.name, p.title LIMIT 10",
            "expected_cypher_contains": ["MATCH (n:Customer)-[r:PURCHASED]->(p:Product)", "RETURN n.name, p.title LIMIT 10"]
        },
        {
            "id": 9,
            "category": "Save Approved Few-Shot Training Example (Streamlit Thumbs Up)",
            "prompt": "List top 5 priority purchase orders.",
            "approved_cypher_save": "MATCH (p:PurchaseOrder) WHERE p.priority = 'HIGH' RETURN p.poNumber, p.amount ORDER BY p.amount DESC LIMIT 5;",
            "expected_cypher_contains": ["MATCH (p:PurchaseOrder)", "priority = 'HIGH'"]
        },
        {
            "id": 10,
            "category": "Few-Shot Similarity Retrieval Test",
            "prompt": "Show top 5 priority purchase orders",
            "expected_cypher_contains": ["Approved Few-Shot Knowledge Repository", "MATCH (p:PurchaseOrder)"]
        }
    ]

    passed_count = 0

    for tc in test_cases:
        print(f"----------------------------------------------------------------------")
        print(f"[TEST CASE #{tc['id']}] Category: {tc['category']}")
        clean_p = tc['prompt'].replace('\n', ' ')
        print(f"  Prompt: \"{clean_p[:80]}...\"" if len(clean_p) > 80 else f"  Prompt: \"{clean_p}\"")

        # Step for Test Case 9: Save Approved Cypher first
        if tc.get("approved_cypher_save"):
            save_res = httpx.post(f"{BASE_URL}/api/v1/projects/{project_id}/llm/approved-cyphers", json={
                "question_prompt": tc["prompt"],
                "approved_cypher": tc["approved_cypher_save"],
                "model_name": "llama-3.3-70b-versatile"
            })
            print(f"  Approved Cypher Saved: Status {save_res.status_code}")

        res = httpx.post(f"{BASE_URL}/api/v1/projects/{project_id}/llm/insights", json={
            "user_prompt": tc["prompt"],
            "model_name": "llama-3.3-70b-versatile"
        })

        if res.status_code in [200, 201]:
            data = res.json()
            cypher = data.get("generated_cypher_query", "")

            # Verify expected Cypher keywords
            missing = [kw for kw in tc["expected_cypher_contains"] if kw.lower() not in cypher.lower()]

            print(f"  Generated Cypher:\n  {cypher.replace('\n', '\n  ')}")

            if not missing:
                print(f"  RESULT: [PASS] PASSED SUCCESSFULLY")
                passed_count += 1
            else:
                print(f"  RESULT: [FAIL] FAILED - Missing expected keywords: {missing}")
        else:
            print(f"  RESULT: [FAIL] FAILED - API returned status code {res.status_code}: {res.text}")

    print("======================================================================")
    print(f"SUMMARY RESULT: {passed_count} / {len(test_cases)} Test Cases Passed!")
    print("======================================================================")

if __name__ == "__main__":
    run_10_chatbot_tests()
