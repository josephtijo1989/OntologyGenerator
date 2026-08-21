// Stateless OWL / RDF Ontology Viewer & Sandbox
let viewerOntologyData = null;
let cyViewerInstance = null;
let viewerSelectedNode = null;
let viewerActiveTab = 'graph';
let viewerPropertyFilter = 'all';
let viewerLayoutName = 'cose';
let viewerCurrentLoadedFile = null;

const VIEWER_PRESETS = [
  {
    label: '🦠 Pasteur Biological & Assay Graph',
    description: 'Proteins, Targets, Assays, Chemical Entities, and Inverse Binding Relationships',
    format: 'turtle',
    filename: 'pasteur_biological.ttl',
    content: `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix pasteur: <http://pasteur.bio/ontology#> .

pasteur:BiologicalOntology a owl:Ontology ;
    rdfs:label "Pasteur Biological System & Assay Knowledge Ontology" ;
    rdfs:comment "Biological knowledge graph mapping proteins, molecular assays, and chemical compounds." .

pasteur:Protein a owl:Class ;
    rdfs:label "Protein" ;
    rdfs:subClassOf owl:Thing ;
    rdfs:comment "Biological protein macromolecule structure" .

pasteur:TargetAssay a owl:Class ;
    rdfs:label "TargetAssay" ;
    rdfs:subClassOf owl:Thing ;
    rdfs:comment "Experimental assay testing biochemical binding" .

pasteur:ChemicalCompound a owl:Class ;
    rdfs:label "ChemicalCompound" ;
    rdfs:subClassOf owl:Thing ;
    rdfs:comment "Small molecule chemical entity and therapeutic agent" .

pasteur:LaboratoryBatch a owl:Class ;
    rdfs:label "LaboratoryBatch" ;
    rdfs:subClassOf owl:Thing ;
    rdfs:comment "Batch processing entity for biological samples" .

pasteur:proteinSequence a owl:DatatypeProperty ;
    rdfs:domain pasteur:Protein ;
    rdfs:range xsd:string ;
    rdfs:label "proteinSequence" ;
    rdfs:comment "FASTA sequence representation" .

pasteur:molecularWeight a owl:DatatypeProperty ;
    rdfs:domain pasteur:Protein ;
    rdfs:range xsd:decimal ;
    rdfs:label "molecularWeight" ;
    rdfs:comment "Molecular weight in kDa" .

pasteur:assayId a owl:DatatypeProperty ;
    rdfs:domain pasteur:TargetAssay ;
    rdfs:range xsd:string ;
    rdfs:label "assayId" ;
    rdfs:comment "[PRIMARY KEY] Assay unique identifier" .

pasteur:compoundFormula a owl:DatatypeProperty ;
    rdfs:domain pasteur:ChemicalCompound ;
    rdfs:range xsd:string ;
    rdfs:label "compoundFormula" ;
    rdfs:comment "Chemical formula notation" .

pasteur:targetsProtein a owl:ObjectProperty ;
    rdfs:domain pasteur:TargetAssay ;
    rdfs:range pasteur:Protein ;
    owl:inverseOf pasteur:targetedByAssay ;
    rdfs:label "targetsProtein" ;
    rdfs:comment "Assay targets a specific biological protein" .

pasteur:targetedByAssay a owl:ObjectProperty ;
    rdfs:domain pasteur:Protein ;
    rdfs:range pasteur:TargetAssay ;
    owl:inverseOf pasteur:targetsProtein ;
    rdfs:label "targetedByAssay" ;
    rdfs:comment "Inverse relationship: Protein is targeted by an assay" .

pasteur:bindsCompound a owl:ObjectProperty ;
    rdfs:domain pasteur:Protein ;
    rdfs:range pasteur:ChemicalCompound ;
    rdfs:label "bindsCompound" ;
    rdfs:comment "Protein binds chemical compound ligand" .

pasteur:producedInBatch a owl:ObjectProperty ;
    rdfs:domain pasteur:TargetAssay ;
    rdfs:range pasteur:LaboratoryBatch ;
    rdfs:label "producedInBatch" ;
    rdfs:comment "Experimental assay produced in laboratory batch" .
`
  },
  {
    label: '🛒 E-Commerce & Order Knowledge Model',
    description: 'Customers, Orders, OrderItems, Products, and Inverted Lineage',
    format: 'turtle',
    filename: 'ecommerce_domain.ttl',
    content: `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ecom: <http://enterprise.org/ecom#> .

ecom:EcommerceOntology a owl:Ontology ;
    rdfs:label "Enterprise E-Commerce Domain Ontology" .

ecom:Customer a owl:Class ;
    rdfs:label "Customer" ;
    rdfs:subClassOf owl:Thing ;
    rdfs:comment "Master customer account entity" .

ecom:Order a owl:Class ;
    rdfs:label "Order" ;
    rdfs:subClassOf owl:Thing ;
    rdfs:comment "Transactional order record" .

ecom:OrderItem a owl:Class ;
    rdfs:label "OrderItem" ;
    rdfs:subClassOf owl:Thing ;
    rdfs:comment "Line item associated with an order" .

ecom:Product a owl:Class ;
    rdfs:label "Product" ;
    rdfs:subClassOf owl:Thing ;
    rdfs:comment "Product catalog dimension" .

ecom:customerId a owl:DatatypeProperty ;
    rdfs:domain ecom:Customer ;
    rdfs:range xsd:string ;
    rdfs:label "customerId" ;
    rdfs:comment "[PRIMARY KEY] Customer identifier" .

ecom:orderTotal a owl:DatatypeProperty ;
    rdfs:domain ecom:Order ;
    rdfs:range xsd:decimal ;
    rdfs:label "orderTotal" ;
    rdfs:comment "Total order value" .

ecom:placedByCustomer a owl:ObjectProperty ;
    rdfs:domain ecom:Order ;
    rdfs:range ecom:Customer ;
    owl:inverseOf ecom:hasOrders ;
    rdfs:label "placedByCustomer" .

ecom:hasOrderItems a owl:ObjectProperty ;
    rdfs:domain ecom:Order ;
    rdfs:range ecom:OrderItem ;
    rdfs:label "hasOrderItems" .

ecom:referencesProduct a owl:ObjectProperty ;
    rdfs:domain ecom:OrderItem ;
    rdfs:range ecom:Product ;
    rdfs:label "referencesProduct" .
`
  }
];

function initOntologyViewer() {
  renderViewerPresets();
  setupViewerDragAndDrop();
}

