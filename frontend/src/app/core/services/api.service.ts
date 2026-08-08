import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:8000/api/v1';

  constructor(private http: HttpClient) {}

  getProjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/projects`);
  }

  createProject(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/projects`, payload);
  }

  getDashboardMetrics(projectId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${projectId}/dashboard/metrics`);
  }

  getSourceConnections(projectId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/projects/${projectId}/source-connections`);
  }

  createSourceConnection(projectId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/projects/${projectId}/source-connections`, payload);
  }

  testSourceConnection(projectId: string, connId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/projects/${projectId}/source-connections/${connId}/test`, {});
  }

  discoverMetadata(projectId: string, connId: string): Observable<any[]> {
    const params = new HttpParams().set('connection_id', connId);
    return this.http.post<any[]>(`${this.baseUrl}/projects/${projectId}/metadata/discover`, {}, { params });
  }

  getMetadata(projectId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/projects/${projectId}/metadata`);
  }

  runProfiling(projectId: string, connId: string): Observable<any[]> {
    const params = new HttpParams().set('connection_id', connId);
    return this.http.post<any[]>(`${this.baseUrl}/projects/${projectId}/profiling/run`, {}, { params });
  }

  getProfilingResults(projectId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/projects/${projectId}/profiling`);
  }

  generateGraph(projectId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${projectId}/graph/generate`);
  }

  generateOntology(projectId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${projectId}/ontology/generate`);
  }

  exportOntology(projectId: string, format: string): Observable<string> {
    return this.http.post(`${this.baseUrl}/projects/${projectId}/ontology/export`, { format }, { responseType: 'text' });
  }

  getRules(projectId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/projects/${projectId}/rules`);
  }

  createRule(projectId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/projects/${projectId}/rules`, payload);
  }

  getWorkflows(projectId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/projects/${projectId}/workflows`);
  }

  triggerWorkflow(projectId: string, wfId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/projects/${projectId}/workflows/${wfId}/trigger`, {});
  }

  getAuditLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/audit-logs`);
  }
}
