import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profiling',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profiling-container">
      <!-- Toast Notification -->
      <div class="toast-notification" *ngIf="toastMessage">
        <span class="toast-icon">✨</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>

      <div class="header-card glass-card">
        <div class="flex-between">
          <div>
            <div class="title-row">
              <h2>Data Profiling & Quality Health Engine</h2>
              <span class="persisted-badge">📈 Automated Data Quality & PII Audit</span>
            </div>
            <p class="subtitle">Row counts, distinct distribution, null ratios, PII tagging, and composite quality scores</p>
          </div>
          <button class="btn-primary glow-btn" (click)="runProfiling()" [disabled]="isProfiling">
            <span *ngIf="!isProfiling">📈 Execute Profiling</span>
            <span *ngIf="isProfiling">⏳ Profiling Datasets...</span>
          </button>
        </div>
      </div>

      <div class="grid-cards" style="margin-top: 10px;">
        <div class="glass-card profile-card" *ngFor="let prof of profilingResults">
          <div class="flex-between">
            <span class="table-title font-mono text-cyan">Catalog #{{ prof.metadata_catalog_id | slice:0:8 }}</span>
            <span class="quality-badge" [class.high]="prof.quality_score >= 90">Quality: {{ prof.quality_score }}%</span>
          </div>
          <div class="row-count">
            <span class="lbl">Total Rows:</span> <span class="val font-mono">{{ prof.row_count | number }}</span>
          </div>
          <div class="stats-list" *ngIf="getColumnStats(prof) as colStats">
            <div class="stat-item" *ngFor="let col of colStats | keyvalue">
              <div class="flex-between">
                <span class="col-name font-mono">{{ col.key }}</span>
                <span class="pii-tag" *ngIf="$any(col.value)?.pii_tagged">🔒 PII: {{ $any(col.value)?.pii_type }}</span>
              </div>
              <div class="stat-meta">
                <span>Nulls: {{ ($any(col.value)?.null_pct || 0) * 100 | number:'1.0-1' }}%</span>
                <span *ngIf="$any(col.value)?.distinct_count">Distinct: {{ $any(col.value)?.distinct_count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state-card glass-card" *ngIf="profilingResults.length === 0">
        <p style="font-size: 15px; font-weight: 600; color: var(--text-primary);">No Profiling Reports Generated Yet</p>
        <p style="font-size: 13px; color: var(--text-secondary);">Click <strong>Execute Profiling</strong> above to run automated statistical profiling across your mapped tables.</p>
      </div>
    </div>
  `,
  styles: [`
    .profiling-container { display: flex; flex-direction: column; gap: 16px; position: relative; }
    .header-card { padding: 20px 24px; }
    .title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
    .persisted-badge {
      font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
      background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 20px;
    }
    .subtitle { color: var(--text-secondary); font-size: 13px; margin: 0; }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet));
      color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.2s ease;
    }
    .btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .glow-btn { box-shadow: 0 0 16px rgba(6, 182, 212, 0.35); }

    .profile-card { display: flex; flex-direction: column; gap: 12px; padding: 18px; }
    .table-title { font-weight: 700; font-size: 15px; }
    .quality-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 12px; background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); }
    .quality-badge.high { background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); }
    .row-count { font-size: 13px; }
    .lbl { color: var(--text-secondary); }
    .val { font-weight: 700; color: var(--accent-cyan); margin-left: 6px; }
    .text-cyan { color: var(--accent-cyan); }
    .font-mono { font-family: var(--font-mono); }
    .stats-list { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }
    .stat-item { background: var(--bg-surface); padding: 8px 12px; border-radius: 6px; font-size: 12px; display: flex; flex-direction: column; gap: 4px; border: 1px solid rgba(255, 255, 255, 0.04); }
    .col-name { font-weight: 600; color: var(--text-primary); }
    .pii-tag { font-size: 10px; background: rgba(244, 63, 94, 0.2); color: var(--accent-rose); padding: 1px 6px; border-radius: 4px; font-weight: 600; }
    .stat-meta { color: var(--text-secondary); display: flex; gap: 12px; font-size: 11px; }
    .empty-state-card { text-align: center; padding: 36px; color: var(--text-secondary); }

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
export class ProfilingComponent implements OnInit, OnDestroy {
  projectId: string = '11111111-1111-1111-1111-111111111111';
  profilingResults: any[] = [];
  isProfiling = false;

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
        this.loadProfiling();
      }
    });
    this.projectId = this.projectStateService.currentProjectId;
    this.loadProfiling();
  }

  ngOnDestroy() {
    if (this.projectSub) this.projectSub.unsubscribe();
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage = null, 3500);
  }

  loadProfiling() {
    this.apiService.getProfilingResults(this.projectId).subscribe({
      next: (res) => this.profilingResults = res,
      error: (err) => this.showToast('Failed to load profiling results: ' + (err.error?.detail || err.message || 'Server Error'))
    });
  }

  getColumnStats(prof: any): any {
    if (!prof.column_stats_json) return {};
    if (typeof prof.column_stats_json === 'object') return prof.column_stats_json;
    try {
      return JSON.parse(prof.column_stats_json);
    } catch {
      return {};
    }
  }

  runProfiling() {
    this.apiService.getSourceConnections(this.projectId).subscribe({
      next: (conns) => {
        if (!conns || conns.length === 0) {
          this.showToast('Please configure a source connection first under Database Connectors');
          return;
        }
        this.isProfiling = true;
        this.apiService.runProfiling(this.projectId, conns[0].id).subscribe({
          next: (res) => {
            this.profilingResults = res;
            this.isProfiling = false;
            this.showToast(`✨ Profiling completed across ${res.length} catalog tables!`);
          },
          error: (err) => {
            this.isProfiling = false;
            this.showToast('Profiling failed: ' + (err.error?.detail || err.message));
          }
        });
      },
      error: () => this.showToast('Failed to check database connectors.')
    });
  }
}
