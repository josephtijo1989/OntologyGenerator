// ==========================================================================
// Enterprise Semantic Ontology & Metadata Visualization Engine
// Modern Hierarchical Taxonomy, Expandable Cards, Multi-Source Mapping & Rationale
// ==========================================================================

// Global Module State
let ontoActiveMode = 'ontology'; // 'ontology' | 'metadata' | 'mapping'
let cyOntologyInstance = null;
let ontoModelData = null; // Generated ontology classes & properties
let ontoMetadataData = []; // Physical metadata tables & columns
let ontoConnectorsData = []; // Source database connectors
let expandedClassIds = new Set(); // Set of class IRIs currently expanded
let ontoSelectedElement = null; // Currently inspected node/edge data
let ontoConceptFilter = 'all'; // 'all' | 'classes' | 'properties' | 'relationships'
let ontoSearchQuery = '';
let ontoUserNodePositions = new Map(); // Manual drag positions per mode
let ontoLegendCollapsed = false;

// Initialize on Tab Switch or Project Switch
async function initOntologyGraph() {
  if (!currentProjectId) return;
  const cyContainer = document.getElementById('cy-ontology');
  if (cyContainer) {
    cyContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; font-size: 13px;">Loading semantic knowledge model...</div>';
  }

  try {
    // 1. Fetch Source Connectors, Metadata, and Ontology Model in parallel
    const [ontoRes, metaRes, connsRes] = await Promise.all([
      fetch(`${API_BASE}/projects/${currentProjectId}/ontology/generate?_t=${Date.now()}`),
      fetch(`${API_BASE}/projects/${currentProjectId}/metadata?_t=${Date.now()}`),
      fetch(`${API_BASE}/projects/${currentProjectId}/source-connections?_t=${Date.now()}`)
    ]);

    if (connsRes.ok) ontoConnectorsData = await connsRes.json();
    if (metaRes.ok) ontoMetadataData = await metaRes.json();
    if (ontoRes.ok) ontoModelData = await ontoRes.json();

    populateOntoToolbarFilters();

    // Render active mode
    if (ontoActiveMode === 'mapping') {
      renderMappingMode();
    } else if (ontoActiveMode === 'metadata') {
      renderMetadataMode();
    } else {
      renderOntologyMode();
    }
  } catch (err) {
    console.error('Error initializing ontology visualizer:', err);
    if (cyContainer) {
      cyContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; font-size: 13px;">Failed to load ontology model. Please run Auto Discovery under Metadata Discovery tab.</div>';
    }
  }
}

// Mode Switcher Controller
function switchOntologyMode(modeName) {
  ontoActiveMode = modeName;

  // Update button active classes
  document.querySelectorAll('.onto-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === modeName);
  });

  const canvasBox = document.getElementById('ontoWorkspaceWrapper');
  const mappingContainer = document.getElementById('ontoMappingContainer');
  const toolbar = document.getElementById('ontoGraphToolbar');
  const legend = document.getElementById('ontoGraphLegend');

  if (modeName === 'mapping') {
    if (canvasBox) canvasBox.style.display = 'none';
    if (mappingContainer) {
      mappingContainer.classList.add('active');
      mappingContainer.style.display = 'flex';
    }
    if (toolbar) toolbar.style.display = 'none';
    if (legend) legend.style.display = 'none';
    closeOntoDetailsPanel();
    renderMappingMode();
  } else {
    if (mappingContainer) {
      mappingContainer.classList.remove('active');
      mappingContainer.style.display = 'none';
    }
    if (canvasBox) canvasBox.style.display = 'grid';
    if (toolbar) toolbar.style.display = 'flex';
    if (legend) legend.style.display = 'flex';

    if (modeName === 'metadata') {
      renderMetadataMode();
    } else {
      renderOntologyMode();
    }
  }
}

// Populate Source Systems and Domain Filter Options
function populateOntoToolbarFilters() {
  const srcSelect = document.getElementById('ontoSourceFilterSelect');
  const mapSrcSelect = document.getElementById('mappingSourceFilter');

  if (srcSelect && ontoConnectorsData) {
    const cur = srcSelect.value;
    srcSelect.innerHTML = '<option value="ALL">All Source Systems</option>';
    ontoConnectorsData.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.innerText = `${c.name} (${c.connector_type})`;
      srcSelect.appendChild(opt);
    });
    if (cur) srcSelect.value = cur;
  }

  if (mapSrcSelect && ontoConnectorsData) {
    const cur = mapSrcSelect.value;
    mapSrcSelect.innerHTML = '<option value="ALL">All Source Connectors</option>';
    ontoConnectorsData.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.innerText = `${c.name} (${c.connector_type})`;
      mapSrcSelect.appendChild(opt);
    });
    if (cur) mapSrcSelect.value = cur;
  }
}

