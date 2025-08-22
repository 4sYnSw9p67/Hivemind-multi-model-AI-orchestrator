import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Agent {
  id: string;
  name: string;
  model: string;
  specialization: string;
  isActive: boolean;
}

@Component({
  selector: 'app-agent-creator',
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-creator.html',
  styleUrl: './agent-creator.css'
})
export class AgentCreatorComponent {
  @Output() agentCreated = new EventEmitter<Agent>();
  @Output() agentRemoved = new EventEmitter<string>();

  agents: Agent[] = [];

  newAgent = {
    name: '',
    model: '',
    specialization: ''
  };

  createAgent() {
    if (this.canCreateAgent()) {
      const agent: Agent = {
        id: crypto.randomUUID(),
        name: this.newAgent.name,
        model: this.newAgent.model,
        specialization: this.newAgent.specialization,
        isActive: true
      };

      this.agents.push(agent);
      this.agentCreated.emit(agent);

      // Reset form
      this.newAgent = {
        name: '',
        model: '',
        specialization: ''
      };
    }
  }

  removeAgent(agentId: string) {
    this.agents = this.agents.filter(agent => agent.id !== agentId);
    this.agentRemoved.emit(agentId);
  }

  canCreateAgent(): boolean {
    return !!(this.newAgent.name?.trim() &&
      this.newAgent.model?.trim() &&
      this.newAgent.specialization?.trim());
  }

  trackAgent(index: number, agent: Agent): string {
    return agent.id;
  }

  getModelDisplayName(model: string): string {
    const modelNames: Record<string, string> = {
      'gpt-4': 'GPT-4',
      'claude-3-sonnet': 'Claude 3 Sonnet',
      'llama-3.1': 'LLaMA 3.1',
      'deepseek-coder': 'DeepSeek Coder'
    };
    return modelNames[model] || model;
  }
}
