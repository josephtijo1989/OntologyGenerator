import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <!-- Toast Notification -->
      <div class="toast-notification" *ngIf="toastMessage">
        <span class="toast-icon">✨</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>

      <div class="header-section glass-card">
        <div class="flex-between">
          <div>
            <h2>Executive System Overview & Health</h2>
            <p class="subtitle">Real-time telemetry and metadata graph metrics for active project workspace</p>
          </div>
          <button class="btn-secondary" (click)="loadMetrics()">🔄 Refresh Metrics</button>
        </div>
      </div>

      <div class="grid-cards" *ngIf="metrics">
        <div class="glass-card metric-card">
          <div class="metric-header">
            <span>Discovered Tables</span>
            <span class="metric-icon">📋</span>
          </div>
          <div class="metric-value font-mono text-cyan">{{ metrics.total_tables_discovered || 0 }}</div>
          <div class="metric-footer text-emerald">↑ 100% schema coverage</div>
        </div>

        <div class="glass-card metric-card">
          <div class="metric-header">
            <span>Graph Nodes & Edges</span>
            <span class="metric-icon">🕸️</span>
          </div>
          <div class="metric-value font-mono text-violet">{{ metrics.total_columns_discovered || 0 }}</div>
          <div class="metric-footer text-cyan">{{ metrics.total_relationships_inferred || 0 }} Inferred Lineage Edges</div>
        </div>

        <div class="glass-card metric-card">
          <div class="metric-header">
            <span>Active Business Rules</span>
            <span class="metric-icon">⚙️</span>
          </div>
          <div class="metric-value font-mono text-amber">{{ metrics.business_rules_active || 0 }}</div>
          <div class="metric-footer text-amber">Masking & Validation Rules</div>
        </div>

        <div class="glass-card metric-card">
          <div class="metric-header">
            <span>System Health</span>
            <span class="metric-icon">💚</span>
          </div>
          <div class="metric-value text-emerald font-mono">{{ metrics.system_health || 'OPERATIONAL' }}</div>
          <div class="metric-footer">SQL Server & Celery Pipeline Online</div>
        </div>
      </div>

      <!-- Domain Entity Classification Summary -->
      <div class="glass-card domain-summary-card" *ngIf="metrics">
        <h3>Domain Entity Classification Breakdown</h3>
        <div class="domain-pills" *ngIf="metrics.domain_classification">
          <div class="domain-pill" *ngFor="let item of metrics.domain_classification | keyvalue">
            <span class="domain-name">{{ item.key }}</span>
            <span class="domain-count font-mono">{{ item.value }} table(s)</span>
          </div>
        </div>
        <div *ngIf="!metrics.domain_classification || (metrics.domain_classification | keyvalue).length === 0" style="color: var(--text-secondary); font-size: 13px;">
          No domain entities classified yet. Run Auto Discovery under Metadata tab.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { display: flex; flex-direction: column; gap: 20px; }
    .header-section { padding: 20px 24px; }
    .header-section h2 { font-size: 22px; font-weight: 700; margin: 0 0 4px 0; }
    .subtitle { color: var(--text-secondary); font-size: 13px; margin: 0; }
    .btn-secondary { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
    .metric-card { display: flex; flex-direction: column; gap: 12px; }
    .metric-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
    .metric-value { font-size: 32px; font-weight: 700; }
    .metric-footer { font-size: 12px; }
    .text-emerald { color: var(--accent-emerald); }
    .text-cyan { color: var(--accent-cyan); }
    .text-violet { color: var(--accent-violet); }
    .text-amber { color: var(--accent-amber); }
    .font-mono { font-family: var(--font-mono); }
    .domain-summary-card { display: flex; flex-direction: column; gap: 16px; padding: 20px; }
    .domain-summary-card h3 { font-size: 16px; margin: 0; }
    .domain-pills { display: flex; flex-wrap: wrap; gap: 12px; }
    .domain-pill {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      padding: 10px 18px;
      border-radius: 8px;
      display: flex;
      gap: 10px;
      font-size: 13px;
    }
    .domain-name { font-weight: 600; color: var(--accent-cyan); }
    .domain-count { color: var(--text-secondary); }

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
export class DashboardComponent implements OnInit, OnDestroy {
  projectId: string = '11111111-1111-1111-1111-111111111111';
  metrics: any = null;
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
        this.loadMetrics();
      }
    });
    this.projectId = this.projectStateService.currentProjectId;
    this.loadMetrics();
  }

  ngOnDestroy() {
    if (this.projectSub) this.projectSub.unsubscribe();
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage = null, 3500);
  }

  loadMetrics() {
    this.apiService.getDashboardMetrics(this.projectId).subscribe({
      next: (res) => this.metrics = res,
      error: (err) => this.showToast('Failed to load metrics: ' + (err.error?.detail || err.message || 'Server Error'))
    });
  }
}
