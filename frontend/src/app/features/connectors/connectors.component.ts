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

      <!-- Main Header -->
      <div class="header-card glass-card">
        <div class="flex-between">
          <div>
            <div class="title-row">
              <h2>Database Connectors Framework</h2>
              <span class="persisted-badge">🔌 Multi-Source & Target Graph Pipeline</span>
            </div>
            <p class="subtitle">Plugin-based architecture supporting 10+ relational database engines & target graph databases</p>
          </div>
          <div class="header-buttons">
            <button class="btn-secondary" (click)="openTargetDbModal()">
              🎯 Edit Target DB Details
            </button>
            <button class="btn-primary glow-btn" (click)="openCreateSourceModal()">
              + Configure Source Connection
            </button>
          </div>
        </div>
      </div>

      <!-- Target Graph Database Section -->
      <div class="target-db-section">
        <div class="glass-card target-card">
          <div class="target-header flex-between">
            <div class="target-title-group">
              <span class="target-icon">🎯</span>
              <div>
                <h3>Target Knowledge Graph Database</h3>
                <p class="target-sub font-mono">
                  Engine: <strong class="text-violet">{{ targetGraph.target_type }}</strong> | Host: <strong class="text-cyan">{{ targetGraph.host }}:{{ targetGraph.port }}</strong> | Database: <strong class="text-emerald">{{ targetGraph.database_name || 'neo4j' }}</strong>
                </p>
              </div>
            </div>
            <div class="target-actions">
              <button class="btn-sm btn-outline-cyan" (click)="testTargetConnection()">⚡ Test Target Connection</button>
              <button class="btn-sm btn-primary-violet" (click)="openTargetDbModal()">✏️ Edit Target DB Details</button>
            </div>
          </div>
          <div class="target-body-grid">
            <div class="t-stat-box">
              <span class="t-lbl">Target Database Engine</span>
              <span class="t-val text-violet font-mono">{{ targetGraph.target_type }}</span>
            </div>
            <div class="t-stat-box">
              <span class="t-lbl">Host Address & Port</span>
              <span class="t-val text-cyan font-mono">{{ targetGraph.host }}:{{ targetGraph.port }}</span>
            </div>
            <div class="t-stat-box">
              <span class="t-lbl">Graph Database Name</span>
              <span class="t-val text-emerald font-mono">{{ targetGraph.database_name || 'neo4j' }}</span>
            </div>
            <div class="t-stat-box">
              <span class="t-lbl">Auth User</span>
              <span class="t-val font-mono">{{ targetGraph.username || 'neo4j' }}</span>
            </div>
            <div class="t-stat-box">
              <span class="t-lbl">Connection Status</span>
              <span class="t-val text-emerald font-mono">● {{ targetGraphStatus }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Source Database Connections Section -->
      <div class="section-title-row flex-between" style="margin-top: 10px;">
        <h3 class="section-heading">Source Database Connections ({{ connections.length }})</h3>
      </div>

      <div class="grid-cards">
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
            <div class="card-btn-group">
              <button class="btn-sm btn-icon-only" (click)="editSourceConnection(conn)" title="Edit Connection">✏️ Edit</button>
              <button class="btn-sm btn-danger" (click)="deleteSourceConnection(conn)" title="Delete Connection">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state-card glass-card" *ngIf="connections.length === 0">
        <p style="font-size: 15px; font-weight: 600; color: var(--text-primary);">No Source Databases Connected</p>
        <p style="font-size: 13px; color: var(--text-secondary);">Click <strong>+ Configure Source Connection</strong> to connect your SQL Server, PostgreSQL, MySQL, or Oracle database.</p>
      </div>

      <!-- Add / Edit Source Connection Modal -->
      <div class="modal-overlay" *ngIf="showSourceModal">
        <div class="glass-card modal-box">
          <div class="flex-between modal-header">
            <h3>{{ editingSourceConnId ? 'Edit Source Connection' : 'New Source Database Connection' }}</h3>
            <button class="btn-close" (click)="showSourceModal = false">✕</button>
          </div>
          <div class="form-group">
            <label>Connection Name <span style="color: var(--accent-rose);">*</span></label>
            <input type="text" [(ngModel)]="newConn.name" placeholder="Connection Name" class="form-input">
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
              <input type="text" [(ngModel)]="newConn.host" placeholder="Host Name or IP Address" class="form-input font-mono">
            </div>
            <div class="form-group half">
              <label>Database Port</label>
              <input type="number" [(ngModel)]="newConn.port" placeholder="Port Number" class="form-input font-mono">
            </div>
          </div>
          <div class="form-group">
            <label>Database Name</label>
            <input type="text" [(ngModel)]="newConn.database_name" placeholder="Database Name" class="form-input font-mono">
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>Username</label>
              <input type="text" [(ngModel)]="newConn.username" placeholder="Username" class="form-input font-mono">
            </div>
            <div class="form-group half">
              <label>Password</label>
              <input type="password" [(ngModel)]="newConn.password" placeholder="Password" class="form-input font-mono">
            </div>
          </div>
          <div class="modal-actions flex-between" style="margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <button class="btn-secondary" (click)="showSourceModal = false">Cancel</button>
            <button class="btn-primary glow-btn" (click)="saveSourceConnection()">
              {{ editingSourceConnId ? 'Update Connection' : 'Save & Connect' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Edit Target DB Details Modal -->
      <div class="modal-overlay" *ngIf="showTargetDbModal">
        <div class="glass-card modal-box">
          <div class="flex-between modal-header">
            <h3>Configure & Edit Target Graph Database</h3>
            <button class="btn-close" (click)="showTargetDbModal = false">✕</button>
          </div>
          <div class="form-group">
            <label>Configuration Name <span style="color: var(--accent-rose);">*</span></label>
            <input type="text" [(ngModel)]="targetDbForm.name" placeholder="Target DB Connection Name" class="form-input">
          </div>
          <div class="form-group">
            <label>Target Graph Database Engine</label>
            <select [(ngModel)]="targetDbForm.target_type" (change)="onTargetTypeChange()" class="form-select">
              <option value="NEO4J">Neo4j Enterprise / Community (Bolt protocol)</option>
              <option value="MEMGRAPH">Memgraph Graph Database (Cypher / Bolt)</option>
              <option value="APACHE_AGE">Apache AGE (PostgreSQL Extension)</option>
              <option value="NEPTUNE">AWS Neptune Graph Database</option>
            </select>
          </div>
          <div class="driver-hint font-mono">
            <span>💡 Target Engine Protocol: {{ targetEngineHint }}</span>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>Host Name / IP</label>
              <input type="text" [(ngModel)]="targetDbForm.host" placeholder="e.g. 127.0.0.1 or bolt://neo4j" class="form-input font-mono">
            </div>
            <div class="form-group half">
              <label>Port</label>
              <input type="number" [(ngModel)]="targetDbForm.port" placeholder="7687" class="form-input font-mono">
            </div>
          </div>
          <div class="form-group">
            <label>Graph Database Name</label>
            <input type="text" [(ngModel)]="targetDbForm.database_name" placeholder="neo4j" class="form-input font-mono">
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>Username</label>
              <input type="text" [(ngModel)]="targetDbForm.username" placeholder="neo4j" class="form-input font-mono">
            </div>
            <div class="form-group half">
              <label>Password</label>
              <input type="password" [(ngModel)]="targetDbForm.password" placeholder="******" class="form-input font-mono">
            </div>
          </div>
          <div class="modal-actions flex-between" style="margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <button class="btn-secondary" (click)="testTargetDbModal()">⚡ Test Target Connection</button>
            <div class="modal-btn-right flex-row" style="gap: 8px;">
              <button class="btn-secondary" (click)="showTargetDbModal = false">Cancel</button>
              <button class="btn-primary glow-btn" (click)="saveTargetDb()">💾 Save Target DB Details</button>
            </div>
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
    .header-buttons { display: flex; gap: 10px; align-items: center; }

    /* Target DB Section Styling */
    .target-db-section { display: flex; flex-direction: column; gap: 10px; }
    .target-card { border-left: 4px solid var(--accent-violet); padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; background: rgba(139, 92, 246, 0.04); }
    .target-title-group { display: flex; align-items: center; gap: 14px; }
    .target-icon { font-size: 26px; }
    .target-title-group h3 { margin: 0 0 4px 0; font-size: 17px; font-weight: 700; color: var(--accent-violet); }
    .target-sub { font-size: 12px; color: var(--text-secondary); margin: 0; }
    .target-actions { display: flex; gap: 10px; }
    .target-body-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; background: rgba(0, 0, 0, 0.15); padding: 14px; border-radius: 8px; border: 1px solid var(--border-color); }
    .t-stat-box { display: flex; flex-direction: column; gap: 4px; }
    .t-lbl { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; }
    .t-val { font-size: 13px; font-weight: 700; color: var(--text-primary); }

    .section-title-row { margin-bottom: 2px; }
    .section-heading { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0; }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet));
      color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.2s ease;
    }
    .btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
    .glow-btn { box-shadow: 0 0 16px rgba(6, 182, 212, 0.35); }
    .btn-secondary { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.08); }
    .btn-sm { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }
    .btn-sm:hover { background: rgba(255, 255, 255, 0.1); }
    .btn-outline-cyan { border-color: rgba(6, 182, 212, 0.5); color: var(--accent-cyan); }
    .btn-primary-violet { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; font-weight: 600; }
    .btn-danger { color: #f43f5e; border-color: rgba(244, 63, 94, 0.3); }
    .btn-danger:hover { background: rgba(244, 63, 94, 0.15); }
    .btn-close { background: transparent; border: none; color: var(--text-secondary); font-size: 16px; cursor: pointer; }
    .card-btn-group { display: flex; gap: 6px; }

    .conn-card { display: flex; flex-direction: column; gap: 12px; padding: 18px; }
    .conn-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .conn-type { font-size: 11px; background: rgba(139, 92, 246, 0.15); color: var(--accent-violet); padding: 2px 8px; border-radius: 4px; }
    .conn-details { font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
    .lbl { color: var(--text-secondary); }
    .text-cyan { color: var(--accent-cyan); }
    .text-violet { color: var(--accent-violet); }
    .text-emerald { color: var(--accent-emerald); font-weight: 600; }
    .font-mono { font-family: var(--font-mono); }

    .empty-state-card { text-align: center; padding: 36px; color: var(--text-secondary); }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-box { width: 520px; max-width: 92vw; display: flex; flex-direction: column; gap: 16px; padding: 24px; }
    .modal-header { border-bottom: 1px solid var(--border-color); padding-bottom: 10px; }
    .modal-header h3 { margin: 0; font-size: 17px; color: var(--accent-cyan); }
    .form-row { display: flex; gap: 12px; }
    .flex-row { display: flex; align-items: center; }
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
  
  // Target Graph Database state
  targetGraph: any = {
    name: 'Enterprise Target Graph Cluster',
    target_type: 'NEO4J',
    host: '127.0.0.1',
    port: 7687,
    database_name: 'neo4j',
    username: 'neo4j'
  };
  targetGraphStatus: string = 'ONLINE';

  // Modals
  showSourceModal = false;
  editingSourceConnId: string | null = null;

  showTargetDbModal = false;
  targetEngineHint: string = 'Neo4j Bolt Protocol (bolt:// standard connector port 7687)';

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

  targetDbForm = {
    name: 'Enterprise Target Graph Cluster',
    target_type: 'NEO4J',
    host: '127.0.0.1',
    port: 7687,
    database_name: 'neo4j',
    username: 'neo4j',
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
        this.loadTargetDbConfig();
      }
    });
    this.projectId = this.projectStateService.currentProjectId;
    this.loadConnections();
    this.loadTargetDbConfig();
    this.onConnectorTypeChange();
    this.onTargetTypeChange();
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

  loadTargetDbConfig() {
    this.apiService.getGraphConfigs(this.projectId).subscribe({
      next: (configs) => {
        if (configs && configs.length > 0) {
          const cfg = configs[configs.length - 1];
          this.targetGraph = cfg;
          this.targetDbForm = {
            name: cfg.name || 'Enterprise Target Graph Cluster',
            target_type: cfg.target_type || 'NEO4J',
            host: cfg.host || '127.0.0.1',
            port: cfg.port || 7687,
            database_name: cfg.database_name || 'neo4j',
            username: cfg.username || 'neo4j',
            password: ''
          };
          this.onTargetTypeChange();
        }
      },
      error: () => {}
    });
  }

  openCreateSourceModal() {
    this.editingSourceConnId = null;
    this.newConn = {
      name: '',
      connector_type: 'MSSQL',
      host: '',
      port: 1433,
      database_name: '',
      username: '',
      password: ''
    };
    this.onConnectorTypeChange();
    this.showSourceModal = true;
  }

  editSourceConnection(conn: any) {
    this.editingSourceConnId = conn.id;
    this.newConn = {
      name: conn.name,
      connector_type: conn.connector_type,
      host: conn.host,
      port: conn.port,
      database_name: conn.database_name,
      username: conn.username,
      password: ''
    };
    this.onConnectorTypeChange();
    this.showSourceModal = true;
  }

  saveSourceConnection() {
    if (!this.newConn.name) {
      this.showToast('Please provide a connection name.');
      return;
    }

    if (this.editingSourceConnId) {
      this.apiService.updateSourceConnection(this.projectId, this.editingSourceConnId, this.newConn).subscribe({
        next: (res) => {
          this.showSourceModal = false;
          this.showToast(`Connection "${this.newConn.name}" updated successfully!`);
          this.testConnection(res);
          this.loadConnections();
        },
        error: (err) => this.showToast(err.error?.detail || 'Failed to update connection')
      });
    } else {
      this.apiService.createSourceConnection(this.projectId, this.newConn).subscribe({
        next: (res) => {
          this.showSourceModal = false;
          this.showToast(`Connection "${this.newConn.name}" saved!`);
          this.testConnection(res);
          this.loadConnections();
        },
        error: (err) => this.showToast(err.error?.detail || 'Failed to save connection')
      });
    }
  }

  deleteSourceConnection(conn: any) {
    if (confirm(`Are you sure you want to delete source connection "${conn.name}"?`)) {
      this.apiService.deleteSourceConnection(this.projectId, conn.id).subscribe({
        next: () => {
          this.showToast(`Connection "${conn.name}" deleted.`);
          this.loadConnections();
        },
        error: (err) => this.showToast('Failed to delete connection: ' + (err.error?.detail || err.message))
      });
    }
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

  // Target DB Modal & Actions
  openTargetDbModal() {
    this.targetDbForm = {
      name: this.targetGraph.name || 'Enterprise Target Graph Cluster',
      target_type: this.targetGraph.target_type || 'NEO4J',
      host: this.targetGraph.host || '127.0.0.1',
      port: this.targetGraph.port || 7687,
      database_name: this.targetGraph.database_name || 'neo4j',
      username: this.targetGraph.username || 'neo4j',
      password: ''
    };
    this.onTargetTypeChange();
    this.showTargetDbModal = true;
  }

  onTargetTypeChange() {
    switch (this.targetDbForm.target_type) {
      case 'NEO4J':
        this.targetEngineHint = 'Neo4j Bolt Protocol (bolt:// standard connector port 7687)';
        if (!this.targetDbForm.port) this.targetDbForm.port = 7687;
        break;
      case 'MEMGRAPH':
        this.targetEngineHint = 'Memgraph Enterprise Graph DB (Cypher / Bolt port 7687)';
        if (!this.targetDbForm.port) this.targetDbForm.port = 7687;
        break;
      case 'APACHE_AGE':
        this.targetEngineHint = 'Apache AGE (PostgreSQL Graph Extension - standard port 5432)';
        if (!this.targetDbForm.port) this.targetDbForm.port = 5432;
        break;
      case 'NEPTUNE':
        this.targetEngineHint = 'AWS Neptune Graph Database (Gremlin / SPARQL port 8182)';
        if (!this.targetDbForm.port) this.targetDbForm.port = 8182;
        break;
    }
  }

  saveTargetDb() {
    this.apiService.saveGraphConfig(this.projectId, this.targetDbForm).subscribe({
      next: (res) => {
        this.targetGraph = res;
        this.showTargetDbModal = false;
        this.showToast(`Target Graph DB details updated to ${res.target_type} at ${res.host}:${res.port}!`);
        this.testTargetConnection();
      },
      error: (err) => this.showToast('Failed to update Target DB details: ' + (err.error?.detail || err.message))
    });
  }

  testTargetConnection() {
    const payload = {
      host: this.targetGraph.host || '127.0.0.1',
      port: this.targetGraph.port || 7687,
      target_type: this.targetGraph.target_type || 'NEO4J',
      database_name: this.targetGraph.database_name || 'neo4j',
      username: this.targetGraph.username || 'neo4j'
    };
    this.apiService.testGraphConnection(this.projectId, payload).subscribe({
      next: (res) => {
        this.targetGraphStatus = res.status || 'ONLINE';
        this.showToast(res.message || `Target Graph DB Status: ${res.status}`);
      },
      error: (err) => {
        this.targetGraphStatus = 'OFFLINE';
        this.showToast('Target Graph DB Test Failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  testTargetDbModal() {
    const payload = {
      host: this.targetDbForm.host || '127.0.0.1',
      port: this.targetDbForm.port || 7687,
      target_type: this.targetDbForm.target_type || 'NEO4J',
      database_name: this.targetDbForm.database_name || 'neo4j',
      username: this.targetDbForm.username || 'neo4j'
    };
    this.apiService.testGraphConnection(this.projectId, payload).subscribe({
      next: (res) => this.showToast(res.message || `Test Result: ${res.status}`),
      error: (err) => this.showToast('Test Failed: ' + (err.error?.detail || err.message))
    });
  }

  onConnectorTypeChange() {
    switch (this.newConn.connector_type) {
      case 'MSSQL':
        this.driverHint = 'PyODBC / PyMSSQL (SQL Server sys catalog & metadata views)';
        if (!this.newConn.port) this.newConn.port = 1433;
        break;
      case 'MYSQL':
        this.driverHint = 'PyMySQL (MySQL / MariaDB information_schema engine)';
        if (!this.newConn.port) this.newConn.port = 3306;
        break;
      case 'POSTGRESQL':
        this.driverHint = 'Psycopg2-binary (PostgreSQL / Redshift catalog engine)';
        if (!this.newConn.port) this.newConn.port = 5432;
        break;
      case 'ORACLE':
        this.driverHint = 'oracledb / cx_Oracle (Oracle ALL_TABLES & ALL_TAB_COLUMNS)';
        if (!this.newConn.port) this.newConn.port = 1521;
        break;
      case 'SNOWFLAKE':
        this.driverHint = 'snowflake-connector-python';
        if (!this.newConn.port) this.newConn.port = 443;
        break;
      case 'SQLITE':
        this.driverHint = 'sqlite3 (Embedded lightweight file DB driver)';
        break;
      default:
        this.driverHint = '';
    }
  }
}
