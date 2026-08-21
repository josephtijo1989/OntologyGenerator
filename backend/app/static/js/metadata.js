// Metadata Catalog & Auto Discovery Module
let currentMetadata = [];

async function loadMetadata() {
  if (!currentProjectId) return;
  const tbody = document.getElementById('metadata-tbody');
  const connSelect = document.getElementById('metadataConnSelect');

  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">Loading metadata catalogs...</td></tr>`;
  }

  try {
    // Populate Source Connector filter dropdown
    if (connSelect) {
      const connsRes = await fetch(`${API_BASE}/projects/${currentProjectId}/source-connections`);
      if (connsRes.ok) {
        const conns = await connsRes.json();
        const curVal = connSelect.value;
        connSelect.innerHTML = `<option value="ALL">All Mapped Source Connectors (${conns.length})</option>`;
        conns.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.innerText = `${c.name} (${c.connector_type})`;
          connSelect.appendChild(opt);
        });
        if (curVal) connSelect.value = curVal;
      }
    }

    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/metadata?_t=${Date.now()}`);
    if (res.ok) {
      currentMetadata = await res.json();
      if (!tbody) return;
      tbody.innerHTML = '';

      if (currentMetadata.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">No metadata cataloged yet for this project. Click "Run Auto Discovery".</td></tr>`;
        return;
      }

      currentMetadata.forEach(tbl => {
        const tr = document.createElement('tr');
        const pks = tbl.columns ? tbl.columns.filter(c => c.is_primary_key).map(c => c.column_name).join(', ') : '';
        const fullTableName = `${tbl.schema_name}.${tbl.table_name}`;

        tr.innerHTML = `
          <td class="font-mono" style="color: var(--accent-violet); font-weight: 600;">${tbl.schema_name}</td>
          <td class="font-bold">${tbl.table_name}</td>
          <td><span class="badge badge-info">${tbl.object_type}</span></td>
          <td><span class="badge badge-success">Transactional</span></td>
          <td class="font-mono">${tbl.columns ? tbl.columns.length : 0}</td>
          <td class="font-mono" style="max-width: 260px;">${pks ? `<span class="badge badge-warning" style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: middle;" title="🔑 ${pks}">🔑 ${pks}</span>` : '<span style="color: var(--text-secondary); font-size: 11px;">None</span>'}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn-danger" style="padding: 5px 12px; font-size: 11px; font-weight: 600; white-space: nowrap; cursor: pointer;" onclick="deleteTable('${tbl.id}', '${fullTableName}')">🗑️ Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      currentMetadata = [];
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">No metadata cataloged yet for this project. Click "Run Auto Discovery".</td></tr>`;
      }
    }
  } catch (e) {
    currentMetadata = [];
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">No metadata cataloged yet for this project. Click "Run Auto Discovery".</td></tr>`;
    }
  }
}

async function deleteTable(tableId, tableName) {
  let confirmed = false;
  if (typeof showConfirm === 'function') {
    confirmed = await showConfirm(
      `Are you sure you want to delete table "${tableName}" from the catalog? This will also remove mapped OWL ontology classes and profiling stats.`,
      'Delete Metadata Table',
      '🗑️ Delete Table'
    );
  } else {
    confirmed = confirm(`Are you sure you want to delete table "${tableName}"?`);
  }
  if (!confirmed) return;
  await performDeleteTable(tableId, tableName);
}

async function performDeleteTable(tableId, tableName) {
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/metadata/tables/${tableId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      showToast(`Table "${tableName}" deleted successfully!`, 'success');
      await loadMetadata();
      await loadDashboard();
      if (typeof loadProfiling === 'function') loadProfiling();
      if (typeof loadOntology === 'function') loadOntology();
    } else {
      const err = await res.json();
      showToast(`Failed to delete table: ${err.detail || 'Error'}`, 'error');
    }
  } catch (e) {
    showToast('Network error while deleting table.', 'error');
  }
}

