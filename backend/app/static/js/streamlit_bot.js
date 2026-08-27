// Streamlit Graph DB Chatbot Controller (LangChain GraphCypherQAChain Replica)
let stBotMessages = [];

function initStreamlitBotView() {
  if (stBotMessages.length === 0) {
    stBotMessages = [
      {
        role: 'assistant',
        content: '👋 **Hello! I am Billy, your Streamlit Graph DB Assistant.**\n\nAsk me natural language questions about your target Graph Database. I will translate your request into Cypher, query your graph, and return natural language answers with inline Cypher statements and data extracts.',
        cypher: null,
        records: [],
        question: null,
        saved: false
      }
    ];
  }
  loadStBotTrainingCount();
  loadStBotSamplePills();
  renderStChatThread();
}

async function loadStBotTrainingCount() {
  const badge = document.getElementById('st-fewshot-badge');
  if (!badge || !currentProjectId) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/llm/approved-cyphers`);
    if (res.ok) {
      const data = await res.json();
      badge.innerHTML = `🚀 ${data.length} Training Examples Loaded`;
    }
  } catch (e) {
    console.warn("Failed to fetch approved cyphers count:", e);
  }
}

async function loadStBotSamplePills() {
  const pillsBox = document.getElementById('st-sample-pills');
  if (!pillsBox || !currentProjectId) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/ontology`);
    if (res.ok) {
      const classes = await res.json();
      pillsBox.innerHTML = '';
      const cNames = classes.map(c => c.class_name);
      
      const samples = [
        "Which invoices have a discount available and are approaching their due date or have significant outstanding amounts",
        cNames.length > 0 ? `List all ${cNames[0]} entities.` : "List all Vendor nodes.",
        cNames.length > 1 ? `Show relationship between ${cNames[0]} and ${cNames[1]}.` : "Show relationships across entities."
      ];

      samples.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'preset-chip';
        btn.style.fontSize = '11px';
        btn.style.padding = '4px 10px';
        btn.innerText = s.length > 55 ? s.substring(0, 52) + '...' : s;
        btn.title = s;
        btn.onclick = () => {
          document.getElementById('st-chat-input').value = s;
          sendStBotQuery();
        };
        pillsBox.appendChild(btn);
      });
    }
  } catch (e) {
    console.warn("Failed to load ontology pills for streamlit bot:", e);
  }
}

