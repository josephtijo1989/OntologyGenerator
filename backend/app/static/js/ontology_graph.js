// W3C OWL 2.0 Graphical Ontology Visualizer Engine (Timbr Ontology Explorer - Refined Aesthetics, Smaller Icons, Normal Weight Fonts, Single Relationship Mention)
let cyOntologyInstance = null;
let allOntologyClassesStore = [];
let allOntologyPropertiesStore = [];
let userMovedPositionsMap = new Map();

async function initOntologyGraph() {
  if (!currentProjectId) return;
  const cyContainer = document.getElementById('cy-ontology');
  if (cyOntologyInstance) {
    cyOntologyInstance.destroy();
    cyOntologyInstance = null;
  }
  if (cyContainer) {
    cyContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; font-size: 13px;">Loading ontology taxonomy graph...</div>';
  }
  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/ontology/generate?_t=${Date.now()}`);
    if (!res.ok) {
      if (cyContainer) {
        cyContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; font-size: 13px;">No ontology classes generated for this project yet. Run Auto Discovery under Metadata Discovery tab first.</div>';
      }
      return;
    }

    const ontoData = await res.json();
    let classes = ontoData.classes || [];
    const properties = ontoData.properties || [];

    // Filter out generic owl:Thing from concept classes list so owl:Thing is ONLY the top single root node
    classes = classes.filter(c => {
      const iriName = c.iri ? c.iri.split('#').pop().toLowerCase() : '';
      const cName = (c.name || c.label || '').toLowerCase();
      return iriName !== 'thing' && cName !== 'thing' && iriName !== 'owl:thing' && cName !== 'owl:thing';
    });

    allOntologyClassesStore = classes;
    allOntologyPropertiesStore = properties;
    populateOntologyClassFilterDropdown(classes);

    if (classes.length === 0) {
      if (cyContainer) {
        cyContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; font-size: 13px;">No ontology classes generated for this project yet. Run Auto Discovery under Metadata Discovery tab first.</div>';
      }
      return;
    }

    // CLEAR container HTML so no "Loading ontology taxonomy graph..." text remains in background
    if (cyContainer) {
      cyContainer.innerHTML = '';
    }

    const cyElements = [];
    const validClassMap = new Map();

    // 1. Single Shared Superclass Taxonomy Root Node: "thing"
    const rootIri = 'sc_root_thing';
    cyElements.push({
      data: {
        id: rootIri,
        label: 'thing',
        subClass: 'W3C Root',
        domain: 'TaxonomyRoot',
        primaryKey: 'None',
        comment: 'W3C OWL Taxonomy Superclass Root',
        color: '#ffffff',
        nodeType: 'thing',
        isRoot: true
      },
      grabbable: true
    });

    // 2. Register all Class IRIs & labels
    classes.forEach(c => {
      const label = c.label || c.name || (c.iri ? c.iri.split('#').pop() : 'Class');
      validClassMap.set(label, c.iri);
      validClassMap.set(label.toLowerCase(), c.iri);
      validClassMap.set(c.iri, c.iri);
    });

    // 3. Build Class Concept Nodes (Displaying actual Class Name) & Property Square Nodes (Timbr Style)
    classes.forEach(c => {
      const rawLabel = c.label || c.name || (c.iri ? c.iri.split('#').pop() : 'Class');
      const displayClassName = rawLabel.toLowerCase();
      const domainType = (c.annotations && c.annotations.domain_type) ? c.annotations.domain_type : 'Transactional';
      const pKeys = c.primary_keys || (c.annotations ? c.annotations.primary_keys : []) || [];
      const pkStr = pKeys.length > 0 ? pKeys.join(', ') : 'None';
      const subClass = (c.subclass_of && c.subclass_of.length > 0) ? c.subclass_of[0] : 'owl:Thing';

      let color = '#f97316'; // Timbr Orange for Concept Entities
      if (domainType === 'Fact') color = '#1e1b4b'; // Timbr Dark Navy
      else if (domainType === 'Dimension') color = '#0284c7'; // Sky Blue
      else if (domainType === 'Lookup') color = '#d97706'; // Amber
      else if (domainType === 'Transactional') color = '#059669'; // Emerald

      const bRules = c.business_rules || [];

      // Class Concept Node
      cyElements.push({
        data: {
          id: c.iri,
          label: displayClassName,
          rawLabel: rawLabel,
          subClass: subClass,
          domain: domainType,
          primaryKey: pkStr,
          comment: c.comment || '',
          businessRules: bRules,
          color: color,
          nodeType: 'class',
          isRoot: false
        },
        grabbable: true
      });

      // Edge from Class Node -> Top Root "thing"
      cyElements.push({
        data: {
          id: `sc_${c.iri}_sc_root_thing`,
          source: c.iri,
          target: rootIri,
          label: 'rdfs:subClassOf',
          type: 'SubClassOf'
        }
      });

      // Datatype Property Nodes (Green Squares)
      const classProps = properties.filter(p => p.domain === c.iri || p.table_name === c.annotations?.table_name);
      classProps.forEach(p => {
        if (p.property_type === 'DatatypeProperty') {
          const propName = (p.label || p.name || '').toLowerCase();
          const propNodeId = `prop_${c.iri}_${propName}`;

          cyElements.push({
            data: {
              id: propNodeId,
              label: propName,
              nodeType: 'property',
              parentClass: c.iri,
              datatype: p.range || 'xsd:string'
            },
            grabbable: true
          });

          // Edge connecting Class -> Property Node
          cyElements.push({
            data: {
              id: `edge_prop_${propNodeId}`,
              source: c.iri,
              target: propNodeId,
              type: 'HasProperty'
            }
          });
        }
      });
    });

    // 4. Build Relationship Nodes (Green Diamonds) & Edges (Timbr Style)
    properties.forEach(p => {
      if (p.property_type === 'ObjectProperty') {
        const sourceIri = p.domain;
        const targetLabel = p.range ? String(p.range).split('#').pop() : '';
        const targetIri = validClassMap.get(targetLabel) || validClassMap.get(p.range);
        const relLabel = (p.label || 'relatesTo').toLowerCase();

        if (sourceIri && targetIri) {
          const relNodeId = `rel_${relLabel}_${sourceIri}_${targetIri}`;

          // Green Diamond Node (Relationship name mentioned ONCE here)
          cyElements.push({
            data: {
              id: relNodeId,
              label: relLabel,
              nodeType: 'relationship',
              sourceClass: sourceIri,
              targetClass: targetIri
            },
            grabbable: true
          });

          // Edge Source -> Relationship Diamond (No duplicate label on edge line)
          cyElements.push({
            data: {
              id: `edge1_${relNodeId}`,
              source: sourceIri,
              target: relNodeId,
              type: 'ObjectPropertyLink'
            }
          });

          // Edge Relationship Diamond -> Target
          cyElements.push({
            data: {
              id: `edge2_${relNodeId}`,
              source: relNodeId,
              target: targetIri,
              type: 'ObjectPropertyArrow'
            }
          });
        }
      }
    });

    if (cyOntologyInstance) {
      cyOntologyInstance.destroy();
    }

    cyOntologyInstance = cytoscape({
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
          selector: 'node[nodeType = "class"]',
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
          selector: 'node[isRoot = true]',
          style: {
            'shape': 'ellipse',
            'width': '28px',
            'height': '28px',
            'background-color': '#ffffff',
            'border-color': '#64748b',
            'border-width': 1.5,
            'color': '#334155',
            'label': 'data(label)',
            'font-size': '11px',
            'font-weight': '400',
            'text-valign': 'bottom',
            'text-margin-y': '4px',
            'text-events': 'yes',
            'overlay-padding': '6px',
            'overlay-opacity': 0
          }
        },
        {
          selector: 'node[nodeType = "property"]',
          style: {
            'shape': 'rectangle',
            'width': '10px',
            'height': '10px',
            'background-color': '#047857',
            'label': 'data(label)',
            'color': '#475569',
            'font-size': '11px',
            'font-weight': '400',
            'text-valign': 'center',
            'text-halign': 'right',
            'text-margin-x': '5px',
            'text-events': 'yes',
            'overlay-padding': '4px',
            'overlay-opacity': 0
          }
        },
        {
          selector: 'node[nodeType = "relationship"]',
          style: {
            'shape': 'diamond',
            'width': '14px',
            'height': '14px',
            'background-color': '#059669',
            'border-width': 1,
            'border-color': '#ffffff',
            'label': 'data(label)',
            'color': '#334155',
            'font-size': '11px',
            'font-weight': '400',
            'text-valign': 'bottom',
            'text-margin-y': '4px',
            'overlay-padding': '4px',
            'overlay-opacity': 0
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
          selector: 'edge[type = "HasProperty"]',
          style: {
            'width': 1,
            'line-color': '#cbd5e1',
            'curve-style': 'straight'
          }
        },
        {
          selector: 'edge[type = "ObjectPropertyLink"]',
          style: {
            'width': 1.2,
            'line-color': '#64748b',
            'curve-style': 'bezier'
          }
        },
        {
          selector: 'edge[type = "ObjectPropertyArrow"]',
          style: {
            'width': 1.2,
            'line-color': '#64748b',
            'target-arrow-color': '#64748b',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        },
        {
          selector: 'edge[type = "SubClassOf"]',
          style: {
            'width': 1.2,
            'line-style': 'dashed',
            'line-color': '#94a3b8',
            'curve-style': 'bezier'
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
            'border-color': '#0284c7'
          }
        }
      ],
      layout: { name: 'preset' }
    });

    // Run Single Custom Timbr Layout Engine
    runTimbrLayout(cyOntologyInstance);

    // Save user moved position on node drag & release natively via Cytoscape events
    cyOntologyInstance.on('drag free', 'node', function(evt) {
      const node = evt.target;
      userMovedPositionsMap.set(node.id(), { ...node.position() });
    });

    cyOntologyInstance.on('tap', 'node', function(evt) {
      const node = evt.target;
      const nData = node.data();

      const neighborhood = node.neighborhood().add(node);
      cyOntologyInstance.elements().addClass('faded').removeClass('highlighted');
      neighborhood.removeClass('faded').addClass('highlighted');

      const card = document.getElementById('ontoNodeCard');
      if (card && nData.nodeType === 'class') {
        document.getElementById('onc-label').innerText = nData.rawLabel || nData.label;
        document.getElementById('onc-domain').innerText = nData.domain;
        document.getElementById('onc-subclass').innerText = `rdfs:subClassOf ${nData.subClass || 'owl:Thing'}`;
        document.getElementById('onc-pk').innerText = nData.primaryKey || 'None';
        document.getElementById('onc-comment').innerText = nData.comment || 'No comment';

        const rulesContainer = document.getElementById('onc-rules');
        if (rulesContainer) {
          const rules = nData.businessRules || [];
          if (rules.length > 0) {
            rulesContainer.innerHTML = rules.map(r => `<div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #0284c7; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-top: 4px;"><strong>⚙️ ${r.name}</strong></div>`).join('');
            rulesContainer.style.display = 'block';
          } else {
            rulesContainer.innerHTML = '<div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">No governance rules applied</div>';
            rulesContainer.style.display = 'block';
          }
        }
        card.style.display = 'block';
      }
    });

    cyOntologyInstance.on('tap', function(evt) {
      if (evt.target === cyOntologyInstance) {
        cyOntologyInstance.elements().removeClass('faded').removeClass('highlighted');
        const card = document.getElementById('ontoNodeCard');
        if (card) card.style.display = 'none';
      }
    });

  } catch (e) { console.log(e); }
}

