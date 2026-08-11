// Business Rules Engine & Governance Module
let currentMetadataForRules = [];
let currentAttributesForRules = [];
let currentProjectRulesList = [];

// Combobox Helper Functions
function openCombobox(listId) {
  document.querySelectorAll('.combobox-options-dropdown').forEach(el => el.style.display = 'none');
  const targetList = document.getElementById(listId);
  if (targetList) targetList.style.display = 'block';
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.custom-combobox')) {
    document.querySelectorAll('.combobox-options-dropdown').forEach(el => el.style.display = 'none');
  }
});

async function fetchMetadataForRules() {
  if (!currentProjectId) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/metadata?_t=${Date.now()}`);
    if (res.ok) {
      currentMetadataForRules = await res.json();
      renderEntityComboboxOptions('');
    }
  } catch (e) { console.log(e); }
}

function renderEntityComboboxOptions(searchTerm = '') {
  const listEl = document.getElementById('nr-entity-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const selectedVal = document.getElementById('nr-entity')?.value || '';
  const term = (searchTerm || '').toLowerCase();

  const clearOpt = document.createElement('div');
  clearOpt.className = 'combobox-option-item';
  clearOpt.innerHTML = `<span style="color: var(--text-secondary); font-style: italic;">-- None (Global Project Rule) --</span>`;
  clearOpt.onclick = () => selectEntityComboboxOption('', '');
  listEl.appendChild(clearOpt);

  currentMetadataForRules.forEach(cat => {
    const labelName = cat.custom_class_label || cat.table_name;
    const fullText = `${labelName} ${cat.schema_name}.${cat.table_name}`.toLowerCase();

    if (!term || fullText.includes(term)) {
      const item = document.createElement('div');
      item.className = `combobox-option-item ${selectedVal.toLowerCase() === labelName.toLowerCase() ? 'selected' : ''}`;
      item.innerHTML = `
        <span style="font-weight: 600;">📦 ${labelName}</span>
        <span style="font-size: 11px; color: var(--text-secondary); font-family: var(--font-mono);">(${cat.schema_name}.${cat.table_name})</span>
      `;
      item.onclick = () => selectEntityComboboxOption(labelName, `${labelName} (${cat.schema_name}.${cat.table_name})`);
      listEl.appendChild(item);
    }
  });

  if (listEl.children.length === 1 && term) {
    const noResult = document.createElement('div');
    noResult.className = 'combobox-option-item';
    noResult.innerHTML = `<span style="color: var(--text-secondary); font-size: 12px;">No matching entities found</span>`;
    listEl.appendChild(noResult);
  }
}

function filterEntityCombobox(val) {
  openCombobox('nr-entity-list');
  renderEntityComboboxOptions(val);
}

function selectEntityComboboxOption(val, label) {
  const searchInput = document.getElementById('nr-entity-search');
  const hiddenInput = document.getElementById('nr-entity');
  const listEl = document.getElementById('nr-entity-list');

  if (searchInput) searchInput.value = label || val || '';
  if (hiddenInput) hiddenInput.value = val || '';
  if (listEl) listEl.style.display = 'none';

  onRuleEntityChanged(val);
}

function onRuleEntityChanged(entityName) {
  currentAttributesForRules = [];
  const attrSearch = document.getElementById('nr-attribute-search');
  const attrHidden = document.getElementById('nr-attribute');
  if (attrSearch) attrSearch.value = '';
  if (attrHidden) attrHidden.value = '';

  if (!entityName) {
    renderAttributeComboboxOptions('');
    return;
  }

  const cat = currentMetadataForRules.find(c =>
    (c.table_name && c.table_name.toLowerCase() === entityName.toLowerCase()) ||
    (c.schema_name && `${c.schema_name}.${c.table_name}`.toLowerCase() === entityName.toLowerCase()) ||
    (c.custom_class_label && c.custom_class_label.toLowerCase() === entityName.toLowerCase())
  );

  if (cat) {
    const rawCols = cat.columns || cat.columns_json || [];
    if (Array.isArray(rawCols)) {
      rawCols.forEach(col => {
        const cname = typeof col === 'string' ? col : (col.column_name || col.name);
        const ctype = typeof col === 'object' ? (col.data_type || col.type || '') : '';
        const isPk = typeof col === 'object' ? Boolean(col.is_primary_key || col.primary_key) : false;
        const isFk = typeof col === 'object' ? Boolean(col.is_foreign_key || col.foreign_key) : false;
        const piiTag = typeof col === 'object' ? (col.pii_tag || '') : '';
        if (cname) {
          currentAttributesForRules.push({
            name: cname,
            type: ctype,
            is_pk: isPk,
            is_fk: isFk,
            pii_tag: piiTag
          });
        }
      });
    }
  }
  renderAttributeComboboxOptions('');
}

function renderAttributeComboboxOptions(searchTerm = '') {
  const listEl = document.getElementById('nr-attribute-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const selectedVal = document.getElementById('nr-attribute')?.value || '';
  const term = (searchTerm || '').toLowerCase();

  const clearOpt = document.createElement('div');
  clearOpt.className = 'combobox-option-item';
  clearOpt.innerHTML = `<span style="color: var(--text-secondary); font-style: italic;">-- None (Entire Entity Rule) --</span>`;
  clearOpt.onclick = () => selectAttributeComboboxOption('', '-- None (Entire Entity Rule) --');
  listEl.appendChild(clearOpt);

  currentAttributesForRules.forEach(attr => {
    const attrName = attr.name;
    if (!term || attrName.toLowerCase().includes(term)) {
      const item = document.createElement('div');
      item.className = `combobox-option-item ${selectedVal.toLowerCase() === attrName.toLowerCase() ? 'selected' : ''}`;
      
      const pkBadge = attr.is_pk ? ` <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); font-weight: 700; font-size: 9px; padding: 1px 4px;">🔑 PK</span>` : '';
      const fkBadge = attr.is_fk ? ` <span class="badge" style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); font-weight: 600; font-size: 9px; padding: 1px 4px;">🔗 FK</span>` : '';
      const piiBadge = (attr.pii_tag && attr.pii_tag !== 'NONE') ? ` <span style="color: var(--accent-rose); font-weight: 700; font-size: 9px;">🛡️ ${attr.pii_tag.replace(/_/g, ' ')}</span>` : '';

      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-weight: 600;">🏷️ ${attrName}</span>
          ${pkBadge}${fkBadge}${piiBadge}
        </div>
        ${attr.type ? `<span style="font-size: 11px; color: var(--text-secondary); font-family: var(--font-mono);">${attr.type}</span>` : ''}
      `;
      item.onclick = () => selectAttributeComboboxOption(attrName, attrName);
      listEl.appendChild(item);
    }
  });

  if (listEl.children.length === 1 && term) {
    const noResult = document.createElement('div');
    noResult.className = 'combobox-option-item';
    noResult.innerHTML = `<span style="color: var(--text-secondary); font-size: 12px;">No matching attributes found</span>`;
    listEl.appendChild(noResult);
  }
}

function filterAttributeCombobox(val) {
  openCombobox('nr-attribute-list');
  renderAttributeComboboxOptions(val);
}

function selectAttributeComboboxOption(val, label) {
  const searchInput = document.getElementById('nr-attribute-search');
  const hiddenInput = document.getElementById('nr-attribute');
  const listEl = document.getElementById('nr-attribute-list');

  if (searchInput) searchInput.value = label || val || '';
  if (hiddenInput) hiddenInput.value = val || '';
  if (listEl) listEl.style.display = 'none';
}

async function openRuleModal() {
  document.getElementById('editing-rule-id').value = '';
  document.getElementById('ruleModalTitle').innerText = 'Create Business Rule';
  document.getElementById('nr-name').value = '';
  document.getElementById('nr-def').value = '';
  document.getElementById('nr-entity-search').value = '';
  document.getElementById('nr-entity').value = '';
  document.getElementById('nr-attribute-search').value = '';
  document.getElementById('nr-attribute').value = '';

  openModal('ruleModal');
  await fetchMetadataForRules();
}

async function openEditRuleModal(ruleId) {
  const rule = currentProjectRulesList.find(r => r.id === ruleId);
  if (!rule) return;

  document.getElementById('editing-rule-id').value = rule.id;
  document.getElementById('ruleModalTitle').innerText = 'Edit Business Rule';
  document.getElementById('nr-name').value = rule.name || '';
  document.getElementById('nr-def').value = rule.rule_definition || (rule.definition_json ? rule.definition_json.description : '') || '';

  openModal('ruleModal');
  await fetchMetadataForRules();

  const targetEntity = rule.target_entity || (rule.definition_json ? rule.definition_json.target_table : '') || '';
  if (targetEntity) {
    const cat = currentMetadataForRules.find(c =>
      c.table_name.toLowerCase() === targetEntity.toLowerCase() ||
      (c.custom_class_label && c.custom_class_label.toLowerCase() === targetEntity.toLowerCase())
    );
    const displayLabel = cat ? `${cat.custom_class_label || cat.table_name} (${cat.schema_name}.${cat.table_name})` : targetEntity;
    selectEntityComboboxOption(targetEntity, displayLabel);
  }

  const targetAttr = rule.target_attribute || (rule.definition_json ? rule.definition_json.target_column : '') || '';
  if (targetAttr) {
    selectAttributeComboboxOption(targetAttr);
  }
}

async function loadRules() {
  if (!currentProjectId) return;
  const tbody = document.getElementById('rules-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">Loading business rules...</td></tr>`;
  }
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/rules?_t=${Date.now()}`);
    if (res.ok) {
      const rules = await res.json();
      currentProjectRulesList = rules;
      if (!tbody) return;
      tbody.innerHTML = '';
      if (rules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">No business rules created yet for this project. Click "+ Add Business Rule".</td></tr>`;
        return;
      }
      rules.forEach(r => {
        const tr = document.createElement('tr');
        const entityText = r.target_entity || (r.definition_json ? r.definition_json.target_table : '') || 'Global';
        const attrText = r.target_attribute || (r.definition_json ? r.definition_json.target_column : '') || '';

        const plainDef = r.rule_definition || (r.definition_json ? (r.definition_json.description || JSON.stringify(r.definition_json)) : 'Enterprise Governance Rule');

        tr.innerHTML = `
          <td class="font-bold" style="color: var(--text-primary); font-size: 13px;">${r.name}</td>
          <td>
            <span class="badge" style="background: rgba(2, 132, 199, 0.15); color: #0284c7; font-weight: 600;">📦 ${entityText}</span>
            ${attrText ? `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #d97706; font-weight: 600; margin-left: 4px;">🏷️ ${attrText}</span>` : ''}
          </td>
          <td style="font-size: 13px; color: var(--text-primary); line-height: 1.4;">${plainDef}</td>
          <td><span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); font-weight: 700;">ACTIVE</span></td>
          <td style="white-space: nowrap;">
            <button class="btn-secondary" style="font-size: 11px; padding: 3px 8px; margin-right: 4px;" onclick="openEditRuleModal('${r.id}')">✏️ Edit</button>
            <button class="btn-danger" style="font-size: 11px; padding: 3px 8px;" onclick="deleteRule('${r.id}')">🗑️ Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">No business rules created yet for this project. Click "+ Add Business Rule".</td></tr>`;
    }
  } catch (e) { console.log(e); }
}

