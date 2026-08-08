import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-ontology-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ontology-container">
      <div class="flex-between">
        <div>
          <h2>Semantic W3C OWL Ontology Editor & Exporter</h2>
          <p class="subtitle">Generated OWL Classes, Datatype Properties, Object Properties, and Serialization</p>
        </div>
        <div class="btn-group">
          <button class="btn-secondary" (click)="exportFormat('turtle')">📥 Export Turtle (.ttl)</button>
          <button class="btn-primary" (click)="exportFormat('xml')">📥 Export OWL/XML</button>
          <button class="btn-secondary" (click)="exportFormat('json-ld')">📥 Export JSON-LD</button>
        </div>
      </div>

      <div class="grid-layout" *ngIf="ontology">
        <!-- Classes Panel -->
        <div class="glass-card panel">
          <h3>OWL Classes ({{ ontology.classes?.length || 0 }})</h3>
          <div class="item-list">
            <div class="class-item" *ngFor="let cls of ontology.classes">
              <div class="flex-between">
                <span class="item-label font-mono">{{ cls.label }}</span>
                <span class="subclass-tag">rdfs:subClassOf owl:Thing</span>
              </div>
              <span class="item-iri">{{ cls.iri }}</span>
            </div>
          </div>
        </div>

        <!-- Properties Panel -->
        <div class="glass-card panel">
          <h3>OWL Properties ({{ ontology.properties?.length || 0 }})</h3>
          <div class="item-list">
            <div class="prop-item" *ngFor="let prop of ontology.properties">
              <div class="flex-between">
                <span class="item-label font-mono">{{ prop.label }}</span>
                <span class="prop-type-tag" [class.obj]="prop.property_type === 'ObjectProperty'">{{ prop.property_type }}</span>
              </div>
              <span class="item-iri">{{ prop.iri }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ontology-container { display: flex; flex-direction: column; gap: 16px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; }
    .btn-group { display: flex; gap: 10px; }
    .btn-primary { background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet)); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
    .grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px; }
    .panel { display: flex; flex-direction: column; gap: 16px; height: 580px; overflow-y: auto; }
    .item-list { display: flex; flex-direction: column; gap: 10px; }
    .class-item, .prop-item { background: var(--bg-primary); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 4px; }
    .item-label { font-weight: 600; color: var(--accent-cyan); }
    .font-mono { font-family: var(--font-mono); }
    .subclass-tag { font-size: 10px; background: rgba(139, 92, 246, 0.15); color: var(--accent-violet); padding: 2px 6px; border-radius: 4px; }
    .prop-type-tag { font-size: 10px; background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); padding: 2px 6px; border-radius: 4px; }
    .prop-type-tag.obj { background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); }
    .item-iri { font-size: 11px; color: var(--text-secondary); word-break: break-all; }
  `]
})
export class OntologyEditorComponent implements OnInit {
  projectId = "11111111-1111-1111-1111-111111111111";
  ontology: any = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadOntology();
  }

  loadOntology() {
    this.apiService.generateOntology(this.projectId).subscribe({
      next: (res) => this.ontology = res,
      error: (err) => console.error(err)
    });
  }

  exportFormat(format: string) {
    this.apiService.exportOntology(this.projectId, format).subscribe({
      next: (text) => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ontology_export.${format === 'turtle' ? 'ttl' : format === 'json-ld' ? 'jsonld' : 'owl'}`;
        a.click();
      },
      error: (err) => alert('Export failed')
    });
  }
}
