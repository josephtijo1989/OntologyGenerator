// Core Application Entry Point & State Initializer
const API_BASE = '/api/v1';
let currentProjectId = null;
let currentProjectObj = null;
let projectsList = [];

// Initialize Navigation Listeners on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // Enforce permanent Light Mode
  document.body.classList.add('light-theme');

  // Navigation Switcher Listeners
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const viewId = btn.getAttribute('data-view');
      const targetPanel = document.getElementById('panel-' + viewId);
      if (targetPanel) targetPanel.classList.add('active');

      if (viewId === 'graph') initCytoscapeGraph();
      if (viewId === 'ontology-graph') initOntologyGraph();
      if (viewId === 'metadata') loadMetadata();
      if (viewId === 'profiling') loadProfiling();
      if (viewId === 'ontology') loadOntology();
      if (viewId === 'connectors') loadConnectors();
      if (viewId === 'rules') loadRules();
      if (viewId === 'audit') loadAuditLogs();
      if (viewId === 'projects') renderProjectsGrid();
    });
  });

  // Initial Data Load
  loadProjects();
});

function switchToTab(viewId) {
  const navBtn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
  if (navBtn) navBtn.click();
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    el.style.display = 'flex';
    el.style.zIndex = '99999';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('active');
    el.style.display = 'none';
  }
}
