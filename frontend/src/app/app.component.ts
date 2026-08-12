import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ProjectsComponent } from './features/projects/projects.component';
import { ConnectorsComponent } from './features/connectors/connectors.component';
import { MetadataComponent } from './features/metadata/metadata.component';
import { ProfilingComponent } from './features/profiling/profiling.component';
import { GraphVisualizerComponent } from './features/graph-visualizer/graph-visualizer.component';
import { OntologyEditorComponent } from './features/ontology-editor/ontology-editor.component';
import { OntologyViewerComponent } from './features/ontology-viewer/ontology-viewer.component';
import { RulesManagementComponent } from './features/rules-management/rules-management.component';
import { WorkflowDesignerComponent } from './features/workflow-designer/workflow-designer.component';
import { AuditLogsComponent } from './features/audit-logs/audit-logs.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    SidebarComponent,
    DashboardComponent,
    ProjectsComponent,
    ConnectorsComponent,
    MetadataComponent,
    ProfilingComponent,
    GraphVisualizerComponent,
    OntologyEditorComponent,
    OntologyViewerComponent,
    RulesManagementComponent,
    WorkflowDesignerComponent,
    AuditLogsComponent
  ],
  template: `
    <div class="app-layout">
      <app-navbar></app-navbar>
      <div class="main-body">
        <app-sidebar [activeTab]="activeTab" (tabSelected)="onTabSelected($event)"></app-sidebar>
        <main class="content-area">
          <app-dashboard *ngIf="activeTab === 'dashboard'"></app-dashboard>
          <app-projects *ngIf="activeTab === 'projects'"></app-projects>
          <app-connectors *ngIf="activeTab === 'connectors'"></app-connectors>
          <app-metadata *ngIf="activeTab === 'metadata'"></app-metadata>
          <app-profiling *ngIf="activeTab === 'profiling'"></app-profiling>
          <app-graph-visualizer *ngIf="activeTab === 'graph-visualizer'"></app-graph-visualizer>
          <app-ontology-editor *ngIf="activeTab === 'ontology-editor'"></app-ontology-editor>
          <app-ontology-viewer *ngIf="activeTab === 'ontology-viewer'"></app-ontology-viewer>
          <app-rules-management *ngIf="activeTab === 'rules-management'"></app-rules-management>
          <app-workflow-designer *ngIf="activeTab === 'workflow-designer'"></app-workflow-designer>
          <app-audit-logs *ngIf="activeTab === 'audit-logs'"></app-audit-logs>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-layout { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg-primary); }
    .main-body { display: flex; flex: 1; }
    .content-area { flex: 1; padding: 24px; overflow-y: auto; height: calc(100vh - 64px); }
  `]
})
export class AppComponent {
  activeTab: string = 'dashboard';

  onTabSelected(tab: string) {
    this.activeTab = tab;
  }
}