// Initialize presets and listeners on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initOntologyViewer();
  });
} else {
  setTimeout(initOntologyViewer, 0);
}

function renderViewerPresets() {
  const container = document.getElementById('viewer-preset-chips');
  if (!container) return;
  container.innerHTML = VIEWER_PRESETS.map((p, idx) => `
    <button type="button" class="preset-chip" onclick="loadViewerPreset(${idx})" title="${p.description}">
      ${p.label}
    </button>
  `).join('');
}

function loadViewerPreset(index) {
  const preset = VIEWER_PRESETS[index];
  if (!preset) return;
  const textarea = document.getElementById('viewer-raw-text');
  const formatSelect = document.getElementById('viewer-format-hint');
  const fileInput = document.getElementById('viewer-file-input');
  if (textarea) textarea.value = preset.content;
  if (formatSelect) formatSelect.value = preset.format;
  if (fileInput) fileInput.value = '';
  viewerCurrentLoadedFile = null;

  const display = document.getElementById('viewer-file-name-display');
  if (display) {
    display.innerHTML = `Loaded Preset: <strong>${preset.label}</strong>`;
    display.style.display = 'inline-block';
  }

  parseAndVisualizeOntology();
}

function triggerViewerFilePicker(e) {
  if (e) e.stopPropagation();
  const fileInput = document.getElementById('viewer-file-input');
  if (fileInput) {
    fileInput.value = ''; // Reset value to re-trigger onchange if same file selected
    fileInput.click();
  }
}

function setupViewerDragAndDrop() {
  const dropzone = document.getElementById('viewer-dropzone');
  const fileInput = document.getElementById('viewer-file-input');
  const panel = document.getElementById('panel-ontology-viewer');

  if (fileInput) {
    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleViewerFile(e.target.files[0]);
      }
    };
  }

  if (dropzone) {
    dropzone.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-over');
    };

    dropzone.ondragleave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-over');
    };

    dropzone.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleViewerFile(e.dataTransfer.files[0]);
      }
    };
  }

  // Prevent browser from navigating away if user drops file outside the exact dropzone
  if (panel) {
    panel.ondragover = (e) => { e.preventDefault(); };
    panel.ondrop = (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleViewerFile(e.dataTransfer.files[0]);
      }
    };
  }
}

function handleViewerFile(file) {
  if (!file) return;
  viewerCurrentLoadedFile = file;

  // Infer format hint from extension
  const fn = file.name.toLowerCase();
  let formatHint = 'auto';
  if (fn.endsWith('.ttl') || fn.endsWith('.n3')) formatHint = 'turtle';
  else if (fn.endsWith('.owl') || fn.endsWith('.rdf') || fn.endsWith('.xml')) formatHint = 'xml';
  else if (fn.endsWith('.jsonld') || fn.endsWith('.json')) formatHint = 'json-ld';
  else if (fn.endsWith('.nt')) formatHint = 'nt';

  const formatSelect = document.getElementById('viewer-format-hint');
  if (formatSelect) formatSelect.value = formatHint;

  const display = document.getElementById('viewer-file-name-display');
  if (display) {
    const sizeKB = (file.size / 1024).toFixed(1);
    display.innerHTML = `📄 <strong>${file.name}</strong> (${sizeKB} KB) &nbsp;<button type="button" onclick="clearViewerInputs(event)" style="background:transparent;border:none;color:#dc2626;cursor:pointer;font-weight:bold;">&times; Remove</button>`;
    display.style.display = 'inline-block';
  }

  // Read file on client side using FileReader
  const reader = new FileReader();
  reader.onload = (event) => {
    const fileContent = event.target.result;
    const textarea = document.getElementById('viewer-raw-text');
    if (textarea) textarea.value = fileContent;

    // Trigger instant parse & visualization
    parseAndVisualizeOntology(file, fileContent);
  };
  reader.onerror = () => {
    showToast(`Failed to read file ${file.name}`, 'danger');
  };
  reader.readAsText(file);
}

function clearViewerInputs(e) {
  if (e) e.stopPropagation();
  viewerCurrentLoadedFile = null;
  const textarea = document.getElementById('viewer-raw-text');
  const fileInput = document.getElementById('viewer-file-input');
  const display = document.getElementById('viewer-file-name-display');
  if (textarea) textarea.value = '';
  if (fileInput) fileInput.value = '';
  if (display) {
    display.innerHTML = '';
    display.style.display = 'none';
  }
}

function clearOntologyViewerState(silent = true) {
  viewerOntologyData = null;
  viewerSelectedNode = null;
  viewerCurrentLoadedFile = null;
  viewerActiveTab = 'graph';
  viewerPropertyFilter = 'all';

  clearViewerInputs();

  const resultsContainer = document.getElementById('viewer-results-container');
  if (resultsContainer) resultsContainer.style.display = 'none';

  const nodeCard = document.getElementById('viewerNodeCard');
  if (nodeCard) nodeCard.style.display = 'none';

  const uploadBody = document.getElementById('viewer-upload-body');
  if (uploadBody) uploadBody.style.display = 'block';

  const collapseBtn = document.getElementById('viewer-collapse-btn');
  if (collapseBtn) collapseBtn.innerText = '▲ Collapse';

  const formatSelect = document.getElementById('viewer-format-hint');
  if (formatSelect) formatSelect.value = 'auto';

  const searchInput = document.getElementById('viewer-search-input');
  if (searchInput) searchInput.value = '';

  const parseBtn = document.getElementById('viewer-parse-btn');
  if (parseBtn) {
    parseBtn.disabled = false;
    parseBtn.innerText = '⚡ Parse & Visualize Ontology';
  }

  if (cyViewerInstance) {
    try { cyViewerInstance.stop(); } catch (e) {}
    try { cyViewerInstance.destroy(); } catch (e) {}
    cyViewerInstance = null;
  }

  if (!silent) {
    showToast('Sandbox cleared. You can now upload or paste a new ontology.', 'info');
  }
}

function resetOntologyViewer() {
  clearOntologyViewerState(false);
}

// Automatically clear viewer state when leaving the page or closing the window
window.addEventListener('beforeunload', () => {
  clearOntologyViewerState(true);
});
window.addEventListener('pagehide', () => {
  clearOntologyViewerState(true);
});

function toggleViewerUploadCollapse() {
  const body = document.getElementById('viewer-upload-body');
  const btn = document.getElementById('viewer-collapse-btn');
  if (!body || !btn) return;
  if (body.style.display === 'none') {
    body.style.display = 'block';
    btn.innerText = '▲ Collapse';
  } else {
    body.style.display = 'none';
    btn.innerText = '▼ Expand Upload Panel';
  }
}

