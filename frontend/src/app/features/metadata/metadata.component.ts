import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-metadata',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metadata-container">
      <!-- Toast Notification -->
      <div class="toast-notification" *ngIf="toastMessage">
        <span class="toast-icon">✨</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>

      <div class="header-card glass-card">
        <div class="flex-between">
          <div>
            <div class="title-row">
              <h2>Relational Metadata Discovery & Domain Classification</h2>
              <span class="persisted-badge">📊 Automated Schema Extraction</span>
            </div>
            <p class="subtitle">Discovered schemas, primary keys, foreign key constraints, and ML-inferred business domain roles</p>
          </div>
          <button class="btn-primary glow-btn" (click)="runDiscovery()" [disabled]="isDiscovering">
            <span *ngIf="!isDiscovering">⚡ Trigger Auto Discovery</span>
            <span *ngIf="isDiscovering">⏳ Discovering Schemas...</span>
          </button>
        </div>
      </div>

      <div class="glass-card table-card" style="margin-top: 10px;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Schema</th>
              <th>Table Name</th>
              <th>Object Type</th>
              <th>Inferred Domain</th>
              <th>Columns Count</th>
              <th>Primary Keys</th>
              <th>Foreign Keys</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let cat of catalogs">
              <td class="font-mono">{{ cat.schema_name || 'dbo' }}</td>
              <td class="font-bold text-cyan font-mono">{{ cat.table_name }}</td>
              <td><span class="type-tag">{{ cat.object_type || 'TABLE' }}</span></td>
              <td>
                <span class="domain-tag" [ngClass]="cat.inferred_domain_type || 'Transactional'">
                  {{ cat.inferred_domain_type || 'Transactional' }}
                </span>
              </td>
              <td class="font-mono text-emerald">{{ getColumnsCount(cat) }} columns</td>
              <td class="font-mono text-amber">{{ getPrimaryKeysDisplay(cat) }}</td>
              <td class="font-mono text-violet">{{ getForeignKeysCount(cat) }} FK(s)</td>
            </tr>
            <tr *ngIf="catalogs.length === 0">
              <td colspan="7" class="empty-msg">
                No metadata catalogs discovered yet for this project. Click "Trigger Auto Discovery" above.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .metadata-container { display: flex; flex-direction: column; gap: 16px; position: relative; }
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
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .glow-btn { box-shadow: 0 0 16px rgba(6, 182, 212, 0.35); }

    .table-card { padding: 0; overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
    .data-table th { color: var(--text-secondary); font-weight: 600; background: rgba(15, 23, 42, 0.6); }
    .font-bold { font-weight: 600; }
    .font-mono { font-family: var(--font-mono); }
    .text-cyan { color: var(--accent-cyan); }
    .text-emerald { color: var(--accent-emerald); }
    .text-amber { color: var(--accent-amber); }
    .text-violet { color: var(--accent-violet); }

    .type-tag { font-size: 11px; background: var(--bg-surface); padding: 2px 6px; border-radius: 4px; color: var(--text-secondary); }
    .domain-tag { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .domain-tag.Fact { background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); }
    .domain-tag.Dimension { background: rgba(139, 92, 246, 0.2); color: var(--accent-violet); }
    .domain-tag.Lookup { background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); }
    .domain-tag.Transactional { background: rgba(6, 182, 212, 0.2); color: var(--accent-cyan); }
    .empty-msg { text-align: center; color: var(--text-secondary); padding: 40px; }

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
export class MetadataComponent implements OnInit, OnDestroy {
  projectId: string = '11111111-1111-1111-1111-111111111111';
  catalogs: any[] = [];
  isDiscovering = false;

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
        this.loadMetadata();
      }
    });
    this.projectId = this.projectStateService.currentProjectId;
    this.loadMetadata();
  }

  ngOnDestroy() {
    if (this.projectSub) this.projectSub.unsubscribe();
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage = null, 3500);
  }

  loadMetadata() {
    this.apiService.getMetadata(this.projectId).subscribe({
      next: (res) => this.catalogs = res,
      error: (err) => console.error(err)
    });
  }

  getColumnsCount(cat: any): number {
    if (!cat.columns_json) return 0;
    if (Array.isArray(cat.columns_json)) return cat.columns_json.length;
    try {
      const parsed = typeof cat.columns_json === 'string' ? JSON.parse(cat.columns_json) : cat.columns_json;
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }

  getPrimaryKeysDisplay(cat: any): string {
    if (!cat.primary_keys_json) return 'None';
    if (Array.isArray(cat.primary_keys_json)) return cat.primary_keys_json.join(', ') || 'None';
    try {
      const parsed = typeof cat.primary_keys_json === 'string' ? JSON.parse(cat.primary_keys_json) : cat.primary_keys_json;
      return Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
    } catch {
      return 'None';
    }
  }

  getForeignKeysCount(cat: any): number {
    if (!cat.foreign_keys_json) return 0;
    if (Array.isArray(cat.foreign_keys_json)) return cat.foreign_keys_json.length;
    try {
      const parsed = typeof cat.foreign_keys_json === 'string' ? JSON.parse(cat.foreign_keys_json) : cat.foreign_keys_json;
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }

  runDiscovery() {
    this.apiService.getSourceConnections(this.projectId).subscribe({
      next: (conns) => {
        if (!conns || conns.length === 0) {
          this.showToast('Please configure a source connection first under Database Connectors');
          return;
        }
        const connId = conns[0].id;
        this.isDiscovering = true;
        this.apiService.discoverMetadata(this.projectId, connId).subscribe({
          next: (res) => {
            this.catalogs = res;
            this.isDiscovering = false;
            this.showToast(`✨ Auto discovery complete! Discovered ${res.length} tables`);
          },
          error: (err) => {
            this.isDiscovering = false;
            this.showToast('Discovery failed: ' + (err.error?.detail || err.message));
          }
        });
      },
      error: () => {
        this.showToast('Failed to check database connections.');
      }
    });
  }
}
