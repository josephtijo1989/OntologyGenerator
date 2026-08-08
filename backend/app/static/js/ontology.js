// OWL Ontology Management Module
let currentOntologyModel = null;
let selectedOntologyClassIdx = null;

function renderPropertyRowHtml(p, idxOrPrefix, isModal = false) {
  const pLabel = (p.relationship_name || p.label || p.name || '').trim();
  const pType = p.property_type || 'DatatypeProperty';
  const rawRange = p.range ? String(p.range) : (pType === 'ObjectProperty' ? (p.target_class || 'TargetClass') : 'xsd:string');
  const rangeTarget = rawRange.includes('#') ? rawRange.split('#').pop() : rawRange;
  const parentCls = p.parent_class || '';
  const targetCls = p.target_class || (pType === 'ObjectProperty' ? rangeTarget : '');
  const invName = p.inverse_property || p.inverse_property_name || '';
  const isPk = Boolean(p.is_primary_key);

  const availableClasses = (currentOntologyModel && currentOntologyModel.classes) 
    ? currentOntologyModel.classes.map(c => c.label) 
    : [];

  let rangeOptions = '';
  if (pType === 'ObjectProperty') {
    rangeOptions = availableClasses.map(cName => `<option value="${cName}" ${cName.toLowerCase() === targetCls.toLowerCase() ? 'selected' : ''}>${cName}</option>`).join('');
    if (!availableClasses.some(cName => cName.toLowerCase() === targetCls.toLowerCase()) && targetCls) {
      rangeOptions += `<option value="${targetCls}" selected>${targetCls}</option>`;
    }
  }

  return `
    <tr class="prop-row-item" data-type="${pType}">
      <td>
        <input type="text" class="prop-label-input" value="${pLabel}" placeholder="${pType === 'ObjectProperty' ? 'e.g. relatesToCustomer' : 'e.g. hasEmail'}" style="padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;">
      </td>
      <td>
        <select class="prop-type-select" onchange="onPropTypeChanged(this)" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px; width: 100%;">
          <option value="DatatypeProperty" ${pType === 'DatatypeProperty' ? 'selected' : ''}>📊 Datatype (Attribute)</option>
          <option value="ObjectProperty" ${pType === 'ObjectProperty' ? 'selected' : ''}>🔗 Object (Relationship)</option>
        </select>
      </td>
      <td>
        <input type="text" class="prop-range-input" value="${rangeTarget}" placeholder="${pType === 'ObjectProperty' ? 'TargetClass' : 'xsd:string'}" style="padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;">
      </td>
      <td>
        <input type="text" class="prop-parent-input" value="${parentCls}" placeholder="Parent/Domain Class" style="padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;">
      </td>
      <td>
        <input type="text" class="prop-inverse-input" value="${invName}" placeholder="${pType === 'ObjectProperty' ? 'e.g. hasOrdersList' : 'N/A'}" ${pType !== 'ObjectProperty' ? 'disabled style="opacity: 0.5; padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-secondary); border-radius: 4px;"' : 'style="padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;"'}>
      </td>
      <td style="text-align: center;">
        <input type="checkbox" class="prop-pk-input" ${isPk ? 'checked' : ''} ${pType === 'ObjectProperty' ? 'disabled' : ''} title="Primary Key" style="cursor: pointer; transform: scale(1.1);">
      </td>
      <td style="text-align: center;">
        <button class="btn-danger" style="padding: 2px 6px; font-size: 11px;" onclick="this.closest('tr').remove()" title="Delete Property">🗑️</button>
      </td>
    </tr>
  `;
}

function onPropTypeChanged(selectEl) {
  const row = selectEl.closest('tr');
  if (!row) return;
  const isObj = selectEl.value === 'ObjectProperty';
  const rangeInput = row.querySelector('.prop-range-input');
  const invInput = row.querySelector('.prop-inverse-input');
  const pkInput = row.querySelector('.prop-pk-input');

  if (isObj) {
    if (rangeInput && rangeInput.value.startsWith('xsd:')) rangeInput.value = 'TargetClass';
    if (invInput) {
      invInput.disabled = false;
      invInput.style.opacity = '1';
      invInput.placeholder = 'e.g. hasInverseRelationship';
    }
    if (pkInput) {
      pkInput.checked = false;
      pkInput.disabled = true;
    }
  } else {
    if (rangeInput && !rangeInput.value.startsWith('xsd:')) rangeInput.value = 'xsd:string';
    if (invInput) {
      invInput.disabled = true;
      invInput.style.opacity = '0.5';
      invInput.placeholder = 'N/A';
    }
    if (pkInput) {
      pkInput.disabled = false;
    }
  }
}

