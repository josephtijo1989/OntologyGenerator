// Projects Lifecycle Management
async function loadProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    if (res.ok) {
      projectsList = await res.json();
      if (projectsList.length > 0) {
        if (!currentProjectId) {
          const demoProj = projectsList.find(p => p.code === 'DEMO_ERP');
          currentProjectId = demoProj ? demoProj.id : projectsList[0].id;
          currentProjectObj = demoProj || projectsList[0];
        } else {
          currentProjectObj = projectsList.find(p => p.id === currentProjectId);
        }
        populateProjectDropdown();
        updateSelectedProjectHeaders();
        if (typeof loadDashboard === 'function') loadDashboard();
        refreshAllProjectViews();
      } else {
        await submitAutoDefaultProject();
      }
      renderProjectsGrid();
    }
  } catch (e) { console.log(e); }
}

function populateProjectDropdown() {
  const select = document.getElementById('projectSelect');
  if (!select) return;
  select.innerHTML = '';
  projectsList.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.innerText = `${p.name} (${p.code})`;
    select.appendChild(opt);
  });

  // Add "+ Create New Project..." option directly in top dropdown
  const createOpt = document.createElement('option');
  createOpt.value = 'CREATE_NEW';
  createOpt.innerText = '➕ Create New Project...';
  createOpt.style.fontWeight = 'bold';
  createOpt.style.color = 'var(--accent-cyan)';
  select.appendChild(createOpt);

  select.value = currentProjectId;

  // Bind change event explicitly to guarantee execution across all browser environments
  select.onchange = function() {
    onProjectChanged(this.value);
  };
}

async function submitAutoDefaultProject() {
  try {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Enterprise ERP Transformation', code: 'DEMO_ERP', description: 'Default Enterprise Transformation Project' })
    });
    if (res.ok) { await loadProjects(); }
  } catch (e) {}
}

function updateSelectedProjectHeaders() {
  const pName = currentProjectObj ? currentProjectObj.name : 'Selected Project';
  const dashHeader = document.getElementById('dash-proj-name');
  const connHeader = document.getElementById('conn-proj-name');
  if (dashHeader) dashHeader.innerText = pName;
  if (connHeader) connHeader.innerText = pName;
}

function refreshAllProjectViews() {
  if (typeof loadConnectors === 'function') loadConnectors();
  if (typeof loadMetadata === 'function') loadMetadata();
  if (typeof loadProfiling === 'function') loadProfiling();
  if (typeof loadRules === 'function') loadRules();
  if (typeof loadOntology === 'function') loadOntology();

  const activeBtn = document.querySelector('.nav-btn.active');
  const activeView = activeBtn ? activeBtn.getAttribute('data-view') : 'connectors';

  if (activeView === 'ontology-graph' && typeof initOntologyGraph === 'function') {
    initOntologyGraph();
  }
  if (activeView === 'graph' && typeof initCytoscapeGraph === 'function') {
    initCytoscapeGraph();
  }
}

function onProjectChanged(pid) {
  if (pid === 'CREATE_NEW') {
    const select = document.getElementById('projectSelect');
    if (select) select.value = currentProjectId || (projectsList[0] ? projectsList[0].id : '');
    openModal('projectModal');
    return;
  }
  currentProjectId = pid;
  currentProjectObj = projectsList.find(p => p.id === pid);

  // Clear global model caches to prevent stale data cross-contamination
  if (typeof currentOntologyModel !== 'undefined') currentOntologyModel = null;
  if (typeof currentProfilingData !== 'undefined') currentProfilingData = [];
  if (typeof cyOntologyInstance !== 'undefined' && cyOntologyInstance) {
    try { cyOntologyInstance.destroy(); cyOntologyInstance = null; } catch(e){}
  }
  if (typeof cyInstance !== 'undefined' && cyInstance) {
    try { cyInstance.destroy(); cyInstance = null; } catch(e){}
  }

  updateSelectedProjectHeaders();
  if (typeof loadDashboard === 'function') loadDashboard();

  // Refresh all page grids and active data views for the newly selected project
  refreshAllProjectViews();
  renderProjectsGrid();
}

