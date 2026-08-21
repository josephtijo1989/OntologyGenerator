import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService, ProjectModel } from '../../core/services/project-state.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="projects-container">
      <!-- Toast Notification -->
      <div class="toast-notification" *ngIf="toastMessage">
        <span class="toast-icon">✨</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>

      <div class="header-card glass-card">
        <div class="flex-between">
          <div>
            <div class="title-row">
              <h2>Enterprise Projects & Multi-Tenant Isolation</h2>
              <span class="active-proj-tag font-mono" *ngIf="currentProjectId">
                Active: {{ getActiveProjectName() }} ({{ currentProjectId | slice:0:8 }}...)
              </span>
            </div>
            <p class="subtitle">Manage multi-tenant project configurations, relational data mappings, and isolated semantic models</p>
          </div>
          <button class="btn-primary glow-btn" (click)="showCreateModal = true">+ New Project</button>
        </div>
      </div>

      <div class="grid-cards" style="margin-top: 10px;">
        <div
          class="glass-card project-card"
          *ngFor="let proj of projects"
          [class.active-card]="proj.id === currentProjectId">
          <div class="proj-header flex-between">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="proj-name">{{ proj.name }}</span>
              <span class="current-badge" *ngIf="proj.id === currentProjectId">⭐ Active Project</span>
            </div>
            <span class="proj-code">{{ proj.code }}</span>
          </div>
          <p class="proj-desc">{{ proj.description || 'Enterprise project data model workspace.' }}</p>
          <div class="proj-footer flex-between">
            <span class="status-badge" [class.active]="proj.status === 'ACTIVE'">{{ proj.status || 'ACTIVE' }}</span>
            <div class="action-buttons">
              <button
                class="btn-sm"
                [class.btn-active-select]="proj.id === currentProjectId"
                (click)="selectProject(proj)">
                {{ proj.id === currentProjectId ? '✓ Active' : 'Switch To Project' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Project Modal -->
      <div class="modal-overlay" *ngIf="showCreateModal">
        <div class="glass-card modal-box">
          <div class="flex-between modal-header">
            <h3>Create New Enterprise Project</h3>
            <button class="btn-close" (click)="showCreateModal = false">✕</button>
          </div>
          <div class="form-group">
            <label>Project Name <span style="color: var(--accent-rose);">*</span></label>
            <input type="text" [(ngModel)]="newProj.name" placeholder="Project Name" class="form-input">
          </div>
          <div class="form-group">
            <label>Project Code <span style="color: var(--accent-rose);">*</span></label>
            <input type="text" [(ngModel)]="newProj.code" placeholder="Project Code" class="form-input font-mono">
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea [(ngModel)]="newProj.description" rows="3" placeholder="Project goals and semantic domain context" class="form-input"></textarea>
          </div>
          <div class="modal-actions flex-between" style="margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <button class="btn-secondary" (click)="showCreateModal = false">Cancel</button>
            <button class="btn-primary glow-btn" (click)="createProject()">Create Project</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .projects-container { display: flex; flex-direction: column; gap: 16px; position: relative; }
    .header-card { padding: 20px 24px; }
    .title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; flex-wrap: wrap; }
    .active-proj-tag {
      font-size: 11px;
      font-weight: 700;
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.3);
      padding: 3px 8px;
      border-radius: 6px;
    }
    .subtitle { color: var(--text-secondary); font-size: 13px; margin: 0; }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet));
      color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.2s ease;
    }
    .btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
    .glow-btn { box-shadow: 0 0 16px rgba(6, 182, 212, 0.35); }
    .btn-secondary { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
    .btn-sm { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s ease; }
    .btn-sm:hover { background: rgba(255, 255, 255, 0.08); }
    .btn-active-select { background: rgba(6, 182, 212, 0.2); border-color: var(--accent-cyan); color: var(--accent-cyan); font-weight: 600; }

    .project-card { display: flex; flex-direction: column; gap: 12px; transition: all 0.2s ease; }
    .project-card.active-card { border-color: rgba(6, 182, 212, 0.5); box-shadow: 0 4px 20px rgba(6, 182, 212, 0.15); }
    .proj-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .current-badge { font-size: 10px; font-weight: 700; background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); padding: 2px 6px; border-radius: 4px; }
    .proj-code { font-family: var(--font-mono); font-size: 11px; color: var(--accent-cyan); background: rgba(6, 182, 212, 0.1); padding: 2px 8px; border-radius: 4px; }
    .proj-desc { font-size: 13px; color: var(--text-secondary); height: 40px; overflow: hidden; margin: 0; }
    .status-badge { font-size: 11px; padding: 2px 8px; border-radius: 12px; background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); }
    .status-badge.active { background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-box { width: 480px; max-width: 92vw; display: flex; flex-direction: column; gap: 16px; padding: 24px; }
    .modal-header { border-bottom: 1px solid var(--border-color); padding-bottom: 10px; }
    .modal-header h3 { margin: 0; font-size: 17px; color: var(--accent-cyan); }
    .btn-close { background: transparent; border: none; color: var(--text-secondary); font-size: 16px; cursor: pointer; }
    .form-group { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .form-input {
      background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px; border-radius: 6px; font-family: inherit; font-size: 13px; outline: none;
    }
    .form-input:focus { border-color: var(--accent-cyan); }

    /* Toast Notification */
    .toast-notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #0284c7, #4f46e5);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      z-index: 9999;
      animation: slideInToast 0.3s ease-out;
    }
    @keyframes slideInToast {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .toast-icon { font-size: 18px; }
  `]
})
export class ProjectsComponent implements OnInit {
  projects: any[] = [];
  currentProjectId: string = '';
  showCreateModal = false;
  newProj = { name: '', code: '', description: '' };

  toastMessage: string | null = null;
  private toastTimer: any = null;

  constructor(
    private apiService: ApiService,
    private projectStateService: ProjectStateService
  ) {}

  ngOnInit() {
    this.projectStateService.activeProjectId$.subscribe((id) => {
      this.currentProjectId = id;
    });
    this.loadProjects();
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage = null, 3500);
  }

  getActiveProjectName(): string {
    const p = this.projects.find(x => x.id === this.currentProjectId);
    return p ? p.name : 'Default Project';
  }

  loadProjects() {
    this.apiService.getProjects().subscribe({
      next: (res) => {
        this.projects = res;
        if (res.length > 0 && !this.currentProjectId) {
          this.selectProject(res[0]);
        }
      },
      error: (err) => this.showToast('Failed to load projects: ' + (err.error?.detail || err.message || 'Server Error'))
    });
  }

  selectProject(proj: ProjectModel) {
    this.projectStateService.setActiveProject(proj);
    this.currentProjectId = proj.id;
    this.showToast(`Switched active project workspace to: "${proj.name}"`);
  }

  createProject() {
    if (!this.newProj.name.trim() || !this.newProj.code.trim()) {
      this.showToast('Please provide both Project Name and Project Code.');
      return;
    }
    this.apiService.createProject(this.newProj).subscribe({
      next: (created: any) => {
        this.showCreateModal = false;
        this.newProj = { name: '', code: '', description: '' };
        this.loadProjects();
        if (created) {
          this.selectProject(created);
        }
        this.showToast('New enterprise project created successfully!');
      },
      error: (err) => this.showToast(err.error?.detail || 'Failed to create project')
    });
  }
}