async function loadOntology() {
  if (!currentProjectId) return;
  const list = document.getElementById('ontology-list');
  if (list) {
    list.innerHTML = '<div style="color: var(--text-secondary); padding: 20px; text-align: center;">Loading W3C ontology...</div>';
  }
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/ontology/generate?_t=${Date.now()}`);
    if (res.ok) {
      currentOntologyModel = await res.json();
      if (!list) return;
      list.innerHTML = '';
      if (!currentOntologyModel.classes || currentOntologyModel.classes.length === 0) {
        list.innerHTML = '<div style="color: var(--text-secondary); padding: 20px; text-align: center;">No ontology classes generated yet. Run Auto Discovery first under Metadata Discovery tab.</div>';
        return;
      }

      currentOntologyModel.classes.forEach((c, idx) => {
        const domainType = c.annotations ? (c.annotations.domain_type || 'Transactional') : 'Transactional';
        const subClass = c.subclass_of ? (c.subclass_of[0] || 'owl:Thing') : 'owl:Thing';
        const comment = c.comment || `Class representing ${c.label}`;

        const tblName = c.annotations ? (c.annotations.table_name || '') : '';
        const matchingProps = currentOntologyModel.properties ? currentOntologyModel.properties.filter(p =>
          p && (p.domain === c.iri ||
          p.parent_class === c.label ||
          (tblName && p.table_name && p.table_name.toLowerCase() === tblName.toLowerCase()) ||
          (p.domain && p.domain.toLowerCase() === (c.iri || '').toLowerCase()))
        ) : [];

        const dataProps = matchingProps.filter(p => p.property_type === 'DatatypeProperty');
        const objProps = matchingProps.filter(p => p.property_type === 'ObjectProperty');
        const pkProps = dataProps.filter(p => p.is_primary_key);

        let propRowsHtml = '';
        if (matchingProps && matchingProps.length > 0) {
          matchingProps.forEach(p => {
            try {
              if (p) propRowsHtml += renderPropertyRowHtml(p, idx, false);
            } catch (eProp) {}
          });
        }

        const div = document.createElement('div');
        div.style.background = 'var(--bg-surface)';
        div.style.padding = '16px';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid var(--border-color)';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.gap = '8px';

        const pKeys = c.primary_keys || (c.annotations ? c.annotations.primary_keys : []) || [];
        const pkBadge = (pKeys.length > 0 || pkProps.length > 0) 
          ? `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); font-size: 11px; font-weight: 700;">🔑 Primary Key: ${pKeys.join(', ') || pkProps.map(p => p.label).join(', ')}</span>` 
          : '';

        const bRules = c.business_rules || [];
        let rulesBadgeHtml = '';
        if (bRules.length > 0) {
          const ruleTags = bRules.map(r => {
            const rName = r.name || 'Business Rule';
            const rDef = r.rule_definition || (typeof r.definition_json === 'string' ? r.definition_json : (r.definition_json ? r.definition_json.description : '')) || '';
            const rAttr = r.target_attribute || (r.definition_json ? r.definition_json.target_column : '') || '';
            const attrTag = rAttr ? `<span style="background: #fef3c7; color: #d97706; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">🏷️ ${rAttr}</span>` : '';
            const defText = rDef ? `: <span style="font-style: italic; color: #334155;">"${rDef}"</span>` : '';
            return `<div style="background: #f0f9ff; color: #0284c7; font-size: 11px; border: 1px solid #bae6fd; border-radius: 6px; padding: 4px 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">⚙️ ${rName}${attrTag}${defText}</div>`;
          }).join(' ');
          rulesBadgeHtml = `<div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;"><span style="font-size: 11px; color: var(--text-secondary); font-weight: 700;">Incorporated Business Rules:</span> <div style="display: flex; flex-wrap: wrap; gap: 6px;">${ruleTags}</div></div>`;
        }

        // Relationships badges summary
        let relsBadgeHtml = '';
        if (objProps.length > 0) {
          const relTags = objProps.map(op => {
            const relName = op.relationship_name || op.label;
            const tgt = op.target_class || (op.range ? String(op.range).split('#').pop() : 'Class');
            const inv = op.inverse_property ? ` ⇄ <span style="color: #4338ca; font-weight: 600;">${op.inverse_property}</span>` : '';
            return `<span style="background: rgba(16, 185, 129, 0.15); color: #047857; font-size: 11px; padding: 3px 8px; border-radius: 6px; border: 1px solid #a7f3d0; display: inline-flex; align-items: center; gap: 4px;">🔗 <strong>${relName}</strong> ➔ ${tgt}${inv}</span>`;
          }).join(' ');
          relsBadgeHtml = `<div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 4px;"><span style="font-size: 11px; color: var(--text-secondary); font-weight: 700;">Relationships & Inverse:</span> ${relTags}</div>`;
        }

        div.innerHTML = `
          <div class="flex-between">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <strong style="color: var(--accent-cyan); font-size: 17px;">${c.label}</strong>
              <span class="badge" style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); font-size: 11px;">${domainType}</span>
              <span class="badge" style="background: rgba(100, 116, 139, 0.15); color: var(--text-secondary); font-size: 11px;">📦 Mapped Table: ${c.mapped_table_name || c.label}</span>
              ${pkBadge}
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn-secondary" style="font-size: 11px; padding: 4px 10px;" onclick="toggleInlineEdit(${idx})">✏️ Quick Edit</button>
              <button class="btn-primary" style="font-size: 11px; padding: 4px 10px;" onclick="openOntologyClassModal(${idx})">🔍 Full Modal & Properties</button>
            </div>
          </div>

          <div style="color: var(--text-secondary); font-size: 12px; margin-top: 2px;">
            rdfs:subClassOf <span class="font-mono" style="color: var(--accent-violet); font-weight: 600;">${subClass}</span>
            <span style="margin-left: 12px; color: #64748b; font-family: var(--font-mono); font-size: 11px;">IRI: ${c.iri}</span>
          </div>

          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
            Comment: <em>${comment}</em>
          </div>

          ${relsBadgeHtml}
          ${rulesBadgeHtml}

          <!-- Inline Quick Edit Form -->
          <div id="inline-edit-${idx}" style="display: none; margin-top: 10px; padding: 12px; border: 1px dashed var(--accent-cyan); background: rgba(6, 182, 212, 0.05); border-radius: 6px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 11px;">Class Label Name</label>
                <input type="text" id="inline-label-${idx}" value="${c.label}" style="padding: 4px 8px; font-size: 12px;">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 11px;">Superclass Taxonomy / Parent</label>
                <input type="text" id="inline-subclass-${idx}" value="${subClass}" style="padding: 4px 8px; font-size: 12px;">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 11px;">Domain Classification</label>
                <select id="inline-domain-${idx}" style="padding: 4px 8px; font-size: 12px; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
                  <option value="Lookup" ${domainType==='Lookup'?'selected':''}>Lookup</option>
                  <option value="Fact" ${domainType==='Fact'?'selected':''}>Fact</option>
                  <option value="Dimension" ${domainType==='Dimension'?'selected':''}>Dimension</option>
                  <option value="SCD" ${domainType==='SCD'?'selected':''}>SCD</option>
                  <option value="Transactional" ${domainType==='Transactional'?'selected':''}>Transactional</option>
                </select>
              </div>
            </div>
            <div class="form-group" style="margin-top: 8px; margin-bottom: 8px;">
              <label style="font-size: 11px;">Description / RDFS Comment</label>
              <input type="text" id="inline-comment-${idx}" value="${comment}" style="padding: 4px 8px; font-size: 12px; width: 100%;">
            </div>

            <div class="flex-between" style="margin-top: 10px;">
              <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">Associated Attributes, Relationships & Inverse</span>
              <div style="display: flex; gap: 6px;">
                <button class="btn-secondary" style="font-size: 11px; padding: 2px 8px;" onclick="addInlinePropRow(${idx}, 'DatatypeProperty')">➕ Add Datatype</button>
                <button class="btn-primary" style="font-size: 11px; padding: 2px 8px;" onclick="addInlinePropRow(${idx}, 'ObjectProperty')">🔗 Add Relationship</button>
              </div>
            </div>
            <div style="max-height: 220px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; margin-top: 6px;">
              <table class="data-table" style="font-size: 11px;">
                <thead>
                  <tr>
                    <th>Property / Rel Name</th>
                    <th>Type</th>
                    <th>Range / Target Class</th>
                    <th>Parent Class</th>
                    <th>Inverse Relationship</th>
                    <th style="width: 45px; text-align: center;">🔑 PK</th>
                    <th style="width: 40px; text-align: center;">Action</th>
                  </tr>
                </thead>
                <tbody id="inline-props-tbody-${idx}">
                  ${propRowsHtml}
                </tbody>
              </table>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
              <button class="btn-secondary" style="font-size: 11px; padding: 4px 10px;" onclick="toggleInlineEdit(${idx})">Cancel</button>
              <button class="btn-primary" style="font-size: 11px; padding: 4px 10px;" onclick="submitInlineUpdate(${idx})">💾 Save Changes & Properties</button>
            </div>
          </div>

          <div style="display: flex; gap: 16px; margin-top: 6px; font-size: 11px; color: var(--accent-cyan); border-top: 1px dashed var(--border-color); padding-top: 6px;">
            <span>📊 Data Properties: <strong>${dataProps.length}</strong></span>
            <span>🔗 Object Properties (Relationships): <strong>${objProps.length}</strong></span>
            <span>🔑 Primary Keys: <strong>${pKeys.length || pkProps.length}</strong></span>
          </div>
        `;
        list.appendChild(div);
      });
    } else {
      currentOntologyModel = null;
      if (list) {
        list.innerHTML = '<div style="color: var(--text-secondary); padding: 20px; text-align: center;">No ontology classes generated yet for this project. Run Auto Discovery first under Metadata Discovery tab.</div>';
      }
    }
  } catch (e) {
    currentOntologyModel = null;
    if (list) {
      list.innerHTML = '<div style="color: var(--text-secondary); padding: 20px; text-align: center;">No ontology classes generated yet for this project. Run Auto Discovery first under Metadata Discovery tab.</div>';
    }
  }
}