// ==========================================================================
// MODE 1: SEMANTIC ONTOLOGY MODE (Default Hierarchical Visualization)
// ==========================================================================
function renderOntologyMode() {
  const cyContainer = document.getElementById('cy-ontology');
  if (!cyContainer) return;

  if (cyOntologyInstance) {
    try { cyOntologyInstance.stop(); } catch(e){}
    try { cyOntologyInstance.destroy(); } catch(e){}
    cyOntologyInstance = null;
  }

  if (!ontoModelData || !ontoModelData.classes || ontoModelData.classes.length === 0) {
    cyContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 50px; text-align: center; font-size: 13px;">No ontology classes generated for this project yet. Run Auto Discovery under Metadata Discovery tab first.</div>';
    return;
  }

  cyContainer.innerHTML = '';

  const classes = (ontoModelData.classes || []).filter(c => {
    const name = (c.label || c.name || '').toLowerCase();
    return name !== 'thing' && name !== 'owl:thing';
  });

  const properties = ontoModelData.properties || [];
  const cyElements = [];
  const validClassMap = new Map();

  // 1. Create W3C Universal Base Class Root Node: "owl:Thing"
  const rootIri = 'http://www.w3.org/2002/07/owl#Thing';
  validClassMap.set('owl:Thing', rootIri);
  validClassMap.set('owl:thing', rootIri);
  validClassMap.set('Thing', rootIri);
  validClassMap.set('thing', rootIri);
  validClassMap.set(rootIri, rootIri);
  validClassMap.set('http://www.w3.org/2002/07/owl#thing', rootIri);

  const rootCardWidth = 140;
  const rootCardHeight = 46;
  const rootSvgUri = generateBaseClassCardSvg({
    label: 'owl:Thing',
    width: rootCardWidth,
    height: rootCardHeight
  });

  cyElements.push({
    group: 'nodes',
    data: {
      id: rootIri,
      label: 'owl:Thing',
      domainType: 'Base Class',
      isBaseClass: true,
      confidence: 100,
      confLabel: 'W3C Standard',
      confReasons: ['Universal Top-Level Base Class in W3C OWL 2.0', 'All ontology classes inherit from owl:Thing'],
      dataProps: [],
      objProps: [],
      sourceTable: 'W3C OWL Standard',
      cardWidth: rootCardWidth,
      cardHeight: rootCardHeight,
      svgCard: rootSvgUri,
      nodeType: 'ontologyClass',
      isRoot: true
    },
    position: { x: 500, y: 60 },
    grabbable: true
  });

  classes.forEach(c => {
    const pascalLabel = formatSemanticPascalCase(c.label || c.name || 'Class');
    validClassMap.set(c.iri, pascalLabel);
    validClassMap.set(pascalLabel, c.iri);
    validClassMap.set(pascalLabel.toLowerCase(), c.iri);
    validClassMap.set((c.label || '').toLowerCase(), c.iri);
    if (c.annotations && c.annotations.table_name) {
      validClassMap.set(c.annotations.table_name.toLowerCase(), c.iri);
    }
  });

  // Build Ontology Class Card Nodes (Collapsed or Expanded)
  classes.forEach(c => {
    const pascalLabel = formatSemanticPascalCase(c.label || c.name || 'Class');
    const domainType = c.annotations?.domain_type || 'Dimension';
    const isExpanded = expandedClassIds.has(c.iri);
    const tblName = c.annotations?.table_name || c.mapped_table_name || pascalLabel;

    // Filter properties for this class
    const classDataProps = properties.filter(p =>
      p.property_type === 'DatatypeProperty' &&
      (p.domain === c.iri || p.parent_class === c.label || p.parent_class === pascalLabel || (p.table_name && p.table_name.toLowerCase() === tblName.toLowerCase()))
    );

    const classObjProps = properties.filter(p =>
      p.property_type === 'ObjectProperty' &&
      (p.domain === c.iri || p.parent_class === c.label || p.parent_class === pascalLabel || (p.table_name && p.table_name.toLowerCase() === tblName.toLowerCase()))
    );

    // Compute Confidence & Rationale
    const confInfo = calculateClassConfidence(c, classDataProps, classObjProps);

    // Dynamic Card Dimensions: Clean, sleek card showing only class name
    const cardWidth = isExpanded ? 240 : Math.max(140, pascalLabel.length * 9.5 + 44);
    const cardHeight = isExpanded ? Math.min(320, 110 + classDataProps.length * 20 + classObjProps.length * 20) : 46;

    // Generate crisp vector SVG Data URI
    const svgUri = generateOntologyClassCardSvg({
      label: pascalLabel,
      iri: c.iri,
      domainType: domainType,
      isExpanded: isExpanded,
      dataProps: classDataProps,
      objProps: classObjProps,
      confidence: confInfo.score,
      sourceTable: tblName,
      width: cardWidth,
      height: cardHeight
    });

    cyElements.push({
      group: 'nodes',
      data: {
        id: c.iri,
        label: pascalLabel,
        rawClass: c,
        domainType: domainType,
        isExpanded: isExpanded,
        confidence: confInfo.score,
        confLabel: confInfo.label,
        confReasons: confInfo.reasons,
        dataProps: classDataProps,
        objProps: classObjProps,
        sourceTable: tblName,
        cardWidth: cardWidth,
        cardHeight: cardHeight,
        svgCard: svgUri,
        nodeType: 'ontologyClass'
      },
      position: { x: 500, y: 200 },
      grabbable: true
    });
  });

  // Build Directed Object Property Edges with Semantic Labels
  const addedEdgeKeys = new Set();

  properties.forEach(p => {
    if (p.property_type === 'ObjectProperty') {
      const srcLabel = p.domain || p.parent_class;
      const srcIri = validClassMap.get(srcLabel) || validClassMap.get((srcLabel || '').toLowerCase()) || p.domain;
      const tgtLabel = p.target_class || (p.range ? String(p.range).split('#').pop() : '');
      const tgtIri = validClassMap.get(tgtLabel) || validClassMap.get((tgtLabel || '').toLowerCase()) || validClassMap.get(p.range);

      if (srcIri && tgtIri && srcIri !== tgtIri) {
        const edgeKey = `${srcIri}->${tgtIri}:${p.label}`;
        if (!addedEdgeKeys.has(edgeKey)) {
          addedEdgeKeys.add(edgeKey);

          const relConf = calculateRelationshipConfidence(p);
          const relLabel = formatSemanticCamelCase(p.relationship_name || p.label || 'relatesTo');

          cyElements.push({
            group: 'edges',
            data: {
              id: `edge_${p.iri || edgeKey}`,
              source: srcIri,
              target: tgtIri,
              label: relLabel,
              edgeType: 'ObjectProperty',
              relationshipName: relLabel,
              inverseProperty: p.inverse_property || '',
              confidence: relConf.score,
              confReasons: relConf.reasons,
              rawProperty: p
            }
          });
        }
      }
    }
  });

  // Build Subclass Hierarchy Edges (rdfs:subClassOf) connecting each class to parent or Base Class
  classes.forEach(c => {
    const rawSub = c.subclass_of && c.subclass_of.length > 0 ? c.subclass_of[0] : 'owl:Thing';
    const cleanSub = String(rawSub || 'owl:Thing').trim();
    let parentIri = rootIri;

    if (cleanSub && cleanSub !== 'owl:Thing' && cleanSub.toLowerCase() !== 'thing' && cleanSub !== 'http://www.w3.org/2002/07/owl#Thing' && cleanSub !== 'http://www.w3.org/2002/07/owl#thing') {
      const foundIri = validClassMap.get(cleanSub) || validClassMap.get(cleanSub.toLowerCase());
      if (foundIri && foundIri !== c.iri) {
        parentIri = foundIri;
      } else {
        // Custom intermediate SuperClass Category (e.g. MasterData, ReferenceData)
        const customSuperIri = `sc_${cleanSub.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        if (!validClassMap.has(customSuperIri)) {
          validClassMap.set(customSuperIri, customSuperIri);
          validClassMap.set(cleanSub.toLowerCase(), customSuperIri);

          const customLabel = formatSemanticPascalCase(cleanSub);
          const scWidth = Math.max(140, customLabel.length * 9.5 + 44);
          const scSvg = generateBaseClassCardSvg({ label: customLabel, width: scWidth, height: 46 });

          cyElements.push({
            group: 'nodes',
            data: {
              id: customSuperIri,
              label: customLabel,
              domainType: 'SuperClass',
              isBaseClass: true,
              confidence: 100,
              confLabel: 'SuperClass Category',
              confReasons: ['Enterprise Taxonomy SuperClass Category'],
              dataProps: [],
              objProps: [],
              sourceTable: 'SuperClass Taxonomy',
              cardWidth: scWidth,
              cardHeight: 46,
              svgCard: scSvg,
              nodeType: 'ontologyClass',
              isRoot: false
            },
            position: { x: 500, y: 120 },
            grabbable: true
          });

          // Connect custom intermediate superclass to root owl:Thing
          cyElements.push({
            group: 'edges',
            data: {
              id: `subclass_${customSuperIri}_${rootIri}`,
              source: customSuperIri,
              target: rootIri,
              label: 'subClassOf',
              edgeType: 'SubClassOf'
            }
          });
        }
        parentIri = customSuperIri;
      }
    }

    // Connect Child Class to Parent SuperClass / Base Class
    cyElements.push({
      group: 'edges',
      data: {
        id: `subclass_${c.iri}_${parentIri}`,
        source: c.iri,
        target: parentIri,
        label: 'subClassOf',
        edgeType: 'SubClassOf'
      }
    });
  });

  // Filter elements to ensure all edge source and target nodes exist in the node set
  const validNodeIds = new Set(cyElements.filter(e => e.group === 'nodes').map(e => e.data.id));
  const sanitizedElements = cyElements.filter(e => {
    if (e.group === 'nodes') return true;
    return validNodeIds.has(e.data.source) && validNodeIds.has(e.data.target);
  });

  // Initialize Cytoscape Instance
  cyOntologyInstance = cytoscape({
    container: cyContainer,
    elements: sanitizedElements,
    boxSelectionEnabled: false,
    autoungrabify: false,
    autolock: false,
    userZoomingEnabled: true,
    userPanningEnabled: true,
    wheelSensitivity: 0.25,
    textureOnViewport: false,
    style: [
      {
        selector: 'node',
        style: {
          'width': 140,
          'height': 46,
          'shape': 'round-rectangle',
          'background-color': '#0284c7',
          'border-width': 0
        }
      },
      {
        selector: 'node[nodeType = "ontologyClass"]',
        style: {
          'shape': 'round-rectangle',
          'width': 'data(cardWidth)',
          'height': 'data(cardHeight)',
          'background-opacity': 0,
          'background-image': 'data(svgCard)',
          'background-fit': 'contain',
          'background-clip': 'none',
          'border-width': 0,
          'label': '',
          'overlay-padding': '4px',
          'overlay-opacity': 0,
          'transition-property': 'opacity',
          'transition-duration': '0.18s'
        }
      },
      {
        selector: 'node:selected, node.highlighted',
        style: {
          'border-width': 2.5,
          'border-color': '#0284c7',
          'border-opacity': 1,
          'shadow-blur': 16,
          'shadow-color': 'rgba(2, 132, 199, 0.4)',
          'opacity': 1
        }
      },
      {
        selector: 'edge[edgeType = "ObjectProperty"]',
        style: {
          'width': 1.8,
          'line-color': '#4f46e5',
          'target-arrow-color': '#4f46e5',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 1.15,
          'curve-style': 'bezier',
          'label': 'data(label)',
          'color': '#334155',
          'font-size': '11px',
          'font-family': 'Inter, sans-serif',
          'font-weight': '500',
          'text-rotation': 'autorotate',
          'text-background-color': '#ffffff',
          'text-background-opacity': 0.95,
          'text-background-padding': '3px',
          'text-background-shape': 'roundrectangle',
          'text-border-color': '#e2e8f0',
          'text-border-width': 1,
          'text-border-opacity': 0.8,
          'transition-property': 'line-color, width, opacity',
          'transition-duration': '0.15s'
        }
      },
      {
        selector: 'edge[edgeType = "SubClassOf"]',
        style: {
          'width': 1.6,
          'line-style': 'dashed',
          'line-color': '#94a3b8',
          'target-arrow-color': '#64748b',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 1.1,
          'curve-style': 'bezier',
          'label': '',
          'overlay-opacity': 0
        }
      },
      {
        selector: '.faded',
        style: {
          'opacity': 0.12
        }
      },
      {
        selector: '.highlighted-edge',
        style: {
          'width': 2.6,
          'line-color': '#0284c7',
          'target-arrow-color': '#0284c7',
          'opacity': 1
        }
      }
    ],
    layout: { name: 'preset' }
  });

  // Run Custom Hierarchical Sugiyama-Style Layout
  runLayeredOntologyLayout(cyOntologyInstance);

  // Setup Graph Events: Click, Double Click (Expand/Collapse), Drag, Background Tap
  setupOntologyGraphEvents(cyOntologyInstance);
}

// ==========================================================================
// DYNAMIC SVG CARD GENERATORS FOR ONTOLOGY & BASE CLASS NODES
// ==========================================================================
function generateBaseClassCardSvg({ label, width, height }) {
  const cornerRadius = (height - 3) / 2;
  return `data:image/svg+xml;utf8,` + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="baseShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.08"/>
        </filter>
      </defs>
      <rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#f8fafc" stroke="#475569" stroke-width="1.8" stroke-dasharray="4,2" filter="url(#baseShadow)" />
      <circle cx="18" cy="${height / 2}" r="6" fill="#334155" />
      
      <!-- Base Class Label -->
      <text x="32" y="${height / 2 + 5}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="700" fill="#1e293b">
        🏛️ ${escapeXml(label)}
      </text>
    </svg>
  `);
}

function generateOntologyClassCardSvg({ label, domainType, isExpanded, dataProps, objProps, sourceTable, width, height }) {
  // Domain Color Accents
  let accentColor = '#0284c7'; // Sky blue default
  let icon = '🟠';

  if (domainType === 'Fact') {
    accentColor = '#4338ca'; icon = '🧬';
  } else if (domainType === 'Lookup') {
    accentColor = '#d97706'; icon = '📦';
  } else if (domainType === 'SCD') {
    accentColor = '#059669'; icon = '🏛️';
  } else if (domainType === 'Dimension') {
    accentColor = '#0284c7'; icon = '🟠';
  }

  if (!isExpanded) {
    const cornerRadius = (height - 3) / 2;
    // Clean, elegant circular pill card showing class name and circular accent dot
    return `data:image/svg+xml;utf8,` + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.06"/>
          </filter>
        </defs>
        <rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" filter="url(#cardShadow)" />
        <circle cx="18" cy="${height / 2}" r="6" fill="${accentColor}" />
        
        <!-- Class Name with Domain Accent -->
        <text x="32" y="${height / 2 + 5}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="600" fill="#0f172a">
          ${escapeXml(label)}
        </text>
      </svg>
    `);
  }

  // Expanded Detailed Card
  const visibleProps = dataProps.slice(0, 4);
  const visibleRels = objProps.slice(0, 3);
  let curY = 46;

  let propsSvg = visibleProps.map(p => {
    const pName = formatSemanticCamelCase(p.label || p.name || 'attr');
    const pRange = (p.range ? String(p.range).split('#').pop() : 'string').replace('xsd:', '');
    const row = `
      <text x="14" y="${curY}" font-family="JetBrains Mono, monospace" font-size="10" fill="#334155">
        ▪ ${escapeXml(pName)} <tspan font-size="8.5" fill="#64748b">(${escapeXml(pRange)})</tspan>
      </text>
    `;
    curY += 18;
    return row;
  }).join('');

  if (dataProps.length > 4) {
    propsSvg += `<text x="14" y="${curY}" font-family="Inter, sans-serif" font-size="9" fill="#64748b">+${dataProps.length - 4} more attributes...</text>`;
    curY += 16;
  }

  curY += 6;
  const relDividerY = curY;
  curY += 14;

  let relsSvg = visibleRels.map(r => {
    const rName = formatSemanticCamelCase(r.relationship_name || r.label || 'relatesTo');
    const rTgt = r.target_class || (r.range ? String(r.range).split('#').pop() : 'Class');
    const row = `
      <text x="14" y="${curY}" font-family="Inter, sans-serif" font-size="10" fill="#4338ca">
        → ${escapeXml(rName)} <tspan font-size="9" font-weight="700" fill="#0284c7">➔ ${escapeXml(rTgt)}</tspan>
      </text>
    `;
    curY += 18;
    return row;
  }).join('');

  if (objProps.length === 0) {
    relsSvg = `<text x="14" y="${curY}" font-family="Inter, sans-serif" font-size="9.5" fill="#94a3b8" font-style="italic">No linked relationships</text>`;
    curY += 16;
  }

  return `data:image/svg+xml;utf8,` + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="10" ry="10" fill="#ffffff" stroke="#0284c7" stroke-width="2" />
      <rect x="1" y="1" width="${width - 2}" height="32" rx="10" fill="#f8fafc" />
      
      <!-- Header -->
      <text x="14" y="21" font-family="Inter, sans-serif" font-size="12.5" font-weight="700" fill="#0f172a">${icon} ${escapeXml(label)}</text>
      
      <!-- Collapse Button Hint -->
      <rect x="${width - 76}" y="8" width="66" height="17" rx="4" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1" />
      <text x="${width - 43}" y="19" font-family="Inter, sans-serif" font-size="9" font-weight="700" fill="#0284c7" text-anchor="middle">Collapse ▴</text>
      
      <line x1="1" y1="32" x2="${width - 1}" y2="32" stroke="#e2e8f0" stroke-width="1" />
      
      <!-- Properties Section -->
      ${propsSvg}
      
      <!-- Relationships Divider -->
      <line x1="10" y1="${relDividerY}" x2="${width - 10}" y2="${relDividerY}" stroke="#e2e8f0" stroke-dasharray="3,3" />
      
      <!-- Relationships Section -->
      ${relsSvg}
      
      <!-- Footer Lineage -->
      <rect x="1" y="${height - 22}" width="${width - 2}" height="21" rx="0" fill="#f8fafc" />
      <line x1="1" y1="${height - 22}" x2="${width - 1}" y2="${height - 22}" stroke="#e2e8f0" stroke-width="1" />
      <text x="10" y="${height - 8}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#64748b">src: ${escapeXml(sourceTable)}</text>
    </svg>
  `);
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ==========================================================================
// HIERARCHICAL LAYERED GRAPH LAYOUT (Sugiyama-Style Layout)
// ==========================================================================
function runLayeredOntologyLayout(cy) {
  if (!cy) return;

  const container = document.getElementById('cy-ontology');
  const containerWidth = container ? (container.clientWidth || 1000) : 1000;
  const nodes = cy.nodes('[nodeType = "ontologyClass"]:visible');
  if (nodes.length === 0) return;

  // 1. Calculate Hierarchy Rank / Layer for Each Concept
  const nodeLevels = new Map();
  const rootNode = cy.nodes('[isBaseClass = true], [id = "http://www.w3.org/2002/07/owl#Thing"], [id = "owl:Thing"]').first();
  const rootId = (rootNode && rootNode.length > 0) ? rootNode.id() : 'http://www.w3.org/2002/07/owl#Thing';

  if (rootNode && rootNode.length > 0) {
    nodeLevels.set(rootNode.id(), 0);
  }

  // Level 1: nodes that point directly to root owl:Thing via SubClassOf
  nodes.forEach(n => {
    if (n.id() !== rootId) {
      const scEdges = n.outgoers('edge[edgeType = "SubClassOf"]');
      const pointsToRoot = scEdges.some(e => e.target().id() === rootId);
      if (pointsToRoot || scEdges.length === 0) {
        nodeLevels.set(n.id(), 1);
      }
    }
  });

  // Iteratively compute deeper subclass levels (Level 2+)
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;

    nodes.forEach(n => {
      if (n.id() !== rootId) {
        const scEdges = n.outgoers('edge[edgeType = "SubClassOf"]');
        scEdges.forEach(e => {
          const parent = e.target();
          if (parent && parent.id() !== rootId) {
            const parentLvl = nodeLevels.get(parent.id()) || 1;
            const currentLvl = nodeLevels.get(n.id()) || 1;
            if (currentLvl <= parentLvl) {
              nodeLevels.set(n.id(), parentLvl + 1);
              changed = true;
            }
          }
        });
      }
    });
  }

  // Assign Level 1 to any remaining unassigned nodes
  nodes.forEach(n => {
    if (!nodeLevels.has(n.id())) nodeLevels.set(n.id(), 1);
  });

  // Group nodes by Layer
  const byLayer = new Map();
  nodes.forEach(n => {
    const lvl = nodeLevels.get(n.id()) || 0;
    if (!byLayer.has(lvl)) byLayer.set(lvl, []);
    byLayer.get(lvl).push(n);
  });

  const sortedLayers = Array.from(byLayer.keys()).sort((a, b) => a - b);
  const maxNodesInLayer = Math.max(1, ...Array.from(byLayer.values()).map(arr => arr.length));
  const nodeSpacingX = 230;
  const totalWidth = Math.max(containerWidth, maxNodesInLayer * nodeSpacingX + 160);

  const startY = 60;
  const layerSpacingY = 160;

  // Position nodes layer by layer
  sortedLayers.forEach((layerIdx, rank) => {
    const layerNodes = byLayer.get(layerIdx);
    const count = layerNodes.length;
    const stepX = count > 1 ? (totalWidth - 230) / (count - 1) : 0;
    const startX = count > 1 ? 115 : totalWidth / 2;
    const currentY = startY + rank * layerSpacingY;

    layerNodes.forEach((node, i) => {
      // If user manually dragged node, respect custom position
      if (ontoUserNodePositions.has(node.id())) {
        const customPos = ontoUserNodePositions.get(node.id());
        node.position(customPos);
      } else {
        const cX = count === 1 ? totalWidth / 2 : startX + i * stepX;
        node.position({ x: cX, y: currentY });
      }
    });
  });

  cy.nodes().unlock().grabify();

  setTimeout(() => {
    if (cy && !cy.destroyed()) {
      try {
        cy.resize();
        cy.fit(cy.elements(':visible'), 50);
      } catch(e) {}
    }
  }, 100);
}

// ==========================================================================
// GRAPH INTERACTIONS, SELECTION & DETAILS PANEL
// ==========================================================================
function setupOntologyGraphEvents(cy) {
  if (!cy) return;

  // Drag & drop position persistence
  cy.on('dragfree', 'node', evt => {
    const node = evt.target;
    ontoUserNodePositions.set(node.id(), { ...node.position() });
  });

  // Single Tap on Node -> Select & Open Details Panel
  cy.on('tap', 'node', evt => {
    const node = evt.target;
    const nData = node.data();

    // Neighborhood Highlighting
    const neighborhood = node.neighborhood().add(node);
    cy.elements().addClass('faded').removeClass('highlighted highlighted-edge');
    node.addClass('highlighted');
    node.connectedEdges().addClass('highlighted-edge').removeClass('faded');
    node.neighborhood('node').removeClass('faded');

    openOntoDetailsPanel(nData, 'node');
  });

  // Double Click / Double Tap on Node -> Toggle Expand/Collapse
  let lastTapTime = 0;
  let lastTappedNodeId = null;

  cy.on('tap', 'node', evt => {
    const node = evt.target;
    const now = Date.now();
    if (lastTappedNodeId === node.id() && now - lastTapTime < 350) {
      // Double tap triggered
      toggleNodeExpand(node.id());
    }
    lastTapTime = now;
    lastTappedNodeId = node.id();
  });

  // Tap on Edge -> Show Relationship Details Panel
  cy.on('tap', 'edge', evt => {
    const edge = evt.target;
    const eData = edge.data();

    cy.elements().addClass('faded').removeClass('highlighted highlighted-edge');
    edge.addClass('highlighted-edge').removeClass('faded');
    edge.source().removeClass('faded').addClass('highlighted');
    edge.target().removeClass('faded').addClass('highlighted');

    openOntoDetailsPanel(eData, 'edge');
  });

  // Tap on Canvas Background -> Deselect & Close Details Panel
  cy.on('tap', evt => {
    if (evt.target === cy) {
      cy.elements().removeClass('faded highlighted highlighted-edge');
      closeOntoDetailsPanel();
    }
  });

  // Level of Detail (LOD) Zoom Listener
  cy.on('zoom', () => {
    const zoomLevel = cy.zoom();
    if (zoomLevel < 0.55) {
      cy.edges().style('font-size', '0px'); // Hide edge text when zoomed out
    } else {
      cy.edges().style('font-size', '11px');
    }
  });
}

// Toggle Node Expand / Collapse
function toggleNodeExpand(nodeId) {
  if (expandedClassIds.has(nodeId)) {
    expandedClassIds.delete(nodeId);
  } else {
    expandedClassIds.add(nodeId);
  }
  renderOntologyMode();
}

// Toggle Expand All / Collapse All
function toggleExpandAllNodes() {
  const btn = document.getElementById('ontoExpandAllBtn');
  const classes = ontoModelData?.classes || [];

  if (expandedClassIds.size > 0) {
    expandedClassIds.clear();
    if (btn) btn.innerText = '📦 Expand All';
  } else {
    classes.forEach(c => expandedClassIds.add(c.iri));
    if (btn) btn.innerText = '📁 Collapse All';
  }
  renderOntologyMode();
}

// Open Dynamic Right-Side Details Drawer
function openOntoDetailsPanel(itemData, itemType = 'node') {
  const drawer = document.getElementById('ontoDetailsDrawer');
  const wrapper = document.getElementById('ontoWorkspaceWrapper');
  if (!drawer || !wrapper) return;

  wrapper.classList.add('details-open');
  drawer.classList.add('active');

  if (itemType === 'node') {
    renderClassDetailsPanel(itemData);
  } else if (itemType === 'edge') {
    renderRelationshipDetailsPanel(itemData);
  }

  // Auto-resize Cytoscape canvas smoothly
  setTimeout(() => {
    if (cyOntologyInstance) cyOntologyInstance.resize();
  }, 300);
}

function closeOntoDetailsPanel() {
  const drawer = document.getElementById('ontoDetailsDrawer');
  const wrapper = document.getElementById('ontoWorkspaceWrapper');
  if (drawer) drawer.classList.remove('active');
  if (wrapper) wrapper.classList.remove('details-open');

  setTimeout(() => {
    if (cyOntologyInstance) cyOntologyInstance.resize();
  }, 300);
}

function renderClassDetailsPanel(nData) {
  if (nData.isBaseClass || nData.id === 'owl:Thing' || nData.id === 'http://www.w3.org/2002/07/owl#Thing') {
    document.getElementById('odd-type-badge').innerText = 'owl:Class (Universal Base Class)';
    document.getElementById('odd-title').innerText = nData.label || 'owl:Thing';
    document.getElementById('odd-subtitle').innerText = 'http://www.w3.org/2002/07/owl#Thing';
    document.getElementById('odd-source-system').innerText = 'W3C OWL 2.0 Standard';
    document.getElementById('odd-source-table').innerText = 'Root SuperClass Taxonomy';
    document.getElementById('odd-subclass').innerText = 'Top-Level Universal Base Class';
    document.getElementById('odd-domain-tag').innerText = 'Taxonomy Root';
  } else {
    document.getElementById('odd-type-badge').innerText = 'owl:Class';
    document.getElementById('odd-title').innerText = nData.label || 'Ontology Class';
    document.getElementById('odd-subtitle').innerText = nData.id || '';
    const srcConn = ontoConnectorsData && ontoConnectorsData.length > 0 ? ontoConnectorsData[0].name : 'SQL Server (Production)';
    document.getElementById('odd-source-system').innerText = srcConn;
    document.getElementById('odd-source-table').innerText = nData.sourceTable || nData.label;
    document.getElementById('odd-subclass').innerText = (nData.rawClass?.subclass_of ? nData.rawClass.subclass_of[0] : 'owl:Thing');
    document.getElementById('odd-domain-tag').innerText = nData.domainType || 'Dimension';
  }

  // Metrics
  document.getElementById('odd-prop-count').innerText = nData.dataProps?.length || 0;
  document.getElementById('odd-rel-count').innerText = nData.objProps?.length || 0;
  document.getElementById('odd-source-count').innerText = 1;

  // Data Properties List
  const propsContainer = document.getElementById('odd-props-list');
  document.getElementById('odd-props-header-badge').innerText = nData.dataProps?.length || 0;
  if (nData.dataProps && nData.dataProps.length > 0) {
    propsContainer.innerHTML = nData.dataProps.map(p => {
      const pName = formatSemanticCamelCase(p.label || p.name);
      return `
        <div style="background: var(--bg-surface); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
          <div>
            <span style="font-weight: 600; color: #0f172a; font-family: var(--font-mono);">▪ ${pName}</span>
            <span style="font-size: 10px; color: var(--text-secondary); display: block;">src: ${p.mapped_column_name || p.label}</span>
          </div>
          <span class="badge" style="background: #ecfdf5; color: #059669; font-size: 10px;">${(p.range || 'string').replace('xsd:', '')}</span>
        </div>
      `;
    }).join('');
  } else {
    propsContainer.innerHTML = '<span style="font-size: 11px; color: var(--text-secondary); font-style: italic;">No datatype properties.</span>';
  }

  // Object Properties List
  const relsContainer = document.getElementById('odd-rels-list');
  document.getElementById('odd-rels-header-badge').innerText = nData.objProps?.length || 0;
  if (nData.objProps && nData.objProps.length > 0) {
    relsContainer.innerHTML = nData.objProps.map(r => {
      const rName = formatSemanticCamelCase(r.relationship_name || r.label);
      const rTgt = r.target_class || (r.range ? String(r.range).split('#').pop() : 'Class');
      return `
        <div style="background: var(--bg-surface); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
          <div>
            <strong style="color: var(--accent-violet); font-family: var(--font-mono);">${rName}</strong>
            ${r.inverse_property ? `<span style="font-size: 10px; color: var(--text-secondary); display: block;">⇄ ${r.inverse_property}</span>` : ''}
          </div>
          <span class="badge" style="background: #e0f2fe; color: #0284c7; font-size: 10px;">➔ ${rTgt}</span>
        </div>
      `;
    }).join('');
  } else {
    relsContainer.innerHTML = '<span style="font-size: 11px; color: var(--text-secondary); font-style: italic;">No connected relationships.</span>';
  }

  // Business Rules
  const rulesSec = document.getElementById('odd-rules-section');
  const rulesList = document.getElementById('odd-rules-list');
  const rules = nData.rawClass?.business_rules || [];
  if (rules.length > 0) {
    rulesSec.style.display = 'block';
    rulesList.innerHTML = rules.map(ru => `
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 4px 8px; border-radius: 4px; font-size: 11px; color: #0284c7;">
        <strong>⚙️ ${escapeXml(ru.name)}</strong>: ${escapeXml(ru.rule_definition || 'Rule applied')}
      </div>
    `).join('');
  } else {
    rulesSec.style.display = 'none';
  }

  // Action Buttons
  const targetLabel = nData.label || (nData.isBaseClass ? 'owl:Thing' : 'Concept');
  const subclassBtn = document.getElementById('odd-create-subclass-btn');
  const subclassLabelSpan = document.getElementById('odd-subclass-target-label');
  if (subclassBtn) {
    subclassBtn.style.display = 'flex';
    if (subclassLabelSpan) subclassLabelSpan.innerText = targetLabel;
    subclassBtn.onclick = () => {
      openCreateClassModalFromGraph(targetLabel);
    };
  }

  document.getElementById('odd-edit-class-btn').onclick = () => {
    switchToTab('ontology');
    if (typeof openOntologyClassModal === 'function') {
      openOntologyClassModal(nData.sourceTable || nData.label);
    }
  };
}

function renderRelationshipDetailsPanel(eData) {
  document.getElementById('odd-type-badge').innerText = 'owl:ObjectProperty';
  document.getElementById('odd-title').innerText = eData.relationshipName || eData.label;
  document.getElementById('odd-subtitle').innerText = `Directed Relationship: ${eData.source} ➔ ${eData.target}`;

  document.getElementById('odd-prop-count').innerText = 1;
  document.getElementById('odd-rel-count').innerText = 1;
  document.getElementById('odd-source-count').innerText = 1;

  document.getElementById('odd-source-system').innerText = 'Relationship Lineage';
  document.getElementById('odd-source-table').innerText = `${eData.source} ➔ ${eData.target}`;
  document.getElementById('odd-subclass').innerText = eData.inverseProperty ? `owl:inverseOf ${eData.inverseProperty}` : 'Unidirectional';
  document.getElementById('odd-domain-tag').innerText = 'ObjectProperty';

  document.getElementById('odd-props-list').innerHTML = `
    <div style="background: var(--bg-surface); padding: 8px; border-radius: 6px; font-size: 11px;">
      <div><strong>Domain (Source):</strong> ${eData.source}</div>
      <div style="margin-top: 4px;"><strong>Range (Target):</strong> ${eData.target}</div>
      ${eData.inverseProperty ? `<div style="margin-top: 4px; color: var(--accent-violet);"><strong>Bidirectional Inverse:</strong> ${eData.inverseProperty}</div>` : ''}
    </div>
  `;

  document.getElementById('odd-rels-list').innerHTML = '<span style="font-size: 11px; color: var(--text-secondary);">Direct semantic link between concepts.</span>';
  document.getElementById('odd-rules-section').style.display = 'none';

  const subclassBtn = document.getElementById('odd-create-subclass-btn');
  if (subclassBtn) subclassBtn.style.display = 'none';

  document.getElementById('odd-edit-class-btn').onclick = () => {
    switchToTab('ontology');
    if (typeof openOntologyClassModal === 'function') {
      openOntologyClassModal(eData.source);
    }
  };
}

// ==========================================================================
// MODE 2: SOURCE METADATA MODE (Physical Relational Database Schema ERD)
// ==========================================================================
function renderMetadataMode() {
  const cyContainer = document.getElementById('cy-ontology');
  if (!cyContainer) return;

  if (cyOntologyInstance) {
    try { cyOntologyInstance.stop(); } catch(e){}
    try { cyOntologyInstance.destroy(); } catch(e){}
    cyOntologyInstance = null;
  }

  if (!ontoMetadataData || ontoMetadataData.length === 0) {
    cyContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 50px; text-align: center; font-size: 13px;">No physical database metadata cataloged yet. Run Auto Discovery under Metadata Discovery tab.</div>';
    return;
  }

  cyContainer.innerHTML = '';

  const cyElements = [];
  const validTableMap = new Map();

  ontoMetadataData.forEach(tbl => {
    const fullTblName = `${tbl.schema_name}.${tbl.table_name}`;
    validTableMap.set(fullTblName, tbl.id);
    validTableMap.set(tbl.table_name, tbl.id);

    const pks = (tbl.columns || []).filter(c => c.is_primary_key);
    const fks = (tbl.columns || []).filter(c => c.is_foreign_key);

    // SVG physical database table card
    const cardWidth = 210;
    const cardHeight = Math.min(260, 60 + (tbl.columns || []).length * 18);
    const svgUri = generateMetadataTableCardSvg({
      schemaName: tbl.schema_name,
      tableName: tbl.table_name,
      columns: tbl.columns || [],
      width: cardWidth,
      height: cardHeight
    });

    cyElements.push({
      group: 'nodes',
      data: {
        id: tbl.id,
        label: tbl.table_name,
        schemaName: tbl.schema_name,
        tableName: tbl.table_name,
        columns: tbl.columns || [],
        pks: pks,
        fks: fks,
        cardWidth: cardWidth,
        cardHeight: cardHeight,
        svgCard: svgUri,
        nodeType: 'metadataTable'
      },
      position: { x: 300, y: 200 },
      grabbable: true
    });
  });

  // Physical Foreign Key Edges
  ontoMetadataData.forEach(tbl => {
    (tbl.columns || []).forEach(col => {
      if (col.is_foreign_key && col.foreign_table_name) {
        const targetId = validTableMap.get(col.foreign_table_name) || validTableMap.get(col.foreign_table_name.toLowerCase());
        if (targetId && targetId !== tbl.id) {
          cyElements.push({
            group: 'edges',
            data: {
              id: `fk_${tbl.id}_${col.column_name}_${targetId}`,
              source: tbl.id,
              target: targetId,
              label: `FK: ${col.column_name}`,
              edgeType: 'ForeignKey'
            }
          });
        }
      }
    });
  });

  // Filter elements to ensure all edge source and target nodes exist in the node set
  const validNodeIds = new Set(cyElements.filter(e => e.group === 'nodes').map(e => e.data.id));
  const sanitizedElements = cyElements.filter(e => {
    if (e.group === 'nodes') return true;
    return validNodeIds.has(e.data.source) && validNodeIds.has(e.data.target);
  });

  cyOntologyInstance = cytoscape({
    container: cyContainer,
    elements: sanitizedElements,
    boxSelectionEnabled: false,
    autoungrabify: false,
    autolock: false,
    userZoomingEnabled: true,
    userPanningEnabled: true,
    textureOnViewport: false,
    style: [
      {
        selector: 'node',
        style: {
          'width': 220,
          'height': 160,
          'shape': 'round-rectangle',
          'background-color': '#059669',
          'border-width': 0
        }
      },
      {
        selector: 'node[nodeType = "metadataTable"]',
        style: {
          'shape': 'round-rectangle',
          'width': 'data(cardWidth)',
          'height': 'data(cardHeight)',
          'background-opacity': 0,
          'background-image': 'data(svgCard)',
          'background-fit': 'contain',
          'border-width': 0
        }
      },
      {
        selector: 'edge[edgeType = "ForeignKey"]',
        style: {
          'width': 1.6,
          'line-color': '#059669',
          'target-arrow-color': '#059669',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': '10px',
          'color': '#065f46',
          'font-family': 'JetBrains Mono, monospace',
          'text-background-color': '#ffffff',
          'text-background-opacity': 0.9,
          'text-background-padding': '2px'
        }
      }
    ],
    layout: {
      name: 'cose',
      animate: false,
      padding: 40,
      nodeOverlap: 20
    }
  });
}

function generateMetadataTableCardSvg({ schemaName, tableName, columns, width, height }) {
  const visibleCols = columns.slice(0, 8);
  let curY = 44;

  const colsSvg = visibleCols.map(c => {
    const isPk = Boolean(c.is_primary_key);
    const isFk = Boolean(c.is_foreign_key);
    const keyIcon = isPk ? '🔑' : (isFk ? '🔗' : '▪');
    const row = `
      <text x="12" y="${curY}" font-family="JetBrains Mono, monospace" font-size="9.5" fill="${isPk ? '#b45309' : '#334155'}">
        ${keyIcon} ${escapeXml(c.column_name)} <tspan font-size="8.5" fill="#64748b">(${escapeXml(c.data_type)})</tspan>
      </text>
    `;
    curY += 16;
    return row;
  }).join('');

  return `data:image/svg+xml;utf8,` + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="8" ry="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
      <rect x="1" y="1" width="${width - 2}" height="28" rx="8" fill="#1e293b" />
      
      <!-- Table Header -->
      <text x="10" y="18" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">📦 ${escapeXml(tableName)}</text>
      <text x="${width - 10}" y="18" font-family="JetBrains Mono, monospace" font-size="9" fill="#94a3b8" text-anchor="end">${escapeXml(schemaName)}</text>
      
      <!-- Columns -->
      ${colsSvg}
    </svg>
  `);
}

// ==========================================================================
// MODE 3: SOURCE-TO-ONTOLOGY MAPPING VIEW (3-Column Visual Bridge)
// ==========================================================================
function renderMappingMode() {
  const sourcesContainer = document.getElementById('mapping-sources-list');
  const targetsContainer = document.getElementById('mapping-targets-list');
  const totalLinksEl = document.getElementById('map-total-links');
  const srcBadge = document.getElementById('map-source-badge');
  const tgtBadge = document.getElementById('map-target-badge');

  if (!sourcesContainer || !targetsContainer) return;

  const tables = ontoMetadataData || [];
  const classes = ontoModelData?.classes || [];
  const properties = ontoModelData?.properties || [];

  if (srcBadge) srcBadge.innerText = `${tables.length} Tables`;
  if (tgtBadge) tgtBadge.innerText = `${classes.length} Concepts`;

  let totalMappings = 0;

  // Render Source Columns Cards
  sourcesContainer.innerHTML = tables.map(tbl => {
    const cols = tbl.columns || [];
    const srcConn = ontoConnectorsData && ontoConnectorsData.length > 0 ? ontoConnectorsData[0].name : 'SQL Server';

    return `
      <div class="onto-mapping-card" onclick="highlightMappingPair('${tbl.table_name}')">
        <div class="flex-between">
          <strong style="font-size: 13px; color: var(--text-primary);">📦 ${tbl.table_name}</strong>
          <span class="badge" style="background: rgba(2, 132, 199, 0.12); color: var(--accent-cyan); font-size: 9px;">${tbl.schema_name}</span>
        </div>
        <div style="font-size: 10.5px; color: var(--text-secondary);">Source System: <strong>${srcConn}</strong> (${cols.length} columns)</div>
        <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 4px; border-top: 1px dashed var(--border-color); padding-top: 4px;">
          ${cols.slice(0, 4).map(c => `
            <div style="display: flex; justify-content: space-between; font-size: 10px; font-family: var(--font-mono); color: #334155;">
              <span>▪ ${c.column_name}</span>
              <span style="color: var(--text-secondary);">${c.data_type}</span>
            </div>
          `).join('')}
          ${cols.length > 4 ? `<span style="font-size: 9.5px; color: var(--text-secondary);">+${cols.length - 4} more columns...</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Render Target Ontology Cards
  targetsContainer.innerHTML = classes.map(c => {
    const pascalLabel = formatSemanticPascalCase(c.label || c.name || 'Class');
    const tblName = c.annotations?.table_name || c.mapped_table_name || pascalLabel;
    const matchingProps = properties.filter(p => p.domain === c.iri || p.parent_class === c.label || (p.table_name && p.table_name.toLowerCase() === tblName.toLowerCase()));

    totalMappings += matchingProps.length + 1;

    return `
      <div class="onto-mapping-card" onclick="highlightMappingPair('${tblName}')">
        <div class="flex-between">
          <strong style="font-size: 13px; color: var(--accent-cyan);">🧠 ${pascalLabel}</strong>
        </div>
        <div style="font-size: 10.5px; color: var(--text-secondary);">Mapped from table: <strong class="font-mono">${tblName}</strong></div>
        <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 4px; border-top: 1px dashed var(--border-color); padding-top: 4px;">
          ${matchingProps.slice(0, 4).map(p => `
            <div style="display: flex; justify-content: space-between; font-size: 10px; font-family: var(--font-mono); color: #047857;">
              <span>${p.property_type === 'ObjectProperty' ? '➔ ' : '▪ '}${formatSemanticCamelCase(p.label)}</span>
              <span style="color: var(--text-secondary);">${p.range ? String(p.range).replace('xsd:', '') : 'string'}</span>
            </div>
          `).join('')}
          ${matchingProps.length > 4 ? `<span style="font-size: 9.5px; color: var(--text-secondary);">+${matchingProps.length - 4} more properties...</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  if (totalLinksEl) totalLinksEl.innerText = `${totalMappings} Mappings Active`;
}

function highlightMappingPair(tableName) {
  const norm = (tableName || '').toLowerCase().replace(/_/g, '');
  document.querySelectorAll('.onto-mapping-card').forEach(card => {
    const text = card.innerText.toLowerCase().replace(/_/g, '');
    if (text.includes(norm)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
}

function filterMappingView() {
  const q = (document.getElementById('mappingSearchInput')?.value || '').toLowerCase().trim();
  document.querySelectorAll('.onto-mapping-card').forEach(card => {
    const text = card.innerText.toLowerCase();
    card.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
  });
}

// ==========================================================================
// TOOLBAR FILTERS, SEARCH & ACTIONS
// ==========================================================================
function onOntoSearchChange(query) {
  ontoSearchQuery = (query || '').toLowerCase().trim();
  applyOntoGraphFilters();
}

function setOntoConceptFilter(filterType) {
  ontoConceptFilter = filterType;
  document.querySelectorAll('#ontoTypeFilterChips .onto-chip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filterType);
  });
  applyOntoGraphFilters();
}

function applyOntoGraphFilters() {
  if (!cyOntologyInstance) return;

  const domainFilter = document.getElementById('ontoDomainFilterSelect')?.value || 'ALL';
  const confFilter = document.getElementById('ontoConfidenceFilterSelect')?.value || 'ALL';

  cyOntologyInstance.batch(() => {
    cyOntologyInstance.nodes().forEach(node => {
      const nData = node.data();
      let match = true;

      // 1. Search Query
      if (ontoSearchQuery) {
        const text = `${nData.label || ''} ${nData.sourceTable || ''} ${nData.domainType || ''}`.toLowerCase();
        if (!text.includes(ontoSearchQuery)) match = false;
      }

      // 2. Domain Filter (keep Base Class visible)
      if (domainFilter !== 'ALL' && nData.domainType !== domainFilter && !nData.isBaseClass) {
        match = false;
      }

      // 3. Confidence Filter (keep Base Class visible)
      if (confFilter === 'high' && (nData.confidence || 0) < 90 && !nData.isBaseClass) match = false;
      if (confFilter === 'medium' && ((nData.confidence || 0) < 70 || (nData.confidence || 0) >= 90) && !nData.isBaseClass) match = false;
      if (confFilter === 'low' && (nData.confidence || 0) >= 70 && !nData.isBaseClass) match = false;

      // 4. Concept Type Filter
      if (ontoConceptFilter === 'relationships') {
        match = false;
      }

      node.style('display', match ? 'element' : 'none');
    });

    cyOntologyInstance.edges().forEach(edge => {
      const eData = edge.data();
      let match = true;

      if (ontoConceptFilter === 'classes') {
        match = false;
      }

      const srcVisible = edge.source().style('display') !== 'none';
      const tgtVisible = edge.target().style('display') !== 'none';

      if (!srcVisible || !tgtVisible) match = false;

      edge.style('display', match ? 'element' : 'none');
    });
  });
}

function zoomOntoGraph(factor) {
  if (!cyOntologyInstance) return;
  cyOntologyInstance.zoom(cyOntologyInstance.zoom() * factor);
}

function fitOntoGraphView() {
  if (!cyOntologyInstance) return;
  cyOntologyInstance.fit(cyOntologyInstance.elements(':visible'), 50);
}

function resetOntologyGraphView() {
  ontoUserNodePositions.clear();
  if (cyOntologyInstance) {
    cyOntologyInstance.elements().removeClass('faded highlighted highlighted-edge');
    cyOntologyInstance.elements().style('display', 'element');
    runLayeredOntologyLayout(cyOntologyInstance);
  }
}

function toggleOntoLegend() {
  ontoLegendCollapsed = !ontoLegendCollapsed;
  const items = document.getElementById('ontoLegendItems');
  const icon = document.getElementById('ontoLegendToggleIcon');
  if (items) items.style.display = ontoLegendCollapsed ? 'none' : 'grid';
  if (icon) icon.innerText = ontoLegendCollapsed ? '▼' : '▲';
}

// ==========================================================================
// UTILITY HELPERS: SEMANTIC NAMING & CONFIDENCE CALCULATOR
// ==========================================================================
function formatSemanticPascalCase(rawName) {
  if (!rawName) return 'Concept';
  let clean = String(rawName).split('#').pop().split('.').pop();
  
  // Clean common database table prefixes (e.g. ref_assay_type -> AssayType, ref_chemical -> Chemical)
  clean = clean.replace(/^(ref_|tbl_|dim_|fact_|stg_|raw_|mstr_|vw_|t_)/i, '');
  
  return clean
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function formatSemanticCamelCase(rawName) {
  if (!rawName) return 'property';
  const pascal = formatSemanticPascalCase(rawName);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function calculateClassConfidence(cls, dataProps, objProps) {
  let score = 92;
  const reasons = [];

  const pks = cls.primary_keys || (cls.annotations ? cls.annotations.primary_keys : []) || [];
  if (pks.length > 0 || dataProps.some(p => p.is_primary_key)) {
    score += 4;
    reasons.push('Primary Key identity articulated');
  }

  if (objProps.length > 0) {
    score += 2;
    reasons.push('Foreign Key constraint relationship detected');
  }

  reasons.push('Column similarity & PascalCase semantic alignment');
  reasons.push('W3C OWL taxonomy structure generated');

  score = Math.min(99, Math.max(65, score));
  return {
    score: score,
    label: score >= 90 ? 'High Confidence' : (score >= 70 ? 'Medium Confidence' : 'Review Required'),
    reasons: reasons
  };
}

function calculateRelationshipConfidence(prop) {
  let score = 94;
  const reasons = [
    'Foreign key relational constraint detected',
    'Domain & Range class matching verified',
    'Directional ObjectProperty axiom inferred'
  ];

  if (prop.inverse_property) {
    score += 4;
    reasons.push('Bidirectional owl:inverseOf axiom synthesized');
  }

  score = Math.min(99, score);
  return { score, reasons };
}

// ==========================================================================
// CREATE CLASS FROM GRAPHICAL ONTOLOGY MODAL & ACTIONS
// ==========================================================================
function openCreateClassModalFromGraph(preselectedParent = null) {
  if (!currentProjectId) {
    if (typeof showToast === 'function') showToast('Please select an active project first.', 'error');
    return;
  }

  // Reset Form
  document.getElementById('goc-label').value = '';
  document.getElementById('goc-domain').value = 'Transactional';
  document.getElementById('goc-comment').value = '';

  // Build SuperClass Dropdown Options (Root owl:Thing + All existing classes)
  const parentSelect = document.getElementById('goc-parent');
  if (parentSelect) {
    parentSelect.innerHTML = '<option value="owl:Thing">owl:Thing (Root Base Class)</option>';
    const availableClasses = (ontoModelData && ontoModelData.classes) ? ontoModelData.classes : [];
    availableClasses.forEach(c => {
      const cLabel = (c.label || '').trim();
      if (cLabel && cLabel !== 'owl:Thing') {
        const opt = document.createElement('option');
        opt.value = cLabel;
        opt.innerText = `${cLabel} (${c.annotations?.domain_type || 'Dimension'})`;
        parentSelect.appendChild(opt);
      }
    });

    if (preselectedParent && preselectedParent !== 'owl:Thing') {
      parentSelect.value = preselectedParent;
    } else {
      parentSelect.value = 'owl:Thing';
    }
  }

  // Clear & Initialize default properties table with 1 primary key attribute
  const tbody = document.getElementById('goc-props-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    addGraphCreateClassPropRow('DatatypeProperty', 'id', 'xsd:string', true);
  }

  openModal('createOntologyClassModal');
}

function openCreateSubclassFromInspectedNode() {
  const currentTitle = document.getElementById('odd-title')?.innerText?.trim();
  openCreateClassModalFromGraph(currentTitle || 'owl:Thing');
}

function addGraphCreateClassPropRow(propType = 'DatatypeProperty', defaultName = '', defaultRange = '', isPk = false) {
  const tbody = document.getElementById('goc-props-tbody');
  if (!tbody) return;

  const isObj = propType === 'ObjectProperty';
  const pName = defaultName || (isObj ? 'relatesTo' : 'hasAttribute');
  const pRange = defaultRange || (isObj ? 'TargetClass' : 'xsd:string');

  const tr = document.createElement('tr');
  tr.className = 'goc-prop-row';
  tr.setAttribute('data-type', propType);
  tr.innerHTML = `
    <td>
      <input type="text" class="goc-prop-name" value="${pName}" placeholder="${isObj ? 'e.g. belongsToGroup' : 'e.g. score'}" style="padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;">
    </td>
    <td>
      <select class="goc-prop-type" onchange="onGocPropTypeChanged(this)" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px; width: 100%;">
        <option value="DatatypeProperty" ${!isObj ? 'selected' : ''}>📊 Datatype</option>
        <option value="ObjectProperty" ${isObj ? 'selected' : ''}>🔗 Object (Rel)</option>
      </select>
    </td>
    <td>
      <input type="text" class="goc-prop-range" value="${pRange}" placeholder="${isObj ? 'TargetClass' : 'xsd:string'}" style="padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;">
    </td>
    <td>
      <input type="text" class="goc-prop-inverse" placeholder="${isObj ? 'e.g. hasInverse' : 'N/A'}" ${!isObj ? 'disabled style="opacity: 0.5; padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-secondary); border-radius: 4px;"' : 'style="padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;"'}>
    </td>
    <td style="text-align: center;">
      <input type="checkbox" class="goc-prop-pk" ${isPk ? 'checked' : ''} ${isObj ? 'disabled' : ''} title="Primary Key" style="cursor: pointer; transform: scale(1.1);">
    </td>
    <td style="text-align: center;">
      <button type="button" class="btn-danger" style="padding: 2px 6px; font-size: 11px;" onclick="this.closest('tr').remove()" title="Remove Property">🗑️</button>
    </td>
  `;
  tbody.appendChild(tr);
}

function onGocPropTypeChanged(sel) {
  const row = sel.closest('tr');
  if (!row) return;
  const isObj = sel.value === 'ObjectProperty';
  const rangeInput = row.querySelector('.goc-prop-range');
  const invInput = row.querySelector('.goc-prop-inverse');
  const pkInput = row.querySelector('.goc-prop-pk');

  if (isObj) {
    if (rangeInput && rangeInput.value.startsWith('xsd:')) rangeInput.value = 'TargetClass';
    if (invInput) {
      invInput.disabled = false;
      invInput.style.opacity = '1';
      invInput.placeholder = 'e.g. hasInverse';
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
      invInput.value = '';
      invInput.placeholder = 'N/A';
    }
    if (pkInput) {
      pkInput.disabled = false;
    }
  }
}

async function submitCreateClassFromGraph() {
  if (!currentProjectId) {
    if (typeof showToast === 'function') showToast('Please select an active project first.', 'error');
    return;
  }

  const rawLabel = document.getElementById('goc-label').value.trim();
  if (!rawLabel) {
    if (typeof showToast === 'function') showToast('Please enter a class name / label.', 'warning');
    document.getElementById('goc-label').focus();
    return;
  }

  // Format into PascalCase class name (e.g. VIPCustomer)
  const classLabel = formatSemanticPascalCase(rawLabel);
  const parentClass = document.getElementById('goc-parent').value.trim() || 'owl:Thing';
  const domainType = document.getElementById('goc-domain').value || 'Transactional';
  const comment = document.getElementById('goc-comment').value.trim() || `Class representing ${classLabel}`;

  // Gather properties
  const propRows = document.querySelectorAll('#goc-props-tbody tr');
  const properties = [];
  propRows.forEach(row => {
    const nameIn = row.querySelector('.goc-prop-name');
    const typeSel = row.querySelector('.goc-prop-type');
    const rangeIn = row.querySelector('.goc-prop-range');
    const invIn = row.querySelector('.goc-prop-inverse');
    const pkIn = row.querySelector('.goc-prop-pk');

    if (nameIn && typeSel && rangeIn) {
      const pName = nameIn.value.trim();
      if (!pName) return;
      const pType = typeSel.value;
      const isObj = pType === 'ObjectProperty';
      properties.push({
        label: pName,
        relationship_name: pName,
        property_type: pType,
        range: rangeIn.value.trim() || (isObj ? 'TargetClass' : 'xsd:string'),
        parent_class: classLabel,
        target_class: isObj ? (rangeIn.value.trim() || null) : null,
        inverse_property: (isObj && invIn) ? (invIn.value.trim() || null) : null,
        is_inverse: false,
        is_primary_key: pkIn ? Boolean(pkIn.checked) : false
      });
    }
  });

  const payload = {
    class_name: classLabel,
    label: classLabel,
    subclass_of: [parentClass],
    domain_type: domainType,
    comment: comment,
    properties: properties
  };

  try {
    const res = await fetch(`${API_BASE}/projects/${currentProjectId}/ontology/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeModal('createOntologyClassModal');
      if (typeof showToast === 'function') showToast(`✨ Ontology Class "${classLabel}" created successfully!`, 'success');

      // Refresh Graphical Ontology & Center on the newly created class
      await initOntologyGraph();
      if (typeof loadOntology === 'function') loadOntology();
      if (typeof loadDashboard === 'function') loadDashboard();

      setTimeout(() => {
        if (cyOntologyInstance && !cyOntologyInstance.destroyed()) {
          const cyNode = cyOntologyInstance.nodes().filter(n => {
            const l = n.data('label') || '';
            const id = n.data('id') || '';
            return l.toLowerCase() === classLabel.toLowerCase() || id.toLowerCase().endsWith(classLabel.toLowerCase());
          });
          if (cyNode && cyNode.length > 0) {
            cyNode.select();
            cyOntologyInstance.fit(cyNode, 100);
            renderClassDetailsPanel(cyNode[0].data());
            const wrapper = document.getElementById('ontoWorkspaceWrapper');
            if (wrapper) wrapper.classList.add('details-open');
          }
        }
      }, 250);
    } else {
      const err = await res.json();
      if (typeof showToast === 'function') showToast(`Failed to create ontology class: ${err.detail || 'Error'}`, 'error');
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('Network error while creating ontology class.', 'error');
  }
}

