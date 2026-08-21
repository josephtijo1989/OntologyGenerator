// Data Profiling & PII Management Module
let currentProfilingData = [];
let activeProfilingId = null;

async function loadProfiling() {
  if (!currentProjectId) return;
  const grid = document.getElementById('profiling-grid');
  if (grid) {
    grid.innerHTML = `<div style="color: var(--text-secondary); padding: 20px; text-align: center; grid-column: 1 / -1;">Loading profiling data...</div>`;
  }
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/profiling?_t=${Date.now()}`);
    if (res.ok) {
      currentProfilingData = await res.json();
      if (!grid) return;
      grid.innerHTML = '';
      if (currentProfilingData.length === 0) {
        grid.innerHTML = `<div style="color: var(--text-secondary); padding: 20px; text-align: center; grid-column: 1 / -1;">No data profiling performed yet. Click "Run Data Profiling".</div>`;
      }
      currentProfilingData.forEach((prof, idx) => {
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '8px';
        card.style.cursor = 'pointer';
        card.style.transition = 'transform 0.2s, border-color 0.2s';
        card.setAttribute('onclick', `openProfilingDetail(${idx})`);

        const scoreColor = prof.quality_score >= 95 ? 'var(--accent-emerald)' : (prof.quality_score >= 80 ? 'var(--accent-amber)' : 'var(--accent-rose)');
        const tableNameDisplay = (prof.schema_name && prof.table_name) ? `${prof.schema_name}.${prof.table_name}` : (prof.table_name || `Catalog ID: ${prof.metadata_catalog_id.slice(0, 8)}`);

        // Compute Primary Keys list
        const pksList = (prof.primary_keys && prof.primary_keys.length > 0) 
          ? prof.primary_keys 
          : (prof.column_stats_json ? Object.keys(prof.column_stats_json).filter(k => prof.column_stats_json[k].is_primary_key || prof.column_stats_json[k].is_pk) : []);
        const pkDisplay = pksList.length > 0 ? pksList.join(', ') : 'None';

        let colsHtml = '';
        if (prof.column_stats_json) {
          const keys = Object.keys(prof.column_stats_json);
          colsHtml = keys.slice(0, 5).map(k => {
            const stat = prof.column_stats_json[k];
            const isPK = stat.is_primary_key || stat.is_pk || pksList.includes(k);
            const isFK = stat.is_foreign_key || stat.is_fk;
            const pkBadge = isPK ? ` <span class="badge" style="background: rgba(245, 158, 11, 0.18); color: var(--accent-amber); font-weight: 700; font-size: 9px; padding: 1px 5px; border: 1px solid rgba(245, 158, 11, 0.4);">🔑 PK</span>` : '';
            const fkBadge = isFK ? ` <span class="badge" style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); font-weight: 600; font-size: 9px; padding: 1px 4px;">🔗 FK</span>` : '';
            const piiTypeDisplay = stat.pii_type ? stat.pii_type.replace(/_/g, ' ') : 'PII';
            const piiBadge = stat.pii_tagged ? ` <span style="color: var(--accent-rose); font-weight: 700; font-size: 10px;">🛡️ ${piiTypeDisplay}</span>` : '';
            return `<div style="font-size: 11px; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span><strong>${k}</strong>${pkBadge}${fkBadge}${piiBadge}</span>
              <span>Null: ${stat.null_pct !== undefined ? stat.null_pct : 0}%</span>
            </div>`;
          }).join('');
        }

        card.innerHTML = `
          <div class="flex-between">
            <span class="font-bold" style="font-size: 15px; color: var(--text-primary);">${tableNameDisplay}</span>
            <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: ${scoreColor}; font-weight: 700;">Score: ${prof.quality_score}%</span>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
            🔑 Primary Key: <strong class="font-mono" style="color: var(--accent-amber); font-weight: 700;">${pkDisplay}</strong>
          </div>
          <div style="font-size: 13px; color: var(--text-secondary);">Total Rows: <strong class="font-mono" style="color: var(--accent-cyan); font-weight: 700;">${(prof.row_count || 0).toLocaleString()}</strong></div>
          <div style="margin-top: 4px; border-top: 1px dashed var(--border-color); padding-top: 6px;">
            ${colsHtml || '<div style="font-size: 11px; color: var(--accent-emerald);">All Columns Profiled Clean</div>'}
          </div>
          <div style="font-size: 11px; color: var(--accent-violet); font-weight: 600; text-align: right; margin-top: 4px;">🛡️ Click to Edit PII & Column Details &rarr;</div>
        `;
        grid.appendChild(card);
      });
    } else {
      currentProfilingData = [];
      if (grid) {
        grid.innerHTML = `<div style="color: var(--text-secondary); padding: 20px; text-align: center; grid-column: 1 / -1;">No data profiling performed yet. Click "Run Data Profiling".</div>`;
      }
    }
  } catch (e) {
    currentProfilingData = [];
    if (grid) {
      grid.innerHTML = `<div style="color: var(--text-secondary); padding: 20px; text-align: center; grid-column: 1 / -1;">No data profiling performed yet for this project. Click "Run Data Profiling".</div>`;
    }
  }
}

