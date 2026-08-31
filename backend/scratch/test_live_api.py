import requests
import json

url = "http://127.0.0.1:8000/api/v1/projects/7f4c2e32-1b24-4e02-9d3e-1226b42484c0/llm/insights"
payload = {
    "user_prompt": "Which vendors currently hold active contracts with multiple jurisdiction indicators, and do they have any outstanding invoices past their due date?",
    "model_name": "gemini-1.5-pro",
    "temperature": 0.2
}

try:
    res = requests.post(url, json=payload)
    print("Status Code:", res.status_code)
    data = res.json()
    print("Generated Cypher:")
    print(data.get("generated_cypher_query"))
except Exception as e:
    print("HTTP Request failed:", e)
