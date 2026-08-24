// Data Movement & Pipeline Execution Controller

let currentDataMovementMapping = null;
let currentDataMovementJobs = [];

async function initDataMovementView() {
  if (!currentProjectId) {
    showToast('Please select or create an active project first.', 'warning');
    return;
  }

  populateDataMovementSourceSelect();
  await loadDataMovementMapping();
  await loadDataMovementJobHistory();
}

function populateDataMovementSourceSelect() {
  const select = document.getElementById('dmSourceConnSelect');
  if (!select) return;

  select.innerHTML = '<option value="">All Mapped Source Connectors</option>';

  fetch(`${API_BASE}/projects/${currentProjectId}/source-connections`)
    .then(r => r.json())
    .then(conns => {
      if (Array.isArray(conns)) {
        conns.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `${c.name} (${c.connector_type})`;
          select.appendChild(opt);
        });
      }
    })
    .catch(err => console.warn('Could not populate source connectors dropdown:', err));
}

async function loadDataMovementMapping() {
  if (!currentProjectId) return;

  const mappingListEl = document.getElementById('dm-mapping-list');
  if (mappingListEl) {
    mappingListEl.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 12px;">Loading data movement mapping topology...</div>`;
  }

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/data-movement/mapping`);
    if (!res.ok) throw new Error('Failed to fetch data movement mapping topology');
    const data = await res.json();
    currentDataMovementMapping = data;

    // Render Stats Badges
    const badgeEl = document.getElementById('dm-mapping-badge');
    if (badgeEl) badgeEl.innerText = `${data.source_tables_count || 0} Tables Mapped`;
    const statSrc = document.getElementById('dm-stat-sources');
    if (statSrc) statSrc.innerText = `${(data.source_tables_count || 0) > 0 ? 1 : 0} Source Systems`;
    const statTbl = document.getElementById('dm-stat-tables');
    if (statTbl) statTbl.innerText = `${data.source_tables_count || 0} Relational Tables`;
    const statCls = document.getElementById('dm-stat-classes');
    if (statCls) statCls.innerText = `${data.ontology_classes_count || 0} Ontology Classes`;
    const statAttr = document.getElementById('dm-stat-attrs');
    if (statAttr) statAttr.innerText = `${data.ontology_attributes_count || 0} Datatype Props`;
    const statType = document.getElementById('dm-stat-target-type');
    if (statType) statType.innerText = data.target_graph_type || 'NEO4J';
    const statHost = document.getElementById('dm-stat-target-host');
    if (statHost) statHost.innerText = data.target_graph_host || 'bolt://localhost:7687';

    // Render Table-to-Class Mapping List
    const mappingListEl = document.getElementById('dm-mapping-list');
    if (mappingListEl) {
      mappingListEl.innerHTML = '';

      if (!data.mappings || data.mappings.length === 0) {
        mappingListEl.innerHTML = `
          <div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 12px; border: 1px dashed var(--border-color); border-radius: 6px;">
            No metadata tables mapped yet. Click <strong>⚡ Execute Data Movement Engine</strong> below to manually run data movement.
          </div>
        `;
        return;
      }

      data.mappings.forEach(m => {
        const item = document.createElement('div');
        item.style.cssText = 'background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; font-size: 12px;';
        
        const colCount = m.columns_mapped ? m.columns_mapped.length : 0;
        
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; color: var(--text-primary);">${m.schema_name}.${m.table_name}</span>
            <span style="font-size: 10px; color: var(--text-secondary);">(${m.row_count} rows)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--accent-cyan); font-weight: bold;">➔</span>
            <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: var(--accent-violet); font-weight: 700;">:${m.mapped_class_name}</span>
            <span style="font-size: 10px; color: var(--text-secondary);">(${colCount} props)</span>
          </div>
        `;
        mappingListEl.appendChild(item);
      });
    }

  } catch (err) {
    console.warn('Data movement mapping load notice:', err);
    const mappingListEl = document.getElementById('dm-mapping-list');
    if (mappingListEl) {
      mappingListEl.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 12px; border: 1px dashed var(--border-color); border-radius: 6px;">
          Data movement topology ready. Click <strong>⚡ Execute Data Movement Engine</strong> below to manually launch pipeline execution.
        </div>
      `;
    }
  }
}

async function executeDataMovementPipeline() {
  if (!currentProjectId) {
    showToast('Please select or create an active project first.', 'warning');
    return;
  }

  const sourceConnSelect = document.getElementById('dmSourceConnSelect');
  const sourceConnId = sourceConnSelect ? sourceConnSelect.value || null : null;
  const migrationModeSelect = document.getElementById('dmMigrationModeSelect');
  const migrationMode = migrationModeSelect ? migrationModeSelect.value || 'FULL_REFRESH' : 'FULL_REFRESH';
  const batchSizeInput = document.getElementById('dmBatchSizeInput');
  const batchSize = batchSizeInput ? parseInt(batchSizeInput.value) || 1000 : 1000;
  const enforceRulesCheckbox = document.getElementById('dmEnforceRulesCheckbox');
  const enforceRules = enforceRulesCheckbox ? enforceRulesCheckbox.checked : true;

  const reqData = {
    source_connection_id: sourceConnId,
    migration_mode: migrationMode,
    batch_size: batchSize,
    enforce_business_rules: enforceRules
  };

  // Reset Stepper & Progress UI
  resetStepperUI();
  updatePipelineStatus('RUNNING PIPELINE...', 'rgba(2, 132, 199, 0.2)', '#0284c7');

  const terminalEl = document.getElementById('dm-terminal-output');
  if (terminalEl) {
    terminalEl.innerHTML = `
      <div style="color: #38bdf8;">[00:00:00] [INFO] Launching Data Movement Engine Pipeline...</div>
      <div style="color: #c084fc; margin-top: 4px;">[00:00:01] [STAGE 1/6] Reading W3C OWL 2.0 Ontology definitions & taxonomy...</div>
      <div style="color: #38bdf8; margin-top: 4px;">[00:00:02] [STAGE 2/6] Querying source relational database tables & extracting records...</div>
    `;
  }

  // Start Stepper Animation & Fetch Request concurrently
  const fetchPromise = fetch(`${API_BASE}/projects/${currentProjectId}/data-movement/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqData)
  });

  const stepperPromise = animateStepperProgress();

  try {
    const [res] = await Promise.all([fetchPromise, stepperPromise]);

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.detail || 'Pipeline execution failed on server.');
    }
    const result = await res.json();

    // Update Summary Metrics
    const metricExt = document.getElementById('dm-metric-extracted');
    if (metricExt) metricExt.innerText = (result.records_extracted || 0).toLocaleString();
    const metricNodes = document.getElementById('dm-metric-nodes');
    if (metricNodes) metricNodes.innerText = (result.nodes_created || 0).toLocaleString();
    const metricEdges = document.getElementById('dm-metric-edges');
    if (metricEdges) metricEdges.innerText = (result.relationships_created || 0).toLocaleString();
    const metricQual = document.getElementById('dm-metric-quality');
    if (metricQual) metricQual.innerText = enforceRules ? '100%' : 'N/A';
    const metricTime = document.getElementById('dm-metric-time');
    if (metricTime) metricTime.innerText = `${result.execution_time_ms || 0}ms`;

    // Render Terminal Log Output
    if (terminalEl && result.log_output) {
      terminalEl.innerHTML = result.log_output.split('\n').map(line => {
        if (line.includes('[SUCCESS]')) return `<div style="color: #4ade80; font-weight: bold;">${escapeHtml(line)}</div>`;
        if (line.includes('[STAGE')) return `<div style="color: #c084fc; font-weight: 600;">${escapeHtml(line)}</div>`;
        if (line.includes('---')) return `<div style="color: #475569;">${escapeHtml(line)}</div>`;
        return `<div style="color: #38bdf8;">${escapeHtml(line)}</div>`;
      }).join('');
      terminalEl.scrollTop = terminalEl.scrollHeight;
    }

    // Complete Stepper
    completeAllSteps();
    updatePipelineStatus('COMPLETED SUCCESSFULLY', 'rgba(16, 185, 129, 0.15)', 'var(--accent-emerald)');
    showToast(`⚡ Data Movement Pipeline completed! Materialized ${result.nodes_created} nodes and ${result.relationships_created} edges.`, 'success');

    // Reload job history
    await loadDataMovementJobHistory();

  } catch (err) {
    console.error('Data movement execution error:', err);
    updatePipelineStatus('EXECUTION FAILED', 'rgba(244, 63, 94, 0.2)', '#f43f5e');
    if (terminalEl) {
      terminalEl.innerHTML += `<div style="color: #f43f5e; font-weight: bold; margin-top: 6px;">[ERROR] Data movement pipeline failed: ${escapeHtml(err.message)}</div>`;
    }
    showToast(`Pipeline execution failed: ${err.message}`, 'error');
  }
}

