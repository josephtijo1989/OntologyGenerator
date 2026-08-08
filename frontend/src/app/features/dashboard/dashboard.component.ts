import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <div class="header-section">
        <h2>Executive System Overview</h2>
        <p class="subtitle">Real-time telemetry and metadata graph metrics for active project</p>
      </div>

      <div class="grid-cards" *ngIf="metrics">
        <div class="glass-card metric-card">
          <div class="metric-header">
            <span>Discovered Tables</span>
            <span class="metric-icon">📋</span>
          </div>
          <div class="metric-value">{{ metrics.total_tables_discovered }}</div>
          <div class="metric-footer text-emerald">↑ 100% schema coverage</div>
        </div>

        <div class="glass-card metric-card">
          <div class="metric-header">
            <span>Graph Nodes & Edges</span>
            <span class="metric-icon">🕸️</span>
          </div>
          <div class="metric-value">{{ metrics.total_columns_discovered }}</div>
          <div class="metric-footer text-cyan">{{ metrics.total_relationships_inferred }} Inferred Lineage Edges</div>
        </div>

        <div class="glass-card metric-card">
          <div class="metric-header">
            <span>Active Business Rules</span>
            <span class="metric-icon">⚙️</span>
          </div>
          <div class="metric-value">{{ metrics.business_rules_active }}</div>
          <div class="metric-footer text-amber">Masking & Validation Enabled</div>
        </div>

        <div class="glass-card metric-card">
          <div class="metric-header">
            <span>System Health</span>
            <span class="metric-icon">💚</span>
          </div>
          <div class="metric-value text-emerald">{{ metrics.system_health }}</div>
          <div class="metric-footer">SQL Server & Celery Online</div>
        </div>
      </div>

      <!-- Domain Entity Classification Summary -->
      <div class="glass-card domain-summary-card" *ngIf="metrics">
        <h3>Domain Entity Classification Breakdown</h3>
        <div class="domain-pills">
          <div class="domain-pill" *ngFor="let item of metrics.domain_classification | keyvalue">
            <span class="domain-name">{{ item.key }}</span>
            <span class="domain-count">{{ item.value }} tables</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { display: flex; flex-direction: column; gap: 24px; }
    .header-section h2 { font-size: 24px; font-weight: 700; }
    .subtitle { color: var(--text-secondary); font-size: 14px; }
    .metric-card { display: flex; flex-direction: column; gap: 12px; }
    .metric-header { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary); }
    .metric-value { font-size: 32px; font-weight: 700; font-family: var(--font-mono); }
    .metric-footer { font-size: 12px; }
    .text-emerald { color: var(--accent-emerald); }
    .text-cyan { color: var(--accent-cyan); }
    .text-amber { color: var(--accent-amber); }
    .domain-summary-card { display: flex; flex-direction: column; gap: 16px; margin-top: 12px; }
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
    .domain-name { font-weight: 600; color: var(--accent-violet); }
    .domain-count { color: var(--text-secondary); font-family: var(--font-mono); }
  `]
})
export class DashboardComponent implements OnInit {
  metrics: any = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.apiService.getDashboardMetrics("11111111-1111-1111-1111-111111111111").subscribe({
      next: (res) => this.metrics = res,
      error: (err) => console.error(err)
    });
  }
}
