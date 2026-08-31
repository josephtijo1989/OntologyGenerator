import sqlite3

conn = sqlite3.connect('quick_pasteur_app.db')
cursor = conn.cursor()
rows = cursor.execute("SELECT id, project_id, question_prompt, approved_cypher FROM approved_cypher_queries;").fetchall()
print(f"Total approved cypher query rows: {len(rows)}")
for r in rows:
    print("\n------------------------------------------------------------")
    print("ID:", r[0])
    print("Project ID:", r[1])
    print("Question:", repr(r[2]))
    print("Cypher:", repr(r[3]))