// Single Custom Timbr Layout Engine
function runTimbrLayout(cy) {
  if (!cy) return;

  const container = document.getElementById('cy-ontology');
  const width = container ? container.clientWidth || 1000 : 1000;

  // 1. Single Root thing Node
  const rootNode = cy.nodes('[isRoot = true]').first();
  if (rootNode && rootNode.length > 0) {
    if (userMovedPositionsMap.has(rootNode.id())) {
      rootNode.position(userMovedPositionsMap.get(rootNode.id()));
    } else {
      rootNode.position({ x: width / 2, y: 80 });
    }
  }

  // 2. Class Concept Nodes
  const classNodes = cy.nodes('[nodeType = "class"]:visible');
  const nClasses = classNodes.length;

  if (nClasses > 0) {
    const xMargin = 200;
    const availableWidth = Math.max(width - 2 * xMargin, 300);
    const stepX = nClasses > 1 ? availableWidth / (nClasses - 1) : 0;

    classNodes.forEach((cNode, i) => {
      let cX, cY;
      if (userMovedPositionsMap.has(cNode.id())) {
        const uPos = userMovedPositionsMap.get(cNode.id());
        cX = uPos.x;
        cY = uPos.y;
      } else {
        cX = nClasses === 1 ? width / 2 : xMargin + i * stepX;
        cY = 240 + (i % 2 === 0 ? 0 : 50);
      }
      cNode.position({ x: cX, y: cY });

      // 3. Property Square Nodes for this Class
      const propNodes = cy.nodes(`[nodeType = "property"][parentClass = "${cNode.id()}"]:visible`);
      const nProps = propNodes.length;

      if (nProps > 0) {
        const side = i % 2 === 0 ? -1 : 1;
        const stepY = 32;

        propNodes.forEach((pNode, j) => {
          if (userMovedPositionsMap.has(pNode.id())) {
            pNode.position(userMovedPositionsMap.get(pNode.id()));
          } else {
            const propX = cX + side * 130;
            const startY = cY - ((nProps - 1) * stepY) / 2;
            const pY = startY + j * stepY;
            pNode.position({ x: propX, y: pY });
          }
        });
      }
    });
  }

  // 4. Relationship Diamond Nodes (Midpoint between connected classes)
  const relNodes = cy.nodes('[nodeType = "relationship"]:visible');
  relNodes.forEach(rNode => {
    if (userMovedPositionsMap.has(rNode.id())) {
      rNode.position(userMovedPositionsMap.get(rNode.id()));
    } else {
      const srcId = rNode.data('sourceClass');
      const tgtId = rNode.data('targetClass');

      const srcNode = cy.getElementById(srcId);
      const tgtNode = cy.getElementById(tgtId);

      if (srcNode && tgtNode && srcNode.length > 0 && tgtNode.length > 0) {
        const sPos = srcNode.position();
        const tPos = tgtNode.position();
        const midX = (sPos.x + tPos.x) / 2;
        const midY = (sPos.y + tPos.y) / 2 + 35;
        rNode.position({ x: midX, y: midY });
      }
    }
  });

  // Ensure all nodes are unlocked and grabbable
  cy.nodes().unlock().grabify();

  setTimeout(() => {
    if (cy) {
      cy.resize();
      cy.fit(cy.elements(':visible'), 60);
    }
  }, 100);
}

