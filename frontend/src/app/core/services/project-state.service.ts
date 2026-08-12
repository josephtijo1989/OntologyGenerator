import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ProjectModel {
  id: string;
  name: string;
  code: string;
  description?: string;
  status?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectStateService {
  private defaultProjectId = '11111111-1111-1111-1111-111111111111';

  private activeProjectSubject = new BehaviorSubject<ProjectModel | null>(null);
  public activeProject$: Observable<ProjectModel | null> = this.activeProjectSubject.asObservable();

  private activeProjectIdSubject = new BehaviorSubject<string>(this.defaultProjectId);
  public activeProjectId$: Observable<string> = this.activeProjectIdSubject.asObservable();

  constructor(private apiService: ApiService) {
    this.initializeDefaultProject();
  }

  public get currentProjectId(): string {
    return this.activeProjectIdSubject.getValue() || this.defaultProjectId;
  }

  public get currentProject(): ProjectModel | null {
    return this.activeProjectSubject.getValue();
  }

  public setActiveProject(project: ProjectModel) {
    if (project && project.id) {
      this.activeProjectSubject.next(project);
      this.activeProjectIdSubject.next(project.id);
    }
  }

  public setActiveProjectId(projectId: string) {
    if (projectId) {
      this.activeProjectIdSubject.next(projectId);
    }
  }

  public refreshProjects(): void {
    this.initializeDefaultProject();
  }

  private initializeDefaultProject(): void {
    this.apiService.getProjects().subscribe({
      next: (projects: ProjectModel[]) => {
        if (projects && projects.length > 0) {
          const currentId = this.activeProjectIdSubject.getValue();
          const matched = projects.find(p => p.id === currentId) || projects[0];
          this.setActiveProject(matched);
        } else {
          this.activeProjectIdSubject.next(this.defaultProjectId);
        }
      },
      error: () => {
        this.activeProjectIdSubject.next(this.defaultProjectId);
      }
    });
  }
}
