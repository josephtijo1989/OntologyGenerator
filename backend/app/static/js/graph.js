// Cytoscape Knowledge Graph Viewer Module (Matching Timbr.ai Aesthetics - Reduced Icons, Normal Weight Fonts)
let cyInstance = null;
let userMovedGraphPositionsMap = new Map();

async function initCytoscapeGraph() {
  if (!currentProjectId) return;
  const cyContainer = document.getElementById('cy');
  if (cyInstance) {
    cyInstance.destroy();
    cyInstance = null;
  }
  if (cyContainer) {
    cyContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; font-size: 13px;">Loading knowledge graph lineage...</div>';
  }
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/graph/generate?_t=${Date.now()}`);
    if (!res.ok) {
      if (cyContainer) {
        cyContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; font-size: 13px;">No knowledge graph lineage available for this project yet. Run Auto Discovery under Metadata Discovery tab first.</div>';
      }
      return;
    }
    const graphData = await res.json();

    if (!graphData.nodes || graphData.nodes.length === 0) {
      if (cyContainer) {
        cyContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; font-size: 13px;">No knowledge graph lineage available for this project yet. Run Auto Discovery under Metadata Discovery tab first.</div>';
      }
      return;
    }

    const cyElements = [];
    const validNodeIds = new Set();

    if (graphData.nodes) {
      graphData.nodes.forEach(n => {
        const isTableNode = (n.properties && n.properties.type === 'Table') || (n.id && n.id.startsWith('table:'));
        if (isTableNode) {
          const schema = n.properties.schema || (n.id.includes('.') ? n.id.split(':')[1].split('.')[0] : 'dbo');
          const rawTableName = n.properties.table_name || (n.label ? n.label.split('.').pop() : n.id.split('.').pop());
          const cleanLabel = rawTableName.toLowerCase();
          const domainType = n.properties.domain_type || 'Transactional';

          let color = '#059669'; // Emerald default
          if (domainType === 'Fact') color = '#1e1b4b'; // Timbr Dark Navy
          else if (domainType === 'Dimension') color = '#0284c7'; // Sky Blue
          else if (domainType === 'Lookup') color = '#d97706'; // Amber
          else if (domainType === 'Transactional') color = '#059669';

          cyElements.push({
            data: {
              id: n.id,
              label: cleanLabel,
              schema: schema,
              tableName: rawTableName,
              primaryKey: n.properties.primary_key || (n.properties.primary_keys ? n.properties.primary_keys.join(', ') : 'None'),
              color: color,
              domain: domainType,
              subclass: n.properties.subclass_of || 'owl:Thing',
              comment: n.properties.comment || ''
            },
            grabbable: true
          });
          validNodeIds.add(n.id);
        }
      });
    }

    if (graphData.edges) {
      graphData.edges.forEach(e => {
        if (validNodeIds.has(e.source_id) && validNodeIds.has(e.target_id)) {
          cyElements.push({
            data: {
              id: e.id,
              source: e.source_id,
              target: e.target_id,
              label: (e.relationship || 'references').toLowerCase()
            }
          });
        }
      });
    }

    if (!cyContainer) return;
    if (cyElements.length === 0) {
      cyContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; font-size: 14px;">No knowledge graph generated yet. Run Auto Discovery under Metadata Discovery tab first.</div>';
      return;
    }

    // CLEAR container HTML so no loading text remains in background
    cyContainer.innerHTML = '';

    cyInstance = cytoscape({
      container: cyContainer,
      elements: cyElements,
      autoungrabify: false,
      autolock: false,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      desktopTapThreshold: 4,
      touchTapThreshold: 4,
      style: [
        {
          selector: 'node',
          style: {
            'shape': 'ellipse',
            'width': '34px',
            'height': '34px',
            'background-color': 'data(color)',
            'label': 'data(label)',
            'color': '#0f172a',
            'font-size': '12px',
            'font-weight': '500',
            'text-valign': 'bottom',
            'text-margin-y': '5px',
            'border-width': 2,
            'border-color': '#ffffff',
            'shadow-blur': 6,
            'shadow-color': 'rgba(15, 23, 42, 0.12)',
            'text-events': 'yes',
            'overlay-padding': '8px',
            'overlay-opacity': 0,
            'transition-property': 'opacity, border-color, border-width',
            'transition-duration': '0.15s'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#0284c7',
            'shadow-blur': 12,
            'shadow-color': '#0284c7'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.2,
            'line-color': '#64748b',
            'target-arrow-color': '#64748b',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'color': '#334155',
            'font-size': '11px',
            'font-weight': '400',
            'text-rotation': 'autorotate',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.85,
            'text-background-padding': '2px',
            'transition-property': 'opacity, line-color, width',
            'transition-duration': '0.2s'
          }
        },
        {
          selector: '.faded',
          style: { 'opacity': 0.12 }
        },
        {
          selector: '.highlighted',
          style: {
            'opacity': 1,
            'border-width': 3,
            'border-color': '#0284c7',
            'line-color': '#0284c7',
            'target-arrow-color': '#0284c7',
            'width': 2
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: false,
        padding: 50,
        nodeRepulsion: 12000,
        idealEdgeLength: 120
      }
    });

    // Restore user moved node positions if available
    cyInstance.nodes().forEach(node => {
      if (userMovedGraphPositionsMap.has(node.id())) {
        node.position(userMovedGraphPositionsMap.get(node.id()));
      }
    });

    // Save user moved node position natively via Cytoscape events
    cyInstance.on('drag free', 'node', function(evt) {
      const node = evt.target;
      userMovedGraphPositionsMap.set(node.id(), { ...node.position() });
    });

    cyInstance.on('tap', 'node', function(evt) {
      const node = evt.target;
      const nData = node.data();

      const neighborhood = node.neighborhood().add(node);
      cyInstance.elements().addClass('faded').removeClass('highlighted');
      neighborhood.removeClass('faded').addClass('highlighted');

      const card = document.getElementById('graphNodeCard');
      if (card) {
        document.getElementById('gnc-label').innerText = nData.label;
        document.getElementById('gnc-domain').innerText = nData.domain;
        document.getElementById('gnc-schema').innerText = `Source Table: ${nData.schema || 'dbo'}.${nData.tableName || nData.label}`;
        document.getElementById('gnc-subclass').innerHTML = `🔑 Primary Key: <strong style="color: var(--accent-amber);">${nData.primaryKey || 'None'}</strong> | <span style="color: var(--accent-violet);">${nData.subclass || 'owl:Thing'}</span>`;

        const connCount = node.connectedEdges().length;
        document.getElementById('gnc-lineage').innerHTML = `Lineage Edges: <strong style="color: var(--accent-cyan);">${connCount}</strong> relationship connection(s)`;
        
        document.getElementById('gnc-edit-btn').onclick = function() {
          switchToTab('ontology');
          openOntologyClassModal(nData.tableName || nData.label);
        };

        card.style.display = 'block';
      }
    });

    cyInstance.on('tap', function(evt) {
      if (evt.target === cyInstance) {
        cyInstance.elements().removeClass('faded').removeClass('highlighted');
        const card = document.getElementById('graphNodeCard');
        if (card) card.style.display = 'none';
      }
    });

  } catch (e) {
    console.log('Cytoscape Graph Init Error:', e);
  }
}

function changeGraphLayout(layoutName) {
  if (!cyInstance) return;
  cyInstance.layout({
    name: layoutName,
    animate: true,
    animationDuration: 500,
    padding: 40,
    nodeRepulsion: 12000,
    idealEdgeLength: 100
  }).run();
}

function searchGraphNodes(query) {
  if (!cyInstance) return;
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    cyInstance.elements().removeClass('faded');
    return;
  }
  cyInstance.nodes().forEach(n => {
    const lbl = (n.data('label') || '').toLowerCase();
    const tbl = (n.data('tableName') || '').toLowerCase();
    if (lbl.includes(q) || tbl.includes(q)) {
      n.removeClass('faded');
      n.neighborhood().removeClass('faded');
    } else {
      n.addClass('faded');
    }
  });
}

function resetGraphView() {
  if (cyInstance) {
    userMovedGraphPositionsMap.clear();
    cyInstance.elements().removeClass('faded').removeClass('highlighted');
    cyInstance.fit(40);
  }
}

function zoomGraph(factor) {
  if (cyInstance) cyInstance.zoom({
    level: cyInstance.zoom() * factor,
    renderedPosition: { x: cyInstance.width() / 2, y: cyInstance.height() / 2 }
  });
}

async function exportGraphCypher() {
  if (!currentProjectId) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/graph/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'CYPHER' })
    });
    if (res.ok) {
      const text = await res.text();
      const blob = new Blob([text], { type: 'plain/text;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enterprise_knowledge_graph_${currentProjectId.slice(0, 8)}.cypher`;
      a.click();
      URL.revokeObjectURL(url);
      alert('Cypher Export file downloaded successfully!');
    }
  } catch (e) { alert('Failed to export Cypher graph'); }
}

async function exportGraphML() {
  if (!currentProjectId) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/graph/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'GRAPHML' })
    });
    if (res.ok) {
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enterprise_knowledge_graph_${currentProjectId.slice(0, 8)}.graphml`;
      a.click();
      URL.revokeObjectURL(url);
      alert('GraphML Export file downloaded successfully!');
    }
  } catch (e) { alert('Failed to export GraphML graph'); }
}

async function syncGraphToTarget() {
  if (!currentProjectId) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/graph/sync-to-target`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      alert(`✅ ${data.message}`);
    } else {
      alert('Failed to sync graph to target DB');
    }
  } catch (e) { alert('Failed to sync graph to target DB'); }
}