function toggleInlineEdit(idx) {
  const el = document.getElementById(`inline-edit-${idx}`);
  if (el) el.style.display = (el.style.display === 'none') ? 'block' : 'none';
}

function addInlinePropRow(idx, propType = 'DatatypeProperty') {
  const tbody = document.getElementById(`inline-props-tbody-${idx}`);
  if (!tbody) return;
  const currentClass = currentOntologyModel && currentOntologyModel.classes[idx] ? currentOntologyModel.classes[idx].label : 'CurrentClass';
  const newProp = {
    label: propType === 'ObjectProperty' ? 'relatesToTarget' : 'hasNewAttribute',
    relationship_name: propType === 'ObjectProperty' ? 'relatesToTarget' : 'hasNewAttribute',
    property_type: propType,
    range: propType === 'ObjectProperty' ? 'TargetClass' : 'xsd:string',
    parent_class: currentClass,
    target_class: propType === 'ObjectProperty' ? 'TargetClass' : '',
    inverse_property: propType === 'ObjectProperty' ? `has${currentClass}List` : '',
    is_inverse: false,
    is_primary_key: false
  };
  const tr = document.createElement('tr');
  tr.className = 'prop-row-item';
  tr.setAttribute('data-type', propType);
  tr.innerHTML = renderPropertyRowHtml(newProp, idx, false).replace(/<tr[^>]*>|<\/tr>/g, '');
  tbody.appendChild(tr);
}

