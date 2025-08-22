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
import { ApiKeysService, ApiKeys } from '../../services/api-keys.service';
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
      <div class="dialog-header">
        <h2 mat-dialog-title>Settings</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <mat-tab-group>
          <mat-tab label="API Keys">
            <div class="tab-content">
              <div class="api-keys-section">
                <div class="section-header">
                  <h3>AI Model API Keys</h3>
                  <p class="section-description">
                    Configure your API keys to enable AI model integration. Keys are stored locally and never sent to external servers.
                  </p>
                </div>

                <div class="form-grid">
                  <div class="form-group">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>OpenAI API Key</mat-label>
                      <input 
                        matInput 
                        type="password"
                        [(ngModel)]="apiKeys.openai"
                        placeholder="sk-..."
                        autocomplete="off"
                      />
                      <mat-icon matSuffix>vpn_key</mat-icon>
                    </mat-form-field>
                    <div class="field-help">
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">
                        Get your OpenAI API key
                        <mat-icon>open_in_new</mat-icon>
                      </a>
                    </div>
                  </div>

                  <div class="form-group">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Anthropic API Key</mat-label>
                      <input 
                        matInput 
                        type="password"
                        [(ngModel)]="apiKeys.anthropic"
                        placeholder="sk-ant-..."
                        autocomplete="off"
                      />
                      <mat-icon matSuffix>vpn_key</mat-icon>
                    </mat-form-field>
                    <div class="field-help">
                      <a href="https://console.anthropic.com/" target="_blank" rel="noopener">
                        Get your Anthropic API key
                        <mat-icon>open_in_new</mat-icon>
                      </a>
                    </div>
                  </div>

                  <div class="form-group">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Google Gemini API Key</mat-label>
                      <input 
                        matInput 
                        type="password"
                        [(ngModel)]="apiKeys.gemini"
                        placeholder="AI..."
                        autocomplete="off"
                      />
                      <mat-icon matSuffix>vpn_key</mat-icon>
                    </mat-form-field>
                    <div class="field-help">
                      <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener">
                        Get your Gemini API key
                        <mat-icon>open_in_new</mat-icon>
                      </a>
                    </div>
                  </div>
                </div>

                <div class="api-status">
                  <div class="status-item" [class.configured]="apiKeys.openai">
                    <mat-icon>{{apiKeys.openai ? 'check_circle' : 'radio_button_unchecked'}}</mat-icon>
                    <span>OpenAI {{apiKeys.openai ? 'Configured' : 'Not configured'}}</span>
                  </div>
                  <div class="status-item" [class.configured]="apiKeys.anthropic">
                    <mat-icon>{{apiKeys.anthropic ? 'check_circle' : 'radio_button_unchecked'}}</mat-icon>
                    <span>Anthropic {{apiKeys.anthropic ? 'Configured' : 'Not configured'}}</span>
                  </div>
                  <div class="status-item" [class.configured]="apiKeys.gemini">
                    <mat-icon>{{apiKeys.gemini ? 'check_circle' : 'radio_button_unchecked'}}</mat-icon>
                    <span>Gemini {{apiKeys.gemini ? 'Configured' : 'Not configured'}}</span>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Preferences">
            <div class="tab-content">
              <div class="preferences-section">
                <div class="section-header">
                  <h3>Application Preferences</h3>
                  <p class="section-description">
                    Customize your Hivemind experience.
                  </p>
                </div>

                <div class="preference-item">
                  <div class="preference-info">
                    <h4>Master AI Evaluation</h4>
                    <p>Enable advanced response evaluation and ranking</p>
                  </div>
                  <mat-slide-toggle [(ngModel)]="preferences.enableMasterAI">
                  </mat-slide-toggle>
                </div>

                <div class="preference-item">
                  <div class="preference-info">
                    <h4>Auto-create Agents</h4>
                    <p>Automatically create agents based on configured API keys</p>
                  </div>
                  <mat-slide-toggle [(ngModel)]="preferences.autoCreateAgents">
                  </mat-slide-toggle>
                </div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="clearKeys()" class="clear-button">
          <mat-icon>delete</mat-icon>
          Clear All Keys
        </button>
        <div class="spacer"></div>
        <button mat-button (click)="close()">Cancel</button>
        <button mat-raised-button color="primary" (click)="save()">
          <mat-icon>save</mat-icon>
          Save Settings
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    /* Settings Dialog - Full Theme Support */
    .settings-dialog {
      width: 600px;
      max-width: 90vw;
      font-family: var(--font-family-sans);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-4) var(--space-6) 0 var(--space-6);
      background: var(--bg-primary);
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .dialog-content {
      padding: var(--space-6);
      min-height: 400px;
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .tab-content {
      padding: var(--space-6) 0;
    }

    .section-header {
      margin-bottom: var(--space-8);
    }

    .section-header h3 {
      margin: 0 0 var(--space-2) 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .section-description {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      margin-bottom: var(--space-8);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .full-width {
      width: 100%;
    }

    .field-help {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: 0.75rem;
    }

    .field-help a {
      color: var(--brand-primary);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: var(--space-1);
      transition: all 0.15s ease-in-out;
    }

    .field-help a:hover {
      text-decoration: underline;
      opacity: 0.8;
    }

    .field-help mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .api-status {
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
      font-size: 0.875rem;
      color: var(--text-secondary);
      transition: color 0.15s ease-in-out;
    }

    .status-item.configured {
      color: var(--success);
    }

    .status-item mat-icon {
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
    }

    .preferences-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .preference-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-4);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      transition: all 0.15s ease-in-out;
    }

    .preference-item:hover {
      border-color: var(--border-medium);
      box-shadow: var(--shadow-sm);
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

    .clear-button {
      color: var(--error) !important;
    }

    .clear-button:hover {
      background: var(--error-light) !important;
    }

    /* Material Component Theme Overrides */
    ::ng-deep .mat-mdc-dialog-container {
      background: var(--bg-primary) !important;
      color: var(--text-primary) !important;
      border-radius: var(--radius-lg) !important;
      box-shadow: var(--shadow-xl) !important;
    }

    ::ng-deep .mat-mdc-dialog-title {
      color: var(--text-primary) !important;
    }

    ::ng-deep .mat-mdc-dialog-content {
      color: var(--text-primary) !important;
    }

    ::ng-deep .mat-mdc-dialog-actions {
      background: var(--bg-secondary) !important;
    }

    /* Tab Group Styling */
    ::ng-deep .mat-mdc-tab-group {
      --mdc-tab-indicator-active-indicator-color: var(--brand-primary);
      background: var(--bg-primary) !important;
    }

    ::ng-deep .mat-mdc-tab-header {
      background: var(--bg-primary) !important;
      border-bottom: 1px solid var(--border-light) !important;
    }

    ::ng-deep .mat-mdc-tab .mdc-tab__text-label {
      color: var(--text-secondary) !important;
      font-weight: 500 !important;
    }

    ::ng-deep .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
      color: var(--brand-primary) !important;
      font-weight: 600 !important;
    }

    ::ng-deep .mat-mdc-tab:hover .mdc-tab__text-label {
      color: var(--text-primary) !important;
    }

    ::ng-deep .mat-mdc-tab-body-wrapper {
      background: var(--bg-primary) !important;
    }

    /* Form Field Styling */
    ::ng-deep .mat-mdc-form-field {
      --mdc-filled-text-field-container-color: var(--bg-primary);
      --mdc-filled-text-field-label-text-color: var(--text-secondary);
      --mdc-filled-text-field-input-text-color: var(--text-primary);
      --mdc-outlined-text-field-outline-color: var(--border-light);
      --mdc-outlined-text-field-focus-outline-color: var(--brand-primary);
      --mdc-outlined-text-field-hover-outline-color: var(--border-medium);
      --mdc-outlined-text-field-label-text-color: var(--text-secondary);
      --mdc-outlined-text-field-input-text-color: var(--text-primary);
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
      color: var(--brand-primary) !important;
    }

    ::ng-deep .mat-mdc-input-element {
      color: var(--text-primary) !important;
      caret-color: var(--brand-primary) !important;
    }

    ::ng-deep .mat-mdc-input-element::placeholder {
      color: var(--text-tertiary) !important;
    }

    /* Button Styling */
    ::ng-deep .mat-mdc-button {
      color: var(--text-secondary) !important;
      font-weight: 500 !important;
    }

    ::ng-deep .mat-mdc-button:hover {
      background: var(--bg-tertiary) !important;
      color: var(--text-primary) !important;
    }

    ::ng-deep .mat-mdc-raised-button.mat-primary {
      background: var(--brand-primary) !important;
      color: var(--text-inverse) !important;
      box-shadow: var(--shadow-md) !important;
    }

    ::ng-deep .mat-mdc-raised-button.mat-primary:hover {
      background: var(--brand-primary-hover) !important;
      box-shadow: var(--shadow-lg) !important;
    }

    ::ng-deep .mat-mdc-icon-button {
      color: var(--text-secondary) !important;
    }

    ::ng-deep .mat-mdc-icon-button:hover {
      background: var(--bg-tertiary) !important;
      color: var(--text-primary) !important;
    }

    /* Slide Toggle Styling */
    ::ng-deep .mat-mdc-slide-toggle {
      --mdc-switch-selected-track-color: var(--brand-primary);
      --mdc-switch-selected-handle-color: var(--text-inverse);
      --mdc-switch-selected-hover-track-color: var(--brand-primary-hover);
      --mdc-switch-unselected-track-color: var(--neutral-300);
      --mdc-switch-unselected-handle-color: var(--neutral-500);
      --mdc-switch-unselected-hover-track-color: var(--neutral-400);
    }

    ::ng-deep .mat-mdc-slide-toggle .mdc-switch {
      --mdc-switch-track-height: 20px;
      --mdc-switch-track-width: 36px;
    }

    ::ng-deep .mat-mdc-slide-toggle.mat-checked .mdc-switch__track {
      background-color: var(--brand-primary) !important;
      opacity: 1 !important;
    }

    ::ng-deep .mat-mdc-slide-toggle.mat-checked .mdc-switch__handle {
      background-color: var(--text-inverse) !important;
    }

    ::ng-deep .mat-mdc-slide-toggle:not(.mat-checked) .mdc-switch__track {
      background-color: var(--neutral-300) !important;
      opacity: 1 !important;
    }

    ::ng-deep .mat-mdc-slide-toggle:not(.mat-checked) .mdc-switch__handle {
      background-color: var(--neutral-500) !important;
    }

    /* Icon Styling */
    ::ng-deep mat-icon {
      color: inherit !important;
    }

    /* Dark mode specific overrides */
    :root[data-theme="dark"] ::ng-deep .mat-mdc-form-field {
      --mdc-outlined-text-field-outline-color: var(--border-light);
      --mdc-outlined-text-field-focus-outline-color: var(--brand-primary);
      --mdc-outlined-text-field-hover-outline-color: var(--border-medium);
    }

    :root[data-theme="dark"] ::ng-deep .mat-mdc-slide-toggle:not(.mat-checked) .mdc-switch__track {
      background-color: var(--neutral-600) !important;
    }

    :root[data-theme="dark"] ::ng-deep .mat-mdc-slide-toggle:not(.mat-checked) .mdc-switch__handle {
      background-color: var(--neutral-400) !important;
    }
  `]
})
export class SettingsDialogComponent {
  apiKeys: ApiKeys = {
    openai: '',
    anthropic: '',
    gemini: ''
  };

  preferences = {
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
  }

  save() {
    this.apiKeysService.updateApiKeys(this.apiKeys);
    this.dialogRef.close({
      apiKeys: this.apiKeys,
      preferences: this.preferences
    });
  }

  clearKeys() {
    this.apiKeys = {
      openai: '',
      anthropic: '',
      gemini: ''
    };
  }

  close() {
    this.dialogRef.close();
  }
}
