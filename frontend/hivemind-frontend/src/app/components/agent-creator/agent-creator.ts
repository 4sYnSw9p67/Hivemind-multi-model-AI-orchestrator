import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Agent {
  id: string;
  name: string;
  model: string;
  specialization: string;
  isActive: boolean;
  responseLength: 'unlimited' | 'brief' | 'detailed' | 'comprehensive';
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

  // Predefined specializations with different perspectives
  predefinedSpecializations = [
    {
      name: 'Academic Researcher',
      description: 'Approach problems with rigorous academic methodology, citing research, providing detailed analysis, and considering theoretical frameworks.'
    },
    {
      name: 'Practical Problem Solver',
      description: 'Focus on actionable, real-world solutions with step-by-step guidance and practical considerations for implementation.'
    },
    {
      name: 'Creative Innovator',
      description: 'Think outside the box, propose novel approaches, explore unconventional solutions, and consider artistic or creative angles.'
    },
    {
      name: 'Critical Analyst',
      description: 'Examine problems from multiple angles, identify potential flaws, consider risks and downsides, and provide balanced critique.'
    },
    {
      name: 'Technical Expert',
      description: 'Provide deep technical insights, focus on implementation details, discuss technical specifications, and consider engineering aspects.'
    },
    {
      name: 'Business Strategist',
      description: 'Analyze from business perspective, consider market implications, ROI, scalability, and strategic impact on organizations.'
    },
    {
      name: 'User Experience Advocate',
      description: 'Prioritize human-centered design, usability, accessibility, and consider the end-user perspective in all recommendations.'
    },
    {
      name: 'Systems Thinker',
      description: 'Consider broader systemic implications, interconnections, long-term effects, and holistic approaches to complex problems.'
    },
    {
      name: 'Devil\'s Advocate',
      description: 'Challenge assumptions, point out potential problems, play contrarian, and stress-test ideas from opposing viewpoints.'
    },
    {
      name: 'Efficiency Optimizer',
      description: 'Focus on optimization, resource efficiency, performance improvements, and streamlining processes for maximum effectiveness.'
    },
    {
      name: 'Ethical Evaluator',
      description: 'Consider moral implications, social responsibility, fairness, and ethical considerations in all recommendations.'
    },
    {
      name: 'Future Visionary',
      description: 'Think about long-term trends, emerging technologies, future implications, and how solutions will evolve over time.'
    }
  ];

  // Response length options
  responseLengthOptions = [
    { value: 'unlimited', label: 'Unlimited', description: 'No length restrictions' },
    { value: 'brief', label: 'Brief', description: '1-2 sentences, key points only' },
    { value: 'detailed', label: 'Detailed', description: '1-2 paragraphs with explanation' },
    { value: 'comprehensive', label: 'Comprehensive', description: 'Full analysis with examples' }
  ];

  newAgent = {
    name: '',
    model: 'qwen',
    specialization: '',
    customSpecialization: '',
    responseLength: 'unlimited' as const,
    temperature: 0.7,
    top_k: 40,
    top_p: 0.8
  };

  selectedNameIndex = 0;
  selectedSpecializationIndex = 0;
  isCustomSpecialization = false;

  createAgent() {
    if (this.canCreateAgent()) {
      const finalSpecialization = this.isCustomSpecialization
        ? this.newAgent.customSpecialization
        : this.newAgent.specialization;

      const agent: Agent = {
        id: crypto.randomUUID(),
        name: this.newAgent.name,
        model: this.newAgent.model,
        specialization: finalSpecialization,
        responseLength: this.newAgent.responseLength,
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
    const hasName = this.newAgent.name?.trim();
    const hasModel = this.newAgent.model?.trim();
    const hasSpecialization = this.isCustomSpecialization
      ? this.newAgent.customSpecialization?.trim()
      : this.newAgent.specialization?.trim();

    return !!(hasName && hasModel && hasSpecialization);
  }

  resetForm() {
    this.selectedNameIndex = this.getNextAvailableNameIndex();
    this.selectedSpecializationIndex = this.getNextAvailableSpecializationIndex();
    this.isCustomSpecialization = false;

    const availableSpecs = this.getAvailableSpecializations();
    this.newAgent = {
      name: this.getAvailableNames()[this.selectedNameIndex] || '',
      model: 'qwen',
      specialization: availableSpecs[this.selectedSpecializationIndex]?.description || '',
      customSpecialization: '',
      responseLength: 'unlimited' as const,
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

  getAvailableSpecializations(): any[] {
    const usedSpecializations = this.agents.map(agent => agent.specialization);
    return this.predefinedSpecializations.filter(spec => !usedSpecializations.includes(spec.description));
  }

  getNextAvailableSpecializationIndex(): number {
    const availableSpecs = this.getAvailableSpecializations();
    return availableSpecs.length > 0 ? 0 : -1;
  }

  onSpecializationChange() {
    if (this.newAgent.specialization === 'custom') {
      this.isCustomSpecialization = true;
      this.newAgent.specialization = '';
    } else {
      this.isCustomSpecialization = false;
      this.newAgent.customSpecialization = '';
    }
  }

  getResponseLengthLabel(length: string): string {
    const option = this.responseLengthOptions.find(opt => opt.value === length);
    return option ? option.label : length;
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