function selectActiveProject(pid) {
  const select = document.getElementById('projectSelect');
  if (select) select.value = pid;
  onProjectChanged(pid);
  alert(`Switched active project to: ${currentProjectObj.name}`);
}

async function submitCreateProject() {
  const name = document.getElementById('np-name').value;
  const code = document.getElementById('np-code').value;
  const desc = document.getElementById('np-desc').value;

  if (!name || !code) { alert('Project Name and Code are required.'); return; }

  try {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, code, description: desc })
    });
    if (res.ok) {
      const newProj = await res.json();
      closeModal('projectModal');
      document.getElementById('np-name').value = '';
      document.getElementById('np-code').value = '';
      document.getElementById('np-desc').value = '';
      currentProjectId = newProj.id;
      await loadProjects();
      alert(`New Project "${newProj.name}" Created & Selected!`);
    } else {
      const err = await res.json();
      alert('Error: ' + (err.detail || 'Failed to create project'));
    }
  } catch (e) { alert('Failed to connect to backend server'); }
}

function openEditProjectModal(p) {
  document.getElementById('ep-id').value = p.id;
  document.getElementById('ep-name').value = p.name;
  document.getElementById('ep-status').value = p.status || 'ACTIVE';
  document.getElementById('ep-desc').value = p.description || '';
  openModal('editProjectModal');
}

async function submitUpdateProject() {
  const pid = document.getElementById('ep-id').value;
  const name = document.getElementById('ep-name').value;
  const status = document.getElementById('ep-status').value;
  const desc = document.getElementById('ep-desc').value;

  try {
    const res = await fetch(`${API_BASE}/projects/${pid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status, description: desc })
    });
    if (res.ok) {
      closeModal('editProjectModal');
      await loadProjects();
      alert('Project Updated Successfully!');
    } else {
      alert('Failed to update project');
    }
  } catch (e) { alert('Failed to update project'); }
}

async function deleteProject(pid, pName) {
  const confirmed = await showConfirm(
    `Are you sure you want to delete project "${pName}"? All mapped connectors and metadata will be permanently deleted.`,
    'Delete Project Confirmation',
    '🗑️ Delete Project'
  );
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/projects/${pid}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      if (currentProjectId === pid) currentProjectId = null;
      await loadProjects();
      alert(`Project "${pName}" Deleted Successfully!`);
    } else {
      alert('Failed to delete project');
    }
  } catch (e) { alert('Failed to delete project'); }
}

function renderProjectsGrid() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  grid.innerHTML = '';
  projectsList.forEach(p => {
    const isCurrent = (p.id === currentProjectId);
    const card = document.createElement('div');
    card.className = `glass-card project-card ${isCurrent ? 'active-proj' : ''}`;
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '12px';
    card.innerHTML = `
      <div class="flex-between">
        <span class="font-bold" style="font-size: 16px; color: var(--text-primary);">${p.name} ${isCurrent ? '⭐' : ''}</span>
        <span class="badge">${p.code}</span>
      </div>
      <p style="font-size: 13px; color: var(--text-secondary); height: 36px; overflow: hidden;">${p.description || 'No description'}</p>
      <div style="font-size: 11px; color: var(--accent-cyan); font-family: var(--font-mono);">Status: ${p.status}</div>
      <div class="flex-between" style="margin-top: 6px; border-top: 1px solid var(--border-color); padding-top: 10px;">
        <button class="btn-primary" style="font-size: 11px; padding: 4px 10px;" onclick="selectActiveProject('${p.id}')">${isCurrent ? 'Active Project' : 'Select Project'}</button>
        <div style="display: flex; gap: 6px;">
          <button class="btn-sm" onclick='openEditProjectModal(${JSON.stringify(p)})'>✏️ Edit</button>
          <button class="btn-danger" onclick="deleteProject('${p.id}', '${p.name}')">🗑️ Delete</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
