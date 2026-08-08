import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar">
      <div class="nav-section-title">PLATFORM NAVIGATOR</div>
      <nav class="nav-menu">
        <button
          *ngFor="let item of menuItems"
          class="nav-item"
          [class.active]="activeTab === item.id"
          (click)="selectTab(item.id)">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 16px 12px;
      height: calc(100vh - 64px);
    }
    .nav-section-title {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-secondary);
      letter-spacing: 1px;
      padding: 0 12px 12px 12px;
    }
    .nav-menu {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }
    .nav-item:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-primary);
    }
    .nav-item.active {
      background: linear-gradient(90deg, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.15));
      color: var(--accent-cyan);
      border-left: 3px solid var(--accent-cyan);
    }
    .nav-icon { font-size: 16px; }
  `]
})
export class SidebarComponent {
  @Input() activeTab: string = 'dashboard';
  @Output() tabSelected = new EventEmitter<string>();

  menuItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: '📊' },
    { id: 'projects', label: 'Projects & Isolation', icon: '📁' },
    { id: 'connectors', label: 'Database Connectors', icon: '🔌' },
    { id: 'metadata', label: 'Metadata Discovery', icon: '🔍' },
    { id: 'profiling', label: 'Data Profiling & Quality', icon: '📈' },
    { id: 'graph-visualizer', label: 'Knowledge Graph', icon: '🕸️' },
    { id: 'ontology-editor', label: 'OWL Ontology Editor', icon: '🧠' },
    { id: 'rules-management', label: 'Business Rules Engine', icon: '⚙️' },
    { id: 'workflow-designer', label: 'Workflow Designer', icon: '🔄' },
    { id: 'audit-logs', label: 'Audit Trail Logs', icon: '🛡️' }
  ];

  selectTab(id: string) {
    this.tabSelected.emit(id);
  }
}