async function submitInlineUpdate(idx) {
  if (!currentOntologyModel || !currentOntologyModel.classes[idx]) return;
  const targetClass = currentOntologyModel.classes[idx];
  const oldLabel = targetClass.label;
  const origTableName = targetClass.annotations ? (targetClass.annotations.table_name || targetClass.label) : targetClass.label;

  const newLabel = document.getElementById(`inline-label-${idx}`).value.trim();
  const newSubclass = document.getElementById(`inline-subclass-${idx}`).value.trim();
  const newDomain = document.getElementById(`inline-domain-${idx}`).value;
  const newComment = document.getElementById(`inline-comment-${idx}`).value.trim();

  const propRows = document.querySelectorAll(`#inline-props-tbody-${idx} tr`);
  const updatedProps = [];
  propRows.forEach(row => {
    const lIn = row.querySelector('.prop-label-input');
    const tSel = row.querySelector('.prop-type-select');
    const rIn = row.querySelector('.prop-range-input');
    const pIn = row.querySelector('.prop-parent-input');
    const invIn = row.querySelector('.prop-inverse-input');
    const pkIn = row.querySelector('.prop-pk-input');

    if (lIn && tSel && rIn) {
      const pType = tSel.value;
      const isObj = pType === 'ObjectProperty';
      updatedProps.push({
        label: lIn.value.trim(),
        relationship_name: lIn.value.trim(),
        property_type: pType,
        range: rIn.value.trim(),
        domain: `http://enterprise.org/ontology#${newLabel}`,
        parent_class: pIn ? pIn.value.trim() : newLabel,
        target_class: isObj ? rIn.value.trim() : null,
        inverse_property: (isObj && invIn) ? invIn.value.trim() : null,
        is_inverse: false,
        is_primary_key: pkIn ? pkIn.checked : false,
        table_name: origTableName
      });
    }
  });

  const payload = {
    label: newLabel,
    subclass_of: [newSubclass],
    comment: newComment,
    domain_type: newDomain,
    properties: updatedProps
  };

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/ontology/classes/${encodeURIComponent(oldLabel)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      if (typeof showToast === 'function') showToast(`Ontology Class "${newLabel}" & Properties Saved!`, 'success');
      await loadOntology();
    } else {
      const err = await res.json();
      if (typeof showToast === 'function') showToast(`Failed to update class: ${err.detail || 'Error'}`, 'error');
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('Network error updating ontology class', 'error');
  }
}

