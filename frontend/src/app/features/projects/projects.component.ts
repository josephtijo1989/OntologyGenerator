import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="projects-container">
      <div class="flex-between">
        <div>
          <h2>Enterprise Projects & Isolation</h2>
          <p class="subtitle">Manage multi-tenant project configurations and metadata isolation</p>
        </div>
        <button class="btn-primary" (click)="showCreateModal = true">+ New Project</button>
      </div>

      <div class="grid-cards" style="margin-top: 20px;">
        <div class="glass-card project-card" *ngFor="let proj of projects">
          <div class="proj-header">
            <span class="proj-name">{{ proj.name }}</span>
            <span class="proj-code">{{ proj.code }}</span>
          </div>
          <p class="proj-desc">{{ proj.description || 'No description provided.' }}</p>
          <div class="proj-footer flex-between">
            <span class="status-badge" [class.active]="proj.status === 'ACTIVE'">{{ proj.status }}</span>
            <div class="action-buttons">
              <button class="btn-sm" (click)="cloneProject(proj)">Clone</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Project Modal -->
      <div class="modal-overlay" *ngIf="showCreateModal">
        <div class="glass-card modal-box">
          <h3>Create New Enterprise Project</h3>
          <div class="form-group">
            <label>Project Name</label>
            <input type="text" [(ngModel)]="newProj.name" placeholder="e.g. Core Banking Migration">
          </div>
          <div class="form-group">
            <label>Project Code</label>
            <input type="text" [(ngModel)]="newProj.code" placeholder="e.g. BANK_MIG_01">
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea [(ngModel)]="newProj.description" rows="3"></textarea>
          </div>
          <div class="modal-actions flex-between">
            <button class="btn-secondary" (click)="showCreateModal = false">Cancel</button>
            <button class="btn-primary" (click)="createProject()">Create Project</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .projects-container { display: flex; flex-direction: column; gap: 16px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet));
      color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;
    }
    .btn-secondary { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-sm { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-primary); padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }
    .project-card { display: flex; flex-direction: column; gap: 12px; }
    .proj-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .proj-code { font-family: var(--font-mono); font-size: 12px; color: var(--accent-cyan); background: rgba(6, 182, 212, 0.1); padding: 2px 8px; border-radius: 4px; }
    .proj-desc { font-size: 13px; color: var(--text-secondary); height: 40px; overflow: hidden; }
    .status-badge { font-size: 11px; padding: 2px 8px; border-radius: 12px; background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); }
    .status-badge.active { background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-box { width: 440px; display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .form-group input, .form-group textarea {
      background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px; border-radius: 6px; font-family: inherit;
    }
  `]
})
export class ProjectsComponent implements OnInit {
  projects: any[] = [];
  showCreateModal = false;
  newProj = { name: '', code: '', description: '' };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.apiService.getProjects().subscribe({
      next: (res) => this.projects = res,
      error: (err) => console.error(err)
    });
  }

  createProject() {
    this.apiService.createProject(this.newProj).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.newProj = { name: '', code: '', description: '' };
        this.loadProjects();
      },
      error: (err) => alert(err.error?.detail || 'Failed to create project')
    });
  }

  cloneProject(proj: any) {
    alert(`Cloning project ${proj.name}...`);
  }
}
