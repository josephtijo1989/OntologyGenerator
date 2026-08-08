import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-metadata',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metadata-container">
      <div class="flex-between">
        <div>
          <h2>Relational Metadata Discovery & Domain Classification</h2>
          <p class="subtitle">Discovered schemas, primary keys, foreign keys, and inferred business domain roles</p>
        </div>
        <button class="btn-primary" (click)="runDiscovery()">⚡ Trigger Auto Discovery</button>
      </div>

      <div class="glass-card" style="margin-top: 20px;">
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
              <td>{{ cat.schema_name }}</td>
              <td class="font-bold">{{ cat.table_name }}</td>
              <td><span class="type-tag">{{ cat.object_type }}</span></td>
              <td><span class="domain-tag" [ngClass]="cat.inferred_domain_type">{{ cat.inferred_domain_type }}</span></td>
              <td class="font-mono">{{ cat.columns_json?.length || 0 }}</td>
              <td class="font-mono">{{ cat.primary_keys_json?.join(', ') || 'None' }}</td>
              <td class="font-mono">{{ cat.foreign_keys_json?.length || 0 }} FKs</td>
            </tr>
            <tr *ngIf="catalogs.length === 0">
              <td colspan="7" class="empty-msg">No metadata catalogs discovered yet. Click "Trigger Auto Discovery".</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .metadata-container { display: flex; flex-direction: column; gap: 16px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; }
    .btn-primary { background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet)); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
    .data-table th { color: var(--text-secondary); font-weight: 600; }
    .font-bold { font-weight: 600; color: var(--text-primary); }
    .font-mono { font-family: var(--font-mono); }
    .type-tag { font-size: 11px; background: var(--bg-surface); padding: 2px 6px; border-radius: 4px; color: var(--text-secondary); }
    .domain-tag { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .domain-tag.Fact { background: rgba(139, 92, 246, 0.2); color: var(--accent-violet); }
    .domain-tag.Dimension { background: rgba(6, 182, 212, 0.2); color: var(--accent-cyan); }
    .domain-tag.Lookup { background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); }
    .empty-msg { text-align: center; color: var(--text-secondary); padding: 40px; }
  `]
})
export class MetadataComponent implements OnInit {
  projectId = "11111111-1111-1111-1111-111111111111";
  catalogs: any[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadMetadata();
  }

  loadMetadata() {
    this.apiService.getMetadata(this.projectId).subscribe({
      next: (res) => this.catalogs = res,
      error: (err) => console.error(err)
    });
  }

  runDiscovery() {
    this.apiService.getSourceConnections(this.projectId).subscribe({
      next: (conns) => {
        if (conns.length === 0) {
          alert('Please configure a source connection first under Database Connectors');
          return;
        }
        const connId = conns[0].id;
        this.apiService.discoverMetadata(this.projectId, connId).subscribe({
          next: (res) => {
            this.catalogs = res;
            alert(`Discovery complete! Discovered ${res.length} tables`);
          },
          error: (err) => alert('Discovery failed: ' + (err.error?.detail || err.message))
        });
      }
    });
  }
}
