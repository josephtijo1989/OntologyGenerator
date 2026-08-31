/**
 * 🗺️ Source Table ➔ Ontology Concept ➔ Target Graph Node Lineage Matrix Module
 */

let currentLineageMatrixData = null;
let currentLineageLevel = 1; // 1 = Table Level, 2 = Column Level

async function loadSchemaMappingMatrix() {
  if (!currentProjectId) {
    if (typeof showToast === 'function') showToast('Select or create a project first', 'warning');
    return;
  }

  const loader = document.getElementById('matrix-loading-spinner');
  const container = document.getElementById('matrix-content-container');

  if (loader) loader.style.display = 'block';
  if (container) container.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/data-movement/lineage-matrix`);
    if (!res.ok) {
      throw new Error('Failed to fetch semantic lineage matrix');
    }

    currentLineageMatrixData = await res.json();
    renderLineageMatrixSummary(currentLineageMatrixData.summary || {});
    switchLineageLevel(currentLineageLevel);

    if (container) container.style.display = 'flex';
  } catch (e) {
    console.error('Schema Matrix Error:', e);
    if (typeof showToast === 'function') showToast(`Lineage Matrix Error: ${e.message}`, 'error');
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

function renderLineageMatrixSummary(summary) {
  const kpiTables = document.getElementById('kpi-matrix-tables');
  const kpiClasses = document.getElementById('kpi-matrix-classes');
  const kpiCols = document.getElementById('kpi-matrix-cols');
  const kpiRels = document.getElementById('kpi-matrix-rels');

  if (kpiTables) kpiTables.innerText = `${summary.total_tables_mapped || 0} Tables`;
  if (kpiClasses) kpiClasses.innerText = `${summary.total_ontology_classes || 0} Concepts`;
  if (kpiCols) kpiCols.innerText = `${summary.total_columns_mapped || 0} Mappings`;
  if (kpiRels) kpiRels.innerText = `${summary.total_object_relationships || 0} Edges`;
}

function switchLineageLevel(level) {
  currentLineageLevel = level;

  const btnLevel1 = document.getElementById('btn-matrix-level1');
  const btnLevel2 = document.getElementById('btn-matrix-level2');
  const tableLevel1 = document.getElementById('matrix-table-level1');
  const tableLevel2 = document.getElementById('matrix-table-level2');

  if (btnLevel1 && btnLevel2) {
    if (level === 1) {
      btnLevel1.style.background = 'linear-gradient(135deg, #0284c7, #8b5cf6)';
      btnLevel1.style.color = '#ffffff';
      btnLevel2.style.background = 'transparent';
      btnLevel2.style.color = 'var(--text-secondary)';
      if (tableLevel1) tableLevel1.style.display = 'table';
      if (tableLevel2) tableLevel2.style.display = 'none';
    } else {
      btnLevel2.style.background = 'linear-gradient(135deg, #0284c7, #8b5cf6)';
      btnLevel2.style.color = '#ffffff';
      btnLevel1.style.background = 'transparent';
      btnLevel1.style.color = 'var(--text-secondary)';
      if (tableLevel2) tableLevel2.style.display = 'table';
      if (tableLevel1) tableLevel1.style.display = 'none';
    }
  }

  filterLineageMatrixTable();
}

function filterLineageMatrixTable() {
  if (!currentLineageMatrixData) return;

  const q = (document.getElementById('matrix-search-input')?.value || '').toLowerCase().trim();

  if (currentLineageLevel === 1) {
    renderLevel1Table(currentLineageMatrixData.table_mappings || [], q);
  } else {
    renderLevel2Table(currentLineageMatrixData.column_mappings || [], q);
  }
}

function renderLevel1Table(tables, query) {
  const tbody = document.getElementById('matrix-level1-tbody');
  if (!tbody) return;

  let filtered = tables;
  if (query) {
    filtered = tables.filter(t => 
      (t.full_source_table || '').toLowerCase().includes(query) ||
      (t.ontology_concept || '').toLowerCase().includes(query) ||
      (t.target_graph_node || '').toLowerCase().includes(query)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-secondary);">No table-to-concept mappings found matching search.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(t => {
    html += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 12px 14px;">
          <div style="font-weight: 700; color: var(--accent-cyan); font-family: var(--font-mono);">${escapeHtml(t.full_source_table)}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${t.row_count || 0} rows</div>
        </td>
        <td style="padding: 12px 14px;"><span class="badge" style="background: rgba(6, 182, 212, 0.12); color: var(--accent-cyan); font-size: 11px;">${escapeHtml(t.source_schema)}</span></td>
        <td style="padding: 12px 14px;">
          <div style="font-weight: 700; color: var(--accent-violet); font-family: var(--font-mono);">${escapeHtml(t.ontology_concept)}</div>
          <div style="font-size: 10px; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; max-width: 180px;">${escapeHtml(t.ontology_iri || '')}</div>
        </td>
        <td style="padding: 12px 14px;"><span class="badge" style="background: rgba(168, 85, 247, 0.12); color: var(--accent-violet); font-size: 11px;">${escapeHtml(t.domain_type)}</span></td>
        <td style="padding: 12px 14px;">
          <div style="font-weight: 700; color: var(--accent-emerald); font-family: var(--font-mono);">${escapeHtml(t.target_graph_node)}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">PK: ${escapeHtml(t.primary_key || 'id')}</div>
        </td>
        <td style="text-align: center; padding: 12px 14px;">
          <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-primary); font-size: 11px;">${t.attributes_count || 0} Attrs</span>
        </td>
        <td style="text-align: center; padding: 12px 14px;">
          <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: var(--accent-violet); font-size: 11px;">${t.relationships_count || 0} Rels</span>
        </td>
        <td style="text-align: right; padding: 12px 14px;">
          <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); font-size: 11px; font-weight: 700;">✅ ${escapeHtml(t.status)}</span>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderLevel2Table(columns, query) {
  const tbody = document.getElementById('matrix-level2-tbody');
  if (!tbody) return;

  let filtered = columns;
  if (query) {
    filtered = columns.filter(c => 
      (c.source_table || '').toLowerCase().includes(query) ||
      (c.source_column || '').toLowerCase().includes(query) ||
      (c.ontology_concept || '').toLowerCase().includes(query) ||
      (c.ontology_attribute || '').toLowerCase().includes(query) ||
      (c.target_graph_property || '').toLowerCase().includes(query)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-secondary);">No column-to-attribute mappings found matching search.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(c => {
    const isPk = c.is_primary_key ? `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); font-size: 10px; padding: 1px 4px; margin-left: 4px;">PK</span>` : '';
    const isFk = c.is_foreign_key ? `<span class="badge" style="background: rgba(168, 85, 247, 0.2); color: var(--accent-violet); font-size: 10px; padding: 1px 4px; margin-left: 4px;">FK</span>` : '';
    const isObj = c.property_type === 'ObjectProperty';

    html += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 12px 14px;"><span style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: 12px; font-weight: 700;">${escapeHtml(c.source_table)}</span></td>
        <td style="padding: 12px 14px;">
          <span style="font-weight: 700; color: var(--text-primary); font-family: var(--font-mono);">${escapeHtml(c.source_column)}</span>${isPk}${isFk}
        </td>
        <td style="padding: 12px 14px;"><span class="badge" style="background: rgba(255,255,255,0.06); font-family: var(--font-mono); font-size: 11px;">${escapeHtml(c.source_data_type)}</span></td>
        <td style="padding: 12px 14px;"><span style="color: var(--accent-violet); font-weight: 700; font-family: var(--font-mono); font-size: 12px;">:${escapeHtml(c.ontology_concept)}</span></td>
        <td style="padding: 12px 14px;"><span style="font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); font-size: 12px;">${escapeHtml(c.ontology_attribute)}</span></td>
        <td style="padding: 12px 14px;">
          <span class="badge" style="background: ${isObj ? 'rgba(168, 85, 247, 0.15)' : 'rgba(6, 182, 212, 0.15)'}; color: ${isObj ? 'var(--accent-violet)' : 'var(--accent-cyan)'}; font-size: 11px;">
            ${escapeHtml(c.property_type)}
          </span>
        </td>
        <td style="padding: 12px 14px;"><span class="badge" style="background: rgba(255,255,255,0.06); color: var(--accent-cyan); font-family: var(--font-mono); font-size: 11px;">${escapeHtml(c.range_datatype)}</span></td>
        <td style="padding: 12px 14px;"><span style="font-weight: 700; color: var(--accent-emerald); font-family: var(--font-mono); font-size: 12px;">${escapeHtml(c.target_graph_property)}</span></td>
        <td style="text-align: right; padding: 12px 14px;">
          <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); font-size: 11px; font-weight: 700;">✅ ${escapeHtml(c.status)}</span>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function exportLineageMatrixJSON() {
  if (!currentLineageMatrixData) {
    if (typeof showToast === 'function') showToast('No lineage matrix data to export', 'warning');
    return;
  }

  const str = JSON.stringify(currentLineageMatrixData, null, 2);
  const blob = new Blob([str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `semantic_lineage_matrix_${currentProjectId}.json`;
  a.click();
  URL.revokeObjectURL(url);

  if (typeof showToast === 'function') showToast('📥 Lineage Mapping Matrix exported to JSON!', 'success');
}
