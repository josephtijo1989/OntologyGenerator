/**
 * Target Graph Schema Profiler & Topology Repository Module
 */

async function runTargetGraphProfiler() {
  if (!currentProjectId) {
    if (typeof showToast === 'function') showToast('Select or create a project first', 'warning');
    else alert('Select or create a project first');
    return;
  }

  const spinner = document.getElementById('profiler-loading-spinner');
  const resultsContainer = document.getElementById('profiler-results-container');
  const btn = document.getElementById('btn-run-graph-profiler');

  if (spinner) spinner.style.display = 'block';
  if (resultsContainer) resultsContainer.style.display = 'none';
  if (btn) btn.disabled = true;

  if (typeof showToast === 'function') showToast('🔍 Profiling connected target graph database topology...', 'info');

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/graph/profile-target-schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to profile target graph schema');
    }

    const data = await res.json();
    renderGraphSchemaProfile(data);

    if (typeof showToast === 'function') showToast('✅ Graph database topology profiled & saved to Application DB!', 'success');
  } catch (e) {
    console.error('Graph Profiler Error:', e);
    renderGraphSchemaProfileError(e.message);
    if (typeof showToast === 'function') showToast(`Graph Profiler Connection Error: ${e.message}`, 'error');
  } finally {
    if (spinner) spinner.style.display = 'none';
    if (btn) btn.disabled = false;
  }
}

