import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-rules-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rules-container">
      <div class="flex-between">
        <div>
          <h2>Business Rules & Data Transformation Engine</h2>
          <p class="subtitle">Validation rules, PII data masking, lookup transformations, and quality rules</p>
        </div>
        <button class="btn-primary" (click)="showModal = true">+ Create Business Rule</button>
      </div>

      <div class="glass-card" style="margin-top: 20px;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Rule Name</th>
              <th>Rule Type</th>
              <th>Version</th>
              <th>Active</th>
              <th>Definition Summary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rule of rules">
              <td class="font-bold">{{ rule.name }}</td>
              <td><span class="type-badge">{{ rule.rule_type }}</span></td>
              <td class="font-mono">v{{ rule.version }}</td>
              <td><span class="status-dot" [class.on]="rule.is_active"></span></td>
              <td class="font-mono text-desc">{{ rule.definition_json | json }}</td>
              <td><button class="btn-sm">Edit</button></td>
            </tr>
            <tr *ngIf="rules.length === 0">
              <td colspan="6" class="empty-msg">No business rules defined yet.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add Rule Modal -->
      <div class="modal-overlay" *ngIf="showModal">
        <div class="glass-card modal-box">
          <h3>Create Business Rule</h3>
          <div class="form-group">
            <label>Rule Name</label>
            <input type="text" [(ngModel)]="newRule.name" placeholder="e.g. Mask Customer Email">
          </div>
          <div class="form-group">
            <label>Rule Type</label>
            <select [(ngModel)]="newRule.rule_type">
              <option value="MASKING">MASKING</option>
              <option value="VALIDATION">VALIDATION</option>
              <option value="TRANSFORMATION">TRANSFORMATION</option>
              <option value="LOOKUP">LOOKUP</option>
              <option value="QUALITY">QUALITY</option>
            </select>
          </div>
          <div class="modal-actions flex-between">
            <button class="btn-secondary" (click)="showModal = false">Cancel</button>
            <button class="btn-primary" (click)="saveRule()">Save Rule</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rules-container { display: flex; flex-direction: column; gap: 16px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; }
    .btn-primary { background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet)); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-sm { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-primary); padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
    .font-bold { font-weight: 600; color: var(--text-primary); }
    .font-mono { font-family: var(--font-mono); }
    .text-desc { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--text-secondary); }
    .type-badge { font-size: 11px; background: rgba(139, 92, 246, 0.2); color: var(--accent-violet); padding: 2px 8px; border-radius: 4px; font-weight: 600; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; background: #64748b; }
    .status-dot.on { background: var(--accent-emerald); }
    .empty-msg { text-align: center; color: var(--text-secondary); padding: 40px; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-box { width: 440px; display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .form-group input, .form-group select { background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px; border-radius: 6px; font-family: inherit; }
  `]
})
export class RulesManagementComponent implements OnInit {
  projectId = "11111111-1111-1111-1111-111111111111";
  rules: any[] = [];
  showModal = false;
  newRule = {
    name: 'Mask Email PII Column',
    rule_type: 'MASKING',
    definition_json: { target_column: 'Email', mask_type: 'SHA256_HASH' },
    is_active: true
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadRules();
  }

  loadRules() {
    this.apiService.getRules(this.projectId).subscribe({
      next: (res) => this.rules = res,
      error: (err) => console.error(err)
    });
  }

  saveRule() {
    this.apiService.createRule(this.projectId, this.newRule).subscribe({
      next: () => {
        this.showModal = false;
        this.loadRules();
      },
      error: (err) => alert('Failed to save rule')
    });
  }
}