function updateDiscoveryProgress(percent, statusText, subtext) {
  const pFill = document.getElementById('discoveryProgressBarFill');
  const pPercent = document.getElementById('discoveryProgressPercent');
  const pStatus = document.getElementById('discoveryProgressStatus');
  const pSubtext = document.getElementById('discoveryProgressSubtext');

  if (pFill) pFill.style.width = `${percent}%`;
  if (pPercent) pPercent.innerText = `${percent}%`;
  if (pStatus) pStatus.innerHTML = statusText;
  if (pSubtext) pSubtext.innerText = subtext;
}

async function triggerDiscovery() {
  if (!currentProjectId) { showToast('Please select a project first.', 'error'); return; }

  // 1. Instantly Open Discovery Progress Modal for Instant User Feedback
  openModal('discoveryProgressModal');
  updateDiscoveryProgress(15, '🔄 Initializing Auto Discovery Engine...', 'Phase 1 of 4: Introspecting Database Connection');

  const connsRes = await fetch(`${API_BASE}/projects/${currentProjectId}/source-connections`);
  if (!connsRes.ok) {
    closeModal('discoveryProgressModal');
    showToast('Failed to fetch project source connections.', 'error');
    return;
  }

  const conns = await connsRes.json();
  if (conns.length === 0) {
    closeModal('discoveryProgressModal');
    showToast('Please add at least one Source Database Connector first under Database Connectors tab.', 'warning');
    return;
  }

  const selectVal = document.getElementById('metadataConnSelect')?.value || 'ALL';
  const targetConns = (selectVal === 'ALL') ? conns : conns.filter(c => c.id === selectVal);

  await delayMs(500);

  let totalCataloged = 0;
  let connIdx = 0;

  for (const c of targetConns) {
    connIdx++;
    updateDiscoveryProgress(
      45,
      `📊 Introspecting Schemas, Tables & Columns for "<strong>${c.name}</strong>"...`,
      `Phase 2 of 4: Extracting Database Constraints & Data Types (${connIdx}/${targetConns.length})`
    );
    await delayMs(700);

    try {
      const res = await fetch(`${API_BASE}/projects/${currentProjectId}/metadata/discover?connection_id=${c.id}`, { method: 'POST' });
      if (res.ok) {
        const catalogs = await res.json();
        totalCataloged += catalogs.length;

        updateDiscoveryProgress(
          85,
          `🧬 Generating OWL Ontology Classes & Datatype Mappings for "<strong>${c.name}</strong>"...`,
          `Phase 3 of 4: Mapping Physical Tables to Semantic Ontology Classes`
        );
        await delayMs(700);
      } else {
        const err = await res.json();
        showToast(`Error discovering connector "${c.name}": ${err.detail || 'Failed'}`, 'error');
      }
    } catch (e) {
      showToast(`Network error during discovery for connector "${c.name}"`, 'error');
    }
  }

  updateDiscoveryProgress(100, '✅ Auto Discovery Completed Successfully!', 'Phase 4 of 4: Catalog Persisted & Knowledge Graph Lineage Ready');
  await delayMs(800);

  closeModal('discoveryProgressModal');
  showToast(`Auto Discovery Completed! Successfully cataloged ${totalCataloged} database table(s).`, 'success');

  await loadMetadata();
  await loadDashboard();
}

async function clearAllMetadataCatalog() {
  if (!currentProjectId) { showToast('Please select a project first.', 'error'); return; }
  let confirmed = false;
  if (typeof showConfirm === 'function') {
    confirmed = await showConfirm(
      'Are you sure you want to clear ALL cataloged tables for this project? This will delete all discovered schemas, columns, profiling stats, and mapped ontology classes.',
      'Clear All Catalog Metadata',
      '🗑️ Clear Entire Catalog'
    );
  } else {
    confirmed = confirm('Are you sure you want to clear ALL cataloged tables for this project?');
  }
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/metadata`, { method: 'DELETE' });
    if (res.ok) {
      showToast('All metadata catalog tables cleared successfully!', 'success');
      await loadMetadata();
      await loadDashboard();
      if (typeof loadProfiling === 'function') loadProfiling();
      if (typeof loadOntology === 'function') loadOntology();
    } else {
      showToast('Failed to clear metadata catalog.', 'error');
    }
  } catch (e) {
    showToast('Network error while clearing metadata catalog.', 'error');
  }
}
