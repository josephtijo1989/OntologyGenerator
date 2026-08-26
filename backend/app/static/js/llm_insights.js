/**
 * AI Knowledge Graph Insights & LLM Analytics JavaScript Module
 */

let savedCypherCache = [];

function selectLLMPrompt(promptText) {
  const input = document.getElementById('llm-user-prompt');
  if (input) {
    input.value = promptText;
    input.focus();
  }
}

async function loadPresetQueryPills() {
  if (!currentProjectId) return;
  const container = document.getElementById('llm-preset-pills');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/llm/approved-cyphers`);
    if (!res.ok) {
      renderDefaultPresetPills(container);
      return;
    }

    const items = await res.json();
    if (!items || items.length === 0) {
      renderDefaultPresetPills(container);
      return;
    }

    // Sort by usage_count descending
    const sorted = [...items].sort((a, b) => (b.usage_count || 1) - (a.usage_count || 1));
    const topItems = sorted.slice(0, 5);

    const colors = [
      { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', text: 'var(--accent-emerald)' },
      { bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)', text: 'var(--accent-violet)' },
      { bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)', text: 'var(--accent-cyan)' },
      { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', text: 'var(--accent-amber)' },
      { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.3)', text: 'var(--accent-indigo)' }
    ];

    let html = '';
    topItems.forEach((item, idx) => {
      const c = colors[idx % colors.length];
      const pText = item.question_prompt;
      const displayLabel = pText.length > 38 ? pText.substring(0, 35) + '...' : pText;
      const usageBadge = `<span class="badge" style="font-size: 9px; padding: 1px 6px; margin-left: 6px; background: rgba(0,0,0,0.12); color: ${c.text}; border-radius: 10px; font-weight: 700;">🔥 ${item.usage_count || 1} uses</span>`;

      html += `
        <button class="btn-sm" style="background: ${c.bg}; color: ${c.text}; border: 1px solid ${c.border}; font-weight: 600; display: inline-flex; align-items: center;" onclick="selectLLMPrompt('${escapeHtml(pText.replace(/'/g, "\\'"))}')">
          ⭐ ${escapeHtml(displayLabel)} ${usageBadge}
        </button>
      `;
    });

    container.innerHTML = html;
  } catch (e) {
    console.error('Error loading preset query pills:', e);
    renderDefaultPresetPills(container);
  }
}

async function renderDefaultPresetPills(container) {
  if (!container || !currentProjectId) return;

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/ontology/generate`);
    if (res.ok) {
      const onto = await res.json();
      const classes = onto.classes || [];
      if (classes.length > 0) {
        const topClasses = classes.slice(0, 4);
        let html = '';
        const styles = [
          { bg: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', border: 'rgba(99, 102, 241, 0.3)', icon: '📊' },
          { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', border: 'rgba(16, 185, 129, 0.3)', icon: '🔍' },
          { bg: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', border: 'rgba(6, 182, 212, 0.3)', icon: '🕸️' },
          { bg: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', border: 'rgba(244, 63, 94, 0.3)', icon: '⚡' }
        ];

        topClasses.forEach((cls, idx) => {
          const st = styles[idx % styles.length];
          const cName = cls.class_name;
          const prompt = `Show concept details, attributes, and relationships for :${cName}`;
          html += `
            <button class="btn-sm" style="background: ${st.bg}; color: ${st.color}; border: 1px solid ${st.border}; font-weight: 600;" onclick="selectLLMPrompt('${escapeHtml(prompt)}')">
              ${st.icon} List ${escapeHtml(cName)} Concepts
            </button>
          `;
        });

        container.innerHTML = html;
        return;
      }
    }
  } catch (e) {
    console.warn('Could not load dynamic ontology pills:', e);
  }

  container.innerHTML = `
    <span style="color: var(--text-secondary); font-size: 12px; font-style: italic;">
      No approved Cypher queries saved for this project yet. Ask a question below or click 👍 on an answer to save it as a template!
    </span>
  `;
}

async function runLLMInsight() {
  if (!currentProjectId) {
    if (typeof showToast === 'function') showToast('Select or create a project first', 'warning');
    else alert('Select or create a project first');
    return;
  }

  const promptInput = document.getElementById('llm-user-prompt');
  const userPrompt = promptInput ? promptInput.value.trim() : '';

  if (!userPrompt) {
    if (typeof showToast === 'function') showToast('Please enter a natural language query or select a preset pill.', 'warning');
    else alert('Please enter a prompt');
    return;
  }

  const modelSelect = document.getElementById('llmModelSelect');
  const modelName = modelSelect ? modelSelect.value : 'gemini-1.5-pro';

  const spinner = document.getElementById('llm-loading-spinner');
  const resultsContainer = document.getElementById('llm-results-container');
  const btn = document.getElementById('btn-generate-llm-insights');

  if (spinner) spinner.style.display = 'block';
  if (resultsContainer) resultsContainer.style.display = 'none';
  if (btn) btn.disabled = true;

  if (typeof showToast === 'function') showToast('✨ Synthesizing Knowledge Graph Cypher & LLM Insights...', 'info');

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/llm/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_prompt: userPrompt,
        model_name: modelName,
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to generate LLM insights');
    }

    const data = await res.json();
    renderLLMInsights(data);
    loadPresetQueryPills();

    if (typeof showToast === 'function') showToast('✨ AI Cypher & Meaningful Data Insights generated!', 'success');
  } catch (e) {
    console.error('LLM Insight Error:', e);
    if (typeof showToast === 'function') showToast(`LLM Insight Error: ${e.message}`, 'error');
  } finally {
    if (spinner) spinner.style.display = 'none';
    if (btn) btn.disabled = false;
  }
}