function openOntologyClassModal(target) {
  if (!currentOntologyModel || !currentOntologyModel.classes) return;

  let idx = -1;
  if (typeof target === 'number') {
    idx = target;
  } else if (typeof target === 'string') {
    const searchStr = target.toLowerCase().trim();
    idx = currentOntologyModel.classes.findIndex(c =>
      (c.label || '').toLowerCase().trim() === searchStr ||
      (c.annotations && c.annotations.table_name && c.annotations.table_name.toLowerCase().trim() === searchStr)
    );
  }

  if (idx < 0 || idx >= currentOntologyModel.classes.length) {
    if (typeof showToast === 'function') showToast(`Could not find Ontology Class for '${target}'`, 'error');
    return;
  }

  selectedOntologyClassIdx = idx;
  const c = currentOntologyModel.classes[idx];

  document.getElementById('ocm-old-label').value = c.label;
  document.getElementById('ocm-label').value = c.label;
  document.getElementById('ocm-subclass').value = c.subclass_of ? (c.subclass_of[0] || 'owl:Thing') : 'owl:Thing';
  document.getElementById('ocm-domain').value = c.annotations ? (c.annotations.domain_type || 'Transactional') : 'Transactional';
  document.getElementById('ocm-comment').value = c.comment || `Class representing ${c.label}`;

  const tblName = c.annotations ? (c.annotations.table_name || '') : '';
  const matchingProps = currentOntologyModel.properties ? currentOntologyModel.properties.filter(p =>
    p && (p.domain === c.iri ||
    p.parent_class === c.label ||
    (tblName && p.table_name && p.table_name.toLowerCase() === tblName.toLowerCase()) ||
    (p.domain && p.domain.toLowerCase() === (c.iri || '').toLowerCase()))
  ) : [];

  const tbody = document.getElementById('ocm-props-tbody');
  tbody.innerHTML = '';
  if (matchingProps && matchingProps.length > 0) {
    matchingProps.forEach(p => {
      if (!p) return;
      tbody.innerHTML += renderPropertyRowHtml(p, 'modal', true);
    });
  }

  openModal('ontologyClassModal');
}

