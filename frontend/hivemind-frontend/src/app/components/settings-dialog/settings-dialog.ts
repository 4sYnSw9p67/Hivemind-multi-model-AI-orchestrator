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
    .settings-dialog {
      width: 600px;
      max-width: 90vw;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem 0 1.5rem;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .dialog-content {
      padding: 1.5rem;
      min-height: 400px;
    }

    .tab-content {
      padding: 1.5rem 0;
    }

    .section-header {
      margin-bottom: 2rem;
    }

    .section-header h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 600;
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
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .full-width {
      width: 100%;
    }

    .field-help {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
    }

    .field-help a {
      color: var(--brand-primary);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .field-help a:hover {
      text-decoration: underline;
    }

    .field-help mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .api-status {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
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
      gap: 1.5rem;
    }

    .preference-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
    }

    .preference-info h4 {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      font-weight: 500;
    }

    .preference-info p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .dialog-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-light);
      background: var(--bg-secondary);
    }

    .spacer {
      flex: 1;
    }

    .clear-button {
      color: var(--error);
    }

    .clear-button:hover {
      background: var(--error-light);
    }

    ::ng-deep .mat-mdc-tab-group {
      --mdc-tab-indicator-active-indicator-color: var(--brand-primary);
    }

    ::ng-deep .mat-mdc-tab .mdc-tab__text-label {
      color: var(--text-secondary);
    }

    ::ng-deep .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
      color: var(--brand-primary);
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
