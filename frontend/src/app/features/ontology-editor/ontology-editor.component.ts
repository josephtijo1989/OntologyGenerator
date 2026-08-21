import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import cytoscape, { Core } from 'cytoscape';

@Component({
  selector: 'app-ontology-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ontology-container">
      <!-- Toast Notification -->
      <div class="toast-notification" *ngIf="toastMessage">
        <span class="toast-icon">✨</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>

      <!-- Header Section -->
      <div class="header-card glass-card">
        <div class="flex-between">
          <div>
            <div class="title-row">
              <h2>Enterprise OWL 2.0 Semantic Ontology Studio</h2>
              <span class="persisted-badge">💾 Database Persisted Project Model</span>
            </div>
            <p class="subtitle">
              Visual W3C OWL/RDF knowledge graph modeler, ontology class creator, automated inverse relationships, and serialization suite.
            </p>
          </div>
          <div class="header-actions">
            <button class="btn-primary glow-btn" (click)="openCreateClassModal()">
              ➕ Create Class
            </button>
            <button class="btn-secondary" (click)="loadOntology()" [disabled]="isLoading">
              🔄 Refresh Model
            </button>
            <div class="dropdown-group">
              <button class="btn-secondary" (click)="exportFormat('turtle')">📥 Export Turtle (.ttl)</button>
              <button class="btn-secondary" (click)="exportFormat('xml')">📥 Export OWL/XML</button>
              <button class="btn-secondary" (click)="exportFormat('json-ld')">📥 Export JSON-LD</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content when Ontology Loaded -->
      <div *ngIf="ontology" class="content-wrapper">
        <!-- Metrics Stats Cards Bar -->
        <div class="metrics-grid">
          <div class="metric-card glass-card">
            <div class="metric-header">
              <span class="metric-label">ONTOLOGY NAME</span>
              <span class="metric-icon">🧠</span>
            </div>
            <div class="metric-val text-cyan truncate" [title]="ontology.ontology_name">
              {{ ontology.ontology_name || 'EnterpriseOntology' }}
            </div>
            <div class="metric-sub truncate" [title]="ontology.base_iri">{{ ontology.base_iri }}</div>
          </div>

          <div class="metric-card glass-card">
            <div class="metric-header">
              <span class="metric-label">OWL CLASSES</span>
              <span class="metric-icon">🏛️</span>
            </div>
            <div class="metric-val text-violet font-mono">
              {{ ontology.stats?.classes_count || ontology.classes?.length || 0 }}
            </div>
            <div class="metric-sub">Semantic entities mapped</div>
          </div>

          <div class="metric-card glass-card">
            <div class="metric-header">
              <span class="metric-label">DATATYPE ATTRIBUTES</span>
              <span class="metric-icon">📊</span>
            </div>
            <div class="metric-val text-emerald font-mono">
              {{ ontology.stats?.datatype_properties_count || datatypePropertiesCount }}
            </div>
            <div class="metric-sub">Scalar fields (XSD typed)</div>
          </div>

          <div class="metric-card glass-card">
            <div class="metric-header">
              <span class="metric-label">OBJECT RELATIONSHIPS</span>
              <span class="metric-icon">🔗</span>
            </div>
            <div class="metric-val text-amber font-mono">
              {{ ontology.stats?.object_properties_count || objectPropertiesCount }}
            </div>
            <div class="metric-sub">Domain &rarr; Range edges</div>
          </div>

          <div class="metric-card glass-card">
            <div class="metric-header">
              <span class="metric-label">TRIPLES & AXIOMS</span>
              <span class="metric-icon">📜</span>
            </div>
            <div class="metric-val text-rose font-mono">
              {{ ontology.stats?.total_triples_count || (ontology.classes?.length * 4 + ontology.properties?.length * 3) }}
            </div>
            <div class="metric-sub">W3C OWL 2.0 Axioms</div>
          </div>
        </div>

        <!-- View Tabs Bar -->
        <div class="view-tabs-bar glass-card">
          <div class="tabs-group">
            <button
              class="view-tab-btn"
              [class.active]="activeViewTab === 'graph'"
              (click)="switchViewTab('graph')">
              🕸️ Graphical Knowledge Graph
            </button>
            <button
              class="view-tab-btn"
              [class.active]="activeViewTab === 'classes'"
              (click)="switchViewTab('classes')">
              🏛️ OWL Classes ({{ ontology.classes?.length || 0 }})
            </button>
            <button
              class="view-tab-btn"
              [class.active]="activeViewTab === 'properties'"
              (click)="switchViewTab('properties')">
              🔗 Properties & Relationships ({{ ontology.properties?.length || 0 }})
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
              <span class="toolbar-title">Graphical Ontology Canvas</span>
              <span class="node-count-badge">
                Nodes: <strong>{{ ontology.graph?.node_count || ontology.classes?.length || 0 }}</strong> &middot;
                Edges: <strong>{{ ontology.graph?.edge_count || 0 }}</strong>
              </span>
            </div>
            <div class="toolbar-right">
              <button class="btn-primary btn-sm glow-btn" (click)="openCreateClassModal()" title="Create New Semantic Class in Graphical Ontology">
                ➕ Create Class
              </button>
              <div class="layout-selector">
                <label>Layout:</label>
                <select [(ngModel)]="graphLayout" (change)="applyLayout()" class="layout-dropdown">
                  <option value="cose">CoSE (Force-Directed Physics)</option>
                  <option value="circle">Circle Layout</option>
                  <option value="breadthfirst">Breadth-First Hierarchy</option>
                  <option value="grid">Orthogonal Grid</option>
                  <option value="concentric">Concentric Rings</option>
                </select>
              </div>
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
              <span>💡 Double-click canvas or click <strong>➕ Create Class</strong> to add persistent classes to project ontology</span>
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
              <span style="font-size: 11px; color: var(--text-secondary); margin-left: 8px;">Persisted semantic entities and taxonomy</span>
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
                  <button class="btn-sm" style="font-size: 10px; padding: 2px 6px;" (click)="openCreateClassModal(cls.label)" title="Create Subclass of {{ cls.label }}">
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
                All Properties ({{ ontology.properties?.length || 0 }})
              </button>
              <button class="filter-btn" [class.active]="propertyFilter === 'datatype'" (click)="propertyFilter = 'datatype'">
                📊 Datatype Properties ({{ datatypePropertiesCount }})
              </button>
              <button class="filter-btn" [class.active]="propertyFilter === 'object'" (click)="propertyFilter = 'object'">
                🔗 Object Properties ({{ objectPropertiesCount }})
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
                  <th>Comment</th>
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
      </div>

      <!-- Create Class Modal Overlay -->
      <div class="modal-overlay" *ngIf="isCreateModalOpen">
        <div class="glass-card modal-box" style="width: 720px; min-width: 480px; min-height: 400px; max-width: 96vw; max-height: 94vh; overflow: auto; resize: both;">
          <div class="flex-between modal-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 14px;">
            <div>
              <h4 style="font-size: 17px; margin: 0; color: var(--accent-cyan); display: flex; align-items: center; gap: 8px;">
                <span>✨</span> Create Class in Graphical Ontology
              </h4>
              <p class="subtitle" style="margin: 2px 0 0 0; font-size: 11px;">Create a persistent semantic class (root or subclass) and persist to project database</p>
            </div>
            <button class="btn-close" (click)="closeCreateClassModal()">✕</button>
          </div>

          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- Hierarchy Type Selection Tabs -->
            <div class="class-type-toggle-row">
              <label class="toggle-option" [class.active]="newClassParent === 'owl:Thing'" (click)="newClassParent = 'owl:Thing'">
                <span class="toggle-radio"></span>
                <span>🏛️ Root OWL Class (owl:Thing)</span>
              </label>
              <label class="toggle-option" [class.active]="newClassParent !== 'owl:Thing'" (click)="newClassParent = (availableSuperclasses[1] || 'owl:Thing')">
                <span class="toggle-radio"></span>
                <span>🌲 Subclass of Existing Concept</span>
              </label>
            </div>

            <div class="form-row" style="display: flex; gap: 12px;">
              <div class="form-group half" style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Class Name / Label <span style="color: var(--accent-rose);">*</span></label>
                <input type="text" [(ngModel)]="newClassLabel" placeholder="Class Name / Label" class="form-input font-mono" style="padding: 8px 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 12px;" />
                <span class="form-hint" *ngIf="ontology?.base_iri" style="font-size: 10px; color: var(--accent-cyan); font-family: var(--font-mono); margin-top: 2px;">
                  IRI: {{ ontology.base_iri }}{{ newClassLabel || 'ClassName' }}
                </span>
              </div>
              <div class="form-group half" style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Parent Hierarchy (rdfs:subClassOf) <span style="color: var(--accent-rose);">*</span></label>
                <select [(ngModel)]="newClassParent" class="form-select font-mono" style="padding: 8px 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 12px;">
                  <option *ngFor="let opt of availableSuperclasses" [value]="opt">{{ opt }}</option>
                </select>
                <span class="form-hint" style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">
                  {{ newClassParent === 'owl:Thing' ? 'Creates a standalone root semantic entity' : 'Inherits properties and hierarchy from parent' }}
                </span>
              </div>
            </div>

            <div class="form-row" style="display: flex; gap: 12px;">
              <div class="form-group half" style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Domain Classification</label>
                <select [(ngModel)]="newClassDomain" class="form-select" style="padding: 8px 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 12px;">
                  <option value="Dimension">Dimension Entity (Master Data Context)</option>
                  <option value="Fact">Fact Entity (Metrics & Measures)</option>
                  <option value="Lookup">Lookup Entity (Reference Code Table)</option>
                  <option value="Transactional">Transactional Entity</option>
                  <option value="SCD">SCD Entity (Slowly Changing Dimension)</option>
                </select>
              </div>
              <div class="form-group half" style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Description / RDFS Comment</label>
                <input type="text" [(ngModel)]="newClassComment" placeholder="Semantic Description" class="form-input" style="padding: 8px 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 12px;" />
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
                  <button class="btn-sm" (click)="addClassPropRow('DatatypeProperty')">➕ Add Datatype</button>
                  <button class="btn-sm" (click)="addClassPropRow('ObjectProperty')">🔗 Add Relationship</button>
                </div>
              </div>

              <div class="props-table-wrap" *ngIf="newClassProps.length > 0" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
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
                    <tr *ngFor="let p of newClassProps; let i = index">
                      <td><input type="text" [(ngModel)]="p.name" placeholder="propName" style="padding: 4px 6px; font-size: 11px; width: 100%; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px;" class="font-mono" /></td>
                      <td>
                        <select [(ngModel)]="p.property_type" (change)="onClassPropTypeChanged(p)" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 4px; width: 100%;">
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
                        <button style="background: transparent; border: none; color: var(--accent-rose); cursor: pointer;" (click)="removeClassPropRow(i)">🗑️</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="modal-actions flex-between" style="margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--border-color);">
              <button class="btn-secondary" (click)="closeCreateClassModal()">Cancel</button>
              <button class="btn-primary glow-btn" (click)="submitCreateClass()" [disabled]="isSubmitting">
                <span *ngIf="!isSubmitting">✨ Create & Save to Database</span>
                <span *ngIf="isSubmitting">⏳ Persisting Entity...</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ontology-container { display: flex; flex-direction: column; gap: 20px; position: relative; }
    .header-card { padding: 20px 24px; }
    .title-row { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }
    .persisted-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.3);
      padding: 4px 10px;
      border-radius: 20px;
    }
    .subtitle { color: var(--text-secondary); font-size: 13px; margin: 0; }
    .header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .dropdown-group { display: flex; gap: 6px; }
    
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

    .content-wrapper { display: flex; flex-direction: column; gap: 20px; }

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
    .layout-dropdown {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
    }
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
export class OntologyEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cyContainer') cyContainerRef!: ElementRef;

  projectId = "11111111-1111-1111-1111-111111111111";
  ontology: any = null;
  isLoading = false;
  isSubmitting = false;

  activeViewTab: 'graph' | 'classes' | 'properties' = 'graph';
  graphLayout: string = 'cose';
  searchQuery: string = '';
  propertyFilter: 'all' | 'datatype' | 'object' = 'all';

  cyInstance: Core | null = null;
  selectedGraphNode: any = null;

  toastMessage: string | null = null;
  private toastTimer: any = null;
  private projectSub: any = null;

  // Create Class Modal state
  isCreateModalOpen = false;
  newClassLabel = '';
  newClassParent = 'owl:Thing';
  newClassDomain = 'Dimension';
  newClassComment = '';
  newClassProps: any[] = [];

  constructor(
    private apiService: ApiService,
    private projectStateService: ProjectStateService
  ) {}

  ngOnInit() {
    this.projectSub = this.projectStateService.activeProjectId$.subscribe((id: string) => {
      if (id && id !== this.projectId) {
        this.projectId = id;
        this.loadOntology();
      }
    });
    this.projectId = this.projectStateService.currentProjectId;
    this.loadOntology();
  }

  ngAfterViewInit() {
    if (this.ontology?.graph) {
      setTimeout(() => this.initCytoscape(), 150);
    }
  }

  ngOnDestroy() {
    if (this.projectSub) this.projectSub.unsubscribe();
    if (this.cyInstance) {
      this.cyInstance.destroy();
      this.cyInstance = null;
    }
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = null;
    }, 3500);
  }

  loadOntology(focusClassName?: string) {
    this.isLoading = true;
    this.apiService.generateOntology(this.projectId).subscribe({
      next: (res) => {
        this.ontology = res;
        this.isLoading = false;
        setTimeout(() => {
          if (this.activeViewTab === 'graph') {
            this.initCytoscape(focusClassName);
          }
        }, 100);
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Failed to load ontology model: ' + (err.error?.detail || err.message || 'Server Error'));
      }
    });
  }

  switchViewTab(tab: 'graph' | 'classes' | 'properties') {
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

  get datatypePropertiesCount(): number {
    if (!this.ontology?.properties) return 0;
    return this.ontology.properties.filter((p: any) => p.property_type === 'DatatypeProperty').length;
  }

  get objectPropertiesCount(): number {
    if (!this.ontology?.properties) return 0;
    return this.ontology.properties.filter((p: any) => p.property_type === 'ObjectProperty').length;
  }

  get filteredClasses(): any[] {
    if (!this.ontology || !this.ontology.classes) return [];
    if (!this.searchQuery.trim()) return this.ontology.classes;
    const q = this.searchQuery.toLowerCase();
    return this.ontology.classes.filter((c: any) =>
      (c.label && c.label.toLowerCase().includes(q)) ||
      (c.iri && c.iri.toLowerCase().includes(q)) ||
      (c.comment && c.comment.toLowerCase().includes(q))
    );
  }

  get filteredProperties(): any[] {
    if (!this.ontology || !this.ontology.properties) return [];
    let props = this.ontology.properties;
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
    if (!this.ontology || !this.ontology.properties) return [];
    const props = this.ontology.properties.filter((p: any) => p.parent_class === className);
    const seen = new Set<string>();
    const result: any[] = [];
    for (const p of props) {
      const name = (p.relationship_name || p.label || p.name || '').trim().toLowerCase();
      const type = (p.property_type || 'DatatypeProperty').toLowerCase();
      const key = `${type}:${name}`;
      if (name && !seen.has(key)) {
        seen.add(key);
        result.push(p);
      }
    }
    return result;
  }

  getNodeEdges(nodeId: string): any[] {
    if (!this.ontology?.graph?.edges) return [];
    return this.ontology.graph.edges.filter((e: any) => e.source === nodeId || e.target === nodeId);
  }

  get availableSuperclasses(): string[] {
    const list = ['owl:Thing'];
    if (this.ontology?.classes) {
      this.ontology.classes.forEach((c: any) => {
        if (c.label && c.label !== 'owl:Thing' && !list.includes(c.label)) {
          list.push(c.label);
        }
      });
    }
    return list;
  }

  // Cytoscape Graph Rendering
  private initCytoscape(focusNodeName?: string) {
    if (!this.cyContainerRef || !this.ontology?.graph) return;

    if (this.cyInstance) {
      this.cyInstance.destroy();
      this.cyInstance = null;
    }

    const elements: any[] = [];

    // Nodes
    this.ontology.graph.nodes.forEach((n: any) => {
      elements.push({
        group: 'nodes',
        data: {
          id: n.id,
          label: n.label,
          nodeType: n.type,
          domainType: n.domain_type || 'Dimension',
          rawNode: n
        }
      });
    });

    // Edges
    this.ontology.graph.edges.forEach((e: any) => {
      elements.push({
        group: 'edges',
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          edgeType: e.type,
          rawEdge: e
        }
      });
    });

    const cytoscapeStyles: any[] = [
      {
        selector: 'node',
        style: {
          'background-color': '#06b6d4',
          'label': 'data(label)',
          'color': '#f8fafc',
          'font-size': '12px',
          'font-family': 'Inter, sans-serif',
          'font-weight': 600,
          'text-valign': 'center',
          'text-halign': 'center',
          'width': '65px',
          'height': '65px',
          'border-width': '2px',
          'border-color': '#38bdf8'
        }
      },
      {
        selector: 'node[domainType = "Fact"]',
        style: {
          'background-color': '#f59e0b',
          'border-color': '#fbbf24'
        }
      },
      {
        selector: 'node[domainType = "Lookup"]',
        style: {
          'background-color': '#10b981',
          'border-color': '#34d399'
        }
      },
      {
        selector: 'node[domainType = "Dimension"]',
        style: {
          'background-color': '#8b5cf6',
          'border-color': '#a78bfa'
        }
      },
      {
        selector: 'node[nodeType = "SuperClass"]',
        style: {
          'background-color': '#334155',
          'border-color': '#64748b',
          'shape': 'round-rectangle',
          'width': '80px',
          'height': '40px'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': '4px',
          'border-color': '#ffffff'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#475569',
          'target-arrow-color': '#94a3b8',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'color': '#94a3b8',
          'font-size': '10px',
          'font-family': 'Inter, sans-serif',
          'text-rotation': 'autorotate',
          'text-background-color': '#0f172a',
          'text-background-opacity': 0.85,
          'text-background-padding': '3px',
          'text-background-shape': 'roundrectangle',
          'arrow-scale': 1.2
        }
      },
      {
        selector: 'edge[edgeType = "subClassOf"]',
        style: {
          'line-style': 'dashed',
          'line-color': '#64748b',
          'target-arrow-color': '#64748b',
          'target-arrow-shape': 'triangle'
        }
      },
      {
        selector: 'edge[edgeType = "ObjectProperty"]',
        style: {
          'line-color': '#06b6d4',
          'target-arrow-color': '#06b6d4',
          'color': '#67e8f9'
        }
      }
    ];

    this.cyInstance = cytoscape({
      container: this.cyContainerRef.nativeElement,
      elements: elements,
      style: cytoscapeStyles,
      layout: {
        name: this.graphLayout,
        animate: true,
        animationDuration: 500,
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

    // Double tap on empty canvas opens Create Class modal
    this.cyInstance.on('dbltap', (evt) => {
      if (evt.target === this.cyInstance) {
        this.openCreateClassModal();
      }
    });

    // Focus target node if specified
    if (focusNodeName) {
      setTimeout(() => {
        const targetNode = this.cyInstance?.$(`#${focusNodeName}`);
        if (targetNode && targetNode.length > 0) {
          this.selectedGraphNode = targetNode.data('rawNode');
          this.cyInstance?.animate({
            center: { eles: targetNode },
            zoom: 1.4,
            duration: 500
          });
          targetNode.select();
        }
      }, 200);
    } else if (this.ontology.graph.nodes.length > 0) {
      this.selectedGraphNode = this.ontology.graph.nodes[0];
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

  exportFormat(format: string) {
    this.apiService.exportOntology(this.projectId, format).subscribe({
      next: (text) => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ontology_export.${format === 'turtle' ? 'ttl' : format === 'json-ld' ? 'jsonld' : 'owl'}`;
        a.click();
        this.showToast(`📥 Exported ontology format: ${format.toUpperCase()}`);
      },
      error: (err) => this.showToast('Export failed: ' + (err.error?.detail || err.message || 'Server Error'))
    });
  }

  // Create Class Modal
  openCreateClassModal(parentClassLabel?: string) {
    this.newClassLabel = '';
    this.newClassDomain = 'Dimension';
    this.newClassComment = '';
    this.newClassProps = [
      { name: 'code', property_type: 'DatatypeProperty', range: 'xsd:string', inverse_property: '', is_primary_key: true }
    ];
    if (parentClassLabel && this.availableSuperclasses.includes(parentClassLabel)) {
      this.newClassParent = parentClassLabel;
    } else {
      this.newClassParent = 'owl:Thing';
    }
    this.isCreateModalOpen = true;
  }

  closeCreateClassModal() {
    this.isCreateModalOpen = false;
  }

  addClassPropRow(propType: 'DatatypeProperty' | 'ObjectProperty' = 'DatatypeProperty') {
    const isObj = propType === 'ObjectProperty';
    const defaultRange = isObj ? (this.availableSuperclasses[1] || 'TargetClass') : 'xsd:string';
    this.newClassProps.push({
      name: isObj ? 'relatesTo' : 'attrName',
      property_type: propType,
      range: defaultRange,
      inverse_property: '',
      is_primary_key: false
    });
  }

  removeClassPropRow(idx: number) {
    this.newClassProps.splice(idx, 1);
  }

  onClassPropTypeChanged(p: any) {
    if (p.property_type === 'ObjectProperty') {
      p.range = this.availableSuperclasses[1] || 'TargetClass';
      p.is_primary_key = false;
    } else {
      p.range = 'xsd:string';
      p.inverse_property = '';
    }
  }

  submitCreateClass() {
    const rawLabel = (this.newClassLabel || '').trim();
    if (!rawLabel) {
      alert('Class name / label is required.');
      return;
    }
    const cleanLabel = rawLabel.replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleanLabel) {
      alert('Class name must contain valid alphanumeric characters.');
      return;
    }
    if (this.ontology?.classes?.some((c: any) => c.label.toLowerCase() === cleanLabel.toLowerCase())) {
      alert(`An ontology class named "${cleanLabel}" already exists in this project.`);
      return;
    }

    const payload = {
      class_name: cleanLabel,
      subclass_of: this.newClassParent || 'owl:Thing',
      domain_type: this.newClassDomain,
      comment: (this.newClassComment || '').trim() || `Class representing ${cleanLabel}`,
      properties: this.newClassProps.map((p) => ({
        label: p.name,
        name: p.name,
        property_type: p.property_type,
        range: p.range,
        relationship_name: p.name,
        target_class: p.property_type === 'ObjectProperty' ? p.range : null,
        inverse_property: p.property_type === 'ObjectProperty' ? (p.inverse_property || null) : null,
        is_primary_key: Boolean(p.is_primary_key)
      }))
    };

    this.isSubmitting = true;
    this.apiService.createOntologyClass(this.projectId, payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.closeCreateClassModal();
        this.showToast(`✨ Class "${cleanLabel}" successfully created and saved in project database!`);
        this.loadOntology(cleanLabel);
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err?.error?.detail || err?.message || 'Failed to create ontology class.');
      }
    });
  }
}