function addPropertyRowToModal(propType = 'DatatypeProperty') {
  const tbody = document.getElementById('ocm-props-tbody');
  if (!tbody) return;
  const currentClass = (currentOntologyModel && currentOntologyModel.classes[selectedOntologyClassIdx]) 
    ? currentOntologyModel.classes[selectedOntologyClassIdx].label 
    : 'CurrentClass';

  const newProp = {
    label: propType === 'ObjectProperty' ? 'relatesToTarget' : 'hasNewAttribute',
    relationship_name: propType === 'ObjectProperty' ? 'relatesToTarget' : 'hasNewAttribute',
    property_type: propType,
    range: propType === 'ObjectProperty' ? 'TargetClass' : 'xsd:string',
    parent_class: currentClass,
    target_class: propType === 'ObjectProperty' ? 'TargetClass' : '',
    inverse_property: propType === 'ObjectProperty' ? `has${currentClass}List` : '',
    is_inverse: false,
    is_primary_key: false
  };

  tbody.innerHTML += renderPropertyRowHtml(newProp, 'modal', true);
}

async function submitUpdateOntologyClass() {
  const oldLabel = document.getElementById('ocm-old-label').value.trim();
  const newLabel = document.getElementById('ocm-label').value.trim();
  const subclass = document.getElementById('ocm-subclass').value.trim();
  const domain = document.getElementById('ocm-domain').value;
  const comment = document.getElementById('ocm-comment').value.trim();

  const targetClass = currentOntologyModel.classes[selectedOntologyClassIdx];
  const origTableName = targetClass.annotations ? (targetClass.annotations.table_name || targetClass.label) : targetClass.label;

  const propRows = document.querySelectorAll('#ocm-props-tbody tr');
  const updatedProps = [];
  propRows.forEach(row => {
    const lIn = row.querySelector('.prop-label-input');
    const tSel = row.querySelector('.prop-type-select');
    const rIn = row.querySelector('.prop-range-input');
    const pIn = row.querySelector('.prop-parent-input');
    const invIn = row.querySelector('.prop-inverse-input');
    const pkIn = row.querySelector('.prop-pk-input');

    if (lIn && tSel && rIn) {
      const pType = tSel.value;
      const isObj = pType === 'ObjectProperty';
      updatedProps.push({
        label: lIn.value.trim(),
        relationship_name: lIn.value.trim(),
        property_type: pType,
        range: rIn.value.trim(),
        domain: `http://enterprise.org/ontology#${newLabel}`,
        parent_class: pIn ? pIn.value.trim() : newLabel,
        target_class: isObj ? rIn.value.trim() : null,
        inverse_property: (isObj && invIn) ? invIn.value.trim() : null,
        is_inverse: false,
        is_primary_key: pkIn ? pkIn.checked : false,
        table_name: origTableName
      });
    }
  });

  const payload = {
    label: newLabel,
    subclass_of: [subclass],
    comment: comment,
    domain_type: domain,
    properties: updatedProps
  };

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/ontology/classes/${encodeURIComponent(oldLabel)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      closeModal('ontologyClassModal');
      await loadOntology();
      if (typeof showToast === 'function') showToast(`Ontology Class "${newLabel}" & Properties Saved!`, 'success');
    } else {
      const err = await res.json();
      if (typeof showToast === 'function') showToast(`Failed to update class: ${err.detail || 'Error'}`, 'error');
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('Network error updating ontology class', 'error');
  }
}

async function exportOntologyTurtle() {
  if (!currentProjectId) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/ontology/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'Turtle' })
    });
    if (res.ok) {
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/turtle;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enterprise_ontology_${currentProjectId.slice(0, 8)}.ttl`;
      a.click();
      URL.revokeObjectURL(url);
      alert('OWL Turtle (.ttl) Export downloaded successfully!');
    }
  } catch (e) { alert('Failed to export OWL Turtle ontology'); }
}

async function exportOntologyOWL() {
  if (!currentProjectId) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/ontology/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'OWL/XML' })
    });
    if (res.ok) {
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enterprise_ontology_${currentProjectId.slice(0, 8)}.owl`;
      a.click();
      URL.revokeObjectURL(url);
      alert('OWL/XML (.owl) Export downloaded successfully!');
    }
  } catch (e) { alert('Failed to export OWL/XML ontology'); }
}
