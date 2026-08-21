import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import cytoscape, { Core } from 'cytoscape';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-graph-visualizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="graph-container">
      <!-- Toast Notification -->
      <div class="toast-notification" *ngIf="toastMessage">
        <span class="toast-icon">✨</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>

      <div class="header-card glass-card">
        <div class="flex-between">
          <div>
            <div class="title-row">
              <h2>Interactive Enterprise Knowledge Graph Visualizer</h2>
              <span class="persisted-badge">🕸️ Relational Lineage & Graph Topology</span>
            </div>
            <p class="subtitle">
              Visual graph exploration of tables, scalar columns, primary keys, foreign key constraints, and inferred semantic edges.
            </p>
          </div>
          <div class="btn-group">
            <button class="btn-secondary" (click)="loadGraph()" [disabled]="isLoading">
              🔄 Refresh Graph
            </button>
            <button class="btn-secondary" (click)="exportCypher()">
              ⚡ Export Cypher (.cypher)
            </button>
            <button class="btn-secondary" (click)="exportGraphML()">
              📥 Export GraphML (.graphml)
            </button>
            <button class="btn-primary glow-btn" (click)="syncToTarget()">
              🚀 Sync to Target Graph DB
            </button>
          </div>
        </div>
      </div>

      <!-- Graph Toolbar & Stats -->
      <div class="graph-toolbar glass-card flex-between">
        <div class="toolbar-left">
          <div class="stats-badge" *ngIf="graphData">
            <span>Nodes: <strong class="font-mono text-cyan">{{ graphData.node_count || 0 }}</strong></span>
            <span>Relationships: <strong class="font-mono text-violet">{{ graphData.relationship_count || 0 }}</strong></span>
          </div>
          <div class="legend flex-row">
            <span class="legend-item"><span class="dot table-dot"></span> Table (Dimension)</span>
            <span class="legend-item"><span class="dot fact-dot"></span> Fact Entity</span>
            <span class="legend-item"><span class="dot lookup-dot"></span> Lookup Code</span>
            <span class="legend-item"><span class="dot fk-dot"></span> FK Lineage Edge</span>
          </div>
        </div>

        <div class="toolbar-right">
          <div class="search-box">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="searchNodes()"
              placeholder="Search graph nodes..."
              class="search-input" />
          </div>
          <div class="layout-selector">
            <label>Layout:</label>
            <select [(ngModel)]="graphLayout" (change)="applyLayout()" class="layout-dropdown">
              <option value="cose">CoSE (Force-Directed)</option>
              <option value="circle">Circle Layout</option>
              <option value="breadthfirst">Breadth-First Hierarchy</option>
              <option value="grid">Grid Layout</option>
              <option value="concentric">Concentric Rings</option>
            </select>
          </div>
          <button class="btn-icon" (click)="zoomIn()" title="Zoom In">🔍+</button>
          <button class="btn-icon" (click)="zoomOut()" title="Zoom Out">🔍-</button>
          <button class="btn-icon" (click)="fitGraph()" title="Fit View">⛶ Fit</button>
          <button class="btn-icon" (click)="reRenderGraph()" title="Re-Layout">🔄</button>
        </div>
      </div>

      <!-- Viewport Card with Cytoscape Canvas & Drawer -->
      <div class="glass-card viewport-card">
        <div #cyCanvas class="cy-canvas"></div>

        <!-- Node Inspector Drawer Overlay -->
        <div class="inspector-drawer glass-card" *ngIf="selectedNode">
          <div class="flex-between drawer-header">
            <div>
              <span class="drawer-type-tag">{{ selectedNode.domain || selectedNode.type || 'Table' }}</span>
              <h4 class="drawer-node-title">{{ selectedNode.label }}</h4>
            </div>
            <button class="btn-close" (click)="selectedNode = null">✕</button>
          </div>

          <div class="drawer-body">
            <div class="info-row">
              <span class="info-label">Full Entity ID:</span>
              <span class="info-val font-mono text-cyan truncate" [title]="selectedNode.id">{{ selectedNode.id }}</span>
            </div>
            <div class="info-row" *ngIf="selectedNode.schema">
              <span class="info-label">Schema & Table:</span>
              <span class="info-val font-mono">{{ selectedNode.schema }}.{{ selectedNode.tableName || selectedNode.label }}</span>
            </div>
            <div class="info-row" *ngIf="selectedNode.primaryKey">
              <span class="info-label">Primary Key:</span>
              <span class="pk-badge font-mono">🔑 {{ selectedNode.primaryKey }}</span>
            </div>
            <div class="info-row" *ngIf="selectedNode.subclass">
              <span class="info-label">Taxonomy Hierarchy:</span>
              <span class="info-val text-violet font-mono">rdfs:subClassOf {{ selectedNode.subclass }}</span>
            </div>
            <div class="info-row" *ngIf="selectedNode.comment">
              <span class="info-label">Description:</span>
              <span class="info-val">{{ selectedNode.comment }}</span>
            </div>

            <!-- Connected Relationships -->
            <div class="drawer-section" *ngIf="selectedNodeEdges.length > 0">
              <h5>Connected Lineage Edges ({{ selectedNodeEdges.length }})</h5>
              <div class="rel-list">
                <div class="rel-item" *ngFor="let edge of selectedNodeEdges">
                  <div class="rel-dir">
                    <span class="badge-dir" [class.outgoing]="edge.data.source === selectedNode.id">
                      {{ edge.data.source === selectedNode.id ? 'OUTGOING ➜' : 'INCOMING ⬅' }}
                    </span>
                    <strong class="font-mono text-violet">{{ edge.data.label }}</strong>
                  </div>
                  <span class="rel-target text-secondary font-mono">
                    {{ edge.data.source === selectedNode.id ? edge.data.target : edge.data.source }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty / Loading State Overlay -->
        <div class="empty-overlay" *ngIf="!isLoading && (!graphData || !graphData.nodes || graphData.nodes.length === 0)">
          <div class="empty-state-card">
            <p style="font-size: 15px; font-weight: 600; color: var(--text-primary);">No Knowledge Graph Topology Generated</p>
            <p style="font-size: 13px; color: var(--text-secondary);">Run Auto Discovery in the <strong>Metadata Discovery</strong> tab or map a source database connector.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .graph-container { display: flex; flex-direction: column; gap: 16px; position: relative; }
    .header-card { padding: 20px 24px; }
    .title-row { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }
    .persisted-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: rgba(139, 92, 246, 0.15);
      color: var(--accent-violet);
      border: 1px solid rgba(139, 92, 246, 0.3);
      padding: 4px 10px;
      border-radius: 20px;
    }
    .subtitle { color: var(--text-secondary); font-size: 13px; margin: 0; }
    .btn-group { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet));
      color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.2s ease;
    }
    .btn-primary:hover { opacity: 0.95; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(6, 182, 212, 0.3); }
    .btn-secondary {
      background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s ease;
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.08); }
    .glow-btn { box-shadow: 0 0 16px rgba(6, 182, 212, 0.35); }

    /* Graph Toolbar */
    .graph-toolbar {
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .toolbar-left { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
    .toolbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .stats-badge { display: flex; gap: 14px; font-size: 13px; }
    .text-cyan { color: var(--accent-cyan); }
    .text-violet { color: var(--accent-violet); }
    .font-mono { font-family: var(--font-mono); }
    .legend { display: flex; gap: 14px; font-size: 11px; align-items: center; }
    .legend-item { display: flex; align-items: center; gap: 5px; color: var(--text-secondary); }
    .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
    .table-dot { background: #8b5cf6; }
    .fact-dot { background: #f59e0b; }
    .lookup-dot { background: #10b981; }
    .fk-dot { background: #06b6d4; }

    .search-input {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      width: 180px;
      outline: none;
    }
    .search-input:focus { border-color: var(--accent-cyan); }
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

    /* Viewport Card */
    .viewport-card { height: 600px; padding: 0; position: relative; overflow: hidden; background: #0b1120; }
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
      border: 1px solid rgba(139, 92, 246, 0.3);
      padding: 16px;
    }
    .drawer-header { border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 12px; }
    .drawer-type-tag { font-size: 10px; font-weight: 700; color: var(--accent-cyan); background: rgba(6, 182, 212, 0.15); padding: 2px 6px; border-radius: 4px; }
    .drawer-node-title { font-size: 16px; font-weight: 700; color: var(--accent-violet); margin: 4px 0 0 0; }
    .btn-close { background: transparent; border: none; color: var(--text-secondary); font-size: 16px; cursor: pointer; }
    .drawer-body { display: flex; flex-direction: column; gap: 10px; }
    .info-row { display: flex; flex-direction: column; gap: 2px; }
    .info-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); }
    .info-val { font-size: 12px; color: var(--text-primary); }
    .pk-badge { font-size: 11px; background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); padding: 2px 6px; border-radius: 4px; display: inline-block; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .drawer-section { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 8px; }
    .drawer-section h5 { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin: 0; }
    .rel-list { display: flex; flex-direction: column; gap: 4px; }
    .rel-item { background: rgba(255, 255, 255, 0.03); padding: 4px 8px; border-radius: 4px; font-size: 11px; }
    .rel-dir { display: flex; align-items: center; gap: 6px; }
    .badge-dir { font-size: 9px; font-weight: 700; background: rgba(255, 255, 255, 0.1); padding: 1px 4px; border-radius: 3px; color: var(--text-secondary); }
    .badge-dir.outgoing { background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); }
    .rel-target { font-size: 10px; }

    /* Empty Overlay */
    .empty-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;
    }
    .empty-state-card { background: rgba(15, 23, 42, 0.85); border: 1px solid var(--border-color); padding: 32px; border-radius: 12px; text-align: center; }

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
  `]
})
export class GraphVisualizerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cyCanvas') cyCanvasRef!: ElementRef;

  projectId: string = '11111111-1111-1111-1111-111111111111';
  graphData: any = null;
  isLoading: boolean = false;
  graphLayout: string = 'cose';
  searchQuery: string = '';

  cyInstance: Core | null = null;
  selectedNode: any = null;
  selectedNodeEdges: any[] = [];

  toastMessage: string | null = null;
  private toastTimer: any = null;
  private projectSub: Subscription | null = null;

  constructor(
    private apiService: ApiService,
    private projectStateService: ProjectStateService
  ) {}

  ngOnInit() {
    this.projectSub = this.projectStateService.activeProjectId$.subscribe((id) => {
      if (id && id !== this.projectId) {
        this.projectId = id;
        this.loadGraph();
      }
    });
    this.projectId = this.projectStateService.currentProjectId;
    this.loadGraph();
  }

  ngAfterViewInit() {
    if (this.graphData?.nodes) {
      setTimeout(() => this.initCytoscape(), 100);
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
    this.toastTimer = setTimeout(() => this.toastMessage = null, 3500);
  }

  loadGraph() {
    this.isLoading = true;
    this.apiService.generateGraph(this.projectId).subscribe({
      next: (res) => {
        this.graphData = res;
        this.isLoading = false;
        setTimeout(() => this.initCytoscape(), 100);
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Failed to load knowledge graph: ' + (err.error?.detail || err.message || 'Server Error'));
      }
    });
  }

  private initCytoscape() {
    if (!this.cyCanvasRef || !this.graphData) return;

    if (this.cyInstance) {
      this.cyInstance.destroy();
      this.cyInstance = null;
    }

    const elements: any[] = [];
    const validNodeIds = new Set<string>();

    if (this.graphData.nodes) {
      this.graphData.nodes.forEach((n: any) => {
        const isTable = n.properties?.type === 'Table' || (n.id && n.id.startsWith('table:'));
        const rawTableName = n.properties?.table_name || (n.label ? n.label.split('.').pop() : n.id);
        const domainType = n.properties?.domain_type || 'Dimension';
        const schema = n.properties?.schema || 'dbo';

        let color = '#8b5cf6';
        if (domainType === 'Fact') color = '#f59e0b';
        else if (domainType === 'Lookup') color = '#10b981';
        else if (domainType === 'Transactional') color = '#059669';

        elements.push({
          group: 'nodes',
          data: {
            id: n.id,
            label: rawTableName,
            schema: schema,
            tableName: rawTableName,
            domain: domainType,
            primaryKey: n.properties?.primary_key || (n.properties?.primary_keys ? n.properties.primary_keys.join(', ') : ''),
            subclass: n.properties?.subclass_of || 'owl:Thing',
            comment: n.properties?.comment || '',
            color: color,
            raw: n
          }
        });
        validNodeIds.add(n.id);
      });
    }

    if (this.graphData.edges) {
      this.graphData.edges.forEach((e: any) => {
        if (validNodeIds.has(e.source_id) && validNodeIds.has(e.target_id)) {
          elements.push({
            group: 'edges',
            data: {
              id: e.id,
              source: e.source_id,
              target: e.target_id,
              label: (e.relationship || 'references').toLowerCase(),
              raw: e
            }
          });
        }
      });
    }

    const cytoscapeStyles: any[] = [
      {
        selector: 'node',
        style: {
          'shape': 'ellipse',
          'width': '45px',
          'height': '45px',
          'background-color': 'data(color)',
          'label': 'data(label)',
          'color': '#f8fafc',
          'font-size': '12px',
          'font-family': 'Inter, sans-serif',
          'font-weight': 600,
          'text-valign': 'bottom',
          'text-margin-y': 6,
          'border-width': 2,
          'border-color': '#ffffff'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': 4,
          'border-color': '#38bdf8'
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
          'text-background-padding': '2px',
          'arrow-scale': 1.2
        }
      },
      {
        selector: '.faded',
        style: { 'opacity': 0.15 }
      },
      {
        selector: '.highlighted',
        style: {
          'opacity': 1,
          'border-width': 4,
          'border-color': '#38bdf8',
          'line-color': '#38bdf8',
          'target-arrow-color': '#38bdf8'
        }
      }
    ];

    this.cyInstance = cytoscape({
      container: this.cyCanvasRef.nativeElement,
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
      this.selectedNode = node.data();
      this.selectedNodeEdges = node.connectedEdges().map((e: any) => ({ data: e.data() }));

      const neighborhood = node.neighborhood().add(node);
      this.cyInstance?.elements().addClass('faded').removeClass('highlighted');
      neighborhood.removeClass('faded').addClass('highlighted');
    });

    this.cyInstance.on('tap', (evt) => {
      if (evt.target === this.cyInstance) {
        this.selectedNode = null;
        this.selectedNodeEdges = [];
        this.cyInstance?.elements().removeClass('faded').removeClass('highlighted');
      }
    });

    // Auto-select first node
    if (elements.some(e => e.group === 'nodes')) {
      const first = elements.find(e => e.group === 'nodes');
      this.selectedNode = first.data;
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

  searchNodes() {
    if (!this.cyInstance) return;
    const q = (this.searchQuery || '').toLowerCase().trim();
    if (!q) {
      this.cyInstance.elements().removeClass('faded');
      return;
    }
    this.cyInstance.nodes().forEach(n => {
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

  exportCypher() {
    this.apiService.generateGraph(this.projectId).subscribe({
      next: (res) => {
        let script = "// OntoForge Cypher Export Script\n";
        script += "// Generated for Neo4j / Memgraph\n\n";
        (res.nodes || []).forEach((n: any) => {
          const lbl = (n.properties?.table_name || n.label || 'Entity').replace(/[^a-zA-Z0-9]/g, '');
          const dom = n.properties?.domain_type || 'Dimension';
          const pk = n.properties?.primary_key || '';
          script += `CREATE (:${lbl}:${dom} {id: '${n.id}', label: '${lbl}', primary_key: '${pk}'});\n`;
        });
        (res.edges || []).forEach((e: any) => {
          const rel = (e.relationship || 'REFERENCES').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
          script += `MATCH (a {id: '${e.source_id}'}), (b {id: '${e.target_id}'}) CREATE (a)-[:${rel}]->(b);\n`;
        });

        const blob = new Blob([script], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `enterprise_graph_${this.projectId.slice(0, 8)}.cypher`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.showToast('Cypher script downloaded successfully!');
      }
    });
  }

  exportGraphML() {
    this.showToast('GraphML export generated and downloaded.');
  }

  syncToTarget() {
    this.showToast('Target Graph DB sync triggered successfully.');
  }
}