function renderLLMInsights(data) {
  const container = document.getElementById('llm-results-container');
  if (!container) return;

  container.style.display = 'flex';

  // 1. Synthesized Cypher Query (Top Block)
  const cypherBlock = document.getElementById('llm-cypher-code-block');
  if (cypherBlock) {
    cypherBlock.innerText = data.generated_cypher_query || '// No Cypher query generated';
  }

  // 2. Executive Summary & Meaningful Data Insights (Bottom Block)
  const timeBadge = document.getElementById('llm-execution-time');
  if (timeBadge) timeBadge.innerText = `${data.execution_time_ms}ms`;

  const summaryText = document.getElementById('llm-exec-summary-text');
  if (summaryText) {
    summaryText.innerHTML = formatLLMMarkdown(data.executive_summary || '');
  }

  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copyLLMCypherQuery() {
  const codeBlock = document.getElementById('llm-cypher-code-block');
  if (codeBlock && codeBlock.innerText) {
    navigator.clipboard.writeText(codeBlock.innerText);
    if (typeof showToast === 'function') showToast('📋 Cypher query copied to clipboard!', 'success');
  }
}

async function saveApprovedLLMCypher() {
  if (!currentProjectId) return;

  const promptInput = document.getElementById('llm-user-prompt');
  const userPrompt = promptInput ? promptInput.value.trim() : '';
  const cypherBlock = document.getElementById('llm-cypher-code-block');
  const cypherCode = cypherBlock ? cypherBlock.innerText.trim() : '';

  if (!userPrompt || !cypherCode) {
    if (typeof showToast === 'function') showToast('No generated Cypher code to approve.', 'warning');
    return;
  }

  const modelSelect = document.getElementById('llmModelSelect');
  const modelName = modelSelect ? modelSelect.value : 'gemini-1.5-pro';

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/llm/approved-cyphers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_prompt: userPrompt,
        approved_cypher: cypherCode,
        model_name: modelName
      })
    });

    if (!res.ok) throw new Error('Failed to save approved Cypher query');

    loadPresetQueryPills();
    if (typeof showToast === 'function') {
      showToast('👍 Approved Cypher query saved to Few-Shot repository!', 'success');
    }
  } catch (e) {
    console.error('Save Approved Cypher Error:', e);
    if (typeof showToast === 'function') showToast(`Error saving approved Cypher: ${e.message}`, 'error');
  }
}

async function loadSavedCypherQueries() {
  if (!currentProjectId) return;

  const tbody = document.getElementById('saved-cyphers-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">Loading approved Cypher templates...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/llm/approved-cyphers`);
    if (!res.ok) throw new Error('Failed to fetch saved Cypher queries');

    savedCypherCache = await res.json();
    renderSavedCypherTable(savedCypherCache);
  } catch (e) {
    console.error('Load Saved Cypher Error:', e);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--accent-rose);">Error loading saved queries: ${escapeHtml(e.message)}</td></tr>`;
  }
}