// Populate Multi-Class Filter Checkbox List
function populateOntologyClassFilterDropdown(classes) {
  const listEl = document.getElementById('ontoClassCheckboxList');
  if (!listEl) return;
  listEl.innerHTML = '';

  classes.forEach(c => {
    const label = c.label || c.name || 'OWLClass';
    const item = document.createElement('label');
    item.style.fontSize = '12px';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '8px';
    item.style.cursor = 'pointer';
    item.style.padding = '4px 6px';
    item.style.borderRadius = '4px';
    item.innerHTML = `
      <input type="checkbox" class="onto-class-chk" value="${c.iri}" checked style="cursor: pointer;">
      <span style="font-weight: 500; color: var(--text-primary);">📦 ${label}</span>
    `;
    listEl.appendChild(item);
  });
  updateOntologyClassFilterBtnLabel();
}

function toggleOntologyClassFilterDropdown() {
  const drop = document.getElementById('ontoClassFilterDropdown');
  if (!drop) return;
  drop.style.display = drop.style.display === 'none' ? 'block' : 'none';
}

function selectAllOntologyClassesFilter(selectState) {
  document.querySelectorAll('.onto-class-chk').forEach(chk => chk.checked = Boolean(selectState));
}

function filterOntologyClassCheckboxList(query) {
  const q = (query || '').toLowerCase().trim();
  const listEl = document.getElementById('ontoClassCheckboxList');
  if (!listEl) return;
  Array.from(listEl.children).forEach(labelEl => {
    const text = labelEl.innerText.toLowerCase();
    labelEl.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
  });
}