function renderStChatThread() {
  const container = document.getElementById('st-chat-messages');
  if (!container) return;
  container.innerHTML = '';

  stBotMessages.forEach((msg, idx) => {
    const isUser = msg.role === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.style.display = 'flex';
    msgDiv.style.flexDirection = 'column';
    msgDiv.style.gap = '10px';
    msgDiv.style.marginBottom = '16px';
    msgDiv.style.padding = '16px 18px';
    msgDiv.style.borderRadius = '12px';
    msgDiv.style.background = isUser ? '#f0f9ff' : '#ffffff';
    msgDiv.style.border = isUser ? '1px solid #bae6fd' : '1px solid var(--border-color)';
    msgDiv.style.boxShadow = '0 3px 10px rgba(0,0,0,0.03)';

    // 1. Message Header
    const headerRow = document.createElement('div');
    headerRow.className = 'flex-between';
    headerRow.style.fontSize = '12px';
    headerRow.style.fontWeight = '700';
    headerRow.style.color = isUser ? '#0369a1' : '#4f46e5';

    headerRow.innerHTML = `
      <span>${isUser ? '👤 You' : '🤖 Billy (Assistant)'}</span>
      <span style="font-size: 10px; font-weight: 500; color: var(--text-secondary);">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    `;
    msgDiv.appendChild(headerRow);

    // 2. Natural Language Content
    const bodyDiv = document.createElement('div');
    bodyDiv.style.fontSize = '13px';
    bodyDiv.style.lineHeight = '1.6';
    bodyDiv.style.color = 'var(--text-primary)';
    
    let htmlContent = msg.content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background: rgba(2,132,199,0.1); color:#0284c7; padding:1px 5px; border-radius:4px; font-family:var(--font-mono);">$1</code>');
    
    bodyDiv.innerHTML = htmlContent;
    msgDiv.appendChild(bodyDiv);

    // 3. Inline Cypher Code Section (If present)
    if (!isUser && msg.cypher) {
      const cypherBox = document.createElement('div');
      cypherBox.style.background = '#f8fafc';
      cypherBox.style.borderRadius = '8px';
      cypherBox.style.border = '1px solid var(--border-color)';
      cypherBox.style.padding = '12px 14px';
      cypherBox.style.marginTop = '4px';

      const cHeader = document.createElement('div');
      cHeader.className = 'flex-between';
      cHeader.style.marginBottom = '6px';
      cHeader.innerHTML = `
        <span style="font-size: 11px; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase;">⚡ Generated Cypher Statement</span>
        <button class="btn-sm" style="font-size: 10px; padding: 2px 8px;" onclick="copyCypherText('${idx}')">📋 Copy Cypher</button>
      `;

      const cPre = document.createElement('pre');
      cPre.id = `st-cypher-pre-${idx}`;
      cPre.style.fontFamily = "'JetBrains Mono', monospace";
      cPre.style.fontSize = '12px';
      cPre.style.color = '#0284c7';
      cPre.style.margin = '0';
      cPre.style.whiteSpace = 'pre-wrap';
      cPre.style.fontWeight = '600';
      cPre.innerText = msg.cypher;

      cypherBox.appendChild(cHeader);
      cypherBox.appendChild(cPre);
      msgDiv.appendChild(cypherBox);
    }

    // 4. Inline Target DB Data Extracts Table (If present)
    if (!isUser && msg.records && msg.records.length > 0) {
      const recordsBox = document.createElement('div');
      recordsBox.style.marginTop = '6px';

      const rHeader = document.createElement('div');
      rHeader.style.fontSize = '11px';
      rHeader.style.fontWeight = '700';
      rHeader.style.color = 'var(--text-secondary)';
      rHeader.style.textTransform = 'uppercase';
      rHeader.style.marginBottom = '6px';
      rHeader.innerText = `📊 Target DB Data Extracts (${msg.records.length} records returned)`;

      const tableWrapper = document.createElement('div');
      tableWrapper.style.overflowX = 'auto';
      tableWrapper.style.border = '1px solid var(--border-color)';
      tableWrapper.style.borderRadius = '8px';

      const table = document.createElement('table');
      table.className = 'data-table';
      table.style.fontSize = '11px';
      
      const headers = Object.keys(msg.records[0]);
      let theadHtml = '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
      
      let tbodyHtml = '<tbody>';
      msg.records.slice(0, 15).forEach(r => {
        tbodyHtml += '<tr>' + headers.map(h => `<td>${r[h] !== null && r[h] !== undefined ? r[h] : ''}</td>`).join('') + '</tr>';
      });
      tbodyHtml += '</tbody>';
      
      table.innerHTML = theadHtml + tbodyHtml;
      tableWrapper.appendChild(table);
      recordsBox.appendChild(rHeader);
      recordsBox.appendChild(tableWrapper);
      msgDiv.appendChild(recordsBox);
    }

    // 5. Thumbs-Up Training Feedback Action Bar
    if (!isUser && msg.cypher) {
      const fbRow = document.createElement('div');
      fbRow.style.display = 'flex';
      fbRow.style.alignItems = 'center';
      fbRow.style.gap = '10px';
      fbRow.style.marginTop = '4px';
      fbRow.style.paddingTop = '10px';
      fbRow.style.borderTop = '1px dashed var(--border-color)';

      if (msg.saved) {
        fbRow.innerHTML = `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); font-size: 11px; font-weight: 600;">🚀 Saved to Training Examples!</span>`;
      } else {
        const btn = document.createElement('button');
        btn.className = 'btn-sm';
        btn.style.background = 'rgba(16, 185, 129, 0.1)';
        btn.style.color = 'var(--accent-emerald)';
        btn.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        btn.style.fontWeight = '600';
        btn.style.fontSize = '11px';
        btn.style.cursor = 'pointer';
        btn.innerHTML = '👍 Approve & Save Example';
        btn.onclick = () => saveStBotFeedback(msg, idx);
        fbRow.appendChild(btn);

        const label = document.createElement('span');
        label.style.fontSize = '11px';
        label.style.color = 'var(--text-secondary)';
        label.innerText = 'Click to save question & Cypher query to approved training repository.';
        fbRow.appendChild(label);
      }
      msgDiv.appendChild(fbRow);
    }

    container.appendChild(msgDiv);
  });

  container.scrollTop = container.scrollHeight;
}

