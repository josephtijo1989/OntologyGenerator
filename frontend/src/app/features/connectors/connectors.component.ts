import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-connectors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="connectors-container">
      <div class="flex-between">
        <div>
          <h2>Database Connectors Framework</h2>
          <p class="subtitle">Plugin-based architecture supporting 10+ relational databases & graph targets</p>
        </div>
        <button class="btn-primary" (click)="showModal = true">+ Configure Source Connection</button>
      </div>

      <div class="grid-cards" style="margin-top: 20px;">
        <div class="glass-card conn-card" *ngFor="let conn of connections">
          <div class="conn-header flex-between">
            <span class="conn-name">{{ conn.name }}</span>
            <span class="conn-type">{{ conn.connector_type }}</span>
          </div>
          <div class="conn-details">
            <div><span class="lbl">Host:</span> {{ conn.host }}:{{ conn.port }}</div>
            <div><span class="lbl">Database:</span> {{ conn.database_name }}</div>
            <div><span class="lbl">Status:</span> <span class="text-emerald">{{ conn.last_status || 'UNKNOWN' }}</span></div>
          </div>
          <div class="conn-actions flex-between">
            <button class="btn-sm" (click)="testConnection(conn)">Test Connection</button>
            <span class="tested-at" *ngIf="conn.last_tested_at">Tested {{ conn.last_tested_at | date:'short' }}</span>
          </div>
        </div>
      </div>

      <!-- Add Connection Modal -->
      <div class="modal-overlay" *ngIf="showModal">
        <div class="glass-card modal-box">
          <h3>New Source Database Connection</h3>
          <div class="form-group">
            <label>Connection Name</label>
            <input type="text" [(ngModel)]="newConn.name" placeholder="e.g. Production SQL Server">
          </div>
          <div class="form-group">
            <label>Connector Type</label>
            <select [(ngModel)]="newConn.connector_type">
              <option value="MSSQL">Microsoft SQL Server / Azure Synapse</option>
              <option value="POSTGRESQL">PostgreSQL / Amazon Redshift</option>
              <option value="MYSQL">MySQL / MariaDB</option>
              <option value="ORACLE">Oracle Database</option>
              <option value="SNOWFLAKE">Snowflake Cloud Data Warehouse</option>
              <option value="SQLITE">SQLite File DB</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>Host</label>
              <input type="text" [(ngModel)]="newConn.host">
            </div>
            <div class="form-group half">
              <label>Port</label>
              <input type="number" [(ngModel)]="newConn.port">
            </div>
          </div>
          <div class="form-group">
            <label>Database Name</label>
            <input type="text" [(ngModel)]="newConn.database_name">
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>Username</label>
              <input type="text" [(ngModel)]="newConn.username">
            </div>
            <div class="form-group half">
              <label>Password</label>
              <input type="password" [(ngModel)]="newConn.password">
            </div>
          </div>
          <div class="modal-actions flex-between">
            <button class="btn-secondary" (click)="showModal = false">Cancel</button>
            <button class="btn-primary" (click)="saveConnection()">Save & Test</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .connectors-container { display: flex; flex-direction: column; gap: 16px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; }
    .btn-primary { background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet)); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-sm { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-primary); padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }
    .conn-card { display: flex; flex-direction: column; gap: 12px; }
    .conn-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .conn-type { font-family: var(--font-mono); font-size: 11px; background: rgba(139, 92, 246, 0.15); color: var(--accent-violet); padding: 2px 8px; border-radius: 4px; }
    .conn-details { font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
    .lbl { color: var(--text-secondary); }
    .text-emerald { color: var(--accent-emerald); font-weight: 600; }
    .tested-at { font-size: 11px; color: var(--text-secondary); }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-box { width: 500px; display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: flex; gap: 12px; }
    .half { flex: 1; }
    .form-group { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .form-group input, .form-group select { background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px; border-radius: 6px; font-family: inherit; }
  `]
})
export class ConnectorsComponent implements OnInit {
  projectId = "11111111-1111-1111-1111-111111111111";
  connections: any[] = [];
  showModal = false;
  newConn = {
    name: 'Production SQL Server',
    connector_type: 'MSSQL',
    host: 'localhost',
    port: 1433,
    database_name: 'QuickPasteurDB',
    username: 'sa',
    password: 'YourStrongPass123!'
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadConnections();
  }

  loadConnections() {
    this.apiService.getSourceConnections(this.projectId).subscribe({
      next: (res) => this.connections = res,
      error: (err) => console.error(err)
    });
  }

  saveConnection() {
    this.apiService.createSourceConnection(this.projectId, this.newConn).subscribe({
      next: (res) => {
        this.showModal = false;
        this.testConnection(res);
        this.loadConnections();
      },
      error: (err) => alert(err.error?.detail || 'Failed to save connection')
    });
  }

  testConnection(conn: any) {
    this.apiService.testSourceConnection(this.projectId, conn.id).subscribe({
      next: (res) => {
        alert(`Connection Test ${res.status}`);
        this.loadConnections();
      },
      error: (err) => alert('Connection Test Failed')
    });
  }
}
