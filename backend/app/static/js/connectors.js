// Connectors & Target Topology Management
let currentConnectorsList = [];
let currentTargetGraphConfig = null;
let editingConnectionId = null;

async function loadConnectors() {
  if (!currentProjectId) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/source-connections?_t=${Date.now()}`);
    if (res.ok) {
      const conns = await res.json();
      currentConnectorsList = conns;

      const countBadge = document.getElementById('source-count-badge');
      if (countBadge) countBadge.innerText = `${conns.length} Source Database(s)`;

      const list = document.getElementById('source-conns-list');
      if (list) {
        list.innerHTML = '';
        if (conns.length === 0) {
          list.innerHTML = `<div style="color: var(--text-secondary); text-align: center; padding: 30px; font-size: 13px;">No source relational databases mapped yet.<br>Click "➕ Add Source Database" above.</div>`;
        }
        conns.forEach(c => {
          const div = document.createElement('div');
          div.style.background = 'var(--bg-surface)';
          div.style.padding = '14px';
          div.style.borderRadius = '8px';
          div.style.border = '1px solid var(--border-color)';
          div.style.display = 'flex';
          div.style.flexDirection = 'column';
          div.style.gap = '6px';

          const dbTypeColor = c.connector_type === 'MSSQL' ? 'var(--accent-cyan)' : (c.connector_type === 'POSTGRESQL' ? 'var(--accent-violet)' : 'var(--accent-amber)');

          div.innerHTML = `
            <div class="flex-between">
              <span class="font-bold" style="font-size: 14px; color: var(--text-primary);">${c.name}</span>
              <span class="badge" style="background: rgba(139, 92, 246, 0.2); color: ${dbTypeColor}; font-weight: 700;">${c.connector_type}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary);">Host: <span class="font-mono">${c.host}:${c.port}</span> | Database: <span class="font-mono" style="color: var(--accent-cyan);">${c.database_name}</span></div>
            <div style="font-size: 11px; color: var(--text-secondary); font-family: var(--font-mono);">Mapped Project ID: ${currentProjectId.slice(0, 8)}...</div>
            <div class="flex-between" style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
              <span style="color: var(--accent-emerald); font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-emerald); display: inline-block;"></span>
                Status: ${c.last_status || 'CONNECTED'}
              </span>
              <div style="display: flex; gap: 6px;">
                <button class="btn-sm" onclick="testConn('${c.id}')">⚡ Test Connection</button>
                <button class="btn-sm" style="background: rgba(37, 99, 235, 0.1); color: var(--accent-blue); border: 1px solid rgba(37, 99, 235, 0.3); font-weight: 600;" onclick="openEditConnectorModal('${c.id}')">✏️ Edit Connection</button>
                <button class="btn-danger" style="padding: 2px 8px; font-size: 11px;" onclick="deleteConnector('${c.id}', '${c.name}')">🗑️</button>
              </div>
            </div>
          `;
          list.appendChild(div);
        });
      }
    }

    const gRes = await fetch(`${API_BASE}/projects/${currentProjectId}/graph-configs`);
    if (gRes.ok) {
      const gCfgs = await gRes.json();
      const tgName = document.getElementById('tg-name');
      const tgType = document.getElementById('tg-type');
      const tgHost = document.getElementById('tg-host');
      if (gCfgs.length > 0) {
        const g = gCfgs[gCfgs.length - 1];
        currentTargetGraphConfig = g;
        if (tgName) tgName.innerText = g.name;
        if (tgType) tgType.innerText = g.target_type;
        if (tgHost) tgHost.innerText = `Host: ${g.host}:${g.port} | Database: ${g.database_name || 'neo4j'} | User: ${g.username || 'neo4j'}`;
      } else {
        currentTargetGraphConfig = null;
        if (tgName) tgName.innerText = 'Target Graph Database';
        if (tgType) tgType.innerText = 'Unconfigured';
        if (tgHost) tgHost.innerText = 'Click "Configure Target Graph DB" to set destination';
      }
    }
    bindTargetGraphEditButtons();
  } catch (e) { console.log(e); }
}

async function testTargetGraphCard() {
  if (!currentProjectId) {
    if (typeof showToast === 'function') showToast('Select or create a project first', 'warning');
    else alert('Select or create a project first');
    return;
  }
  if (typeof showToast === 'function') showToast('⚡ Testing connection to Target Graph Database...', 'info');

  const g = currentTargetGraphConfig || { host: '127.0.0.1', port: 7687, target_type: 'NEO4J', database_name: 'neo4j', username: 'neo4j' };
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/graph/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: g.host || '127.0.0.1',
        port: g.port || 7687,
        target_type: g.target_type || 'NEO4J',
        database_name: g.database_name || 'neo4j',
        username: g.username || 'neo4j',
        password: g.password || ''
      })
    });

    if (res.ok) {
      const data = await res.json();
      const statusBadge = document.getElementById('tg-status-badge');
      if (data.status === 'ONLINE') {
        if (statusBadge) {
          statusBadge.style.color = 'var(--accent-emerald)';
          statusBadge.innerHTML = `<span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-emerald); display: inline-block;"></span> Status: ONLINE & READY`;
        }
        if (typeof showToast === 'function') showToast(data.message || 'Target Graph Database is ONLINE!', 'success');
        else alert(data.message || 'Target Graph Database is ONLINE!');
      } else {
        if (statusBadge) {
          statusBadge.style.color = 'var(--accent-amber)';
          statusBadge.innerHTML = `<span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-amber); display: inline-block;"></span> Status: OFFLINE / UNREACHABLE`;
        }
        if (typeof showToast === 'function') showToast(data.message || 'Target Graph Database is offline', 'warning');
        else alert(data.message || 'Target Graph Database is offline');
      }
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('Target Graph DB Test Failed', 'error');
  }
}

