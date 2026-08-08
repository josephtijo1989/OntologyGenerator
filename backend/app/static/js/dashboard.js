// Dashboard Telemetry Module
async function loadDashboard() {
  if (!currentProjectId) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/dashboard/metrics`);
    if (res.ok) {
      const data = await res.json();
      const mTables = document.getElementById('m-tables');
      const mEdges = document.getElementById('m-edges');
      const mConns = document.getElementById('m-conns');
      if (mTables) mTables.innerText = data.total_tables_discovered || 0;
      if (mEdges) mEdges.innerText = data.total_relationships_inferred || 0;
      if (mConns) mConns.innerText = data.source_connections_count || 0;
    }
  } catch (e) { console.log(e); }
}