function copyCypherText(idx) {
  const pre = document.getElementById(`st-cypher-pre-${idx}`);
  if (pre && pre.innerText) {
    navigator.clipboard.writeText(pre.innerText);
    if (typeof showToast === 'function') {
      showToast('Cypher statement copied to clipboard! 📋', 'info');
    } else {
      alert('Cypher statement copied to clipboard!');
    }
  }
}

async function saveStBotFeedback(msg, idx) {
  if (!currentProjectId || !msg.question || !msg.cypher) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/llm/approved-cyphers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_prompt: msg.question,
        approved_cypher: msg.cypher,
        model_name: 'llama-3.3-70b-versatile'
      })
    });

    if (res.ok) {
      msg.saved = true;
      stBotMessages[idx] = msg;
      if (typeof showToast === 'function') {
        showToast('Saved to training examples! 🚀', 'success');
      } else {
        alert('Saved to training examples! 🚀');
      }
      loadStBotTrainingCount();
      renderStChatThread();
    }
  } catch (e) {
    console.error("Failed to save feedback example:", e);
  }
}

async function sendStBotQuery() {
  const input = document.getElementById('st-chat-input');
  if (!input || !input.value.trim()) return;
  if (!currentProjectId) {
    alert("Please select or create an active project first.");
    return;
  }

  const promptText = input.value.trim();
  input.value = '';

  // 1. Append User Message
  stBotMessages.push({
    role: 'user',
    content: promptText,
    cypher: null,
    records: [],
    question: promptText,
    saved: false
  });

  // 2. Append Spinner Placeholder Assistant Message
  const loadingIdx = stBotMessages.length;
  stBotMessages.push({
    role: 'assistant',
    content: '⚡ *Billy is translating your question to Cypher and searching your graph...*',
    cypher: null,
    records: [],
    question: promptText,
    saved: false
  });

  renderStChatThread();

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/llm/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_prompt: promptText,
        model_name: 'llama-3.3-70b-versatile'
      })
    });

    if (res.ok) {
      const data = await res.json();
      
      let answerText = data.executive_summary;
      if (answerText.includes('### 💬 Direct Answer\n')) {
        const parts = answerText.split('### 🧠 W3C OWL');
        answerText = parts[0].replace('### 💬 Direct Answer\n', '').trim();
      }

      stBotMessages[loadingIdx] = {
        role: 'assistant',
        content: answerText || 'Query executed successfully.',
        cypher: data.generated_cypher_query,
        records: data.cypher_data_records || [],
        question: promptText,
        saved: false
      };
    } else {
      stBotMessages[loadingIdx] = {
        role: 'assistant',
        content: '⚠️ Failed to generate insights or execute Cypher statement.',
        cypher: null,
        records: [],
        question: promptText,
        saved: false
      };
    }
  } catch (e) {
    console.error("Error executing streamlit bot query:", e);
    stBotMessages[loadingIdx] = {
      role: 'assistant',
      content: `❌ Error connecting to graph engine: ${e.message}`,
      cypher: null,
      records: [],
      question: promptText,
      saved: false
    };
  }

  renderStChatThread();
}
