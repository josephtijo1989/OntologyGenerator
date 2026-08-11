import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-profiling',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profiling-container">
      <div class="flex-between">
        <div>
          <h2>Data Profiling & Data Quality Engine</h2>
          <p class="subtitle">Row counts, distinct counts, null ratios, PII tagging, and quality scores</p>
        </div>
        <button class="btn-primary" (click)="runProfiling()">📈 Execute Profiling</button>
      </div>

      <div class="grid-cards" style="margin-top: 20px;">
        <div class="glass-card profile-card" *ngFor="let prof of profilingResults">
          <div class="flex-between">
            <span class="table-title">Catalog ID: {{ prof.metadata_catalog_id | slice:0:8 }}</span>
            <span class="quality-badge" [class.high]="prof.quality_score >= 95">Score: {{ prof.quality_score }}%</span>
          </div>
          <div class="row-count">
            <span class="lbl">Total Rows:</span> <span class="val font-mono">{{ prof.row_count | number }}</span>
          </div>
          <div class="stats-list">
            <div class="stat-item" *ngFor="let col of prof.column_stats_json | keyvalue">
              <div class="flex-between">
                <span class="col-name font-mono">{{ col.key }}</span>
                <span class="pii-tag" *ngIf="$any(col.value)?.pii_tagged">🔒 PII: {{ $any(col.value)?.pii_type }}</span>
              </div>
              <div class="stat-meta">
                <span>Nulls: {{ ($any(col.value)?.null_pct || 0) * 100 }}%</span>
                <span *ngIf="$any(col.value)?.distinct_count">Distinct: {{ $any(col.value)?.distinct_count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profiling-container { display: flex; flex-direction: column; gap: 16px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; }
    .btn-primary { background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet)); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .profile-card { display: flex; flex-direction: column; gap: 12px; }
    .table-title { font-weight: 700; font-size: 14px; }
    .quality-badge { font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 12px; background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); }
    .quality-badge.high { background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); }
    .row-count { font-size: 14px; }
    .lbl { color: var(--text-secondary); }
    .val { font-weight: 700; color: var(--accent-cyan); }
    .font-mono { font-family: var(--font-mono); }
    .stats-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    .stat-item { background: var(--bg-surface); padding: 8px 12px; border-radius: 6px; font-size: 12px; display: flex; flex-direction: column; gap: 4px; }
    .col-name { font-weight: 600; color: var(--text-primary); }
    .pii-tag { font-size: 10px; background: rgba(244, 63, 94, 0.2); color: var(--accent-rose); padding: 1px 6px; border-radius: 4px; font-weight: 600; }
    .stat-meta { color: var(--text-secondary); display: flex; gap: 12px; }
  `]
})
export class ProfilingComponent implements OnInit {
  projectId = "11111111-1111-1111-1111-111111111111";
  profilingResults: any[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadProfiling();
  }

  loadProfiling() {
    this.apiService.getProfilingResults(this.projectId).subscribe({
      next: (res) => this.profilingResults = res,
      error: (err) => console.error(err)
    });
  }

  runProfiling() {
    this.apiService.getSourceConnections(this.projectId).subscribe({
      next: (conns) => {
        if (conns.length === 0) {
          alert('Configure database connector first');
          return;
        }
        this.apiService.runProfiling(this.projectId, conns[0].id).subscribe({
          next: (res) => {
            this.profilingResults = res;
            alert('Profiling completed successfully');
          },
          error: (err) => alert('Profiling failed: ' + (err.error?.detail || err.message))
        });
      }
    });
  }
}