async function parseAndVisualizeOntology(directFile = null, directContent = null) {
  const file = directFile || viewerCurrentLoadedFile;
  const text = (directContent || document.getElementById('viewer-raw-text')?.value || '').trim();
  const formatHint = document.getElementById('viewer-format-hint')?.value || 'auto';
  const parseBtn = document.getElementById('viewer-parse-btn');

  if (!file && !text) {
    showToast('Please select an ontology file or paste RDF/Turtle code.', 'warning');
    return;
  }

  if (parseBtn) {
    parseBtn.disabled = true;
    parseBtn.innerText = '⏳ Ingesting & Analyzing...';
  }

  try {
    let response;

    // Prefer sending raw text payload if available
    if (text) {
      response = await fetch(`${API_BASE}/ontology/parse-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_content: text,
          filename: file ? file.name : 'ontology_schema.ttl',
          format_hint: formatHint
        })
      });
    } else if (file) {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('format_hint', formatHint);
      response = await fetch(`${API_BASE}/ontology/upload-preview`, {
        method: 'POST',
        body: formData
      });
    }

    if (!response || !response.ok) {
      const err = response ? await response.json().catch(() => ({ detail: 'Failed to parse ontology.' })) : { detail: 'No response from server.' };
      throw new Error(err.detail || 'Failed to parse ontology file.');
    }

    const data = await response.json();
    viewerOntologyData = data;
    renderViewerResults();
    showToast(`Parsed "${data.ontology_name}" (${data.stats?.classes_count || 0} classes, ${data.stats?.total_triples_count || 0} triples).`, 'success');
  } catch (error) {
    showToast(error.message || 'Error processing ontology file.', 'danger');
  } finally {
    if (parseBtn) {
      parseBtn.disabled = false;
      parseBtn.innerText = '⚡ Parse & Visualize Ontology';
    }
  }
}

function renderViewerResults() {
  if (!viewerOntologyData) return;
  const container = document.getElementById('viewer-results-container');
  if (!container) return;

  container.style.display = 'flex';

  // Render Metric Badges
  document.getElementById('v-stat-name').innerText = viewerOntologyData.ontology_name || 'Uploaded Ontology';
  document.getElementById('v-stat-iri').innerText = viewerOntologyData.base_iri || '—';
  document.getElementById('v-stat-iri').title = viewerOntologyData.base_iri || '';
  document.getElementById('v-stat-classes').innerText = viewerOntologyData.stats?.classes_count || 0;
  document.getElementById('v-stat-datatype').innerText = viewerOntologyData.stats?.datatype_properties_count || 0;
  document.getElementById('v-stat-object').innerText = viewerOntologyData.stats?.object_properties_count || 0;
  document.getElementById('v-stat-triples').innerText = viewerOntologyData.stats?.total_triples_count || 0;
  document.getElementById('v-stat-format').innerText = viewerOntologyData.detected_format || 'TURTLE';

  // Render active tab view
  switchViewerSubTab(viewerActiveTab);
}

function switchViewerSubTab(tabName) {
  viewerActiveTab = tabName;
  document.querySelectorAll('.viewer-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-subtab') === tabName);
  });

  const paneGraph = document.getElementById('v-pane-graph');
  const paneClasses = document.getElementById('v-pane-classes');
  const paneProps = document.getElementById('v-pane-props');
  const paneSource = document.getElementById('v-pane-source');
  const searchBox = document.getElementById('viewer-search-box');

  if (paneGraph) paneGraph.style.display = (tabName === 'graph') ? 'block' : 'none';
  if (paneClasses) paneClasses.style.display = (tabName === 'classes') ? 'block' : 'none';
  if (paneProps) paneProps.style.display = (tabName === 'properties') ? 'block' : 'none';
  if (paneSource) paneSource.style.display = (tabName === 'source') ? 'block' : 'none';

  if (searchBox) {
    searchBox.style.display = (tabName === 'classes' || tabName === 'properties') ? 'block' : 'none';
  }

  if (tabName === 'graph') {
    setTimeout(() => {
      initViewerCytoscape();
    }, 50);
  } else if (tabName === 'classes') {
    renderViewerClassesList();
  } else if (tabName === 'properties') {
    renderViewerPropertiesList();
  } else if (tabName === 'source') {
    renderViewerSource();
  }
}

// Cytoscape Canvas Visualizer for Sandbox (Graphical Ontology Design System)
function initViewerCytoscape() {
  const container = document.getElementById('cy-ontology-viewer');
  if (!container || !viewerOntologyData) return;

  if (cyViewerInstance) {
    try { cyViewerInstance.stop(); } catch(e){}
    try { cyViewerInstance.destroy(); } catch(e){}
    cyViewerInstance = null;
  }

  const elements = [];
  const rawNodes = viewerOntologyData.graph?.nodes || [];
  const rawEdges = viewerOntologyData.graph?.edges || [];
  const classes = viewerOntologyData.classes || [];
  const properties = viewerOntologyData.properties || [];

  const validClassMap = new Map();

  // 1. Root Base Class: owl:Thing Node
  const rootIri = 'http://www.w3.org/2002/07/owl#Thing';
  validClassMap.set('owl:Thing', rootIri);
  validClassMap.set('owl:thing', rootIri);
  validClassMap.set('Thing', rootIri);
  validClassMap.set('thing', rootIri);
  validClassMap.set(rootIri, rootIri);

  const rootCardWidth = 140;
  const rootCardHeight = 46;
  const rootSvgUri = typeof generateBaseClassCardSvg === 'function' 
    ? generateBaseClassCardSvg({ label: 'owl:Thing', width: rootCardWidth, height: rootCardHeight })
    : generateViewerBaseClassSvg({ label: 'owl:Thing', width: rootCardWidth, height: rootCardHeight });

  elements.push({
    group: 'nodes',
    data: {
      id: rootIri,
      label: 'owl:Thing',
      domainType: 'Base Class',
      isBaseClass: true,
      cardWidth: rootCardWidth,
      cardHeight: rootCardHeight,
      svgCard: rootSvgUri,
      nodeType: 'ontologyClass',
      isRoot: true,
      raw: { id: rootIri, label: 'owl:Thing', comment: 'Universal Top-Level Base Class in W3C OWL 2.0' }
    },
    position: { x: 500, y: 60 }
  });

  // Map known class labels and IRIs
  classes.forEach(c => {
    const pascalLabel = c.label || c.name || 'Class';
    validClassMap.set(c.iri || c.id, c.iri || c.id);
    validClassMap.set(pascalLabel, c.iri || c.id);
    validClassMap.set(pascalLabel.toLowerCase(), c.iri || c.id);
  });

  rawNodes.forEach(n => {
    if (n.id !== rootIri && n.label !== 'owl:Thing' && n.label !== 'Thing') {
      validClassMap.set(n.id, n.id);
      validClassMap.set(n.label, n.id);
    }
  });

  // Build SVG Card Nodes for Classes
  rawNodes.forEach(n => {
    if (n.id === rootIri || n.label === 'owl:Thing' || n.label === 'Thing') return;

    const label = n.label || n.id;
    const domainType = n.domain_type || n.type || 'Dimension';
    const cardWidth = Math.max(140, label.length * 9.5 + 44);
    const cardHeight = 46;

    const svgUri = typeof generateOntologyClassCardSvg === 'function'
      ? generateOntologyClassCardSvg({ label: label, domainType: domainType, isExpanded: false, width: cardWidth, height: cardHeight })
      : generateViewerClassSvg({ label: label, domainType: domainType, width: cardWidth, height: cardHeight });

    elements.push({
      group: 'nodes',
      data: {
        id: n.id,
        label: label,
        domainType: domainType,
        cardWidth: cardWidth,
        cardHeight: cardHeight,
        svgCard: svgUri,
        nodeType: 'ontologyClass',
        raw: n
      }
    });
  });

  // Build Edges
  const addedEdgeKeys = new Set();

  rawEdges.forEach(e => {
    const srcIri = validClassMap.get(e.source) || e.source;
    const tgtIri = validClassMap.get(e.target) || e.target;

    if (srcIri && tgtIri && srcIri !== tgtIri) {
      const edgeKey = `${srcIri}->${tgtIri}:${e.label}`;
      if (!addedEdgeKeys.has(edgeKey)) {
        addedEdgeKeys.add(edgeKey);
        const isSubclass = (e.type === 'subClassOf' || e.label === 'subClassOf');
        elements.push({
          group: 'edges',
          data: {
            id: e.id || `edge_${edgeKey}`,
            source: srcIri,
            target: tgtIri,
            label: isSubclass ? '' : (e.label || 'relatesTo'),
            edgeType: isSubclass ? 'SubClassOf' : 'ObjectProperty',
            raw: e
          }
        });
      }
    }
  });

  // Ensure SubClassOf edges to root owl:Thing for top-level classes
  classes.forEach(c => {
    const cId = validClassMap.get(c.iri || c.id || c.label) || c.id || c.label;
    if (cId && cId !== rootIri) {
      const rawSub = c.subclass_of && c.subclass_of.length > 0 ? c.subclass_of[0] : 'owl:Thing';
      let parentIri = rootIri;

      if (rawSub && rawSub !== 'owl:Thing' && rawSub !== 'Thing' && rawSub !== rootIri) {
        const found = validClassMap.get(rawSub) || validClassMap.get(String(rawSub).toLowerCase());
        if (found && found !== cId) parentIri = found;
      }

      const subKey = `${cId}->${parentIri}:subClassOf`;
      if (!addedEdgeKeys.has(subKey)) {
        addedEdgeKeys.add(subKey);
        elements.push({
          group: 'edges',
          data: {
            id: `sub_${cId}_${parentIri}`,
            source: cId,
            target: parentIri,
            label: '',
            edgeType: 'SubClassOf'
          }
        });
      }
    }
  });

  // Filter elements to ensure source and target exist
  const validNodeIds = new Set(elements.filter(e => e.group === 'nodes').map(e => e.data.id));
  const sanitizedElements = elements.filter(e => {
    if (e.group === 'nodes') return true;
    return validNodeIds.has(e.data.source) && validNodeIds.has(e.data.target);
  });

  cyViewerInstance = cytoscape({
    container: container,
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
      }
    ],
    layout: {
      name: (typeof viewerLayoutName !== 'undefined' && viewerLayoutName) ? viewerLayoutName : 'breadthfirst',
      directed: true,
      padding: 45
    }
  });

  cyViewerInstance.on('tap', 'node', (evt) => {
    const rawNode = evt.target.data('raw');
    openViewerNodeInspector(rawNode);
  });

  cyViewerInstance.on('tap', (evt) => {
    if (evt.target === cyViewerInstance) {
      const card = document.getElementById('viewerNodeCard');
      if (card) card.style.display = 'none';
    }
  });

  // Open inspector for first class
  const firstNode = rawNodes[0];
  if (firstNode) {
    openViewerNodeInspector(firstNode);
  }
}

// Fallback SVG Generators if not present globally
function generateViewerBaseClassSvg({ label, width, height }) {
  return `data:image/svg+xml;utf8,` + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="10" ry="10" fill="#f8fafc" stroke="#475569" stroke-width="1.8" stroke-dasharray="4,2" />
      <rect x="1.5" y="1.5" width="4.5" height="${height - 3}" rx="2" fill="#334155" />
      <text x="14" y="${height / 2 + 5}" font-family="Inter, sans-serif" font-size="13.5" font-weight="700" fill="#1e293b">🏛️ ${label}</text>
    </svg>
  `);
}

function generateViewerClassSvg({ label, domainType, width, height }) {
  let accentColor = '#0284c7';
  let icon = '🟠';
  if (domainType === 'Fact') { accentColor = '#4338ca'; icon = '🧬'; }
  else if (domainType === 'Lookup') { accentColor = '#d97706'; icon = '📦'; }
  else if (domainType === 'SCD') { accentColor = '#059669'; icon = '🏛️'; }

  return `data:image/svg+xml;utf8,` + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="10" ry="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
      <rect x="1.5" y="1.5" width="4.5" height="${height - 3}" rx="2" fill="${accentColor}" />
      <text x="14" y="${height / 2 + 5}" font-family="Inter, sans-serif" font-size="13.5" font-weight="600" fill="#0f172a">${icon} ${label}</text>
    </svg>
  `);
}

  cyViewerInstance.on('tap', 'node', (evt) => {
    const rawNode = evt.target.data('raw');
    openViewerNodeInspector(rawNode);
  });

  cyViewerInstance.on('tap', (evt) => {
    if (evt.target === cyViewerInstance) {
      document.getElementById('viewerNodeCard').style.display = 'none';
    }
  });

  // Open inspector for first class
  if (nodes.length > 0) {
    openViewerNodeInspector(nodes[0]);
  }
}

function changeViewerLayout(layout) {
  viewerLayoutName = layout;
  if (cyViewerInstance) {
    cyViewerInstance.layout({
      name: layout,
      animate: true,
      animationDuration: 400,
      padding: 40
    }).run();
  }
}

function zoomViewerGraph(factor) {
  if (!cyViewerInstance) return;
  cyViewerInstance.zoom(cyViewerInstance.zoom() * factor);
}

function resetViewerGraphView() {
  if (!cyViewerInstance) return;
  cyViewerInstance.fit(undefined, 40);
}

function openViewerNodeInspector(nodeData) {
  if (!nodeData) return;
  const card = document.getElementById('viewerNodeCard');
  if (!card) return;

  document.getElementById('vnc-label').innerText = nodeData.label || 'Entity';
  document.getElementById('vnc-domain').innerText = nodeData.domain_type || 'Class';
  document.getElementById('vnc-iri').innerText = nodeData.iri || '';
  document.getElementById('vnc-iri').title = nodeData.iri || '';
  document.getElementById('vnc-comment').innerText = nodeData.comment || 'No description comment provided.';

  // Primary keys
  const pkBox = document.getElementById('vnc-pks');
  if (nodeData.primary_keys && nodeData.primary_keys.length > 0) {
    pkBox.innerHTML = `🔑 Primary Keys: <strong>${nodeData.primary_keys.join(', ')}</strong>`;
    pkBox.style.display = 'block';
  } else {
    pkBox.style.display = 'none';
  }

  // Attributes list
  const attrContainer = document.getElementById('vnc-attributes-list');
  if (nodeData.attributes && nodeData.attributes.length > 0) {
    attrContainer.innerHTML = nodeData.attributes.map(a => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
        <span style="color: var(--accent-cyan); font-family: var(--font-mono);">${a.name}</span>
        <span style="color: var(--accent-emerald); font-size: 10px;">${a.range}</span>
      </div>
    `).join('');
  } else {
    attrContainer.innerHTML = '<span style="font-size: 11px; color: var(--text-secondary); font-style: italic;">No scalar datatype attributes.</span>';
  }

  // Relationships
  const relContainer = document.getElementById('vnc-relations-list');
  const edges = (viewerOntologyData?.graph?.edges || []).filter(e => e.source === nodeData.id || e.target === nodeData.id);
  if (edges.length > 0) {
    relContainer.innerHTML = edges.map(e => `
      <div style="background: var(--bg-surface); padding: 6px 8px; border-radius: 4px; display: flex; flex-direction: column; gap: 2px; font-size: 11px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 9px; font-weight: 700; background: ${e.source === nodeData.id ? '#e0f2fe' : '#f1f5f9'}; color: ${e.source === nodeData.id ? '#0284c7' : '#475569'}; padding: 1px 4px; border-radius: 3px;">
            ${e.source === nodeData.id ? 'OUTGOING ➜' : 'INCOMING ⬅'}
          </span>
          <strong style="color: var(--accent-violet); font-family: var(--font-mono);">${e.label}</strong>
        </div>
        <span style="color: var(--text-secondary); font-size: 11px;">
          Target: <strong>${e.source === nodeData.id ? e.target : e.source}</strong>
        </span>
      </div>
    `).join('');
  } else {
    relContainer.innerHTML = '<span style="font-size: 11px; color: var(--text-secondary); font-style: italic;">No linked object properties.</span>';
  }

  const subclassBtn = document.getElementById('vnc-create-subclass-btn');
  if (subclassBtn) {
    subclassBtn.innerHTML = `➕ Create Subclass of <strong>${nodeData.label || 'this Class'}</strong>`;
  }

  card.style.display = 'block';
}

