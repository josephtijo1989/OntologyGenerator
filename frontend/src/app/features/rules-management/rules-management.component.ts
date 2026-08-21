import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-rules-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rules-container">
      <!-- Toast Notification -->
      <div class="toast-notification" *ngIf="toastMessage">
        <span class="toast-icon">✨</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>

      <div class="header-card glass-card">
        <div class="flex-between">
          <div>
            <div class="title-row">
              <h2>Business Rules & Data Transformation Engine</h2>
              <span class="persisted-badge">⚙️ Rules Engine & PII Masking</span>
            </div>
            <p class="subtitle">Validation rules, PII data masking, lookup transformations, and automated quality checks</p>
          </div>
          <button class="btn-primary glow-btn" (click)="showModal = true">+ Create Business Rule</button>
        </div>
      </div>

      <div class="glass-card table-card" style="margin-top: 10px;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Rule Name</th>
              <th>Rule Type</th>
              <th>Version</th>
              <th>Status</th>
              <th>Definition Summary</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rule of rules">
              <td class="font-bold text-cyan">{{ rule.name }}</td>
              <td><span class="type-badge">{{ rule.rule_type }}</span></td>
              <td class="font-mono">v{{ rule.version || 1 }}</td>
              <td>
                <span class="status-badge" [class.active]="rule.is_active">
                  {{ rule.is_active ? 'ACTIVE' : 'INACTIVE' }}
                </span>
              </td>
              <td class="font-mono text-desc">{{ getDefinitionDisplay(rule) }}</td>
            </tr>
            <tr *ngIf="rules.length === 0">
              <td colspan="5" class="empty-msg">No business rules defined yet. Click "+ Create Business Rule" above.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add Rule Modal -->
      <div class="modal-overlay" *ngIf="showModal">
        <div class="glass-card modal-box">
          <div class="flex-between modal-header">
            <h3>Create Business Rule</h3>
            <button class="btn-close" (click)="showModal = false">✕</button>
          </div>
          <div class="form-group">
            <label>Rule Name <span style="color: var(--accent-rose);">*</span></label>
            <input type="text" [(ngModel)]="newRule.name" placeholder="Rule Name" class="form-input">
          </div>
          <div class="form-group">
            <label>Rule Type</label>
            <select [(ngModel)]="newRule.rule_type" class="form-select">
              <option value="MASKING">MASKING (PII Obfuscation)</option>
              <option value="VALIDATION">VALIDATION (Constraint Checking)</option>
              <option value="TRANSFORMATION">TRANSFORMATION (Data Enrichment)</option>
              <option value="LOOKUP">LOOKUP (Reference Mapping)</option>
              <option value="QUALITY">QUALITY (Health Score Threshold)</option>
            </select>
          </div>
          <div class="modal-actions flex-between" style="margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <button class="btn-secondary" (click)="showModal = false">Cancel</button>
            <button class="btn-primary glow-btn" (click)="saveRule()">Save Rule</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rules-container { display: flex; flex-direction: column; gap: 16px; position: relative; }
    .header-card { padding: 20px 24px; }
    .title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
    .persisted-badge {
      font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
      background: rgba(139, 92, 246, 0.15); color: var(--accent-violet);
      border: 1px solid rgba(139, 92, 246, 0.3); padding: 4px 10px; border-radius: 20px;
    }
    .subtitle { color: var(--text-secondary); font-size: 13px; margin: 0; }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet));
      color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.2s ease;
    }
    .btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
    .glow-btn { box-shadow: 0 0 16px rgba(6, 182, 212, 0.35); }
    .btn-secondary { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
    .btn-close { background: transparent; border: none; color: var(--text-secondary); font-size: 16px; cursor: pointer; }

    .table-card { padding: 0; overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
    .data-table th { color: var(--text-secondary); font-weight: 600; background: rgba(15, 23, 42, 0.6); }
    .font-bold { font-weight: 600; }
    .font-mono { font-family: var(--font-mono); }
    .text-cyan { color: var(--accent-cyan); }
    .text-desc { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--text-secondary); }
    .type-badge { font-size: 11px; background: rgba(139, 92, 246, 0.2); color: var(--accent-violet); padding: 2px 8px; border-radius: 4px; font-weight: 600; }
    .status-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(244, 63, 94, 0.15); color: var(--accent-rose); }
    .status-badge.active { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); }
    .empty-msg { text-align: center; color: var(--text-secondary); padding: 40px; }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-box { width: 480px; max-width: 92vw; display: flex; flex-direction: column; gap: 16px; padding: 24px; }
    .modal-header { border-bottom: 1px solid var(--border-color); padding-bottom: 10px; }
    .modal-header h3 { margin: 0; font-size: 17px; color: var(--accent-cyan); }
    .form-group { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .form-input, .form-select { background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px; border-radius: 6px; font-family: inherit; font-size: 13px; outline: none; }
    .form-input:focus, .form-select:focus { border-color: var(--accent-cyan); }

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
export class RulesManagementComponent implements OnInit, OnDestroy {
  projectId: string = '11111111-1111-1111-1111-111111111111';
  rules: any[] = [];
  showModal = false;
  newRule = {
    name: '',
    rule_type: 'MASKING',
    definition_json: {},
    is_active: true
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
        this.loadRules();
      }
    });
    this.projectId = this.projectStateService.currentProjectId;
    this.loadRules();
  }

  ngOnDestroy() {
    if (this.projectSub) this.projectSub.unsubscribe();
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage = null, 3500);
  }

  loadRules() {
    this.apiService.getRules(this.projectId).subscribe({
      next: (res) => this.rules = res,
      error: (err) => this.showToast('Failed to load business rules: ' + (err.error?.detail || err.message || 'Server Error'))
    });
  }

  getDefinitionDisplay(rule: any): string {
    if (!rule.definition_json) return '—';
    if (typeof rule.definition_json === 'string') return rule.definition_json;
    return JSON.stringify(rule.definition_json);
  }

  saveRule() {
    if (!this.newRule.name.trim()) {
      this.showToast('Please provide a Rule Name');
      return;
    }
    this.apiService.createRule(this.projectId, this.newRule).subscribe({
      next: () => {
        this.showModal = false;
        this.loadRules();
        this.showToast(`✨ Rule "${this.newRule.name}" created successfully!`);
      },
      error: (err) => this.showToast('Failed to save rule: ' + (err.error?.detail || err.message))
    });
  }
}