function updateOntologyClassFilterBtnLabel() {
  const btn = document.getElementById('ontoClassFilterBtn');
  if (!btn) return;
  const chks = document.querySelectorAll('.onto-class-chk');
  const checked = document.querySelectorAll('.onto-class-chk:checked');
  if (chks.length === 0) {
    btn.innerText = '🧠 Select Classes to Root ▾';
  } else if (checked.length === chks.length) {
    btn.innerText = '🧠 Select Classes to Root (All Selected) ▾';
  } else {
    btn.innerText = `🧠 Select Classes to Root (${checked.length}/${chks.length} Classes) ▾`;
  }
}

function applyOntologyClassFilter() {
  const drop = document.getElementById('ontoClassFilterDropdown');
  if (drop) drop.style.display = 'none';

  if (!cyOntologyInstance) return;

  const chks = document.querySelectorAll('.onto-class-chk:checked');
  const selectedIris = new Set(Array.from(chks).map(c => c.value));
  updateOntologyClassFilterBtnLabel();

  if (selectedIris.size === 0) {
    cyOntologyInstance.elements().style('display', 'none');
    return;
  }

  // Traversal upwards to root for each selected node, plus attached property nodes & relationships
  const nodesToKeep = new Set();
  nodesToKeep.add('sc_root_thing'); // Always keep single top root node

  selectedIris.forEach(startIri => {
    nodesToKeep.add(startIri);

    // Include datatype property nodes for this class
    cyOntologyInstance.nodes(`[parentClass = "${startIri}"]`).forEach(propNode => {
      nodesToKeep.add(propNode.id());
    });
  });

  // Also include relationship diamond nodes connecting any 2 nodesToKeep
  cyOntologyInstance.nodes('[nodeType = "relationship"]').forEach(relNode => {
    const src = relNode.data('sourceClass');
    const tgt = relNode.data('targetClass');
    if (nodesToKeep.has(src) && nodesToKeep.has(tgt)) {
      nodesToKeep.add(relNode.id());
    }
  });

  // Display nodes in nodesToKeep and hide the rest
  cyOntologyInstance.batch(() => {
    cyOntologyInstance.nodes().forEach(node => {
      if (nodesToKeep.has(node.id())) {
        node.style('display', 'element');
        node.removeClass('faded');
      } else {
        node.style('display', 'none');
      }
    });

    cyOntologyInstance.edges().forEach(edge => {
      const srcId = edge.source().id();
      const tgtId = edge.target().id();
      if (nodesToKeep.has(srcId) && nodesToKeep.has(tgtId)) {
        edge.style('display', 'element');
        edge.removeClass('faded');
      } else {
        edge.style('display', 'none');
      }
    });
  });

  // Re-run single Timbr Layout
  runTimbrLayout(cyOntologyInstance);
}

function resetOntologyGraphView() {
  if (cyOntologyInstance) {
    userMovedPositionsMap.clear();
    cyOntologyInstance.elements().removeClass('faded').removeClass('highlighted');
    cyOntologyInstance.elements().style('display', 'element');
    selectAllOntologyClassesFilter(true);
    updateOntologyClassFilterBtnLabel();
    runTimbrLayout(cyOntologyInstance);
  }
}
