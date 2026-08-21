import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-connectors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="connectors-container">
      <!-- Toast Notification -->
      <div class="toast-notification" *ngIf="toastMessage">
        <span class="toast-icon">✨</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>

      <div class="header-card glass-card">
        <div class="flex-between">
          <div>
            <div class="title-row">
              <h2>Database Connectors Framework</h2>
              <span class="persisted-badge">🔌 Multi-Source Plugin Pipeline</span>
            </div>
            <p class="subtitle">Plugin-based architecture supporting 10+ relational database engines & target graph databases</p>
          </div>
          <button class="btn-primary glow-btn" (click)="showModal = true">+ Configure Source Connection</button>
        </div>
      </div>

      <div class="grid-cards" style="margin-top: 10px;">
        <div class="glass-card conn-card" *ngFor="let conn of connections">
          <div class="conn-header flex-between">
            <span class="conn-name">{{ conn.name }}</span>
            <span class="conn-type font-mono">{{ conn.connector_type }}</span>
          </div>
          <div class="conn-details">
            <div><span class="lbl">Host:</span> <span class="font-mono">{{ conn.host }}:{{ conn.port }}</span></div>
            <div><span class="lbl">Database:</span> <span class="font-mono text-cyan">{{ conn.database_name }}</span></div>
            <div><span class="lbl">Status:</span> <span class="text-emerald font-mono">● {{ conn.last_status || 'CONNECTED' }}</span></div>
          </div>
          <div class="conn-actions flex-between" style="border-top: 1px solid var(--border-color); padding-top: 10px;">
            <button class="btn-sm" (click)="testConnection(conn)">⚡ Test Connection</button>
            <span class="tested-at" *ngIf="conn.last_tested_at">Tested {{ conn.last_tested_at | date:'short' }}</span>
          </div>
        </div>
      </div>

      <div class="empty-state-card glass-card" *ngIf="connections.length === 0">
        <p style="font-size: 15px; font-weight: 600; color: var(--text-primary);">No Source Databases Connected</p>
        <p style="font-size: 13px; color: var(--text-secondary);">Click <strong>+ Configure Source Connection</strong> to connect your SQL Server, PostgreSQL, MySQL, or Oracle database.</p>
      </div>

      <!-- Add Connection Modal -->
      <div class="modal-overlay" *ngIf="showModal">
        <div class="glass-card modal-box">
          <div class="flex-between modal-header">
            <h3>New Source Database Connection</h3>
            <button class="btn-close" (click)="showModal = false">✕</button>
          </div>
          <div class="form-group">
            <label>Connection Name <span style="color: var(--accent-rose);">*</span></label>
            <input type="text" [(ngModel)]="newConn.name" placeholder="e.g. Production SQL Server" class="form-input">
          </div>
          <div class="form-group">
            <label>Connector Type</label>
            <select [(ngModel)]="newConn.connector_type" (change)="onConnectorTypeChange()" class="form-select">
              <option value="MSSQL">Microsoft SQL Server / Azure Synapse</option>
              <option value="POSTGRESQL">PostgreSQL / Amazon Redshift</option>
              <option value="MYSQL">MySQL / MariaDB</option>
              <option value="ORACLE">Oracle Database</option>
              <option value="SNOWFLAKE">Snowflake Cloud Data Warehouse</option>
              <option value="SQLITE">SQLite File DB</option>
            </select>
          </div>
          <div class="driver-hint font-mono" *ngIf="driverHint">
            <span>💡 Driver: {{ driverHint }}</span>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>Host Name / IP</label>
              <input type="text" [(ngModel)]="newConn.host" placeholder="e.g. localhost or 192.168.1.10" class="form-input font-mono">
            </div>
            <div class="form-group half">
              <label>Database Port</label>
              <input type="number" [(ngModel)]="newConn.port" placeholder="e.g. 1433" class="form-input font-mono">
            </div>
          </div>
          <div class="form-group">
            <label>Database Name</label>
            <input type="text" [(ngModel)]="newConn.database_name" placeholder="e.g. AnalyticsDB" class="form-input font-mono">
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>Username</label>
              <input type="text" [(ngModel)]="newConn.username" placeholder="e.g. sa or domain user" class="form-input font-mono">
            </div>
            <div class="form-group half">
              <label>Password</label>
              <input type="password" [(ngModel)]="newConn.password" placeholder="Enter database password" class="form-input font-mono">
            </div>
          </div>
          <div class="modal-actions flex-between" style="margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <button class="btn-secondary" (click)="showModal = false">Cancel</button>
            <button class="btn-primary glow-btn" (click)="saveConnection()">Save & Connect</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .connectors-container { display: flex; flex-direction: column; gap: 16px; position: relative; }
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
    .btn-secondary { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
    .btn-sm { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }
    .btn-close { background: transparent; border: none; color: var(--text-secondary); font-size: 16px; cursor: pointer; }

    .conn-card { display: flex; flex-direction: column; gap: 12px; padding: 18px; }
    .conn-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .conn-type { font-size: 11px; background: rgba(139, 92, 246, 0.15); color: var(--accent-violet); padding: 2px 8px; border-radius: 4px; }
    .conn-details { font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
    .lbl { color: var(--text-secondary); }
    .text-cyan { color: var(--accent-cyan); }
    .text-emerald { color: var(--accent-emerald); font-weight: 600; }
    .font-mono { font-family: var(--font-mono); }
    .tested-at { font-size: 11px; color: var(--text-secondary); }

    .empty-state-card { text-align: center; padding: 36px; color: var(--text-secondary); }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-box { width: 500px; max-width: 92vw; display: flex; flex-direction: column; gap: 16px; padding: 24px; }
    .modal-header { border-bottom: 1px solid var(--border-color); padding-bottom: 10px; }
    .modal-header h3 { margin: 0; font-size: 17px; color: var(--accent-cyan); }
    .form-row { display: flex; gap: 12px; }
    .half { flex: 1; }
    .form-group { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .form-input, .form-select { background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px; border-radius: 6px; font-family: inherit; font-size: 13px; outline: none; }
    .form-input:focus, .form-select:focus { border-color: var(--accent-cyan); }

    .driver-hint {
      font-size: 11px;
      color: var(--accent-cyan);
      background: rgba(6, 182, 212, 0.08);
      border: 1px dashed rgba(6, 182, 212, 0.3);
      padding: 6px 10px;
      border-radius: 6px;
    }

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
export class ConnectorsComponent implements OnInit, OnDestroy {
  projectId: string = '11111111-1111-1111-1111-111111111111';
  connections: any[] = [];
  showModal = false;
  driverHint: string = 'PyODBC / PyMSSQL (ODBC Driver 17/18 for SQL Server)';
  newConn = {
    name: '',
    connector_type: 'MSSQL',
    host: '',
    port: null as any,
    database_name: '',
    username: '',
    password: ''
  };

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
        this.loadConnections();
      }
    });
    this.projectId = this.projectStateService.currentProjectId;
    this.loadConnections();
    this.onConnectorTypeChange();
  }

  onConnectorTypeChange() {
    switch (this.newConn.connector_type) {
      case 'MSSQL':
        this.driverHint = 'PyODBC / PyMSSQL (SQL Server sys catalog & metadata views)';
        break;
      case 'MYSQL':
        this.driverHint = 'PyMySQL (MySQL / MariaDB information_schema engine)';
        break;
      case 'POSTGRESQL':
        this.driverHint = 'Psycopg2-binary (PostgreSQL / Redshift catalog engine)';
        break;
      case 'ORACLE':
        this.driverHint = 'oracledb / cx_Oracle (Oracle ALL_TABLES & ALL_TAB_COLUMNS)';
        break;
      case 'SNOWFLAKE':
        this.driverHint = 'snowflake-connector-python';
        break;
      case 'SQLITE':
        this.driverHint = 'sqlite3 (Embedded lightweight file DB driver)';
        break;
      default:
        this.driverHint = '';
    }
  }

  ngOnDestroy() {
    if (this.projectSub) this.projectSub.unsubscribe();
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage = null, 3500);
  }

  loadConnections() {
    this.apiService.getSourceConnections(this.projectId).subscribe({
      next: (res) => this.connections = res,
      error: (err) => this.showToast('Failed to load database connections: ' + (err.error?.detail || err.message || 'Server Error'))
    });
  }

  saveConnection() {
    this.apiService.createSourceConnection(this.projectId, this.newConn).subscribe({
      next: (res) => {
        this.showModal = false;
        this.showToast(`Connection "${this.newConn.name}" saved!`);
        this.testConnection(res);
        this.loadConnections();
      },
      error: (err) => this.showToast(err.error?.detail || 'Failed to save connection')
    });
  }

  testConnection(conn: any) {
    this.apiService.testSourceConnection(this.projectId, conn.id).subscribe({
      next: (res) => {
        this.showToast(`Connection Test Status: ${res.status}`);
        this.loadConnections();
      },
      error: () => this.showToast('Connection Test Failed')
    });
  }
}
