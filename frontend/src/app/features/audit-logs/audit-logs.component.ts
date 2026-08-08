import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="audit-container">
      <div class="flex-between">
        <div>
          <h2>Immutable Enterprise Audit Trail Explorer</h2>
          <p class="subtitle">Complete historical audit records capturing user identities, timestamps, and actions</p>
        </div>
        <button class="btn-secondary" (click)="loadAuditLogs()">🔄 Refresh Audit Trail</button>
      </div>

      <div class="glass-card" style="margin-top: 20px;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>User</th>
              <th>Outcome</th>
              <th>Client IP</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of auditLogs">
              <td class="font-mono">{{ log.created_at | date:'short' }}</td>
              <td class="font-bold">{{ log.action }}</td>
              <td><span class="entity-tag">{{ log.entity_type }}</span></td>
              <td>{{ log.username || 'System' }}</td>
              <td><span class="outcome-badge" [class.success]="log.outcome === 'SUCCESS'">{{ log.outcome }}</span></td>
              <td class="font-mono text-secondary">{{ log.client_ip || '127.0.0.1' }}</td>
            </tr>
            <tr *ngIf="auditLogs.length === 0">
              <td colspan="6" class="empty-msg">No audit log records recorded yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .audit-container { display: flex; flex-direction: column; gap: 16px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; }
    .btn-secondary { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
    .font-bold { font-weight: 600; color: var(--text-primary); }
    .font-mono { font-family: var(--font-mono); }
    .entity-tag { font-size: 11px; background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); padding: 2px 6px; border-radius: 4px; }
    .outcome-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px; background: rgba(244, 63, 94, 0.2); color: var(--accent-rose); }
    .outcome-badge.success { background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); }
    .empty-msg { text-align: center; color: var(--text-secondary); padding: 40px; }
  `]
})
export class AuditLogsComponent implements OnInit {
  auditLogs: any[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadAuditLogs();
  }

  loadAuditLogs() {
    this.apiService.getAuditLogs().subscribe({
      next: (res) => this.auditLogs = res,
      error: (err) => console.error(err)
    });
  }
}