function openProfilingDetail(idx) {
  const prof = currentProfilingData[idx];
  if (!prof) return;

  activeProfilingId = prof.id;
  const fullTableName = (prof.schema_name && prof.table_name) ? `${prof.schema_name}.${prof.table_name}` : prof.table_name;
  
  // Extract Primary Keys list
  const pksList = (prof.primary_keys && prof.primary_keys.length > 0) 
    ? prof.primary_keys 
    : (prof.column_stats_json ? Object.keys(prof.column_stats_json).filter(k => prof.column_stats_json[k].is_primary_key || prof.column_stats_json[k].is_pk) : []);
  const pkDisplay = pksList.length > 0 ? pksList.join(', ') : 'None';

  document.getElementById('pdm-title').innerText = `Table Profiling & PII Management: ${fullTableName}`;
  document.getElementById('pdm-subtitle').innerText = `Catalog ID: ${prof.metadata_catalog_id} | Profiled at: ${new Date(prof.profiled_at).toLocaleString()}`;
  document.getElementById('pdm-score').innerText = `${prof.quality_score}%`;
  const pdmPk = document.getElementById('pdm-pk');
  if (pdmPk) {
    pdmPk.innerText = pkDisplay;
    pdmPk.title = `Primary Key(s): ${pkDisplay}`;
  }
  document.getElementById('pdm-rows').innerText = (prof.row_count || 0).toLocaleString();

  const stats = prof.column_stats_json || {};
  const colKeys = Object.keys(stats);
  document.getElementById('pdm-cols').innerText = colKeys.length;

  let piiCount = 0;
  const tbody = document.getElementById('pdm-tbody');
  tbody.innerHTML = '';

  colKeys.forEach(colName => {
    const colStat = stats[colName];
    if (colStat.pii_tagged) piiCount++;

    const isPK = colStat.is_primary_key || colStat.is_pk || pksList.includes(colName);
    const isFK = colStat.is_foreign_key || colStat.is_fk;
    const fkTarget = colStat.foreign_table_name ? ` ➔ ${colStat.foreign_table_name}` : '';

    let keyBadgeHtml = '<span style="color: var(--text-secondary); font-size: 11px;">—</span>';
    if (isPK) {
      keyBadgeHtml = '<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); font-weight: 700; border: 1px solid rgba(245, 158, 11, 0.4);">🔑 PRIMARY KEY</span>';
    } else if (isFK) {
      keyBadgeHtml = `<span class="badge" style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); font-weight: 600;" title="Foreign Key${fkTarget}">🔗 FK${fkTarget}</span>`;
    }

    const piiTypeVal = colStat.pii_type || (colStat.pii_tagged ? 'CONFIDENTIAL_OTHER' : 'NONE');

    const tr = document.createElement('tr');
    tr.setAttribute('data-col-name', colName);
    tr.innerHTML = `
      <td class="font-bold">${colName}</td>
      <td>${keyBadgeHtml}</td>
      <td class="font-mono" style="font-size: 12px; color: var(--text-secondary);">${colStat.data_type || 'VARCHAR'}</td>
      <td><span style="color: ${colStat.null_pct > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}; font-weight: 600;">${colStat.null_pct || 0}%</span></td>
      <td class="font-mono">${(colStat.distinct_count || 0).toLocaleString()}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" class="pii-check" data-col="${colName}" ${colStat.pii_tagged ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;" onchange="onPiiCheckboxChanged(this)">
          <select class="pii-type-select" data-col="${colName}" style="padding: 5px 8px; font-size: 11px; background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; ${!colStat.pii_tagged ? 'opacity: 0.6;' : ''}" onchange="onPiiSelectChanged(this)">
            <option value="NONE" ${piiTypeVal==='NONE'?'selected':''}>None (Not Sensitive)</option>
            <option value="EMAIL" ${piiTypeVal==='EMAIL'?'selected':''}>📧 Email</option>
            <option value="PHONE" ${piiTypeVal==='PHONE'?'selected':''}>📞 Phone Number</option>
            <option value="SSN" ${piiTypeVal==='SSN'?'selected':''}>🆔 SSN / National ID</option>
            <option value="CREDIT_CARD" ${piiTypeVal==='CREDIT_CARD'?'selected':''}>💳 Credit Card</option>
            <option value="NAME" ${piiTypeVal==='NAME'?'selected':''}>👤 Full Name</option>
            <option value="ADDRESS" ${piiTypeVal==='ADDRESS'?'selected':''}>🏠 Physical Address</option>
            <option value="IP_ADDRESS" ${piiTypeVal==='IP_ADDRESS'?'selected':''}>🌐 IP Address</option>
            <option value="CONFIDENTIAL_OTHER" ${piiTypeVal==='CONFIDENTIAL_OTHER'?'selected':''}>🔒 Confidential Other</option>
          </select>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('pdm-pii').innerText = piiCount;
  openModal('profileDetailModal');
}

function recalcModalPiiCount() {
  const checks = document.querySelectorAll('#pdm-tbody .pii-check');
  let count = 0;
  checks.forEach(c => { if (c.checked) count++; });
  const pdmPii = document.getElementById('pdm-pii');
  if (pdmPii) pdmPii.innerText = count;
}

function onPiiCheckboxChanged(cb) {
  const colName = cb.getAttribute('data-col');
  const sel = document.querySelector(`.pii-type-select[data-col="${colName}"]`);
  if (sel) {
    if (cb.checked) {
      sel.style.opacity = '1';
      if (sel.value === 'NONE') sel.value = 'CONFIDENTIAL_OTHER';
    } else {
      sel.style.opacity = '0.6';
      sel.value = 'NONE';
    }
  }
  recalcModalPiiCount();
}

function onPiiSelectChanged(sel) {
  const colName = sel.getAttribute('data-col');
  const cb = document.querySelector(`.pii-check[data-col="${colName}"]`);
  if (cb) {
    if (sel.value !== 'NONE') {
      cb.checked = true;
      sel.style.opacity = '1';
    } else {
      cb.checked = false;
      sel.style.opacity = '0.6';
    }
  }
  recalcModalPiiCount();
}

async function submitSavePII() {
  if (!activeProfilingId) return;

  const rows = document.querySelectorAll('#pdm-tbody tr');
  const columnPiiMap = {};

  rows.forEach(row => {
    const colName = row.getAttribute('data-col-name');
    const cb = row.querySelector('.pii-check');
    const sel = row.querySelector('.pii-type-select');
    if (colName && cb && sel) {
      const isTagged = Boolean(cb.checked);
      const pType = isTagged ? (sel.value !== 'NONE' ? sel.value : 'CONFIDENTIAL_OTHER') : 'NONE';

      columnPiiMap[colName] = {
        pii_tagged: isTagged,
        pii_type: pType
      };
    }
  });

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/profiling/${activeProfilingId}/pii`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_pii_map: columnPiiMap })
    });
    if (res.ok) {
      closeModal('profileDetailModal');
      await loadProfiling();
      if (typeof loadMetadata === 'function') await loadMetadata();
      if (typeof loadDashboard === 'function') await loadDashboard();
      showToast('PII Classifications & Privacy Tags Saved Successfully!', 'success');
    } else {
      const err = await res.json();
      showToast(`Failed to update PII classifications: ${err.detail || 'Error'}`, 'error');
    }
  } catch (e) {
    showToast('Network error while saving PII classifications', 'error');
  }
}

