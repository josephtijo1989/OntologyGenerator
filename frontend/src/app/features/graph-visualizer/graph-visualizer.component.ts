import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-graph-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="graph-container">
      <div class="flex-between">
        <div>
          <h2>Interactive Enterprise Knowledge Graph Visualizer</h2>
          <p class="subtitle">Visual graph exploration of tables, columns, PK/FK lineages, and semantic edges</p>
        </div>
        <div class="btn-group">
          <button class="btn-secondary" (click)="loadGraph()">🔄 Refresh Graph</button>
          <button class="btn-primary" (click)="exportCypher()">⚡ Export Cypher</button>
        </div>
      </div>

      <div class="graph-toolbar flex-between" *ngIf="graphData">
        <div class="stats-badge">
          <span>Nodes: <strong class="font-mono text-cyan">{{ graphData.node_count }}</strong></span>
          <span>Relationships: <strong class="font-mono text-violet">{{ graphData.relationship_count }}</strong></span>
        </div>
        <div class="legend flex-row">
          <span class="legend-item"><span class="dot table-dot"></span> Table</span>
          <span class="legend-item"><span class="dot column-dot"></span> Column</span>
          <span class="legend-item"><span class="dot fk-dot"></span> Foreign Key</span>
        </div>
      </div>

      <div class="glass-card viewport-card">
        <div #cyCanvas class="cy-canvas"></div>
      </div>
    </div>
  `,
  styles: [`
    .graph-container { display: flex; flex-direction: column; gap: 16px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; }
    .btn-group { display: flex; gap: 10px; }
    .btn-primary { background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet)); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .graph-toolbar { background: var(--bg-secondary); padding: 12px 20px; border-radius: 8px; border: 1px solid var(--border-color); }
    .stats-badge { display: flex; gap: 20px; font-size: 13px; }
    .text-cyan { color: var(--accent-cyan); }
    .text-violet { color: var(--accent-violet); }
    .font-mono { font-family: var(--font-mono); }
    .legend { display: flex; gap: 16px; font-size: 12px; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .table-dot { background: var(--accent-cyan); }
    .column-dot { background: var(--accent-violet); }
    .fk-dot { background: var(--accent-amber); }
    .viewport-card { height: 550px; padding: 0; position: relative; overflow: hidden; }
    .cy-canvas { width: 100%; height: 100%; background: rgba(15, 23, 42, 0.5); }
  `]
})
export class GraphVisualizerComponent implements OnInit {
  projectId = "11111111-1111-1111-1111-111111111111";
  graphData: any = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadGraph();
  }

  loadGraph() {
    this.apiService.generateGraph(this.projectId).subscribe({
      next: (res) => {
        this.graphData = res;
      },
      error: (err) => console.error(err)
    });
  }

  exportCypher() {
    this.apiService.generateGraph(this.projectId).subscribe({
      next: (res) => {
        let script = "// Cypher Export Script\n";
        res.nodes.forEach((n: any) => {
          script += `CREATE (:${n.properties.type || 'Node'} {id: '${n.id}', label: '${n.label}'});\n`;
        });
        const blob = new Blob([script], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'enterprise_graph.cypher';
        a.click();
      }
    });
  }
}