function openAddConnectorModal() {
  editingConnectionId = null;
  const title = document.getElementById('connModalTitle');
  if (title) title.innerText = 'Map Source Relational Database';

  document.getElementById('nc-name').value = '';
  document.getElementById('nc-type').value = 'MSSQL';
  document.getElementById('nc-host').value = '';
  document.getElementById('nc-port').value = '';
  document.getElementById('nc-dbname').value = '';
  document.getElementById('nc-user').value = '';
  document.getElementById('nc-pass').value = '';

  const statusDiv = document.getElementById('nc-test-status');
  if (statusDiv) {
    statusDiv.style.display = 'none';
    statusDiv.innerHTML = '';
  }
  openModal('connModal');
}

async function openEditConnectorModal(connId) {
  let c = currentConnectorsList.find(x => x.id === connId);
  if (!c && currentProjectId) {
    try {
      const res = await fetch(`${API_BASE}/projects/${currentProjectId}/source-connections`);
      if (res.ok) {
        currentConnectorsList = await res.json();
        c = currentConnectorsList.find(x => x.id === connId);
      }
    } catch(e) {}
  }
  if (!c) return;

  editingConnectionId = connId;
  const title = document.getElementById('connModalTitle');
  if (title) title.innerText = 'Edit Source Relational Database';

  document.getElementById('nc-name').value = c.name || '';
  document.getElementById('nc-type').value = c.connector_type || 'MSSQL';
  document.getElementById('nc-host').value = c.host || 'localhost';
  document.getElementById('nc-port').value = c.port || 1433;
  document.getElementById('nc-dbname').value = c.database_name || '';
  document.getElementById('nc-user').value = c.username || '';
  document.getElementById('nc-pass').value = '******';

  const statusDiv = document.getElementById('nc-test-status');
  if (statusDiv) {
    statusDiv.style.display = 'none';
    statusDiv.innerHTML = '';
  }
  openModal('connModal');
}