// Classes List View
function renderViewerClassesList() {
  const container = document.getElementById('v-classes-grid');
  if (!container || !viewerOntologyData) return;

  const query = (document.getElementById('viewer-search-input')?.value || '').toLowerCase();
  let classes = viewerOntologyData.classes || [];

  if (query) {
    classes = classes.filter(c => 
      (c.label && c.label.toLowerCase().includes(query)) ||
      (c.iri && c.iri.toLowerCase().includes(query)) ||
      (c.comment && c.comment.toLowerCase().includes(query))
    );
  }

  if (classes.length === 0) {
    container.innerHTML = `<div class="glass-card" style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-secondary);">No classes match query "${query}".</div>`;
    return;
  }

  // Top action bar inside grid container
  let topBarHtml = `
    <div class="glass-card" style="grid-column: 1/-1; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(2, 132, 199, 0.05), rgba(79, 70, 229, 0.05)); border: 1px solid rgba(2, 132, 199, 0.2);">
      <div>
        <strong style="color: var(--text-primary); font-size: 14px;">OWL Classes Catalog (${classes.length})</strong>
        <span style="font-size: 11px; color: var(--text-secondary); margin-left: 8px;">Explore semantic class concepts & taxonomy hierarchy</span>
      </div>
      <button class="btn-primary" style="font-size: 12px; height: 32px; padding: 0 14px;" onclick="openViewerSubclassModal()">
        ➕ Create New Subclass
      </button>
    </div>
  `;

  container.innerHTML = topBarHtml + classes.map(c => {
    const classProps = (viewerOntologyData.properties || []).filter(p => p.parent_class === c.label || p.domain === c.iri);
    return `
      <div class="glass-card" style="display: flex; flex-direction: column; gap: 10px; border-top: 3px solid var(--accent-cyan);">
        <div class="flex-between" style="align-items: flex-start; gap: 8px;">
          <div>
            <h4 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">${c.label}</h4>
            <span style="font-size: 11px; color: var(--text-secondary); font-family: var(--font-mono); display: block; word-break: break-all; margin-top: 2px;">${c.iri}</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <span class="badge" style="background: rgba(2, 132, 199, 0.12); color: var(--accent-cyan);">${c.annotations?.domain_type || 'Dimension'}</span>
            <button class="btn-sm" style="font-size: 11px; padding: 2px 8px; color: var(--accent-cyan); border-color: rgba(2, 132, 199, 0.3);" onclick="openViewerSubclassModal('${c.label}')" title="Create Subclass of ${c.label}">
              ➕ Subclass
            </button>
          </div>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.4;">${c.comment || '—'}</p>
        
        ${c.subclass_of && c.subclass_of.length > 0 ? `
          <div style="font-size: 11px; display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--text-secondary); font-weight: 600;">rdfs:subClassOf:</span>
            <span style="background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-weight: 600;">${c.subclass_of.join(', ')}</span>
          </div>
        ` : ''}

        ${c.primary_keys && c.primary_keys.length > 0 ? `
          <div style="font-size: 11px; display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--text-secondary); font-weight: 600;">owl:hasKey:</span>
            <span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono);">🔑 ${c.primary_keys.join(', ')}</span>
          </div>
        ` : ''}

        <div style="border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 4px;">
          <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">Associated Properties (${classProps.length}):</span>
          <div style="display: flex; flex-direction: column; gap: 4px; max-height: 120px; overflow-y: auto; margin-top: 6px;">
            ${classProps.length > 0 ? classProps.map(p => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                <span style="font-family: var(--font-mono); color: ${p.property_type === 'ObjectProperty' ? 'var(--accent-violet)' : 'var(--accent-cyan)'};">${p.label}</span>
                <span style="font-size: 10px; color: var(--text-secondary);">${p.property_type === 'ObjectProperty' ? '➜ ' + p.target_class : p.range}</span>
              </div>
            `).join('') : '<span style="font-size: 11px; color: var(--text-secondary); font-style: italic;">No direct properties.</span>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Properties Table View
function renderViewerPropertiesList() {
  const tbody = document.getElementById('v-props-tbody');
  if (!tbody || !viewerOntologyData) return;

  const query = (document.getElementById('viewer-search-input')?.value || '').toLowerCase();
  let properties = viewerOntologyData.properties || [];

  if (viewerPropertyFilter === 'datatype') {
    properties = properties.filter(p => p.property_type === 'DatatypeProperty');
  } else if (viewerPropertyFilter === 'object') {
    properties = properties.filter(p => p.property_type === 'ObjectProperty');
  }

  if (query) {
    properties = properties.filter(p =>
      (p.label && p.label.toLowerCase().includes(query)) ||
      (p.parent_class && p.parent_class.toLowerCase().includes(query)) ||
      (p.target_class && p.target_class.toLowerCase().includes(query)) ||
      (p.range && p.range.toLowerCase().includes(query))
    );
  }

  if (properties.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-secondary);">No properties match active filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = properties.map(p => `
    <tr>
      <td>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">${p.label}</strong>
          <span style="font-size: 10px; color: var(--text-secondary); font-family: var(--font-mono);">${p.iri}</span>
        </div>
      </td>
      <td>
        <span class="badge" style="background: ${p.property_type === 'ObjectProperty' ? 'rgba(79, 70, 229, 0.12)' : 'rgba(5, 150, 105, 0.12)'}; color: ${p.property_type === 'ObjectProperty' ? 'var(--accent-violet)' : 'var(--accent-emerald)'};">
          ${p.property_type}
        </span>
        ${p.is_primary_key ? '<span class="badge" style="background: #fef3c7; color: #b45309; margin-left: 4px;">🔑 PK</span>' : ''}
      </td>
      <td>
        <span style="font-family: var(--font-mono); color: var(--text-primary); font-weight: 600;">${p.parent_class || p.domain || 'owl:Thing'}</span>
      </td>
      <td>
        <span style="font-family: var(--font-mono); color: ${p.property_type === 'ObjectProperty' ? 'var(--accent-violet)' : 'var(--accent-emerald)'};">
          ${p.property_type === 'ObjectProperty' ? (p.target_class || p.range) : p.range}
        </span>
      </td>
      <td>
        ${p.inverse_property ? `<span style="font-size: 11px; background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono);">⇄ owl:inverseOf ${p.inverse_property}</span>` : '<span style="color: var(--text-secondary);">—</span>'}
      </td>
      <td>
        <span style="font-size: 11px; color: var(--text-secondary);">${p.comment || '—'}</span>
      </td>
    </tr>
  `).join('');
}

function filterViewerPropertyType(type) {
  viewerPropertyFilter = type;
  document.querySelectorAll('.v-prop-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-pfilter') === type);
  });
  renderViewerPropertiesList();
}

function onViewerSearchChange(val) {
  if (viewerActiveTab === 'classes') {
    renderViewerClassesList();
  } else if (viewerActiveTab === 'properties') {
    renderViewerPropertiesList();
  }
}

// Raw Source Preview
function renderViewerSource() {
  const codeBlock = document.getElementById('viewer-turtle-code');
  if (codeBlock && viewerOntologyData) {
    codeBlock.innerText = viewerOntologyData.turtle_preview || '# No preview generated';
  }
}

function copyViewerSource() {
  if (!viewerOntologyData?.turtle_preview) return;
  navigator.clipboard.writeText(viewerOntologyData.turtle_preview).then(() => {
    showToast('Turtle source copied to clipboard!', 'success');
  });
}

function downloadViewerTurtle() {
  if (!viewerOntologyData?.turtle_preview) return;
  const blob = new Blob([viewerOntologyData.turtle_preview], { type: 'text/turtle' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(viewerOntologyData.ontology_name || 'ontology').replace(/\s+/g, '_').toLowerCase()}.ttl`;
  a.click();
  window.URL.revokeObjectURL(url);
  showToast('Ontology file downloaded successfully.', 'info');
}

// ==========================================================================
// CREATE SUBCLASS IN ONTOLOGY VIEWER SANDBOX
// ==========================================================================

function openViewerSubclassModal(parentClassLabel = null) {
  if (!viewerOntologyData) {
    showToast('Please load or parse an ontology first.', 'warning');
    return;
  }

  const parentSelect = document.getElementById('vsc-parent');
  const labelInput = document.getElementById('vsc-label');
  const domainSelect = document.getElementById('vsc-domain');
  const commentInput = document.getElementById('vsc-comment');
  const propsTbody = document.getElementById('vsc-props-tbody');

  // Populate Superclass Options
  const availableClasses = (viewerOntologyData.classes || []).map(c => c.label);
  const options = ['owl:Thing', ...availableClasses.filter(c => c && c !== 'owl:Thing')];

  if (parentSelect) {
    parentSelect.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    if (parentClassLabel && options.includes(parentClassLabel)) {
      parentSelect.value = parentClassLabel;
    } else {
      parentSelect.value = 'owl:Thing';
    }
  }

  if (labelInput) {
    labelInput.value = '';
    labelInput.focus();
  }
  if (domainSelect) domainSelect.value = 'Dimension';
  if (commentInput) commentInput.value = '';
  if (propsTbody) {
    propsTbody.innerHTML = '';
    // Add 1 default datatype attribute row for convenience
    addViewerSubclassPropRow('DatatypeProperty');
  }

  openModal('viewerSubclassModal');
}

function addViewerSubclassPropRow(propType = 'DatatypeProperty') {
  const tbody = document.getElementById('vsc-props-tbody');
  if (!tbody) return;
  const isObj = propType === 'ObjectProperty';
  const availableClasses = (viewerOntologyData && viewerOntologyData.classes) ? viewerOntologyData.classes.map(c => c.label) : [];
  
  let rangeHtml = '';
  if (isObj) {
    const opts = availableClasses.map(cName => `<option value="${cName}">${cName}</option>`).join('');
    rangeHtml = `<select class="vsc-prop-range" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px; width: 100%;">${opts || '<option value="TargetClass">TargetClass</option>'}</select>`;
  } else {
    rangeHtml = `<input type="text" class="vsc-prop-range" value="xsd:string" placeholder="xsd:string" style="padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;">`;
  }

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <input type="text" class="vsc-prop-name" placeholder="${isObj ? 'e.g. relatesToTarget' : 'e.g. hasAttribute'}" style="padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;">
    </td>
    <td>
      <select class="vsc-prop-type" onchange="onViewerSubclassPropTypeChanged(this)" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px; width: 100%;">
        <option value="DatatypeProperty" ${!isObj ? 'selected' : ''}>📊 Datatype</option>
        <option value="ObjectProperty" ${isObj ? 'selected' : ''}>🔗 Object</option>
      </select>
    </td>
    <td class="vsc-range-container">
      ${rangeHtml}
    </td>
    <td>
      <input type="text" class="vsc-prop-inv" placeholder="${isObj ? 'e.g. inverseRel' : 'N/A'}" ${!isObj ? 'disabled style="opacity: 0.5; padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-secondary); border-radius: 4px;"' : 'style="padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;"'}>
    </td>
    <td style="text-align: center;">
      <input type="checkbox" class="vsc-prop-pk" ${isObj ? 'disabled' : ''} style="cursor: pointer; transform: scale(1.1);" title="Primary Key">
    </td>
    <td style="text-align: center;">
      <button type="button" class="btn-danger" style="padding: 2px 6px; font-size: 11px;" onclick="this.closest('tr').remove()" title="Remove Property">🗑️</button>
    </td>
  `;
  tbody.appendChild(tr);
}

function onViewerSubclassPropTypeChanged(selectEl) {
  const row = selectEl.closest('tr');
  if (!row) return;
  const isObj = selectEl.value === 'ObjectProperty';
  const rangeCell = row.querySelector('.vsc-range-container');
  const invInput = row.querySelector('.vsc-prop-inv');
  const pkInput = row.querySelector('.vsc-prop-pk');

  const availableClasses = (viewerOntologyData && viewerOntologyData.classes) ? viewerOntologyData.classes.map(c => c.label) : [];

  if (isObj) {
    const opts = availableClasses.map(cName => `<option value="${cName}">${cName}</option>`).join('');
    rangeCell.innerHTML = `<select class="vsc-prop-range" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px; width: 100%;">${opts || '<option value="TargetClass">TargetClass</option>'}</select>`;
    if (invInput) {
      invInput.disabled = false;
      invInput.style.opacity = '1';
      invInput.placeholder = 'e.g. inverseRel';
    }
    if (pkInput) {
      pkInput.checked = false;
      pkInput.disabled = true;
    }
  } else {
    rangeCell.innerHTML = `<input type="text" class="vsc-prop-range" value="xsd:string" placeholder="xsd:string" style="padding: 4px 8px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;">`;
    if (invInput) {
      invInput.disabled = true;
      invInput.style.opacity = '0.5';
      invInput.placeholder = 'N/A';
      invInput.value = '';
    }
    if (pkInput) {
      pkInput.disabled = false;
    }
  }
}