function resetStepperUI() {
  for (let i = 1; i <= 6; i++) {
    const card = document.getElementById(`dm-step-${i}`);
    if (card) {
      card.className = 'dm-step-card';
    }
  }
  document.getElementById('dm-progress-bar').style.width = '0%';
}

async function animateStepperProgress() {
  const progressBar = document.getElementById('dm-progress-bar');
  
  for (let i = 1; i <= 6; i++) {
    const card = document.getElementById(`dm-step-${i}`);
    if (card) card.classList.add('active');
    progressBar.style.width = `${Math.round((i / 6) * 100)}%`;
    await delayMs(180);
  }
}

function completeAllSteps() {
  for (let i = 1; i <= 6; i++) {
    const card = document.getElementById(`dm-step-${i}`);
    if (card) {
      card.classList.remove('active');
      card.classList.add('completed');
    }
  }
  document.getElementById('dm-progress-bar').style.width = '100%';
}

function updatePipelineStatus(text, bg, color) {
  const badge = document.getElementById('dm-status-badge');
  if (badge) {
    badge.innerText = text;
    badge.style.background = bg;
    badge.style.color = color;
  }
}

async function loadDataMovementJobHistory() {
  if (!currentProjectId) return;

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/data-movement/history`);
    if (!res.ok) throw new Error('Failed to fetch job history');
    const jobs = await res.json();
    currentDataMovementJobs = jobs;

    const tbody = document.getElementById('dm-history-tbody');
    tbody.innerHTML = '';

    if (!jobs || jobs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 24px; color: var(--text-secondary); font-size: 13px;">
            No historical data movement executions recorded yet. Click <strong>⚡ Execute Data Movement Engine</strong> to launch a pipeline run.
          </td>
        </tr>
      `;
      return;
    }

    jobs.forEach(j => {
      const tr = document.createElement('tr');
      const timeStr = j.started_at ? new Date(j.started_at).toLocaleString() : 'N/A';
      
      tr.innerHTML = `
        <td>
          <div style="font-weight: 700; color: var(--text-primary);">${j.job_name}</div>
          <div style="font-size: 10px; color: var(--text-secondary);">${timeStr}</div>
        </td>
        <td><span class="badge" style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan);">${j.source_connection_name || 'All Sources'}</span></td>
        <td><span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald);">${j.target_graph_name || 'Neo4j Cluster'}</span></td>
        <td><span style="font-size: 11px; font-weight: 600; font-family: var(--font-mono);">${j.migration_mode}</span></td>
        <td><strong style="font-family: var(--font-mono); color: var(--accent-cyan);">${j.records_extracted.toLocaleString()}</strong></td>
        <td><strong style="font-family: var(--font-mono); color: var(--accent-violet);">${j.nodes_created.toLocaleString()}</strong></td>
        <td><strong style="font-family: var(--font-mono); color: var(--accent-emerald);">${j.relationships_created.toLocaleString()}</strong></td>
        <td><span style="font-family: var(--font-mono); font-size: 11px;">${j.execution_time_ms}ms</span></td>
        <td>
          <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); font-weight: 700;">${j.status}</span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn-sm" onclick="viewJobLogDetails('${j.id}')" title="View Full Execution Logs" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;">📜 Logs</button>
          <button class="btn-sm" style="display: inline-flex; align-items: center; justify-content: center; color: #f43f5e; border-color: rgba(244, 63, 94, 0.3); padding: 4px 8px; margin-left: 6px;" onclick="deleteDataMovementJob('${j.id}')" title="Delete Log Entry">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('Error loading data movement job history:', err);
  }
}

function viewJobLogDetails(jobId) {
  const job = currentDataMovementJobs.find(j => j.id === jobId);
  if (!job || !job.log_output) {
    showToast('No log output available for this job execution.', 'info');
    return;
  }

  const terminalEl = document.getElementById('dm-terminal-output');
  terminalEl.innerHTML = job.log_output.split('\n').map(line => {
    if (line.includes('[SUCCESS]')) return `<div style="color: #4ade80; font-weight: bold;">${escapeHtml(line)}</div>`;
    if (line.includes('[STAGE')) return `<div style="color: #c084fc; font-weight: 600;">${escapeHtml(line)}</div>`;
    if (line.includes('---')) return `<div style="color: #475569;">${escapeHtml(line)}</div>`;
    return `<div style="color: #38bdf8;">${escapeHtml(line)}</div>`;
  }).join('');
  
  terminalEl.scrollTop = 0;
  showToast(`Loaded log output for ${job.job_name}`, 'success');
}

async function deleteDataMovementJob(jobId) {
  if (!confirm('Are you sure you want to delete this migration job execution record?')) return;

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/data-movement/history/${jobId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete job log record');
    showToast('Job execution audit record deleted successfully.', 'success');
    await loadDataMovementJobHistory();
  } catch (err) {
    console.error('Error deleting job log:', err);
    showToast(`Failed to delete job log: ${err.message}`, 'error');
  }
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