async function submitCreateConnector() {
  if (!currentProjectId) { alert('Select or create a project first'); return; }
  const rawHost = document.getElementById('nc-host').value.trim();
  const rawDbname = document.getElementById('nc-dbname').value.trim();
  if (!rawHost || !rawDbname) {
    alert('Host Name and Database Name are required.');
    return;
  }
  const type = document.getElementById('nc-type').value;
  const name = document.getElementById('nc-name').value.trim() || `${type} Database (${rawDbname})`;
  const port = parseInt(document.getElementById('nc-port').value) || 1433;
  const user = document.getElementById('nc-user').value.trim();
  const pass = document.getElementById('nc-pass').value;

  const payload = {
    name, connector_type: type, host: rawHost, port, database_name: rawDbname, username: user
  };
  if (pass && pass !== '******') {
    payload.password = pass;
  }

  try {
    const isEdit = !!editingConnectionId;
    const url = isEdit
      ? `${API_BASE}/projects/${currentProjectId}/source-connections/${editingConnectionId}`
      : `${API_BASE}/projects/${currentProjectId}/source-connections`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeModal('connModal');
      await loadConnectors();
      alert(`Source Database Connection "${name}" ${isEdit ? 'Updated' : 'Mapped'} Successfully!`);
    } else {
      alert(`Failed to ${isEdit ? 'update' : 'add'} connector`);
    }
  } catch (e) { alert('Failed to connect to server'); }
}