function updateProfilingProgress(percent, statusText, subtext) {
  const pFill = document.getElementById('profilingProgressBarFill');
  const pPercent = document.getElementById('profilingProgressPercent');
  const pStatus = document.getElementById('profilingProgressStatus');
  const pSubtext = document.getElementById('profilingProgressSubtext');

  if (pFill) pFill.style.width = `${percent}%`;
  if (pPercent) pPercent.innerText = `${percent}%`;
  if (pStatus) pStatus.innerHTML = statusText;
  if (pSubtext) pSubtext.innerText = subtext;
}

async function triggerProfiling() {
  if (!currentProjectId) { showToast('Please select a project first.', 'error'); return; }

  // Check metadata catalogs existence first
  const metaRes = await fetch(`${API_BASE}/projects/${currentProjectId}/metadata`);
  if (metaRes.ok) {
    const metaList = await metaRes.json();
    if (metaList.length === 0) {
      showToast('No metadata cataloged yet. Please click "Run Auto Discovery" first under Metadata Discovery tab.', 'warning');
      return;
    }
  }

  const connsRes = await fetch(`${API_BASE}/projects/${currentProjectId}/source-connections`);
  if (!connsRes.ok) {
    showToast('Failed to fetch project source connections.', 'error');
    return;
  }

  const conns = await connsRes.json();
  if (conns.length === 0) {
    showToast('Please add at least one Source Database Connector first under Database Connectors tab.', 'warning');
    return;
  }

  // Instantly Open Profiling Progress Modal for Instant User Feedback
  openModal('profilingProgressModal');
  updateProfilingProgress(15, '📈 Initializing Statistical Data Profiling Engine...', 'Phase 1 of 4: Introspecting Column Metrics & Row Counts');

  try {
    await delayMs(400);

    let successCount = 0;
    let connIdx = 0;

    for (const c of conns) {
      connIdx++;
      updateProfilingProgress(
        45,
        `📊 Calculating Null Ratios & Distinct Ratios for "<strong>${c.name}</strong>"...`,
        `Phase 2 of 4: Statistical Null Percentage Analysis (${connIdx}/${conns.length})`
      );
      await delayMs(100);

      try {
        const res = await fetch(`${API_BASE}/projects/${currentProjectId}/profiling/run?connection_id=${c.id}`, { method: 'POST' });
        if (res.ok) {
          successCount++;
          updateProfilingProgress(
            85,
            `🛡️ Running Automated PII Classification Scan for "<strong>${c.name}</strong>"...`,
            `Phase 3 of 4: Automated Privacy Classification & PII Tagging`
          );
          await delayMs(100);
        } else {
          const err = await res.json();
          showToast(`Profiling failed for "${c.name}": ${err.detail || 'Error'}`, 'error');
        }
      } catch (e) {
        showToast(`Network error during profiling for "${c.name}"`, 'error');
      }
    }

    updateProfilingProgress(100, '✅ Data Profiling Completed Successfully!', 'Phase 4 of 4: Statistical Metrics Persisted & Ready');
    closeModal('profilingProgressModal');
    showToast('Data Profiling & Quality Scan Completed Successfully!', 'success');
  } finally {
    closeModal('profilingProgressModal');
    const modalEl = document.getElementById('profilingProgressModal');
    if (modalEl) modalEl.style.display = 'none';
    await loadProfiling();
  }
}
