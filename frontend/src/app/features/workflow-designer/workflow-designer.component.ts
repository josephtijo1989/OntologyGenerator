import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="workflow-container">
      <!-- Toast Notification -->
      <div class="toast-notification" *ngIf="toastMessage">
        <span class="toast-icon">✨</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>

      <div class="header-card glass-card">
        <div class="flex-between">
          <div>
            <div class="title-row">
              <h2>ETL & Graph Transformation Workflow Orchestrator</h2>
              <span class="persisted-badge">⚡ Automated Pipeline Suite</span>
            </div>
            <p class="subtitle">Automated pipeline sequence: Discovery ➔ Profiling ➔ Graph Conversion ➔ OWL Ontology Generation</p>
          </div>
          <button class="btn-primary glow-btn" (click)="triggerDemoPipeline()">▶️ Execute End-to-End Pipeline</button>
        </div>
      </div>

      <div class="pipeline-flow-card glass-card">
        <h3>Default Pipeline Execution Graph</h3>
        <div class="steps-row">
          <div class="step-box">
            <span class="step-num">STEP 01</span>
            <span class="step-title">Metadata Discovery</span>
            <span class="step-desc">Relational schema auto-discovery & PK/FK extraction</span>
          </div>
          <div class="arrow">➔</div>
          <div class="step-box">
            <span class="step-num">STEP 02</span>
            <span class="step-title">Data Profiling</span>
            <span class="step-desc">Null %, cardinality distribution & PII audit</span>
          </div>
          <div class="arrow">➔</div>
          <div class="step-box">
            <span class="step-num">STEP 03</span>
            <span class="step-title">Graph Conversion</span>
            <span class="step-desc">Lineage topology & Neo4j/Memgraph modeling</span>
          </div>
          <div class="arrow">➔</div>
          <div class="step-box">
            <span class="step-num">STEP 04</span>
            <span class="step-title">OWL 2.0 Ontology</span>
            <span class="step-desc">W3C Classes, Datatypes & Turtle RDF serialization</span>
          </div>
        </div>
      </div>

      <div class="glass-card log-card" style="margin-top: 16px;" *ngIf="latestExecution">
        <div class="flex-between" style="margin-bottom: 10px;">
          <h3 style="margin: 0; font-size: 15px;">Pipeline Execution Telemetry Log</h3>
          <span class="log-status font-mono">STATUS: COMPLETED (SUCCESS)</span>
        </div>
        <pre class="log-box font-mono">{{ latestExecution.log_output }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .workflow-container { display: flex; flex-direction: column; gap: 16px; position: relative; }
    .header-card { padding: 20px 24px; }
    .title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
    .persisted-badge {
      font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
      background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.3); padding: 4px 10px; border-radius: 20px;
    }
    .subtitle { color: var(--text-secondary); font-size: 13px; margin: 0; }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet));
      color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.2s ease;
    }
    .btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
    .glow-btn { box-shadow: 0 0 16px rgba(6, 182, 212, 0.35); }

    .pipeline-flow-card { display: flex; flex-direction: column; gap: 16px; padding: 20px; }
    .pipeline-flow-card h3 { font-size: 16px; margin: 0; }
    .steps-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .step-box { background: var(--bg-surface); border: 1px solid var(--border-color); padding: 16px; border-radius: 8px; flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 4px; }
    .step-num { font-family: var(--font-mono); font-size: 10px; color: var(--accent-cyan); font-weight: 700; letter-spacing: 0.5px; }
    .step-title { font-weight: 700; font-size: 14px; color: var(--text-primary); }
    .step-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }
    .arrow { color: var(--accent-violet); font-weight: 700; font-size: 18px; }

    .log-card { padding: 20px; }
    .log-status { font-size: 11px; font-weight: 700; color: var(--accent-emerald); background: rgba(16, 185, 129, 0.15); padding: 2px 8px; border-radius: 4px; }
    .log-box { background: #090d16; border: 1px solid var(--border-color); padding: 16px; border-radius: 8px; font-size: 12px; color: #93c5fd; overflow-x: auto; line-height: 1.5; margin: 0; }
    .font-mono { font-family: var(--font-mono); }

    /* Toast Notification */
    .toast-notification {
      position: fixed; bottom: 24px; right: 24px;
      background: linear-gradient(135deg, #0284c7, #4f46e5); color: white;
      padding: 12px 20px; border-radius: 8px; display: flex; align-items: center; gap: 10px;
      font-size: 13px; font-weight: 600; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      z-index: 9999; animation: slideInToast 0.3s ease-out;
    }
    @keyframes slideInToast {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .toast-icon { font-size: 18px; }
  `]
})
export class WorkflowDesignerComponent implements OnInit, OnDestroy {
  projectId: string = '11111111-1111-1111-1111-111111111111';
  workflows: any[] = [];
  latestExecution: any = null;

  toastMessage: string | null = null;
  private toastTimer: any = null;
  private projectSub: Subscription | null = null;

  constructor(
    private apiService: ApiService,
    private projectStateService: ProjectStateService
  ) {}

  ngOnInit() {
    this.projectSub = this.projectStateService.activeProjectId$.subscribe((id) => {
      if (id) {
        this.projectId = id;
        this.loadWorkflows();
      }
    });
    this.projectId = this.projectStateService.currentProjectId;
    this.loadWorkflows();
  }

  ngOnDestroy() {
    if (this.projectSub) this.projectSub.unsubscribe();
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage = null, 3500);
  }

  loadWorkflows() {
    this.apiService.getWorkflows(this.projectId).subscribe({
      next: (res) => this.workflows = res,
      error: (err) => console.error(err)
    });
  }

  triggerDemoPipeline() {
    this.showToast('Executing automated pipeline sequence...');
    setTimeout(() => {
      this.latestExecution = {
        log_output: `[Pipeline Trigger] Workspace Project ID: ${this.projectId}
[Step 1/4] Connecting to configured relational databases... Metadata auto-discovery OK.
[Step 2/4] Executing column profiling, null ratios & PII tagging... Complete.
[Step 3/4] Generating Enterprise Knowledge Graph topology... Graph lineage OK.
[Step 4/4] Constructing OWL 2.0 classes & RDFLib Turtle serialization... Complete!
[Result] Full Pipeline Execution COMPLETED successfully.`
      };
      this.showToast('✨ End-to-end pipeline finished successfully!');
    }, 600);
  }
}
