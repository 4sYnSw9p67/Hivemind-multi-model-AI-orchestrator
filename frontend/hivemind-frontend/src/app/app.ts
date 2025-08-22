import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AgentCreatorComponent, Agent } from './components/agent-creator/agent-creator';
import { MainChatComponent } from './components/main-chat/main-chat';
import { WorkerResponsesComponent, WorkerResponse } from './components/worker-responses/worker-responses';
import { SettingsDialogComponent } from './components/settings-dialog/settings-dialog';
import { ThemeService } from './services/theme.service';
import { ApiKeysService } from './services/api-keys.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    AgentCreatorComponent,
    MainChatComponent,
    WorkerResponsesComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('hivemind-frontend');

  activeAgents: Agent[] = [];
  workerResponses: WorkerResponse[] = [];
  currentTheme = 'light';

  constructor(
    private themeService: ThemeService,
    private apiKeysService: ApiKeysService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });

    // Auto-create agents if API keys are configured and preference is enabled
    this.autoCreateAgentsIfConfigured();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  openSettings() {
    const dialogRef = this.dialog.open(SettingsDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      autoFocus: true,
      panelClass: 'settings-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Settings saved:', result);
        // Handle any additional logic after settings are saved
        if (result.preferences?.autoCreateAgents) {
          this.autoCreateAgentsIfConfigured();
        }
      }
    });
  }

  private autoCreateAgentsIfConfigured() {
    const apiKeys = this.apiKeysService.getApiKeys();

    // Auto-create agents for configured API keys
    const availableModels = [
      { key: 'openai', model: 'gpt-4', name: 'GPT-4 Assistant' },
      { key: 'anthropic', model: 'claude-3-sonnet', name: 'Claude Assistant' },
      { key: 'gemini', model: 'gemini-pro', name: 'Gemini Assistant' }
    ];

    availableModels.forEach(({ key, model, name }) => {
      if (apiKeys[key as keyof typeof apiKeys]?.trim() &&
        !this.activeAgents.some(agent => agent.model === model)) {

        const agent: Agent = {
          id: crypto.randomUUID(),
          name,
          model,
          specialization: `AI assistant powered by ${name.split(' ')[0]}`,
          isActive: true
        };

        this.activeAgents.push(agent);
      }
    });
  }

  onAgentCreated(agent: Agent) {
    this.activeAgents.push(agent);
  }

  onAgentRemoved(agentId: string) {
    this.activeAgents = this.activeAgents.filter(agent => agent.id !== agentId);
  }

  onMessageProcessed(event: { query: string, results: any[] }) {
    // Transform API results into WorkerResponse format
    const newResponses: WorkerResponse[] = event.results.map(result => ({
      id: crypto.randomUUID(),
      model: result.model,
      output: result.output,
      error: result.error,
      query: event.query,
      timestamp: new Date(),
      processingTime: Math.floor(Math.random() * 2000) + 500, // Mock processing time
      confidence: result.error ? undefined : Math.floor(Math.random() * 30) + 70, // Mock confidence
      rating: null
    }));

    this.workerResponses.unshift(...newResponses);

    // Keep only the latest 50 responses
    if (this.workerResponses.length > 50) {
      this.workerResponses = this.workerResponses.slice(0, 50);
    }
  }
}
