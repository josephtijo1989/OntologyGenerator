import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import cytoscape, { Core } from 'cytoscape';

interface PresetOption {
  label: string;
  description: string;
  format: string;
  filename: string;
  content: string;
}

@Component({
  selector: 'app-ontology-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="viewer-container">
      <!-- Header Section -->
      <div class="header-card glass-card">
        <div class="flex-between">
          <div>
            <div class="title-row">
              <h2>OWL / RDF Ontology Viewer & Sandbox</h2>
              <span class="sandbox-badge">🔒 Stateless Sandbox Mode (Read-Only Preview)</span>
            </div>
            <p class="subtitle">
              Upload, parse, and visually explore Semantic Web ontologies (Turtle, OWL/XML, JSON-LD, N-Triples) in real time without database persistence.
            </p>
          </div>
          <div class="header-actions">
            <button class="btn-primary glow-btn" (click)="openCreateClassModal()" *ngIf="parsedData" id="viewer-create-class-header-btn">
              ➕ Create Class
            </button>
            <button class="btn-secondary" (click)="resetViewer()" *ngIf="parsedData">
              🗑️ Clear Sandbox
            </button>
            <button class="btn-primary" (click)="downloadTurtle()" *ngIf="parsedData">
              📥 Export Turtle (.ttl)
            </button>
          </div>
        </div>
      </div>

      <!-- Ingestion & Upload Section -->
      <div class="glass-card upload-section" [class.collapsed]="parsedData && isUploadCollapsed">
        <div class="flex-between section-header" (click)="toggleUploadCollapse()">
          <h3>
            <span>📥 Ingest Ontology File or Raw Source</span>
            <span class="collapse-hint" *ngIf="parsedData">({{ isUploadCollapsed ? 'Click to expand upload panel' : 'Click to collapse' }})</span>
          </h3>
          <button class="btn-sm" *ngIf="parsedData" (click)="$event.stopPropagation(); toggleUploadCollapse()">
            {{ isUploadCollapsed ? '▼ Expand Ingestion' : '▲ Collapse' }}
          </button>
        </div>

        <div class="upload-body" *ngIf="!isUploadCollapsed">
          <!-- Preset Selector -->
          <div class="presets-bar">
            <span class="preset-label">⚡ Quick-Load Sample Ontologies:</span>
            <div class="preset-chips">
              <button
                *ngFor="let preset of presets"
                class="preset-chip"
                (click)="loadPreset(preset)"
                [title]="preset.description">
                {{ preset.label }}
              </button>
            </div>
          </div>

          <div class="ingestion-grid">
            <!-- Dropzone -->
            <div
              class="dropzone"
              [class.drag-over]="isDragging"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onFileDrop($event)"
              (click)="fileInput.click()">
              <input
                #fileInput
                type="file"
                (change)="onFileSelected($event)"
                accept=".ttl,.owl,.rdf,.xml,.jsonld,.json,.nt,.n3"
                style="display: none" />
              
              <div class="dropzone-content">
                <span class="dropzone-icon">📁</span>
                <strong class="dropzone-title">
                  {{ selectedFile ? selectedFile.name : 'Drag & Drop Ontology File Here' }}
                </strong>
                <p class="dropzone-sub">
                  {{ selectedFile ? (selectedFile.size / 1024 | number:'1.1-2') + ' KB — Click to change' : 'or browse from your machine (.ttl, .owl, .rdf, .xml, .jsonld, .nt)' }}
                </p>
                <span class="format-tags">Turtle · OWL/XML · RDF/XML · JSON-LD · N-Triples</span>
              </div>
            </div>

            <!-- Raw Text Area -->
            <div class="editor-box">
              <div class="editor-header flex-between">
                <span class="editor-title">Or Paste Raw Ontology / RDF Code:</span>
                <div class="format-select-row">
                  <label>Format Hint:</label>
                  <select [(ngModel)]="formatHint" class="format-dropdown">
                    <option value="auto">Auto-Detect</option>
                    <option value="turtle">Turtle (.ttl / .n3)</option>
                    <option value="xml">OWL / RDF XML (.owl, .xml)</option>
                    <option value="json-ld">JSON-LD (.jsonld)</option>
                    <option value="nt">N-Triples (.nt)</option>
                  </select>
                </div>
              </div>
              <textarea
                class="raw-textarea font-mono"
                [(ngModel)]="rawTextContent"
                placeholder="@prefix owl: <http://www.w3.org/2002/07/owl#> ...&#10;Paste your RDF/OWL Turtle or XML schema here..."></textarea>
            </div>
          </div>

          <!-- Parse Action Bar -->
          <div class="action-bar flex-between">
            <div class="status-msg" *ngIf="errorMessage">
              <span class="error-text">⚠️ {{ errorMessage }}</span>
            </div>
            <div class="status-msg" *ngIf="!errorMessage && selectedFile">
              <span class="ready-text">✓ Ready to parse: <strong>{{ selectedFile.name }}</strong></span>
            </div>
            <div class="status-msg" *ngIf="!errorMessage && !selectedFile && rawTextContent">
              <span class="ready-text">✓ Custom text buffer: <strong>{{ rawTextContent.length }} characters</strong></span>
            </div>
            <div class="btn-group">
              <button class="btn-secondary" (click)="clearInputs()">Clear</button>
              <button class="btn-primary glow-btn" (click)="parseAndVisualize()" [disabled]="isLoading">
                <span *ngIf="!isLoading">⚡ Parse & Visualize Ontology</span>
                <span *ngIf="isLoading">⏳ Ingesting & Analyzing Graph...</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Viewer Content (When Parsed) -->
      <div class="viewer-content" *ngIf="parsedData">
        <!-- Metrics Stats Bar -->
        <div class="metrics-grid">
          <div class="metric-card glass-card">
            <div class="metric-header">
              <span class="metric-label">ONTOLOGY NAME</span>
              <span class="metric-icon">🧠</span>
            </div>
            <div class="metric-val text-cyan truncate" [title]="parsedData.ontology_name">
              {{ parsedData.ontology_name }}
            </div>
            <div class="metric-sub truncate" [title]="parsedData.base_iri">{{ parsedData.base_iri }}</div>
          </div>

          <div class="metric-card glass-card">
            <div class="metric-header">
              <span class="metric-label">OWL CLASSES</span>
              <span class="metric-icon">🏛️</span>
            </div>
            <div class="metric-val text-violet font-mono">
              {{ parsedData.stats?.classes_count || 0 }}
            </div>
            <div class="metric-sub">Semantic entities mapped</div>
          </div>

          <div class="metric-card glass-card">
            <div class="metric-header">
              <span class="metric-label">DATATYPE ATTRIBUTES</span>
              <span class="metric-icon">📊</span>
            </div>
            <div class="metric-val text-emerald font-mono">
              {{ parsedData.stats?.datatype_properties_count || 0 }}
            </div>
            <div class="metric-sub">Scalar fields (XSD typed)</div>
          </div>

          <div class="metric-card glass-card">
            <div class="metric-header">
              <span class="metric-label">OBJECT RELATIONSHIPS</span>
              <span class="metric-icon">🔗</span>
            </div>
            <div class="metric-val text-amber font-mono">
              {{ parsedData.stats?.object_properties_count || 0 }}
            </div>
            <div class="metric-sub">Domain &rarr; Range edges</div>
          </div>

          <div class="metric-card glass-card">
            <div class="metric-header">
              <span class="metric-label">RDF TRIPLES & FORMAT</span>
              <span class="metric-icon">📜</span>
            </div>
            <div class="metric-val text-rose font-mono">
              {{ parsedData.stats?.total_triples_count || 0 }}
            </div>
            <div class="metric-sub">Format: <strong class="badge-format">{{ parsedData.detected_format }}</strong></div>
          </div>
        </div>

        <!-- View Tabs Bar -->
        <div class="view-tabs-bar glass-card">
          <div class="tabs-group">
            <button
              class="view-tab-btn"
              [class.active]="activeViewTab === 'graph'"
              (click)="switchViewTab('graph')">
              🕸️ Knowledge Graph View
            </button>
            <button
              class="view-tab-btn"
              [class.active]="activeViewTab === 'classes'"
              (click)="switchViewTab('classes')">
              🏛️ OWL Classes ({{ parsedData.classes?.length || 0 }})
            </button>
            <button
              class="view-tab-btn"
              [class.active]="activeViewTab === 'properties'"
              (click)="switchViewTab('properties')">
              🔗 Properties & Edges ({{ parsedData.properties?.length || 0 }})
            </button>
            <button
              class="view-tab-btn"
              [class.active]="activeViewTab === 'source'"
              (click)="switchViewTab('source')">
              📜 Raw Turtle Source
            </button>
          </div>

          <div class="search-filter-box" *ngIf="activeViewTab === 'classes' || activeViewTab === 'properties'">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search classes or properties..."
              class="search-input" />
          </div>
        </div>

        <!-- Tab 1: Interactive Knowledge Graph View -->
        <div class="tab-pane graph-pane glass-card" [style.display]="activeViewTab === 'graph' ? 'block' : 'none'">
          <div class="graph-toolbar flex-between">
            <div class="toolbar-left">
              <span class="toolbar-title">Cytoscape Visualizer Canvas</span>
              <span class="node-count-badge">
                Nodes: <strong>{{ parsedData.graph?.node_count || parsedData.classes?.length || 0 }}</strong> &middot;
                Edges: <strong>{{ parsedData.graph?.edge_count || 0 }}</strong>
              </span>
            </div>
            <div class="toolbar-right">
              <button class="btn-primary btn-sm glow-btn" (click)="openCreateClassModal()" title="Create New Semantic Class">➕ Create Class</button>
              <button class="btn-sm btn-subclass-nav" (click)="openCreateClassModal()" title="Add Subclass to Hierarchy">➕ Add Subclass</button>
              <button class="btn-icon" (click)="zoomIn()" title="Zoom In">🔍+</button>
              <button class="btn-icon" (click)="zoomOut()" title="Zoom Out">🔍-</button>
              <button class="btn-icon" (click)="fitGraph()" title="Fit to Screen">⛶ Fit</button>
              <button class="btn-icon" (click)="reRenderGraph()" title="Re-Layout">🔄</button>
            </div>
          </div>

          <div class="graph-layout-container">
            <div #cyContainer class="cy-canvas" title="Double click empty canvas to create a class"></div>

            <!-- Canvas Quick Hint -->
            <div class="canvas-quick-hint">
              <span>💡 Double-click canvas or click <strong>➕ Create Class</strong> to add nodes to graphical ontology</span>
            </div>

            <!-- Node Inspector Overlay / Drawer -->
            <div class="inspector-drawer glass-card" *ngIf="selectedGraphNode">
              <div class="flex-between drawer-header">
                <div>
                  <span class="drawer-type-tag">{{ selectedGraphNode.type }}</span>
                  <h4 class="drawer-node-title">{{ selectedGraphNode.label }}</h4>
                </div>
                <button class="btn-close" (click)="selectedGraphNode = null">✕</button>
              </div>
              <div class="drawer-body">
                <div class="info-row">
                  <span class="info-label">IRI:</span>
                  <span class="info-val font-mono text-cyan truncate" [title]="selectedGraphNode.iri">{{ selectedGraphNode.iri }}</span>
                </div>
                <div class="info-row" *ngIf="selectedGraphNode.comment">
                  <span class="info-label">Description:</span>
                  <span class="info-val">{{ selectedGraphNode.comment }}</span>
                </div>
                <div class="info-row" *ngIf="selectedGraphNode.primary_keys?.length">
                  <span class="info-label">Primary Key(s):</span>
                  <div class="pk-badge-group">
                    <span class="pk-badge" *ngFor="let pk of selectedGraphNode.primary_keys">🔑 {{ pk }}</span>
                  </div>
                </div>

                <!-- Attributes list on this node -->
                <div class="drawer-section" *ngIf="selectedGraphNode.attributes?.length">
                  <h5>Datatype Properties ({{ selectedGraphNode.attributes.length }})</h5>
                  <div class="attr-table">
                    <div class="attr-row" *ngFor="let attr of selectedGraphNode.attributes">
                      <span class="attr-name font-mono">{{ attr.name }}</span>
                      <span class="attr-range font-mono">{{ attr.range }}</span>
                      <span class="pk-icon" *ngIf="attr.is_primary_key" title="Primary Key">🔑</span>
                    </div>
                  </div>
                </div>

                <!-- Connected relationships -->
                <div class="drawer-section">
                  <h5>Connected Object Properties</h5>
                  <div class="rel-list">
                    <div class="rel-item" *ngFor="let edge of getNodeEdges(selectedGraphNode.id)">
                      <div class="rel-dir">
                        <span class="badge-dir" [class.outgoing]="edge.source === selectedGraphNode.id">
                          {{ edge.source === selectedGraphNode.id ? 'OUTGOING ➜' : 'INCOMING ⬅' }}
                        </span>
                        <strong class="font-mono text-violet">{{ edge.label }}</strong>
                      </div>
                      <span class="rel-target text-secondary">
                        {{ edge.source === selectedGraphNode.id ? edge.target : edge.source }}
                      </span>
                    </div>
                    <div class="empty-state-sm" *ngIf="getNodeEdges(selectedGraphNode.id).length === 0">
                      No direct object properties linked.
                    </div>
                  </div>
                </div>

                <!-- Drawer Subclass & Sibling Actions -->
                <div class="drawer-action-row" style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 6px;">
                  <button class="btn-primary" style="width: 100%; font-size: 11px; padding: 6px 10px;" (click)="openCreateClassModal(selectedGraphNode.label)">
                    ➕ Create Subclass of {{ selectedGraphNode.label }}
                  </button>
                  <button class="btn-secondary" style="width: 100%; font-size: 11px; padding: 6px 10px;" (click)="openCreateClassModal(selectedGraphNode.properties?.subclass_of?.[0] || 'owl:Thing')">
                    ➕ Create Sibling Class
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: OWL Classes Matrix -->
        <div class="tab-pane classes-pane" *ngIf="activeViewTab === 'classes'">
          <div class="classes-top-bar glass-card flex-between" style="padding: 12px 18px; margin-bottom: 16px;">
            <div>
              <strong style="color: var(--text-primary); font-size: 14px;">OWL Classes Matrix ({{ filteredClasses.length }})</strong>
              <span style="font-size: 11px; color: var(--text-secondary); margin-left: 8px;">Explore semantic class concepts & taxonomy hierarchy</span>
            </div>
            <button class="btn-primary glow-btn" (click)="openCreateClassModal()" style="font-size: 12px; padding: 6px 14px;">
              ➕ Create New Class
            </button>
          </div>

          <div class="grid-cards">
            <div class="glass-card class-card" *ngFor="let cls of filteredClasses">
              <div class="class-card-header flex-between">
                <div>
                  <h4 class="class-title font-mono">{{ cls.label }}</h4>
                  <span class="class-iri font-mono">{{ cls.iri }}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                  <span class="domain-badge" [class.lookup]="cls.annotations?.domain_type === 'Lookup'" [class.fact]="cls.annotations?.domain_type === 'Fact'">
                    {{ cls.annotations?.domain_type || 'Dimension' }}
                  </span>
                  <button class="btn-sm" style="font-size: 10px; padding: 2px 6px;" (click)="openSubclassModal(cls.label)" title="Create Subclass of {{ cls.label }}">
                    ➕ Subclass
                  </button>
                </div>
              </div>

              <div class="class-card-body">
                <p class="class-comment" *ngIf="cls.comment">{{ cls.comment }}</p>

                <!-- Hierarchy & Subclass -->
                <div class="hierarchy-row" *ngIf="cls.subclass_of?.length">
                  <span class="subclass-label">rdfs:subClassOf:</span>
                  <div class="chips-wrap">
                    <span class="subclass-chip font-mono" *ngFor="let sc of cls.subclass_of">{{ sc }}</span>
                  </div>
                </div>

                <!-- Primary Keys -->
                <div class="pk-row" *ngIf="cls.primary_keys?.length">
                  <span class="pk-label">owl:hasKey:</span>
                  <div class="chips-wrap">
                    <span class="pk-chip font-mono" *ngFor="let pk of cls.primary_keys">🔑 {{ pk }}</span>
                  </div>
                </div>

                <!-- Class Datatype Properties -->
                <div class="class-props-section">
                  <span class="props-title">Associated Properties ({{ getClassProperties(cls.label).length }})</span>
                  <div class="props-mini-list">
                    <div class="mini-prop-item" *ngFor="let p of getClassProperties(cls.label)">
                      <div class="flex-between">
                        <span class="mini-prop-name font-mono" [class.obj]="p.property_type === 'ObjectProperty'">
                          {{ p.label }}
                        </span>
                        <span class="mini-prop-tag">{{ p.property_type === 'ObjectProperty' ? '➜ ' + p.target_class : p.range }}</span>
                      </div>
                    </div>
                    <div class="empty-state-sm" *ngIf="getClassProperties(cls.label).length === 0">
                      No explicitly bound properties.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="empty-state-card glass-card" *ngIf="filteredClasses.length === 0">
            <p>No OWL classes found matching query "{{ searchQuery }}".</p>
          </div>
        </div>

        <!-- Tab 3: OWL Properties Matrix -->
        <div class="tab-pane properties-pane glass-card" *ngIf="activeViewTab === 'properties'">
          <div class="prop-filter-chips flex-between">
            <div class="chips-group">
              <button class="filter-btn" [class.active]="propertyFilter === 'all'" (click)="propertyFilter = 'all'">
                All Properties ({{ parsedData.properties?.length || 0 }})
              </button>
              <button class="filter-btn" [class.active]="propertyFilter === 'datatype'" (click)="propertyFilter = 'datatype'">
                📊 Datatype Properties ({{ parsedData.stats?.datatype_properties_count || 0 }})
              </button>
              <button class="filter-btn" [class.active]="propertyFilter === 'object'" (click)="propertyFilter = 'object'">
                🔗 Object Properties ({{ parsedData.stats?.object_properties_count || 0 }})
              </button>
            </div>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Property Name / IRI</th>
                  <th>Type</th>
                  <th>Domain (Source Class)</th>
                  <th>Range (Type / Target Class)</th>
                  <th>Inverse Relationship</th>
                  <th>Annotations & Comment</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let prop of filteredProperties">
                  <td>
                    <div class="prop-id-cell">
                      <strong class="font-mono text-cyan">{{ prop.label }}</strong>
                      <span class="prop-full-iri font-mono">{{ prop.iri }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="prop-type-badge" [class.obj-badge]="prop.property_type === 'ObjectProperty'">
                      {{ prop.property_type }}
                    </span>
                    <span class="pk-badge-sm" *ngIf="prop.is_primary_key">🔑 PK</span>
                  </td>
                  <td>
                    <span class="font-mono text-violet">{{ prop.parent_class || prop.domain || 'owl:Thing' }}</span>
                  </td>
                  <td>
                    <span class="font-mono" [class.text-amber]="prop.property_type === 'ObjectProperty'" [class.text-emerald]="prop.property_type === 'DatatypeProperty'">
                      {{ prop.property_type === 'ObjectProperty' ? (prop.target_class || prop.range) : prop.range }}
                    </span>
                  </td>
                  <td>
                    <span class="inverse-tag font-mono" *ngIf="prop.inverse_property">
                      ⇄ owl:inverseOf {{ prop.inverse_property }}
                    </span>
                    <span class="text-secondary" *ngIf="!prop.inverse_property">—</span>
                  </td>
                  <td>
                    <span class="comment-cell">{{ prop.comment || '—' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="empty-state-card" *ngIf="filteredProperties.length === 0">
            <p>No properties found matching filters.</p>
          </div>
        </div>

        <!-- Tab 4: Raw Turtle Source Preview -->
        <div class="tab-pane source-pane glass-card" *ngIf="activeViewTab === 'source'">
          <div class="flex-between source-header">
            <div>
              <h4>Turtle Serialization (.ttl)</h4>
              <p class="subtitle">Standard W3C RDF/Turtle representation of the loaded ontology graph</p>
            </div>
            <div class="btn-group">
              <button class="btn-secondary" (click)="copySourceToClipboard()">
                {{ isCopied ? '✓ Copied!' : '📋 Copy Source' }}
              </button>
              <button class="btn-primary" (click)="downloadTurtle()">
                📥 Download File
              </button>
            </div>
          </div>
          <pre class="code-block font-mono"><code>{{ parsedData.turtle_preview }}</code></pre>
        </div>
      </div>

      <!-- Toast Notification Container -->
      <div class="toast-notification" *ngIf="toastMessage">
        <span class="toast-icon">✨</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>

      <!-- Create Class / Subclass Modal Overlay -->
      <div class="modal-overlay" *ngIf="isSubclassModalOpen">
        <div class="glass-card modal-box" style="width: 720px; max-width: 94vw; max-height: 92vh; overflow-y: auto;">
          <div class="flex-between modal-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 14px;">
            <div>
              <h4 style="font-size: 17px; margin: 0; color: var(--accent-cyan); display: flex; align-items: center; gap: 8px;">
                <span>✨</span> Create Class in Graphical Ontology
              </h4>
              <p class="subtitle" style="margin: 2px 0 0 0; font-size: 11px;">Define a root semantic class (owl:Thing) or subclass, taxonomy hierarchy, attributes, and relationships</p>
            </div>
            <button class="btn-close" (click)="closeCreateClassModal()">✕</button>
          </div>

          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- Hierarchy Type Selection Tabs -->
            <div class="class-type-toggle-row">
              <label class="toggle-option" [class.active]="newSubclassParent === 'owl:Thing'" (click)="newSubclassParent = 'owl:Thing'">
                <span class="toggle-radio"></span>
                <span>🏛️ Root OWL Class (owl:Thing)</span>
              </label>
              <label class="toggle-option" [class.active]="newSubclassParent !== 'owl:Thing'" (click)="newSubclassParent = (availableSuperclasses[1] || 'owl:Thing')">
                <span class="toggle-radio"></span>
                <span>🌲 Subclass of Existing Concept</span>
              </label>
            </div>

            <div class="form-row" style="display: flex; gap: 12px;">
              <div class="form-group half" style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Class Name / Label <span style="color: var(--accent-rose);">*</span></label>
                <input type="text" [(ngModel)]="newSubclassLabel" placeholder="e.g. TherapeuticAntibody or BioAssay" class="form-input font-mono" style="padding: 8px 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 12px;" />
                <span class="form-hint" *ngIf="parsedData?.base_iri" style="font-size: 10px; color: var(--accent-cyan); font-family: var(--font-mono); margin-top: 2px;">
                  IRI: {{ parsedData.base_iri }}{{ newSubclassLabel || 'ClassName' }}
                </span>
              </div>
              <div class="form-group half" style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Parent Hierarchy (rdfs:subClassOf) <span style="color: var(--accent-rose);">*</span></label>
                <select [(ngModel)]="newSubclassParent" class="form-select font-mono" style="padding: 8px 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 12px;">
                  <option *ngFor="let opt of availableSuperclasses" [value]="opt">{{ opt }}</option>
                </select>
                <span class="form-hint" style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">
                  {{ newSubclassParent === 'owl:Thing' ? 'Creates a standalone root semantic entity' : 'Inherits properties and hierarchy from parent' }}
                </span>
              </div>
            </div>

            <div class="form-row" style="display: flex; gap: 12px;">
              <div class="form-group half" style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Domain Classification</label>
                <select [(ngModel)]="newSubclassDomain" class="form-select" style="padding: 8px 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 12px;">
                  <option value="Dimension">Dimension Entity (Master Data Context)</option>
                  <option value="Fact">Fact Entity (Metrics & Measures)</option>
                  <option value="Lookup">Lookup Entity (Reference Code Table)</option>
                  <option value="Transactional">Transactional Entity</option>
                  <option value="SCD">SCD Entity (Slowly Changing Dimension)</option>
                </select>
              </div>
              <div class="form-group half" style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Description / RDFS Comment</label>
                <input type="text" [(ngModel)]="newSubclassComment" placeholder="e.g. Biological macromolecule with antigen binding specificity" class="form-input" style="padding: 8px 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 12px;" />
              </div>
            </div>

            <!-- Properties in modal -->
            <div class="props-form-section" style="border-top: 1px dashed var(--border-color); padding-top: 10px;">
              <div class="flex-between" style="margin-bottom: 8px;">
                <div>
                  <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">Initial Class Properties & Attributes</span>
                  <span style="font-size: 11px; color: var(--text-secondary); margin-left: 6px;">(Optional Datatype & Object Properties)</span>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button class="btn-sm" (click)="addSubclassPropRow('DatatypeProperty')">➕ Add Datatype</button>
                  <button class="btn-sm" (click)="addSubclassPropRow('ObjectProperty')">🔗 Add Relationship</button>
                </div>
              </div>

              <div class="props-table-wrap" *ngIf="newSubclassProps.length > 0" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
                <table class="data-table" style="font-size: 11px;">
                  <thead>
                    <tr>
                      <th>Property Name</th>
                      <th>Type</th>
                      <th>Range / Target</th>
                      <th>Inverse Rel</th>
                      <th style="text-align: center; width: 45px;">🔑 PK</th>
                      <th style="width: 30px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let p of newSubclassProps; let i = index">
                      <td><input type="text" [(ngModel)]="p.name" placeholder="propName" style="padding: 4px 6px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;" class="font-mono" /></td>
                      <td>
                        <select [(ngModel)]="p.property_type" (change)="onSubclassPropTypeChanged(p)" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px; width: 100%;">
                          <option value="DatatypeProperty">📊 Datatype</option>
                          <option value="ObjectProperty">🔗 Object</option>
                        </select>
                      </td>
                      <td>
                        <select *ngIf="p.property_type === 'ObjectProperty'" [(ngModel)]="p.range" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px; width: 100%;">
                          <option *ngFor="let cls of availableSuperclasses" [value]="cls">{{ cls }}</option>
                        </select>
                        <select *ngIf="p.property_type === 'DatatypeProperty'" [(ngModel)]="p.range" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px; width: 100%;">
                          <option value="xsd:string">xsd:string</option>
                          <option value="xsd:integer">xsd:integer</option>
                          <option value="xsd:decimal">xsd:decimal</option>
                          <option value="xsd:dateTime">xsd:dateTime</option>
                          <option value="xsd:boolean">xsd:boolean</option>
                        </select>
                      </td>
                      <td>
                        <input type="text" [(ngModel)]="p.inverse_property" [disabled]="p.property_type !== 'ObjectProperty'" placeholder="invRel" style="padding: 4px 6px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;" class="font-mono" />
                      </td>
                      <td style="text-align: center;">
                        <input type="checkbox" [(ngModel)]="p.is_primary_key" [disabled]="p.property_type === 'ObjectProperty'" style="cursor: pointer;" title="Mark as Primary Key (owl:hasKey)" />
                      </td>
                      <td style="text-align: center;">
                        <button style="background: transparent; border: none; color: var(--accent-rose); cursor: pointer;" (click)="removeSubclassPropRow(i)">🗑️</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="modal-actions flex-between" style="margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--border-color);">
              <button class="btn-secondary" (click)="closeCreateClassModal()">Cancel</button>
              <button class="btn-primary glow-btn" (click)="submitCreateClass()">✨ Create Class in Graphical Ontology</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .viewer-container { display: flex; flex-direction: column; gap: 20px; }
    .header-card { padding: 20px 24px; }
    .title-row { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; flex-wrap: wrap; }
    .sandbox-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px;
      border-radius: 20px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    .subtitle { color: var(--text-secondary); font-size: 13px; margin: 0; line-height: 1.4; }
    .header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet));
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s ease;
    }
    .btn-primary:hover { opacity: 0.95; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(6, 182, 212, 0.3); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .btn-secondary {
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s ease;
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.08); }
    .btn-sm {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
    }
    .glow-btn {
      box-shadow: 0 0 16px rgba(6, 182, 212, 0.35);
    }

    /* Upload Section */
    .upload-section { padding: 20px; transition: all 0.3s ease; }
    .upload-section.collapsed { padding: 12px 20px; }
    .section-header { cursor: pointer; user-select: none; }
    .section-header h3 { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 10px; margin: 0; }
    .collapse-hint { font-size: 12px; font-weight: 400; color: var(--text-secondary); }
    .upload-body { margin-top: 16px; display: flex; flex-direction: column; gap: 16px; }

    /* Presets Bar */
    .presets-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(15, 23, 42, 0.6);
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      flex-wrap: wrap;
    }
    .preset-label { font-size: 12px; font-weight: 600; color: var(--accent-cyan); }
    .preset-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .preset-chip {
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.3);
      color: #c4b5fd;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .preset-chip:hover {
      background: rgba(139, 92, 246, 0.3);
      color: white;
      transform: translateY(-1px);
    }

    /* Ingestion Grid */
    .ingestion-grid {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: 16px;
    }
    .dropzone {
      border: 2px dashed rgba(6, 182, 212, 0.35);
      background: rgba(15, 23, 42, 0.5);
      border-radius: 10px;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 220px;
    }
    .dropzone:hover, .dropzone.drag-over {
      border-color: var(--accent-cyan);
      background: rgba(6, 182, 212, 0.08);
      transform: scale(1.01);
    }
    .dropzone-content { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .dropzone-icon { font-size: 38px; }
    .dropzone-title { font-size: 15px; color: var(--text-primary); }
    .dropzone-sub { font-size: 12px; color: var(--text-secondary); margin: 0; }
    .format-tags {
      font-size: 10px;
      letter-spacing: 0.5px;
      color: var(--accent-cyan);
      background: rgba(6, 182, 212, 0.1);
      padding: 3px 8px;
      border-radius: 4px;
      margin-top: 4px;
    }

    .editor-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 12px 16px;
    }
    .editor-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .format-select-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); }
    .format-dropdown, .layout-dropdown {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
    }
    .raw-textarea {
      width: 100%;
      height: 160px;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 10px;
      color: #e2e8f0;
      font-size: 12px;
      resize: vertical;
      outline: none;
    }
    .raw-textarea:focus { border-color: var(--accent-cyan); }

    .action-bar {
      background: rgba(15, 23, 42, 0.6);
      padding: 12px 18px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }
    .error-text { color: var(--accent-rose); font-size: 13px; font-weight: 500; }
    .ready-text { color: var(--accent-emerald); font-size: 13px; }
    .btn-group { display: flex; gap: 10px; }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .metric-card { padding: 16px; display: flex; flex-direction: column; gap: 6px; }
    .metric-header { display: flex; justify-content: space-between; align-items: center; }
    .metric-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.5px; }
    .metric-icon { font-size: 16px; }
    .metric-val { font-size: 22px; font-weight: 700; line-height: 1.2; }
    .metric-sub { font-size: 11px; color: var(--text-secondary); }
    .badge-format { background: rgba(244, 63, 94, 0.15); color: var(--accent-rose); padding: 2px 6px; border-radius: 4px; }
    .text-cyan { color: var(--accent-cyan); }
    .text-violet { color: var(--accent-violet); }
    .text-emerald { color: var(--accent-emerald); }
    .text-amber { color: var(--accent-amber); }
    .text-rose { color: var(--accent-rose); }
    .font-mono { font-family: var(--font-mono); }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* View Tabs Bar */
    .view-tabs-bar {
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .tabs-group { display: flex; gap: 6px; flex-wrap: wrap; }
    .view-tab-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .view-tab-btn:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-primary); }
    .view-tab-btn.active {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2));
      color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.35);
      font-weight: 600;
    }
    .search-input {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      width: 240px;
      outline: none;
    }
    .search-input:focus { border-color: var(--accent-cyan); }

    /* Graph Tab */
    .graph-pane { padding: 0; overflow: hidden; }
    .graph-toolbar {
      background: var(--bg-secondary);
      padding: 12px 18px;
      border-bottom: 1px solid var(--border-color);
    }
    .toolbar-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-right: 12px; }
    .node-count-badge { font-size: 12px; color: var(--text-secondary); }
    .node-count-badge strong { color: var(--accent-cyan); }
    .toolbar-right { display: flex; align-items: center; gap: 8px; }
    .layout-selector { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
    .btn-icon {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-icon:hover { background: rgba(255, 255, 255, 0.1); }

    .graph-layout-container { position: relative; height: 600px; width: 100%; background: #0b1120; }
    .cy-canvas { width: 100%; height: 100%; }

    /* Inspector Drawer */
    .inspector-drawer {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 320px;
      max-height: 560px;
      overflow-y: auto;
      z-index: 10;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(6, 182, 212, 0.3);
      padding: 16px;
    }
    .drawer-header { border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 12px; }
    .drawer-type-tag { font-size: 10px; font-weight: 700; color: var(--accent-violet); background: rgba(139, 92, 246, 0.15); padding: 2px 6px; border-radius: 4px; }
    .drawer-node-title { font-size: 16px; font-weight: 700; color: var(--accent-cyan); margin: 4px 0 0 0; }
    .btn-close { background: transparent; border: none; color: var(--text-secondary); font-size: 16px; cursor: pointer; }
    .drawer-body { display: flex; flex-direction: column; gap: 12px; }
    .info-row { display: flex; flex-direction: column; gap: 2px; }
    .info-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); }
    .info-val { font-size: 12px; color: var(--text-primary); }
    .pk-badge-group { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px; }
    .pk-badge { font-size: 11px; background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); padding: 2px 6px; border-radius: 4px; }

    .drawer-section { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 10px; }
    .drawer-section h5 { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
    .attr-table { display: flex; flex-direction: column; gap: 4px; }
    .attr-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: rgba(255, 255, 255, 0.03); padding: 4px 8px; border-radius: 4px; }
    .attr-name { color: var(--accent-cyan); }
    .attr-range { color: var(--accent-emerald); font-size: 10px; }
    .rel-list { display: flex; flex-direction: column; gap: 6px; }
    .rel-item { background: rgba(255, 255, 255, 0.03); padding: 6px 8px; border-radius: 4px; display: flex; flex-direction: column; gap: 2px; font-size: 11px; }
    .rel-dir { display: flex; align-items: center; gap: 6px; }
    .badge-dir { font-size: 9px; font-weight: 700; background: rgba(255, 255, 255, 0.1); padding: 1px 4px; border-radius: 3px; color: var(--text-secondary); }
    .badge-dir.outgoing { background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); }
    .empty-state-sm { font-size: 11px; color: var(--text-secondary); font-style: italic; }

    /* Classes Matrix */
    .class-card { display: flex; flex-direction: column; gap: 12px; }
    .class-title { font-size: 16px; font-weight: 700; color: var(--accent-cyan); margin: 0; }
    .class-iri { font-size: 11px; color: var(--text-secondary); display: block; word-break: break-all; margin-top: 2px; }
    .domain-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: rgba(139, 92, 246, 0.15); color: var(--accent-violet); }
    .domain-badge.lookup { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); }
    .domain-badge.fact { background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); }
    .class-comment { font-size: 12px; color: var(--text-primary); margin: 0; line-height: 1.4; }
    .hierarchy-row, .pk-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .subclass-label, .pk-label, .props-title { font-size: 11px; font-weight: 600; color: var(--text-secondary); }
    .chips-wrap { display: flex; gap: 6px; flex-wrap: wrap; }
    .subclass-chip { font-size: 11px; background: rgba(6, 182, 212, 0.12); color: #67e8f9; padding: 2px 6px; border-radius: 4px; }
    .pk-chip { font-size: 11px; background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); padding: 2px 6px; border-radius: 4px; }
    .class-props-section { border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
    .props-mini-list { display: flex; flex-direction: column; gap: 4px; max-height: 140px; overflow-y: auto; }
    .mini-prop-item { background: var(--bg-primary); padding: 4px 8px; border-radius: 4px; font-size: 11px; }
    .mini-prop-name { color: var(--accent-cyan); }
    .mini-prop-name.obj { color: var(--accent-violet); }
    .mini-prop-tag { color: var(--text-secondary); font-size: 10px; }

    /* Properties Table */
    .prop-filter-chips { margin-bottom: 12px; }
    .chips-group { display: flex; gap: 8px; }
    .filter-btn {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }
    .filter-btn.active {
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent-cyan);
      border-color: var(--accent-cyan);
      font-weight: 600;
    }
    .table-container { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .data-table th { background: rgba(15, 23, 42, 0.6); color: var(--text-secondary); font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
    .data-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); vertical-align: top; }
    .prop-id-cell { display: flex; flex-direction: column; gap: 2px; }
    .prop-full-iri { font-size: 10px; color: var(--text-secondary); word-break: break-all; }
    .prop-type-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); }
    .prop-type-badge.obj-badge { background: rgba(139, 92, 246, 0.15); color: var(--accent-violet); }
    .pk-badge-sm { font-size: 10px; background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); padding: 1px 4px; border-radius: 3px; margin-left: 4px; }
    .inverse-tag { font-size: 11px; background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); padding: 2px 6px; border-radius: 4px; display: inline-block; }
    .comment-cell { color: var(--text-secondary); font-size: 11px; line-height: 1.4; }

    /* Source Preview */
    .source-header { margin-bottom: 12px; }
    .source-header h4 { font-size: 15px; font-weight: 600; margin: 0 0 4px 0; color: var(--accent-cyan); }
    .code-block {
      background: #090d16;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      max-height: 500px;
      overflow-y: auto;
      font-size: 12px;
      line-height: 1.5;
      color: #93c5fd;
    }
    .empty-state-card { text-align: center; padding: 32px; color: var(--text-secondary); }

    /* Toast Notification */
    .toast-notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #0284c7, #4f46e5);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      z-index: 9999;
      animation: slideInToast 0.3s ease-out;
    }
    @keyframes slideInToast {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .toast-icon { font-size: 18px; }

    /* Canvas Quick Hint */
    .canvas-quick-hint {
      position: absolute;
      bottom: 14px;
      left: 14px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      color: var(--text-secondary);
      pointer-events: none;
      z-index: 5;
    }
    .canvas-quick-hint strong { color: var(--accent-cyan); }

    /* Class Type Toggle in Modal */
    .class-type-toggle-row {
      display: flex;
      gap: 10px;
      background: rgba(15, 23, 42, 0.5);
      padding: 6px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }
    .toggle-option {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .toggle-option:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.04); }
    .toggle-option.active {
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.3);
    }
    .toggle-radio {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid var(--text-secondary);
      display: inline-block;
    }
    .toggle-option.active .toggle-radio {
      border-color: var(--accent-cyan);
      background: var(--accent-cyan);
    }
  `]
})
export class OntologyViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cyContainer') cyContainerRef!: ElementRef;

  isDragging = false;
  isUploadCollapsed = false;
  isLoading = false;
  errorMessage: string | null = null;
  isCopied = false;

  selectedFile: File | null = null;
  rawTextContent: string = '';
  formatHint: string = 'auto';

  parsedData: any = null;
  activeViewTab: 'graph' | 'classes' | 'properties' | 'source' = 'graph';
  graphLayout: string = 'cose';
  searchQuery: string = '';
  propertyFilter: 'all' | 'datatype' | 'object' = 'all';

  cyInstance: Core | null = null;
  selectedGraphNode: any = null;

  presets: PresetOption[] = [
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

  constructor(private apiService: ApiService) {}

  ngAfterViewInit() {
    // Starts with clean, ready-to-ingest sandbox
  }

  ngOnDestroy() {
    this.resetViewer();
  }

  loadPreset(preset: PresetOption) {
    this.rawTextContent = preset.content;
    this.formatHint = preset.format;
    this.selectedFile = null;
    this.parseAndVisualize();
  }

  toggleUploadCollapse() {
    this.isUploadCollapsed = !this.isUploadCollapsed;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
      this.errorMessage = null;
      this.parseAndVisualize();
    }
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
      this.errorMessage = null;
      this.parseAndVisualize();
    }
  }

  clearInputs() {
    this.selectedFile = null;
    this.rawTextContent = '';
    this.formatHint = 'auto';
    this.errorMessage = null;
  }

  resetViewer() {
    this.parsedData = null;
    this.isUploadCollapsed = false;
    this.selectedGraphNode = null;
    this.clearInputs();
    if (this.cyInstance) {
      this.cyInstance.destroy();
      this.cyInstance = null;
    }
  }

  parseAndVisualize() {
    this.errorMessage = null;
    this.isLoading = true;

    if (this.selectedFile) {
      this.apiService.uploadOntologyPreview(this.selectedFile, this.formatHint).subscribe({
        next: (res) => {
          this.handleParseSuccess(res);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.detail || err?.message || 'Failed to parse uploaded ontology file.';
        }
      });
    } else if (this.rawTextContent && this.rawTextContent.trim()) {
      this.apiService.parseOntologyPreview({
        raw_content: this.rawTextContent,
        filename: 'manual_input.ttl',
        format_hint: this.formatHint
      }).subscribe({
        next: (res) => {
          this.handleParseSuccess(res);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.detail || err?.message || 'Failed to parse ontology text content.';
        }
      });
    } else {
      this.isLoading = false;
      this.errorMessage = 'Please select an ontology file or paste RDF/Turtle text content.';
    }
  }

  private handleParseSuccess(data: any) {
    this.parsedData = data;
    this.isLoading = false;
    this.isUploadCollapsed = true;
    this.selectedGraphNode = null;

    setTimeout(() => {
      if (this.activeViewTab === 'graph') {
        this.initCytoscape();
      }
    }, 100);
  }

  switchViewTab(tab: 'graph' | 'classes' | 'properties' | 'source') {
    this.activeViewTab = tab;
    if (tab === 'graph') {
      setTimeout(() => {
        if (!this.cyInstance) {
          this.initCytoscape();
        } else {
          this.cyInstance.resize();
          this.cyInstance.fit();
        }
      }, 50);
    }
  }

  get filteredClasses(): any[] {
    if (!this.parsedData || !this.parsedData.classes) return [];
    if (!this.searchQuery.trim()) return this.parsedData.classes;
    const q = this.searchQuery.toLowerCase();
    return this.parsedData.classes.filter((c: any) =>
      (c.label && c.label.toLowerCase().includes(q)) ||
      (c.iri && c.iri.toLowerCase().includes(q)) ||
      (c.comment && c.comment.toLowerCase().includes(q))
    );
  }

  get filteredProperties(): any[] {
    if (!this.parsedData || !this.parsedData.properties) return [];
    let props = this.parsedData.properties;
    if (this.propertyFilter === 'datatype') {
      props = props.filter((p: any) => p.property_type === 'DatatypeProperty');
    } else if (this.propertyFilter === 'object') {
      props = props.filter((p: any) => p.property_type === 'ObjectProperty');
    }
    if (!this.searchQuery.trim()) return props;
    const q = this.searchQuery.toLowerCase();
    return props.filter((p: any) =>
      (p.label && p.label.toLowerCase().includes(q)) ||
      (p.parent_class && p.parent_class.toLowerCase().includes(q)) ||
      (p.target_class && p.target_class.toLowerCase().includes(q)) ||
      (p.range && p.range.toLowerCase().includes(q)) ||
      (p.comment && p.comment.toLowerCase().includes(q))
    );
  }

  getClassProperties(className: string): any[] {
    if (!this.parsedData || !this.parsedData.properties) return [];
    return this.parsedData.properties.filter((p: any) => p.parent_class === className);
  }

  getNodeEdges(nodeId: string): any[] {
    if (!this.parsedData?.graph?.edges) return [];
    return this.parsedData.graph.edges.filter((e: any) => e.source === nodeId || e.target === nodeId);
  }

  // SVG Vector Card Generators for Circular Node Alignment
  private generateBaseClassCardSvg(label: string, width: number, height: number): string {
    const cornerRadius = (height - 3) / 2;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#f8fafc" stroke="#475569" stroke-width="1.8" stroke-dasharray="4,2" />
        <circle cx="18" cy="${height / 2}" r="6" fill="#334155" />
        <text x="32" y="${height / 2 + 5}" font-family="Inter, -apple-system, sans-serif" font-size="13.5" font-weight="700" fill="#1e293b">
          🏛️ ${label}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,` + encodeURIComponent(svg.trim());
  }

  private generateOntologyClassCardSvg(label: string, domainType: string, width: number, height: number): string {
    let accentColor = '#0284c7';
    if (domainType === 'Fact') { accentColor = '#4338ca'; }
    else if (domainType === 'Lookup') { accentColor = '#d97706'; }
    else if (domainType === 'SCD') { accentColor = '#059669'; }
    else if (domainType === 'Dimension') { accentColor = '#0284c7'; }

    const cornerRadius = (height - 3) / 2;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#ffffff" stroke="${accentColor}" stroke-width="1.8" />
        <circle cx="18" cy="${height / 2}" r="6" fill="${accentColor}" />
        <text x="32" y="${height / 2 + 5}" font-family="Inter, -apple-system, sans-serif" font-size="13.5" font-weight="600" fill="#0f172a">
          ${label}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,` + encodeURIComponent(svg.trim());
  }

  // Cytoscape Graph Rendering
  private initCytoscape() {
    if (!this.cyContainerRef || !this.parsedData?.graph) return;

    if (this.cyInstance) {
      this.cyInstance.destroy();
      this.cyInstance = null;
    }

    const elements: any[] = [];
    const validClassMap = new Map<string, string>();

    // 1. Root Base Class Node: owl:Thing
    const rootIri = 'http://www.w3.org/2002/07/owl#Thing';
    validClassMap.set('owl:Thing', rootIri);
    validClassMap.set('owl:thing', rootIri);
    validClassMap.set('Thing', rootIri);
    validClassMap.set(rootIri, rootIri);

    const rootWidth = 140;
    const rootHeight = 46;
    const rootSvg = this.generateBaseClassCardSvg('owl:Thing', rootWidth, rootHeight);

    elements.push({
      group: 'nodes',
      data: {
        id: rootIri,
        label: 'owl:Thing',
        domainType: 'Base Class',
        cardWidth: rootWidth,
        cardHeight: rootHeight,
        svgCard: rootSvg,
        nodeType: 'ontologyClass',
        isRoot: true,
        rawNode: { id: rootIri, label: 'owl:Thing', comment: 'Universal Top-Level Base Class in W3C OWL 2.0' }
      },
      position: { x: 500, y: 60 }
    });

    const classes = this.parsedData.classes || [];
    classes.forEach((c: any) => {
      const lbl = c.label || c.name || 'Class';
      validClassMap.set(c.iri || c.id, c.iri || c.id);
      validClassMap.set(lbl, c.iri || c.id);
      validClassMap.set(lbl.toLowerCase(), c.iri || c.id);
    });

    const rawNodes = this.parsedData.graph.nodes || [];
    rawNodes.forEach((n: any) => {
      if (n.id !== rootIri && n.label !== 'owl:Thing' && n.label !== 'Thing') {
        validClassMap.set(n.id, n.id);
        validClassMap.set(n.label, n.id);
      }
    });

    // 2. Class Card Nodes
    rawNodes.forEach((n: any) => {
      if (n.id === rootIri || n.label === 'owl:Thing' || n.label === 'Thing') return;

      const label = n.label || n.id;
      const domainType = n.domain_type || n.type || 'Dimension';
      const cardWidth = Math.max(140, label.length * 9.5 + 44);
      const cardHeight = 46;
      const svgUri = this.generateOntologyClassCardSvg(label, domainType, cardWidth, cardHeight);

      elements.push({
        group: 'nodes',
        data: {
          id: n.id,
          label: label,
          nodeType: 'ontologyClass',
          domainType: domainType,
          cardWidth: cardWidth,
          cardHeight: cardHeight,
          svgCard: svgUri,
          rawNode: n
        }
      });
    });

    // 3. Edges
    const addedEdgeKeys = new Set<string>();
    const rawEdges = this.parsedData.graph.edges || [];

    rawEdges.forEach((e: any) => {
      const src = validClassMap.get(e.source) || e.source;
      const tgt = validClassMap.get(e.target) || e.target;

      if (src && tgt && src !== tgt) {
        const edgeKey = `${src}->${tgt}:${e.label}`;
        if (!addedEdgeKeys.has(edgeKey)) {
          addedEdgeKeys.add(edgeKey);
          const isSubclass = (e.type === 'subClassOf' || e.label === 'subClassOf');
          elements.push({
            group: 'edges',
            data: {
              id: e.id || `edge_${edgeKey}`,
              source: src,
              target: tgt,
              label: isSubclass ? '' : (e.label || 'relatesTo'),
              edgeType: isSubclass ? 'SubClassOf' : 'ObjectProperty',
              rawEdge: e
            }
          });
        }
      }
    });

    // Ensure SubClassOf edges connect top-level concepts to root owl:Thing
    classes.forEach((c: any) => {
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

    // Filter elements to ensure valid source and target nodes exist
    const validNodeIds = new Set(elements.filter(e => e.group === 'nodes').map(e => e.data.id));
    const sanitizedElements = elements.filter(e => {
      if (e.group === 'nodes') return true;
      return validNodeIds.has(e.data.source) && validNodeIds.has(e.data.target);
    });

    const cytoscapeStyles: any[] = [
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
          'overlay-opacity': 0
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': '2.5px',
          'border-color': '#0284c7',
          'border-opacity': 1,
          'shadow-blur': 16,
          'shadow-color': 'rgba(2, 132, 199, 0.4)'
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
          'text-border-opacity': 0.8
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
    ];

    this.cyInstance = cytoscape({
      container: this.cyContainerRef.nativeElement,
      elements: sanitizedElements,
      style: cytoscapeStyles,
      layout: {
        name: this.graphLayout || 'breadthfirst',
        directed: true,
        padding: 50
      } as any
    });

    this.cyInstance.on('tap', 'node', (evt) => {
      const node = evt.target;
      this.selectedGraphNode = node.data('rawNode');
    });

    this.cyInstance.on('tap', (evt) => {
      if (evt.target === this.cyInstance) {
        this.selectedGraphNode = null;
      }
    });

    // Double tap on empty canvas opens Create Class Modal
    this.cyInstance.on('dbltap', (evt) => {
      if (evt.target === this.cyInstance) {
        this.openCreateClassModal();
      }
    });

    // Auto-select first node if available
    if (this.parsedData.graph.nodes.length > 0) {
      this.selectedGraphNode = this.parsedData.graph.nodes[0];
    }
  }

  applyLayout() {
    if (!this.cyInstance) return;
    this.cyInstance.layout({
      name: this.graphLayout,
      animate: true,
      animationDuration: 500,
      padding: 50
    } as any).run();
  }

  reRenderGraph() {
    this.applyLayout();
    this.fitGraph();
  }

  zoomIn() {
    if (!this.cyInstance) return;
    this.cyInstance.zoom(this.cyInstance.zoom() * 1.25);
  }

  zoomOut() {
    if (!this.cyInstance) return;
    this.cyInstance.zoom(this.cyInstance.zoom() * 0.8);
  }

  fitGraph() {
    if (!this.cyInstance) return;
    this.cyInstance.fit(undefined, 40);
  }

  copySourceToClipboard() {
    if (!this.parsedData?.turtle_preview) return;
    navigator.clipboard.writeText(this.parsedData.turtle_preview).then(() => {
      this.isCopied = true;
      setTimeout(() => this.isCopied = false, 2000);
    });
  }

  downloadTurtle() {
    if (!this.parsedData?.turtle_preview) return;
    const blob = new Blob([this.parsedData.turtle_preview], { type: 'text/turtle' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(this.parsedData.ontology_name || 'ontology').replace(/\s+/g, '_').toLowerCase()}.ttl`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ==========================================
  // Class & Subclass Creation in Graphical Ontology
  // ==========================================

  toastMessage: string | null = null;
  private toastTimer: any = null;

  showToast(msg: string) {
    this.toastMessage = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = null;
    }, 3500);
  }

  isSubclassModalOpen = false;
  newSubclassLabel = '';
  newSubclassParent = 'owl:Thing';
  newSubclassDomain = 'Dimension';
  newSubclassComment = '';
  newSubclassProps: any[] = [];

  get availableSuperclasses(): string[] {
    const list = ['owl:Thing'];
    if (this.parsedData?.classes) {
      this.parsedData.classes.forEach((c: any) => {
        if (c.label && c.label !== 'owl:Thing' && !list.includes(c.label)) {
          list.push(c.label);
        }
      });
    }
    return list;
  }

  openCreateClassModal(parentClassLabel?: string) {
    if (!this.parsedData) return;
    this.newSubclassLabel = '';
    this.newSubclassDomain = 'Dimension';
    this.newSubclassComment = '';
    this.newSubclassProps = [
      { name: 'code', property_type: 'DatatypeProperty', range: 'xsd:string', inverse_property: '', is_primary_key: true }
    ];
    if (parentClassLabel && this.availableSuperclasses.includes(parentClassLabel)) {
      this.newSubclassParent = parentClassLabel;
    } else {
      this.newSubclassParent = 'owl:Thing';
    }
    this.isSubclassModalOpen = true;
  }

  closeCreateClassModal() {
    this.isSubclassModalOpen = false;
  }

  // Backwards compatibility aliases
  openSubclassModal(parentClassLabel?: string) {
    this.openCreateClassModal(parentClassLabel);
  }

  closeSubclassModal() {
    this.closeCreateClassModal();
  }

  addSubclassPropRow(propType: 'DatatypeProperty' | 'ObjectProperty' = 'DatatypeProperty') {
    const isObj = propType === 'ObjectProperty';
    const defaultRange = isObj ? (this.availableSuperclasses[1] || 'TargetClass') : 'xsd:string';
    this.newSubclassProps.push({
      name: isObj ? 'relatesTo' : 'attrName',
      property_type: propType,
      range: defaultRange,
      inverse_property: '',
      is_primary_key: false
    });
  }

  removeSubclassPropRow(idx: number) {
    this.newSubclassProps.splice(idx, 1);
  }

  onSubclassPropTypeChanged(p: any) {
    if (p.property_type === 'ObjectProperty') {
      p.range = this.availableSuperclasses[1] || 'TargetClass';
      p.is_primary_key = false;
    } else {
      p.range = 'xsd:string';
      p.inverse_property = '';
    }
  }

  submitCreateClass() {
    if (!this.parsedData) return;
    const rawLabel = (this.newSubclassLabel || '').trim();
    if (!rawLabel) {
      alert('Class name / label is required.');
      return;
    }
    const cleanLabel = rawLabel.replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleanLabel) {
      alert('Class name must contain valid alphanumeric characters.');
      return;
    }
    if (this.parsedData.classes.some((c: any) => c.label.toLowerCase() === cleanLabel.toLowerCase())) {
      alert(`A class named "${cleanLabel}" already exists in the ontology.`);
      return;
    }

    const baseIri = this.parsedData.base_iri || 'http://uploaded.ontology/schema#';
    const classIri = `${baseIri}${cleanLabel}`;
    const comment = (this.newSubclassComment || '').trim() || `Class representing ${cleanLabel}`;
    const parent = this.newSubclassParent || 'owl:Thing';
    const pks = this.newSubclassProps.filter((p: any) => p.is_primary_key && p.property_type === 'DatatypeProperty').map((p: any) => p.name);

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
        domain_type: this.newSubclassDomain,
        table_name: cleanLabel,
        primary_keys: pks,
        is_uploaded: true,
        is_custom_class: true
      }
    };

    const newProps: any[] = [];
    this.newSubclassProps.forEach((p: any) => {
      const pName = (p.name || '').trim().replace(/[^a-zA-Z0-9_]/g, '');
      if (pName) {
        const isObj = p.property_type === 'ObjectProperty';
        newProps.push({
          id: `${baseIri}${pName}`,
          iri: `${baseIri}${pName}`,
          name: pName,
          label: pName,
          relationship_name: isObj ? pName : null,
          property_type: p.property_type,
          range: p.range || (isObj ? 'TargetClass' : 'xsd:string'),
          domain: classIri,
          parent_class: cleanLabel,
          target_class: isObj ? p.range : null,
          inverse_property: isObj ? (p.inverse_property || null) : null,
          is_inverse: false,
          is_primary_key: p.is_primary_key && !isObj,
          table_name: cleanLabel,
          comment: `${p.property_type} for ${cleanLabel}`
        });
      }
    });

    this.parsedData.classes.push(newClassObj);
    this.parsedData.classes.sort((a: any, b: any) => a.label.localeCompare(b.label));

    if (!this.parsedData.properties) this.parsedData.properties = [];
    newProps.forEach((p: any) => this.parsedData.properties.push(p));

    // Graph elements
    if (!this.parsedData.graph) {
      this.parsedData.graph = { nodes: [], edges: [], node_count: 0, edge_count: 0 };
    }

    const classAttrs = newProps.filter((p: any) => p.property_type === 'DatatypeProperty').map((p: any) => ({
      name: p.name,
      range: p.range,
      is_primary_key: p.is_primary_key
    }));

    const graphNode = {
      id: cleanLabel,
      label: cleanLabel,
      type: 'Class',
      iri: classIri,
      domain_type: this.newSubclassDomain,
      comment: comment,
      primary_keys: pks,
      attributes: classAttrs,
      properties: {
        type: 'Class',
        domain_type: this.newSubclassDomain,
        subclass_of: [parent],
        comment: comment
      }
    };
    this.parsedData.graph.nodes.push(graphNode);

    if (parent && parent !== 'owl:Thing') {
      this.parsedData.graph.edges.push({
        id: `sub_${cleanLabel}_${parent}`,
        source: cleanLabel,
        target: parent,
        label: 'subClassOf',
        type: 'subClassOf',
        relationship_type: 'INHERITANCE'
      });
    }

    newProps.filter((p: any) => p.property_type === 'ObjectProperty').forEach((p: any) => {
      if (p.target_class) {
        this.parsedData.graph.edges.push({
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

    this.parsedData.graph.node_count = this.parsedData.graph.nodes.length;
    this.parsedData.graph.edge_count = this.parsedData.graph.edges.length;

    // Turtle
    let turtleAddition = `\n# --- Custom Class: ${cleanLabel} ---\n`;
    const parentRef = parent === 'owl:Thing' ? 'owl:Thing' : (parent.includes(':') ? parent : `:${parent}`);
    turtleAddition += `:${cleanLabel} a owl:Class ;\n`;
    turtleAddition += `    rdfs:label "${cleanLabel}" ;\n`;
    turtleAddition += `    rdfs:subClassOf ${parentRef} ;\n`;
    turtleAddition += `    rdfs:comment "${comment.replace(/"/g, '\\"')}" .\n`;

    newProps.forEach((p: any) => {
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

    if (this.parsedData.turtle_preview) {
      this.parsedData.turtle_preview += turtleAddition;
    } else {
      this.parsedData.turtle_preview = turtleAddition;
    }

    // Stats
    if (!this.parsedData.stats) {
      this.parsedData.stats = { classes_count: 0, datatype_properties_count: 0, object_properties_count: 0, total_triples_count: 0 };
    }
    this.parsedData.stats.classes_count = this.parsedData.classes.length;
    this.parsedData.stats.datatype_properties_count += newProps.filter((p: any) => p.property_type === 'DatatypeProperty').length;
    this.parsedData.stats.object_properties_count += newProps.filter((p: any) => p.property_type === 'ObjectProperty').length;
    this.parsedData.stats.total_triples_count += (4 + newProps.length * 4);

    this.closeCreateClassModal();
    this.showToast(`✨ Class "${cleanLabel}" created and rendered in Graphical Ontology!`);

    if (this.activeViewTab === 'graph') {
      this.initCytoscape();
      setTimeout(() => {
        this.selectedGraphNode = graphNode;
        const cyNode = this.cyInstance?.$(`#${cleanLabel}`);
        if (cyNode && cyNode.length > 0) {
          this.cyInstance?.animate({
            center: { eles: cyNode },
            zoom: 1.4,
            duration: 500
          });
          cyNode.select();
        }
      }, 150);
    }
  }

  submitCreateSubclass() {
    this.submitCreateClass();
  }
}