async function submitCreateRule() {
  if (!currentProjectId) { alert('Select a project first.'); return; }
  const ruleId = document.getElementById('editing-rule-id')?.value;
  const name = document.getElementById('nr-name')?.value;
  const entity = document.getElementById('nr-entity')?.value;
  const attribute = document.getElementById('nr-attribute')?.value;
  const ruleDef = document.getElementById('nr-def')?.value;

  if (!name) { alert('Please enter a Rule Name.'); return; }
  if (!ruleDef) { alert('Please enter a Plain English Rule Definition.'); return; }

  const payload = {
    name,
    rule_type: 'VALIDATION',
    rule_definition: ruleDef,
    target_entity: entity || null,
    target_attribute: attribute || null,
    definition_json: {
      description: ruleDef,
      target_table: entity || null,
      target_column: attribute || null
    }
  };

  try {
    const isEdit = Boolean(ruleId);
    const url = isEdit ? `${API_BASE}/projects/${currentProjectId}/rules/${ruleId}` : `${API_BASE}/projects/${currentProjectId}/rules`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeModal('ruleModal');
      document.getElementById('editing-rule-id').value = '';
      document.getElementById('nr-name').value = '';
      document.getElementById('nr-def').value = '';
      document.getElementById('nr-entity-search').value = '';
      document.getElementById('nr-entity').value = '';
      document.getElementById('nr-attribute-search').value = '';
      document.getElementById('nr-attribute').value = '';

      loadRules();
      if (typeof showToast === 'function') showToast(`Business Rule ${isEdit ? 'Updated' : 'Saved'} Successfully!`, 'success');
    } else {
      const err = await res.json();
      alert(`Error saving rule: ${err.detail || 'Failed'}`);
    }
  } catch (e) { alert('Network error saving rule.'); }
}

async function deleteRule(ruleId) {
  let confirmed = false;
  if (typeof showConfirm === 'function') {
    confirmed = await showConfirm('Are you sure you want to delete this business rule?', 'Delete Business Rule', '🗑️ Delete Rule');
  } else {
    confirmed = confirm('Are you sure you want to delete this business rule?');
  }
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/rules/${ruleId}`, { method: 'DELETE' });
    if (res.ok) {
      loadRules();
      if (typeof showToast === 'function') showToast('Business Rule Deleted Successfully!', 'info');
    }
  } catch (e) { console.log(e); }
}

async function loadAuditLogs() {
  try {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (res.ok) {
      const logs = await res.json();
      const tbody = document.getElementById('audit-tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      logs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono">${new Date(l.created_at).toLocaleString()}</td>
          <td class="font-bold">${l.action}</td>
          <td><span class="badge">${l.entity_type}</span></td>
          <td style="color: var(--accent-emerald); font-weight: 600;">${l.outcome}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (e) { console.log(e); }
}
