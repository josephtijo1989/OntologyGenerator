import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="workflow-container">
      <div class="flex-between">
        <div>
          <h2>ETL & Graph Transformation Workflow Orchestrator</h2>
          <p class="subtitle">Automated pipeline sequence: Discovery ➔ Profiling ➔ Graph Build ➔ Ontology Gen</p>
        </div>
        <button class="btn-primary" (click)="triggerDemoPipeline()">▶️ Execute End-to-End Pipeline</button>
      </div>

      <div class="pipeline-flow-card glass-card">
        <h3>Default Pipeline Sequence</h3>
        <div class="steps-row">
          <div class="step-box">
            <span class="step-num">1</span>
            <span class="step-title">Metadata Discovery</span>
            <span class="step-desc">SQL Server / Postgres</span>
          </div>
          <div class="arrow">➔</div>
          <div class="step-box">
            <span class="step-num">2</span>
            <span class="step-title">Data Profiling</span>
            <span class="step-desc">Null & PII Detection</span>
          </div>
          <div class="arrow">➔</div>
          <div class="step-box">
            <span class="step-num">3</span>
            <span class="step-title">Graph Conversion</span>
            <span class="step-desc">Neo4j / Memgraph</span>
          </div>
          <div class="arrow">➔</div>
          <div class="step-box">
            <span class="step-num">4</span>
            <span class="step-title">OWL Ontology Gen</span>
            <span class="step-desc">RDFLib / Turtle</span>
          </div>
        </div>
      </div>

      <div class="glass-card" style="margin-top: 16px;" *ngIf="latestExecution">
        <h3>Latest Execution Log Output</h3>
        <pre class="log-box font-mono">{{ latestExecution.log_output }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .workflow-container { display: flex; flex-direction: column; gap: 16px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; }
    .btn-primary { background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet)); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .pipeline-flow-card { display: flex; flex-direction: column; gap: 20px; margin-top: 12px; }
    .steps-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .step-box { background: var(--bg-surface); border: 1px solid var(--border-color); padding: 16px; border-radius: 8px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .step-num { font-family: var(--font-mono); font-size: 12px; color: var(--accent-cyan); font-weight: 700; }
    .step-title { font-weight: 700; font-size: 14px; color: var(--text-primary); }
    .step-desc { font-size: 12px; color: var(--text-secondary); }
    .arrow { color: var(--accent-violet); font-weight: 700; font-size: 18px; }
    .log-box { background: var(--bg-primary); border: 1px solid var(--border-color); padding: 14px; border-radius: 6px; font-size: 12px; color: var(--accent-emerald); overflow-x: auto; }
    .font-mono { font-family: var(--font-mono); }
  `]
})
export class WorkflowDesignerComponent implements OnInit {
  projectId = "11111111-1111-1111-1111-111111111111";
  workflows: any[] = [];
  latestExecution: any = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadWorkflows();
  }

  loadWorkflows() {
    this.apiService.getWorkflows(this.projectId).subscribe({
      next: (res) => this.workflows = res,
      error: (err) => console.error(err)
    });
  }

  triggerDemoPipeline() {
    alert("Pipeline triggered! Executing Metadata Discovery -> Profiling -> Graph Build -> Ontology Gen");
    this.latestExecution = {
      log_output: `[2026-08-04 18:12:00] Pipeline execution started.
[2026-08-04 18:12:01] Step 1: Discovered 2 schemas and 5 tables in Microsoft SQL Server.
[2026-08-04 18:12:02] Step 2: Completed row count, null %, distinct %, and PII profiling.
[2026-08-04 18:12:03] Step 3: Converted relational metadata to NetworkX Enterprise Knowledge Graph.
[2026-08-04 18:12:04] Step 4: Generated OWL classes, datatype properties, and Turtle RDF serialization.
[2026-08-04 18:12:05] Workflow execution COMPLETED successfully.`
    };
  }
}