async function testConn(connId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/source-connections/${connId}/test`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      alert(`Connection Test Outcome: ${data.status}`);
      loadConnectors();
    }
  } catch (e) { alert('Connection Test Failed'); }
}

async function deleteConnector(connId, name) {
  let confirmed = false;
  if (typeof showConfirm === 'function') {
    confirmed = await showConfirm(`Are you sure you want to remove source connector "${name}"?`, 'Remove Source Database', '🗑️ Remove');
  } else {
    confirmed = confirm(`Are you sure you want to remove source connector "${name}"?`);
  }
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/source-connections/${connId}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      await loadConnectors();
      if (typeof showToast === 'function') showToast(`Source Connector "${name}" Removed Successfully!`, 'success');
      else alert(`Source Connector "${name}" Removed Successfully!`);
    } else {
      if (typeof showToast === 'function') showToast('Failed to remove connector', 'error');
      else alert('Failed to remove connector');
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed to remove connector', 'error');
    else alert('Failed to remove connector');
  }
}

function openTargetGraphModal() {
  const statusDiv = document.getElementById('ng-test-status');
  if (statusDiv) {
    statusDiv.style.display = 'none';
    statusDiv.innerHTML = '';
  }

  if (currentTargetGraphConfig) {
    if (document.getElementById('ng-name')) document.getElementById('ng-name').value = currentTargetGraphConfig.name || 'Enterprise Target Graph Cluster';
    if (document.getElementById('ng-type')) document.getElementById('ng-type').value = currentTargetGraphConfig.target_type || 'NEO4J';
    if (document.getElementById('ng-host')) document.getElementById('ng-host').value = currentTargetGraphConfig.host || '127.0.0.1';
    if (document.getElementById('ng-port')) document.getElementById('ng-port').value = currentTargetGraphConfig.port || 7687;
    if (document.getElementById('ng-dbname')) document.getElementById('ng-dbname').value = currentTargetGraphConfig.database_name || 'neo4j';
    if (document.getElementById('ng-user')) document.getElementById('ng-user').value = currentTargetGraphConfig.username || 'neo4j';
    if (document.getElementById('ng-pass')) document.getElementById('ng-pass').value = '******';
  } else {
    if (document.getElementById('ng-name')) document.getElementById('ng-name').value = 'Enterprise Target Graph Cluster';
    if (document.getElementById('ng-type')) document.getElementById('ng-type').value = 'NEO4J';
    if (document.getElementById('ng-host')) document.getElementById('ng-host').value = '127.0.0.1';
    if (document.getElementById('ng-port')) document.getElementById('ng-port').value = 7687;
    if (document.getElementById('ng-dbname')) document.getElementById('ng-dbname').value = 'neo4j';
    if (document.getElementById('ng-user')) document.getElementById('ng-user').value = 'neo4j';
    if (document.getElementById('ng-pass')) document.getElementById('ng-pass').value = '';
  }

  openModal('graphModal');
}

async function submitTargetGraph() {
  if (!currentProjectId) { alert('Select or create a project first'); return; }
  const name = document.getElementById('ng-name').value.trim() || 'Production Neo4j Instance';
  const type = document.getElementById('ng-type').value;
  const host = document.getElementById('ng-host').value.trim() || 'bolt://localhost:7687';
  const port = parseInt(document.getElementById('ng-port').value) || 7687;
  const dbname = document.getElementById('ng-dbname') ? (document.getElementById('ng-dbname').value.trim() || 'neo4j') : 'neo4j';
  const username = document.getElementById('ng-user') ? (document.getElementById('ng-user').value.trim() || 'neo4j') : 'neo4j';
  const password = document.getElementById('ng-pass') ? document.getElementById('ng-pass').value : '';

  const payload = { name, target_type: type, host, port, database_name: dbname, username };
  if (password && password !== '******') {
    payload.password = password;
  }

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/graph-configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      closeModal('graphModal');
      await loadConnectors();
      if (typeof showToast === 'function') showToast('Target Graph Database Configured Successfully!', 'success');
      else alert('Target Graph Database Configured Successfully!');
    } else {
      if (typeof showToast === 'function') showToast('Failed to configure target graph database', 'error');
      else alert('Failed to configure target graph database');
    }
  } catch (e) { alert('Failed to configure target graph'); }
}

async function testTargetGraphModalConnection() {
  if (!currentProjectId) {
    alert('Select or create a project first');
    return;
  }
  const statusDiv = document.getElementById('ng-test-status');
  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.style.background = 'rgba(6, 182, 212, 0.15)';
    statusDiv.style.color = 'var(--accent-cyan)';
    statusDiv.style.border = '1px solid var(--accent-cyan)';
    statusDiv.innerHTML = '⏳ Testing connection to target graph database...';
  }

  const host = document.getElementById('ng-host').value.trim() || '127.0.0.1';
  const port = parseInt(document.getElementById('ng-port').value) || 7687;
  const type = document.getElementById('ng-type').value || 'NEO4J';
  const dbname = document.getElementById('ng-dbname') ? (document.getElementById('ng-dbname').value.trim() || 'neo4j') : 'neo4j';
  const user = document.getElementById('ng-user') ? (document.getElementById('ng-user').value.trim() || 'neo4j') : 'neo4j';
  const pass = document.getElementById('ng-pass') ? document.getElementById('ng-pass').value : '';

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/graph/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: host,
        port: port,
        target_type: type,
        database_name: dbname,
        username: user,
        password: pass
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (statusDiv) {
        if (data.status === 'ONLINE' || data.status === 'SUCCESS') {
          statusDiv.style.background = 'rgba(16, 185, 129, 0.15)';
          statusDiv.style.color = 'var(--accent-emerald)';
          statusDiv.style.border = '1px solid var(--accent-emerald)';
          statusDiv.innerHTML = `<strong>✅ Connection Status: ONLINE</strong><br>${data.message || 'Connected successfully'}`;
        } else {
          statusDiv.style.background = 'rgba(244, 63, 94, 0.15)';
          statusDiv.style.color = 'var(--accent-rose)';
          statusDiv.style.border = '1px solid var(--accent-rose)';
          statusDiv.innerHTML = `<strong>❌ Connection Status: UNREACHABLE</strong><br>${data.message || 'Unable to connect to target graph database'}`;
        }
      }
    } else {
      if (statusDiv) {
        statusDiv.style.background = 'rgba(244, 63, 94, 0.15)';
        statusDiv.style.color = 'var(--accent-rose)';
        statusDiv.style.border = '1px solid var(--accent-rose)';
        statusDiv.innerHTML = '<strong>❌ Connection Failed:</strong> Unable to connect to target graph server.';
      }
    }
  } catch (e) {
    if (statusDiv) {
      statusDiv.style.background = 'rgba(244, 63, 94, 0.15)';
      statusDiv.style.color = 'var(--accent-rose)';
      statusDiv.style.border = '1px solid var(--accent-rose)';
      statusDiv.innerHTML = `<strong>❌ Error:</strong> ${e.message || 'Network error while testing connection.'}`;
    }
  }
}

async function testSourceModalConnection() {
  if (!currentProjectId) {
    alert('Select or create a project first');
    return;
  }
  const statusDiv = document.getElementById('nc-test-status');
  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.style.background = 'rgba(6, 182, 212, 0.15)';
    statusDiv.style.color = 'var(--accent-cyan)';
    statusDiv.style.border = '1px solid var(--accent-cyan)';
    statusDiv.innerHTML = '⏳ Testing connection to source database...';
  }

  const type = document.getElementById('nc-type').value;
  const host = document.getElementById('nc-host').value.trim();
  const port = parseInt(document.getElementById('nc-port').value) || 1433;
  const dbname = document.getElementById('nc-dbname').value.trim();
  const user = document.getElementById('nc-user').value.trim();
  const pass = document.getElementById('nc-pass').value;

  if (!host || !dbname) {
    if (statusDiv) {
      statusDiv.style.background = 'rgba(244, 63, 94, 0.15)';
      statusDiv.style.color = 'var(--accent-rose)';
      statusDiv.style.border = '1px solid var(--accent-rose)';
      statusDiv.innerHTML = '<strong>⚠️ Validation Error:</strong> Host Name and Database Name are required to test connection.';
    }
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/source-connections/test-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Draft Test Connection',
        connector_type: type,
        host: host,
        port: port,
        database_name: dbname,
        username: user,
        password: pass
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (statusDiv) {
        if (data.status === 'SUCCESS') {
          statusDiv.style.background = 'rgba(16, 185, 129, 0.15)';
          statusDiv.style.color = 'var(--accent-emerald)';
          statusDiv.style.border = '1px solid var(--accent-emerald)';
          statusDiv.innerHTML = `<strong>✅ Connection Status: SUCCESS</strong><br>${data.message || 'Connected successfully'}`;
        } else {
          statusDiv.style.background = 'rgba(244, 63, 94, 0.15)';
          statusDiv.style.color = 'var(--accent-rose)';
          statusDiv.style.border = '1px solid var(--accent-rose)';
          statusDiv.innerHTML = `<strong>❌ Connection Status: FAILED</strong><br>${data.message || 'Connection failed'}`;
        }
      }
    } else {
      if (statusDiv) {
        statusDiv.style.background = 'rgba(244, 63, 94, 0.15)';
        statusDiv.style.color = 'var(--accent-rose)';
        statusDiv.style.border = '1px solid var(--accent-rose)';
        statusDiv.innerHTML = '<strong>❌ Connection Failed:</strong> Unable to connect to source database server.';
      }
    }
  } catch (e) {
    if (statusDiv) {
      statusDiv.style.background = 'rgba(244, 63, 94, 0.15)';
      statusDiv.style.color = 'var(--accent-rose)';
      statusDiv.style.border = '1px solid var(--accent-rose)';
      statusDiv.innerHTML = `<strong>❌ Error:</strong> ${e.message || 'Network error while testing connection.'}`;
    }
  }
}

// Bind DOM Click Event Listeners
function bindTargetGraphEditButtons() {
  const btn1 = document.getElementById('btn-edit-target-db');
  if (btn1) {
    btn1.onclick = function(e) {
      if (e) e.preventDefault();
      openTargetGraphModal();
    };
  }
  const btn2 = document.getElementById('btn-edit-target-db-header');
  if (btn2) {
    btn2.onclick = function(e) {
      if (e) e.preventDefault();
      openTargetGraphModal();
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindTargetGraphEditButtons);
} else {
  bindTargetGraphEditButtons();
}


