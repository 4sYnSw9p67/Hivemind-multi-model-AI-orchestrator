import { Component, signal } from '@angular/core';
// RouterOutlet removed from imports because not used in current template
import { AgentCreatorComponent, Agent } from './components/agent-creator/agent-creator';
import { MainChatComponent } from './components/main-chat/main-chat';
import { WorkerResponsesComponent, WorkerResponse } from './components/worker-responses/worker-responses';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-root',
  imports: [MatToolbarModule, AgentCreatorComponent, MainChatComponent, WorkerResponsesComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('hivemind-frontend');

  activeAgents: Agent[] = [];
  workerResponses: WorkerResponse[] = [];

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