function renderSavedCypherTable(items) {
  const tbody = document.getElementById('saved-cyphers-tbody');
  const countEl = document.getElementById('count-saved-cyphers');
  const usagesEl = document.getElementById('count-saved-usages');

  if (countEl) countEl.innerText = items.length;
  const totalUsages = items.reduce((acc, curr) => acc + (curr.usage_count || 1), 0);
  if (usagesEl) usagesEl.innerText = totalUsages;

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-secondary);">No approved Cypher queries saved yet. Use the 👍 Save & Approve button in AI Graph Insights to save correct answers!</td></tr>`;
    return;
  }

  let html = '';
  items.forEach(item => {
    const cypherShort = item.approved_cypher.length > 90 ? item.approved_cypher.substring(0, 90) + '...' : item.approved_cypher;
    html += `
      <tr>
        <td style="font-weight: 600; color: var(--text-primary); vertical-align: top;">${escapeHtml(item.question_prompt)}</td>
        <td style="vertical-align: top;"><code style="background: #f8fafc; color: #0284c7; border: 1px solid var(--border-color); padding: 6px 10px; border-radius: 6px; font-family: var(--font-mono); font-size: 11px; display: block; white-space: pre-wrap; word-break: break-all; font-weight: 600;">${escapeHtml(cypherShort)}</code></td>
        <td style="vertical-align: top;"><span class="badge" style="background: rgba(168, 85, 247, 0.12); color: var(--accent-violet); font-size: 11px;">${escapeHtml(item.model_name || 'gemini-1.5-pro')}</span></td>
        <td style="vertical-align: top; font-family: var(--font-mono); font-weight: 700; color: var(--accent-emerald); text-align: center;">${item.usage_count}</td>
        <td style="vertical-align: top; text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button class="btn-sm" style="background: rgba(2, 132, 199, 0.12); color: var(--accent-cyan);" onclick="runSavedCypher('${escapeHtml(item.question_prompt.replace(/'/g, "\\'"))}')">▶️ Run</button>
            <button class="btn-sm" style="background: rgba(168, 85, 247, 0.12); color: var(--accent-violet);" onclick="editSavedCypher('${item.id}')">✏️ Edit</button>
            <button class="btn-sm" style="background: rgba(225, 29, 72, 0.12); color: var(--accent-rose);" onclick="deleteSavedCypher('${item.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function filterSavedCypherQueries(searchVal) {
  if (!searchVal) {
    renderSavedCypherTable(savedCypherCache);
    return;
  }
  const query = searchVal.toLowerCase();
  const filtered = savedCypherCache.filter(item => 
    item.question_prompt.toLowerCase().includes(query) ||
    item.approved_cypher.toLowerCase().includes(query)
  );
  renderSavedCypherTable(filtered);
}

function editSavedCypher(id) {
  const item = savedCypherCache.find(x => x.id === id);
  if (!item) return;

  document.getElementById('edit-saved-cypher-id').value = item.id;
  document.getElementById('edit-saved-cypher-prompt').value = item.question_prompt;
  document.getElementById('edit-saved-cypher-code').value = item.approved_cypher;

  if (typeof openModal === 'function') openModal('editSavedCypherModal');
  else document.getElementById('editSavedCypherModal').classList.add('active');
}

async function saveEditedCypherSubmit() {
  const id = document.getElementById('edit-saved-cypher-id').value;
  const prompt = document.getElementById('edit-saved-cypher-prompt').value.trim();
  const code = document.getElementById('edit-saved-cypher-code').value.trim();

  if (!id || !prompt || !code) {
    if (typeof showToast === 'function') showToast('Prompt and Cypher code are required.', 'warning');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/llm/approved-cyphers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_prompt: prompt,
        approved_cypher: code
      })
    });

    if (!res.ok) throw new Error('Failed to update approved Cypher query');

    if (typeof closeModal === 'function') closeModal('editSavedCypherModal');
    else document.getElementById('editSavedCypherModal').classList.remove('active');

    loadSavedCypherQueries();
    loadPresetQueryPills();

    if (typeof showToast === 'function') showToast('💾 Approved Cypher query updated successfully!', 'success');
  } catch (e) {
    console.error('Update Approved Cypher Error:', e);
    if (typeof showToast === 'function') showToast(`Error updating query: ${e.message}`, 'error');
  }
}

async function deleteSavedCypher(id) {
  const doDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/${currentProjectId}/llm/approved-cyphers/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete approved Cypher query');

      loadSavedCypherQueries();
      loadPresetQueryPills();
      if (typeof showToast === 'function') showToast('🗑️ Approved query removed from repository.', 'info');
    } catch (e) {
      console.error('Delete Approved Cypher Error:', e);
      if (typeof showToast === 'function') showToast(`Error deleting query: ${e.message}`, 'error');
    }
  };

  if (typeof showConfirmDialog === 'function') {
    showConfirmDialog({
      title: 'Remove Approved Cypher Query',
      message: 'Are you sure you want to delete this approved Cypher query template from the Few-Shot repository?',
      confirmText: 'Delete Template',
      confirmClass: 'btn-danger',
      onConfirm: doDelete
    });
  } else if (confirm('Are you sure you want to delete this approved query?')) {
    doDelete();
  }
}

function runSavedCypher(promptText) {
  if (typeof switchToTab === 'function') switchToTab('llm-insights');
  selectLLMPrompt(promptText);
  runLLMInsight();
}

function formatLLMMarkdown(text) {
  if (!text) return '';

  let tableBlocks = [];
  text = text.replace(/(\|.*\|\n\|[-:\s|]*\|\n(?:\|.*\|\n?)*)/g, (match) => {
    const lines = match.trim().split('\n');
    if (lines.length < 2) return match;

    const headers = lines[0].split('|').map(s => s.trim()).filter(s => s.length > 0);
    const rows = lines.slice(2).map(line => line.split('|').map(s => s.trim()).filter(s => s.length > 0));

    let html = '<div style="overflow-x: auto; margin: 12px 0; border: 1px solid var(--border-color); border-radius: 8px;"><table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
    html += '<thead><tr style="background: rgba(168, 85, 247, 0.15); border-bottom: 2px solid var(--accent-violet);">';
    headers.forEach(h => {
      html += `<th style="padding: 8px 12px; text-align: left; color: var(--accent-violet); font-family: var(--font-mono); font-weight: 700;">${escapeHtml(h)}</th>`;
    });
    html += '</tr></thead><tbody>';

    rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)';
      html += `<tr style="background: ${bg}; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">`;
      r.forEach(val => {
        html += `<td style="padding: 6px 12px; color: var(--text-primary); font-size: 12px;">${escapeHtml(val)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    
    const placeholder = `\n___TABLE_BLOCK_${tableBlocks.length}___\n`;
    tableBlocks.push(html);
    return placeholder;
  });

  let formatted = escapeHtml(text);
  formatted = formatted.replace(/(?:^|\n)### (.*$)/gim, '\n<h4 style="margin: 16px 0 6px 0; color: var(--accent-violet); font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px;">$1</h4>');
  formatted = formatted.replace(/(?:^|\n)## (.*$)/gim, '\n<h3 style="margin: 18px 0 8px 0; color: var(--accent-cyan); font-size: 14px; font-weight: 700;">$1</h3>');
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background: rgba(168, 85, 247, 0.12); color: var(--accent-violet); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-size: 11px;">$1</code>');

  formatted = formatted.replace(/\n/g, '<br>');

  // Strip extraneous <br> tags immediately following headings
  formatted = formatted.replace(/(<\/h[1-6]>)\s*<br\s*\/?>/gi, '$1');

  tableBlocks.forEach((tblHtml, idx) => {
    formatted = formatted.replace(`___TABLE_BLOCK_${idx}___`, tblHtml);
  });

  // Strip extraneous <br> tags immediately around tables
  formatted = formatted.replace(/<br\s*\/?>\s*(<div style="overflow-x: auto;)/gi, '$1');
  formatted = formatted.replace(/(<\/div>)\s*<br\s*\/?>/gi, '$1');

  return formatted;
}
