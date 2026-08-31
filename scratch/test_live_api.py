import uuid
import httpx

base_url = "http://127.0.0.1:8000"

code = f"LV_{uuid.uuid4().hex[:8]}"
res_proj = httpx.post(f"{base_url}/api/v1/projects", json={
    "name": "Live Verification Project 2",
    "code": code,
    "description": "Testing natural language prompt cypher generation"
})
project_id = res_proj.json()["id"]

prompt = (
    "Which invoices have a discount available and are approaching their due date or have significant outstanding amounts\n"
    "Invoice\n"
    "InvoiceDiscount\n"
    "discountAmount\n"
    "dueDate\n"
    "totalAmount\n"
    "AgingReportData\n"
    "invoiceDueDate\n"
    "invoiceDueAmount"
)

res_llm = httpx.post(f"{base_url}/api/v1/projects/{project_id}/llm/insights", json={
    "user_prompt": prompt,
    "model_name": "gemini-1.5-pro"
})

data = res_llm.json()
print("=== GENERATED CYPHER QUERY FROM LIVE API ===")
print(data.get("generated_cypher_query"))