function submitViewerCreateSubclass() {
  if (!viewerOntologyData) return;

  const rawLabel = (document.getElementById('vsc-label')?.value || '').trim();
  if (!rawLabel) {
    showToast('Subclass label/name is required.', 'warning');
    document.getElementById('vsc-label')?.focus();
    return;
  }

  // Sanitize label name (PascalCase or alphanumeric)
  const cleanLabel = rawLabel.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleanLabel) {
    showToast('Subclass name must contain valid alphanumeric characters.', 'warning');
    return;
  }

  // Check for uniqueness
  const classes = viewerOntologyData.classes || [];
  if (classes.some(c => c.label.toLowerCase() === cleanLabel.toLowerCase())) {
    showToast(`An ontology class with the name "${cleanLabel}" already exists.`, 'warning');
    return;
  }

  const parent = document.getElementById('vsc-parent')?.value.trim() || 'owl:Thing';
  const domainType = document.getElementById('vsc-domain')?.value || 'Dimension';
  const comment = (document.getElementById('vsc-comment')?.value || '').trim() || `Subclass representing ${cleanLabel}`;

  const baseIri = viewerOntologyData.base_iri || 'http://uploaded.ontology/schema#';
  const classIri = `${baseIri}${cleanLabel}`;

  // Read properties
  const propRows = document.querySelectorAll('#vsc-props-tbody tr');
  const newProps = [];
  const pks = [];

  propRows.forEach(row => {
    const nameIn = row.querySelector('.vsc-prop-name');
    const typeSel = row.querySelector('.vsc-prop-type');
    const rangeIn = row.querySelector('.vsc-prop-range');
    const invIn = row.querySelector('.vsc-prop-inv');
    const pkIn = row.querySelector('.vsc-prop-pk');

    const pName = nameIn ? nameIn.value.trim().replace(/[^a-zA-Z0-9_]/g, '') : '';
    if (pName) {
      const pType = typeSel ? typeSel.value : 'DatatypeProperty';
      const isObj = pType === 'ObjectProperty';
      const pRange = rangeIn ? rangeIn.value.trim() : (isObj ? 'TargetClass' : 'xsd:string');
      const isPk = pkIn ? pkIn.checked : false;
      const invName = (isObj && invIn) ? invIn.value.trim() : null;

      if (isPk && !isObj) {
        pks.push(pName);
      }

      newProps.push({
        id: `${baseIri}${pName}`,
        iri: `${baseIri}${pName}`,
        name: pName,
        label: pName,
        relationship_name: isObj ? pName : null,
        property_type: pType,
        range: pRange,
        domain: classIri,
        parent_class: cleanLabel,
        target_class: isObj ? pRange : null,
        inverse_property: invName,
        is_inverse: false,
        is_primary_key: isPk,
        table_name: cleanLabel,
        comment: `${pType} for ${cleanLabel}`
      });
    }
  });

  // Construct new class schema
  const newClassObj = {
    id: classIri,
    iri: classIri,
    label: cleanLabel,
    name: cleanLabel,
    comment: comment,
    subclass_of: [parent],
    parent_class: parent,
    primary_keys: pks,
    business_rules: [],
    annotations: {
      domain_type: domainType,
      table_name: cleanLabel,
      primary_keys: pks,
      is_uploaded: true,
      is_custom_subclass: true
    }
  };

  // Add to classes array
  classes.push(newClassObj);
  classes.sort((a, b) => a.label.localeCompare(b.label));

  // Add properties
  if (!viewerOntologyData.properties) viewerOntologyData.properties = [];
  newProps.forEach(p => viewerOntologyData.properties.push(p));

  // Add to graph elements
  if (!viewerOntologyData.graph) {
    viewerOntologyData.graph = { nodes: [], edges: [], node_count: 0, edge_count: 0 };
  }

  const classAttrs = newProps.filter(p => p.property_type === 'DatatypeProperty').map(p => ({
    name: p.name,
    range: p.range,
    is_primary_key: p.is_primary_key
  }));

  const graphNode = {
    id: cleanLabel,
    label: cleanLabel,
    type: 'Class',
    iri: classIri,
    domain_type: domainType,
    comment: comment,
    primary_keys: pks,
    attributes: classAttrs,
    properties: {
      type: 'Class',
      domain_type: domainType,
      subclass_of: [parent],
      comment: comment
    }
  };
  viewerOntologyData.graph.nodes.push(graphNode);

  // Add SubClassOf edge
  if (parent && parent !== 'owl:Thing') {
    viewerOntologyData.graph.edges.push({
      id: `sub_${cleanLabel}_${parent}`,
      source: cleanLabel,
      target: parent,
      label: 'subClassOf',
      type: 'subClassOf',
      relationship_type: 'INHERITANCE'
    });
  }

  // Add ObjectProperty edges
  newProps.filter(p => p.property_type === 'ObjectProperty').forEach(p => {
    if (p.target_class) {
      viewerOntologyData.graph.edges.push({
        id: `rel_${cleanLabel}_${p.name}_${p.target_class}`,
        source: cleanLabel,
        target: p.target_class,
        label: p.name,
        type: 'ObjectProperty',
        relationship_type: 'OBJECT_PROPERTY',
        inverse_property: p.inverse_property,
        comment: p.comment
      });
    }
  });

  viewerOntologyData.graph.node_count = viewerOntologyData.graph.nodes.length;
  viewerOntologyData.graph.edge_count = viewerOntologyData.graph.edges.length;

  // Append Turtle serialization
  let turtleAddition = `\n# --- Custom Subclass: ${cleanLabel} ---\n`;
  const parentRef = parent === 'owl:Thing' ? 'owl:Thing' : (parent.includes(':') ? parent : `:${parent}`);
  turtleAddition += `:${cleanLabel} a owl:Class ;\n`;
  turtleAddition += `    rdfs:label "${cleanLabel}" ;\n`;
  turtleAddition += `    rdfs:subClassOf ${parentRef} ;\n`;
  turtleAddition += `    rdfs:comment "${comment.replace(/"/g, '\\"')}" .\n`;

  newProps.forEach(p => {
    if (p.property_type === 'DatatypeProperty') {
      turtleAddition += `\n:${p.name} a owl:DatatypeProperty ;\n`;
      turtleAddition += `    rdfs:domain :${cleanLabel} ;\n`;
      turtleAddition += `    rdfs:range ${p.range} ;\n`;
      turtleAddition += `    rdfs:label "${p.name}" .\n`;
    } else if (p.property_type === 'ObjectProperty') {
      turtleAddition += `\n:${p.name} a owl:ObjectProperty ;\n`;
      turtleAddition += `    rdfs:domain :${cleanLabel} ;\n`;
      turtleAddition += `    rdfs:range :${p.target_class} ;\n`;
      if (p.inverse_property) {
        turtleAddition += `    owl:inverseOf :${p.inverse_property} ;\n`;
      }
      turtleAddition += `    rdfs:label "${p.name}" .\n`;
    }
  });

  if (viewerOntologyData.turtle_preview) {
    viewerOntologyData.turtle_preview += turtleAddition;
  } else {
    viewerOntologyData.turtle_preview = turtleAddition;
  }

  // Update raw textarea
  const rawTextarea = document.getElementById('viewer-raw-text');
  if (rawTextarea && rawTextarea.value) {
    rawTextarea.value += turtleAddition;
  }

  // Update stats
  if (!viewerOntologyData.stats) {
    viewerOntologyData.stats = { classes_count: 0, datatype_properties_count: 0, object_properties_count: 0, total_triples_count: 0 };
  }
  viewerOntologyData.stats.classes_count = classes.length;
  viewerOntologyData.stats.datatype_properties_count += newProps.filter(p => p.property_type === 'DatatypeProperty').length;
  viewerOntologyData.stats.object_properties_count += newProps.filter(p => p.property_type === 'ObjectProperty').length;
  viewerOntologyData.stats.total_triples_count += (4 + newProps.length * 4);

  // Update metric counters
  const statClasses = document.getElementById('v-stat-classes');
  const statDt = document.getElementById('v-stat-datatype');
  const statObj = document.getElementById('v-stat-object');
  const statTriples = document.getElementById('v-stat-triples');

  if (statClasses) statClasses.innerText = viewerOntologyData.stats.classes_count;
  if (statDt) statDt.innerText = viewerOntologyData.stats.datatype_properties_count;
  if (statObj) statObj.innerText = viewerOntologyData.stats.object_properties_count;
  if (statTriples) statTriples.innerText = viewerOntologyData.stats.total_triples_count;

  closeModal('viewerSubclassModal');
  showToast(`✨ Subclass "${cleanLabel}" of "${parent}" created successfully!`, 'success');

  // Re-render active view
  if (viewerActiveTab === 'graph') {
    initViewerCytoscape();
    setTimeout(() => {
      if (cyViewerInstance && !cyViewerInstance.destroyed()) {
        try {
          openViewerNodeInspector(graphNode);
          const cyNode = cyViewerInstance.getElementById(cleanLabel);
          if (cyNode && cyNode.length > 0) {
            cyNode.select();
            cyViewerInstance.fit(cyNode, 40);
          }
        } catch(e){}
      }
    }, 100);
  } else if (viewerActiveTab === 'classes') {
    renderViewerClassesList();
  } else if (viewerActiveTab === 'properties') {
    renderViewerPropertiesList();
  } else if (viewerActiveTab === 'source') {
    renderViewerSource();
  }
}
