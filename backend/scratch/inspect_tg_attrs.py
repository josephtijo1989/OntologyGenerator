import sqlite3

conn = sqlite3.connect('quick_pasteur_app.db')
cursor = conn.cursor()

nodes = cursor.execute("SELECT id, project_id, node_label FROM target_graph_nodes WHERE node_label IN ('Contract', 'Vendor', 'Invoice');").fetchall()
for n in nodes:
    attrs = cursor.execute("SELECT attribute_name FROM target_graph_attributes WHERE node_id=?;", (n[0],)).fetchall()
    attr_names = [a[0] for a in attrs]
    print(f"\nNode: {n[2]} (Project: {n[1]})\n  Attributes ({len(attr_names)}): {attr_names}")
