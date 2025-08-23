import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Agent {
  id: string;
  name: string;
  model: string;
  specialization: string;
  isActive: boolean;
  workerParams: {
    temperature: number;
    top_k: number;
    top_p: number;
  };
}

@Component({
  selector: 'app-agent-creator',
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-creator.html',
  styleUrl: './agent-creator.css'
})
export class AgentCreatorComponent implements OnInit {
  @Output() agentCreated = new EventEmitter<Agent>();
  @Output() agentRemoved = new EventEmitter<string>();

  agents: Agent[] = [];

  // Predefined worker names
  predefinedNames = [
    'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
    'Scholar', 'Analyst', 'Creator', 'Reviewer', 'Explorer', 'Synthesizer',
    'Strategist', 'Innovator', 'Optimizer', 'Validator', 'Researcher', 'Advisor'
  ];

  newAgent = {
    name: '',
    model: 'qwen',
    specialization: '',
    temperature: 0.7,
    top_k: 40,
    top_p: 0.8
  };

  selectedNameIndex = 0;

  createAgent() {
    if (this.canCreateAgent()) {
      const agent: Agent = {
        id: crypto.randomUUID(),
        name: this.newAgent.name,
        model: this.newAgent.model,
        specialization: this.newAgent.specialization,
        isActive: true,
        workerParams: {
          temperature: this.newAgent.temperature,
          top_k: this.newAgent.top_k,
          top_p: this.newAgent.top_p
        }
      };

      this.agents.push(agent);
      this.agentCreated.emit(agent);

      // Reset form and select next available name
      this.resetForm();
    }
  }

  removeAgent(agentId: string) {
    this.agents = this.agents.filter(agent => agent.id !== agentId);
    this.agentRemoved.emit(agentId);
  }

  canCreateAgent(): boolean {
    return !!(this.newAgent.name?.trim() && this.newAgent.model?.trim());
  }

  resetForm() {
    this.selectedNameIndex = this.getNextAvailableNameIndex();
    this.newAgent = {
      name: this.getAvailableNames()[this.selectedNameIndex] || '',
      model: 'qwen',
      specialization: '',
      temperature: this.randomizeParameter(0.3, 1.2),
      top_k: this.randomizeParameter(20, 80, true),
      top_p: this.randomizeParameter(0.7, 0.95)
    };
  }

  getAvailableNames(): string[] {
    const usedNames = this.agents.map(agent => agent.name);
    return this.predefinedNames.filter(name => !usedNames.includes(name));
  }

  getNextAvailableNameIndex(): number {
    const availableNames = this.getAvailableNames();
    return availableNames.length > 0 ? 0 : -1;
  }

  randomizeParameter(min: number, max: number, isInteger = false): number {
    const value = Math.random() * (max - min) + min;
    return isInteger ? Math.round(value) : Math.round(value * 100) / 100;
  }

  ngOnInit() {
    this.resetForm(); // Initialize with first available name
  }

  trackAgent(index: number, agent: Agent): string {
    return agent.id;
  }

  getModelDisplayName(model: string): string {
    const modelNames: Record<string, string> = {
      'gpt-4': 'GPT-4',
      'claude-3-sonnet': 'Claude 3 Sonnet',
      'llama-3.1': 'LLaMA 3.1',
      'deepseek-coder': 'DeepSeek Coder',
      'qwen': 'Qwen'
    };
    return modelNames[model] || model;
  }
}
