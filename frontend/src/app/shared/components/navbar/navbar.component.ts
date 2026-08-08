import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="navbar">
      <div class="brand">
        <span class="logo-icon">⚡</span>
        <span class="logo-text">Quick-Pasteur</span>
        <span class="version-badge">v1.0 Enterprise</span>
      </div>
      <div class="nav-controls">
        <button class="theme-toggle-btn" (click)="toggleTheme()">
          <span>{{ (themeService.isDark$ | async) ? '🌙 Dark Mode' : '☀️ Light Mode' }}</span>
        </button>
        <div class="user-chip">
          <span class="user-avatar">SA</span>
          <span class="user-name">Solution Architect</span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      height: 64px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-icon { font-size: 24px; }
    .logo-text {
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .version-badge {
      font-size: 11px;
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent-cyan);
      padding: 2px 8px;
      border-radius: 12px;
      font-family: var(--font-mono);
    }
    .nav-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .theme-toggle-btn {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 6px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .theme-toggle-btn:hover {
      border-color: var(--accent-cyan);
    }
    .user-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface);
      padding: 4px 12px 4px 6px;
      border-radius: 20px;
      border: 1px solid var(--border-color);
    }
    .user-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--accent-violet);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
    }
    .user-name { font-size: 13px; color: var(--text-primary); }
  `]
})
export class NavbarComponent {
  constructor(public themeService: ThemeService) {}

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