function renderGraphSchemaProfileError(errorMsg) {
  const container = document.getElementById('profiler-results-container');
  if (!container) return;

  container.style.display = 'flex';
  container.innerHTML = `
    <div class="glass-card" style="padding: 24px; border-left: 4px solid var(--accent-rose); background: rgba(244, 63, 94, 0.06);">
      <div style="display: flex; align-items: flex-start; gap: 16px;">
        <div style="font-size: 32px;">⚠️</div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 6px 0; color: var(--accent-rose); font-size: 16px; font-weight: 700;">
            Target Graph Database Connection Error
          </h3>
          <p style="margin: 0 0 14px 0; color: var(--text-primary); font-size: 13px; font-family: var(--font-mono); background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; word-break: break-word;">
            ${escapeHtml(errorMsg)}
          </p>
          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-secondary);">
            <strong style="color: var(--text-primary);">💡 How to Resolve:</strong>
            <span>1. Navigate to <strong>🔌 Database Connectors</strong> tab ➔ <strong>Target Graph Database Config</strong>.</span>
            <span>2. Ensure your local or cloud Neo4j / Memgraph server is running on <strong>host & port</strong> (default: <code>127.0.0.1:7687</code>).</span>
            <span>3. Verify your <strong>Username</strong> (default: <code>neo4j</code>) and <strong>Password</strong> in Database Connectors and click <em>Save Configuration</em>.</span>
          </div>
        </div>
      </div>
    </div>
  `;
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderGraphSchemaProfile(data) {
  const container = document.getElementById('profiler-results-container');
  if (!container) return;

  container.style.display = 'flex';

  // 1. App DB Sync Summary Banner
  const syncBanner = document.getElementById('profiler-sync-banner');
  if (syncBanner) {
    syncBanner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px;">✅</div>
          <div>
            <h4 style="margin: 0; color: var(--accent-emerald); font-size: 15px; font-weight: 700;">
              Profiled & Synchronized to Application DB
            </h4>
            <p style="margin: 3px 0 0 0; color: var(--text-secondary); font-size: 13px;">
              ${escapeHtml(data.message || '')}
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); font-size: 12px; font-weight: 700;">
            📦 ${data.profiled_node_labels ? data.profiled_node_labels.length : 0} Node Labels (${data.total_nodes || 0} Nodes)
          </span>
          <span class="badge" style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); font-size: 12px; font-weight: 700;">
            🏷️ ${data.persisted_attributes_count || 0} Attributes Saved
          </span>
          <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: var(--accent-violet); font-size: 12px; font-weight: 700;">
            🔗 ${data.profiled_relationships ? data.profiled_relationships.length : 0} Relationships (${data.total_relationships || 0} Edges)
          </span>
        </div>
      </div>
    `;
  }

  // 2. Node Labels Grid
  const nodesGrid = document.getElementById('profiler-nodes-grid');
  const nodeBadge = document.getElementById('profiler-node-count-badge');
  const nodes = data.profiled_node_labels || [];

  if (nodeBadge) nodeBadge.innerText = `${nodes.length} Label${nodes.length !== 1 ? 's' : ''} (${data.total_nodes || 0} Nodes)`;

  if (nodesGrid) {
    if (nodes.length === 0) {
      nodesGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 20px; color: var(--text-secondary); text-align: center;">No node labels found in target graph database.</div>`;
    } else {
      let gridHtml = '';
      nodes.forEach(n => {
        const props = n.properties || [];
        let propsListHtml = props.map(p => `<span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-primary); font-family: var(--font-mono); font-size: 11px; padding: 3px 8px; margin: 2px;">:${escapeHtml(p)}</span>`).join('');
        if (!propsListHtml) propsListHtml = '<span style="color: var(--text-secondary); font-size: 12px; font-style: italic;">No properties</span>';

        gridHtml += `
          <div class="glass-card" style="padding: 16px; border-left: 3px solid var(--accent-cyan); display: flex; flex-direction: column; gap: 10px; background: rgba(255, 255, 255, 0.02);">
            <div class="flex-between" style="align-items: center;">
              <span style="font-size: 14px; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-mono);">:${escapeHtml(n.label)}</span>
              <span class="badge" style="background: rgba(6, 182, 212, 0.12); color: var(--accent-cyan); font-weight: 700; font-size: 11px;">${n.node_count || 0} nodes</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${propsListHtml}
            </div>
          </div>
        `;
      });
      nodesGrid.innerHTML = gridHtml;
    }
  }

  // 3. Relationships Container
  const relsContainer = document.getElementById('profiler-rels-container');
  const relBadge = document.getElementById('profiler-rel-count-badge');
  const rels = data.profiled_relationships || [];

  if (relBadge) relBadge.innerText = `${rels.length} Type${rels.length !== 1 ? 's' : ''} (${data.total_relationships || 0} Edges)`;

  if (relsContainer) {
    if (rels.length === 0) {
      relsContainer.innerHTML = `<div style="padding: 20px; color: var(--text-secondary); text-align: center;">No relationship types found in target graph database.</div>`;
    } else {
      let relsHtml = '';
      rels.forEach(r => {
        relsHtml += `
          <div class="glass-card" style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-left: 3px solid var(--accent-violet); background: rgba(255, 255, 255, 0.02);">
            <div style="display: flex; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: 13px;">
              <span style="color: var(--accent-cyan); font-weight: 700;">(:${escapeHtml(r.source)})</span>
              <span style="color: var(--accent-violet); font-weight: 700;">-[:${escapeHtml(r.relationship)}]-></span>
              <span style="color: var(--accent-emerald); font-weight: 700;">(:${escapeHtml(r.target)})</span>
            </div>
            <span class="badge" style="background: rgba(168, 85, 247, 0.12); color: var(--accent-violet); font-size: 11px; font-weight: 700;">
              ${r.edge_count || 0} edges
            </span>
          </div>
        `;
      });
      relsContainer.innerHTML = relsHtml;
    }
  }

  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadGraphSchemaProfile() {
  if (!currentProjectId) return;
  
  const titleEl = document.getElementById('profiler-target-db-title');
  const infoEl = document.getElementById('profiler-target-db-info');

  try {
    const resCfg = await fetch(`${API_BASE}/projects/${currentProjectId}/graph-configs`);
    if (resCfg.ok) {
      const cfgs = await resCfg.json();
      if (cfgs && cfgs.length > 0) {
        const gConn = cfgs[cfgs.length - 1];
        if (titleEl && infoEl) {
          titleEl.innerText = `Connected Target Graph: ${gConn.name || 'Neo4j Database'}`;
          infoEl.innerText = `${gConn.target_type || 'Neo4j'} live instance at ${gConn.host}:${gConn.port || 7687} (Database: ${gConn.database_name || 'neo4j'})`;
        }
      }
    }

    // Fetch persisted graph schema directly from SQLite Application DB
    const resSchema = await fetch(`${API_BASE}/projects/${currentProjectId}/graph/profile-target-schema`);
    if (resSchema.ok) {
      const data = await resSchema.json();
      if (data && (data.persisted_classes_count > 0 || data.persisted_attributes_count > 0 || (data.profiled_node_labels && data.profiled_node_labels.length > 0))) {
        renderGraphSchemaProfile(data);
      }
    }
  } catch (e) {
    console.warn('Could not fetch graph schema profile from application DB:', e);
  }
}
