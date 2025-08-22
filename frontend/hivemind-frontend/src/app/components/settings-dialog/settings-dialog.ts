import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiKeysService, ApiKeys, UserPreferences } from '../../services/api-keys.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="settings-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h2>Settings</h2>
        <button class="close-btn" (click)="close()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <div class="tabs-container">
          <div class="tab-nav">
            <button 
              class="tab-button" 
              [class.active]="activeTab === 'keys'" 
              (click)="activeTab = 'keys'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="16" r="1"/>
                <path d="m14 16 2-2 4 4"/>
                <path d="M6 16h6"/>
                <path d="M7.5 13.5 4 10l8-8 3 3-8 8z"/>
              </svg>
              API Keys
            </button>
            <button 
              class="tab-button" 
              [class.active]="activeTab === 'preferences'" 
              (click)="activeTab = 'preferences'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Preferences
            </button>
          </div>

          <!-- API Keys Tab -->
          <div class="tab-content" *ngIf="activeTab === 'keys'">
            <div class="section">
              <div class="section-header">
                <h3>AI Model API Keys</h3>
                <p>Configure your API keys to enable AI model integration. Keys are stored locally and never sent to external servers.</p>
              </div>

              <div class="form-container">
                <!-- OpenAI -->
                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">OpenAI API Key</span>
                    <span class="label-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="16" r="1"/>
                        <path d="m14 16 2-2 4 4"/>
                        <path d="M6 16h6"/>
                        <path d="M7.5 13.5 4 10l8-8 3 3-8 8z"/>
                      </svg>
                    </span>
                  </label>
                  <input 
                    class="form-input"
                    type="password"
                    [(ngModel)]="apiKeys.openai"
                    placeholder="sk-..."
                    autocomplete="off"
                  />
                  <div class="form-help">
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">
                      Get your OpenAI API key
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M7 17L17 7"/>
                        <path d="M7 7h10v10"/>
                      </svg>
                    </a>
                  </div>
                </div>

                <!-- Anthropic -->
                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">Anthropic API Key</span>
                    <span class="label-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="16" r="1"/>
                        <path d="m14 16 2-2 4 4"/>
                        <path d="M6 16h6"/>
                        <path d="M7.5 13.5 4 10l8-8 3 3-8 8z"/>
                      </svg>
                    </span>
                  </label>
                  <input 
                    class="form-input"
                    type="password"
                    [(ngModel)]="apiKeys.anthropic"
                    placeholder="sk-ant-..."
                    autocomplete="off"
                  />
                  <div class="form-help">
                    <a href="https://console.anthropic.com/" target="_blank" rel="noopener">
                      Get your Anthropic API key
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M7 17L17 7"/>
                        <path d="M7 7h10v10"/>
                      </svg>
                    </a>
                  </div>
                </div>

                <!-- Gemini -->
                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">Google Gemini API Key</span>
                    <span class="label-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="16" r="1"/>
                        <path d="m14 16 2-2 4 4"/>
                        <path d="M6 16h6"/>
                        <path d="M7.5 13.5 4 10l8-8 3 3-8 8z"/>
                      </svg>
                    </span>
                  </label>
                  <input 
                    class="form-input"
                    type="password"
                    [(ngModel)]="apiKeys.gemini"
                    placeholder="AI..."
                    autocomplete="off"
                  />
                  <div class="form-help">
                    <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener">
                      Get your Gemini API key
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M7 17L17 7"/>
                        <path d="M7 7h10v10"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              <!-- Status Indicators -->
              <div class="status-grid">
                <div class="status-item" [class.configured]="apiKeys.openai">
                  <div class="status-icon">
                    <svg *ngIf="apiKeys.openai" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <svg *ngIf="!apiKeys.openai" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  </div>
                  <span>OpenAI {{apiKeys.openai ? 'Configured' : 'Not configured'}}</span>
                </div>
                <div class="status-item" [class.configured]="apiKeys.anthropic">
                  <div class="status-icon">
                    <svg *ngIf="apiKeys.anthropic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <svg *ngIf="!apiKeys.anthropic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  </div>
                  <span>Anthropic {{apiKeys.anthropic ? 'Configured' : 'Not configured'}}</span>
                </div>
                <div class="status-item" [class.configured]="apiKeys.gemini">
                  <div class="status-icon">
                    <svg *ngIf="apiKeys.gemini" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <svg *ngIf="!apiKeys.gemini" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  </div>
                  <span>Gemini {{apiKeys.gemini ? 'Configured' : 'Not configured'}}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Preferences Tab -->
          <div class="tab-content" *ngIf="activeTab === 'preferences'">
            <div class="section">
              <div class="section-header">
                <h3>Application Preferences</h3>
                <p>Customize how Hivemind behaves and processes your requests.</p>
              </div>

              <div class="preferences-grid">
                <div class="preference-item">
                  <div class="preference-info">
                    <h4>Auto-create Agents</h4>
                    <p>Automatically create AI agents for configured API keys when the app starts.</p>
                  </div>
                  <div class="preference-control">
                    <label class="toggle-switch">
                      <input type="checkbox" [(ngModel)]="preferences.autoCreateAgents">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="preference-item">
                  <div class="preference-info">
                    <h4>Enable Master AI Evaluation</h4>
                    <p>Use a master AI to evaluate and rank responses from different models for better results.</p>
                  </div>
                  <div class="preference-control">
                    <label class="toggle-switch">
                      <input type="checkbox" [(ngModel)]="preferences.enableMasterAI">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="dialog-actions">
        <button class="btn btn-ghost" (click)="clearAll()">
          Clear All
        </button>
        <div class="spacer"></div>
        <button class="btn btn-ghost" (click)="close()">
          Cancel
        </button>
        <button class="btn btn-primary" (click)="save()">
          Save Settings
        </button>
      </div>
    </div>
  `,
  styles: [`
    .settings-dialog {
      width: 600px;
      max-width: 90vw;
      max-height: 90vh;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-family-sans);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-xl);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-6);
      border-bottom: 1px solid var(--border-light);
      background: var(--bg-primary);
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }

    .close-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .dialog-content {
      max-height: 60vh;
      overflow-y: auto;
      background: var(--bg-primary);
    }

    .tabs-container {
      display: flex;
      flex-direction: column;
    }

    .tab-nav {
      display: flex;
      border-bottom: 1px solid var(--border-light);
      background: var(--bg-secondary);
    }

    .tab-button {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-6);
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      border-bottom: 2px solid transparent;
    }

    .tab-button:hover {
      color: var(--text-primary);
      background: var(--bg-tertiary);
    }

    .tab-button.active {
      color: var(--brand-primary);
      border-bottom-color: var(--brand-primary);
      background: var(--bg-primary);
    }

    .tab-content {
      padding: var(--space-6);
      background: var(--bg-primary);
    }

    .section {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .section-header h3 {
      margin: 0 0 var(--space-2) 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .section-header p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .form-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .label-text {
      flex: 1;
    }

    .label-icon {
      color: var(--text-tertiary);
    }

    .form-input {
      width: 100%;
      padding: var(--space-3) var(--space-4);
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 0.875rem;
      font-family: var(--font-family-sans);
      transition: all 0.15s ease-in-out;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--brand-primary);
      box-shadow: 0 0 0 3px var(--brand-primary-light);
      background: var(--bg-primary);
    }

    .form-input:hover {
      border-color: var(--border-medium);
    }

    .form-input::placeholder {
      color: var(--text-tertiary);
    }

    .form-help {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .form-help a {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      color: var(--brand-primary);
      text-decoration: none;
      font-size: 0.75rem;
      transition: opacity 0.15s ease-in-out;
    }

    .form-help a:hover {
      opacity: 0.8;
      text-decoration: underline;
    }

    .status-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-4);
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .status-item.configured {
      color: var(--success);
    }

    .status-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
    }

    .preferences-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .preference-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4);
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      transition: all 0.15s ease-in-out;
    }

    .preference-item:hover {
      border-color: var(--border-medium);
      box-shadow: var(--shadow-sm);
    }

    .preference-info {
      flex: 1;
    }

    .preference-info h4 {
      margin: 0 0 var(--space-1) 0;
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .preference-info p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .preference-control {
      flex-shrink: 0;
      margin-left: var(--space-4);
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      cursor: pointer;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--neutral-300);
      border-radius: 24px;
      transition: 0.2s;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      border-radius: 50%;
      transition: 0.2s;
      box-shadow: var(--shadow-sm);
    }

    .toggle-switch input:checked + .toggle-slider {
      background-color: var(--brand-primary);
    }

    .toggle-switch input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }

    .dialog-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-6);
      border-top: 1px solid var(--border-light);
      background: var(--bg-secondary);
    }

    .spacer {
      flex: 1;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      border: none;
      text-decoration: none;
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--border-light);
    }

    .btn-ghost:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-medium);
    }

    .btn-primary {
      background: var(--brand-primary);
      color: var(--text-inverse);
      border: 1px solid var(--brand-primary);
    }

    .btn-primary:hover {
      background: var(--brand-primary-hover);
      border-color: var(--brand-primary-hover);
    }

    /* Dark theme specific adjustments */
    :root[data-theme="dark"] .toggle-slider {
      background-color: var(--neutral-600);
    }

    :root[data-theme="dark"] .toggle-slider:before {
      background-color: var(--neutral-300);
    }
  `]
})
export class SettingsDialogComponent {
  activeTab: 'keys' | 'preferences' = 'keys';

  apiKeys: ApiKeys = {
    openai: '',
    anthropic: '',
    gemini: ''
  };

  preferences: UserPreferences = {
    enableMasterAI: true,
    autoCreateAgents: false
  };

  constructor(
    private dialogRef: MatDialogRef<SettingsDialogComponent>,
    private apiKeysService: ApiKeysService,
    private themeService: ThemeService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.apiKeys = { ...this.apiKeysService.getApiKeys() };
    this.preferences = { ...this.apiKeysService.getPreferences() };
  }

  save() {
    this.apiKeysService.saveApiKeys(this.apiKeys);
    this.apiKeysService.savePreferences(this.preferences);
    this.dialogRef.close({
      apiKeys: this.apiKeys,
      preferences: this.preferences
    });
  }

  close() {
    this.dialogRef.close();
  }

  clearAll() {
    this.apiKeys = {
      openai: '',
      anthropic: '',
      gemini: ''
    };
  }
}