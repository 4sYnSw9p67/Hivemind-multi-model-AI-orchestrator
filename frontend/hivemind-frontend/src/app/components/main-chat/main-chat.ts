import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HivemindService } from '../../services/hivemind.service';
import { Agent } from '../agent-creator/agent-creator';

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
}

@Component({
  selector: 'app-main-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './main-chat.html',
  styleUrl: './main-chat.css'
})
export class MainChatComponent implements AfterViewChecked {
  @Input() activeAgents: Agent[] = [];
  @Output() messageProcessed = new EventEmitter<{ query: string, results: any[] }>();

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: ChatMessage[] = [
    {
      id: crypto.randomUUID(),
      sender: 'System',
      content: 'Welcome to Hivemind! Create some agents and start asking questions.',
      timestamp: new Date(),
      type: 'system'
    }
  ];

  currentMessage = '';
  isLoading = false;
  now = new Date();

  constructor(private hivemindService: HivemindService) { }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  sendMessage() {
    if (!this.canSendMessage()) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'You',
      content: this.currentMessage,
      timestamp: new Date(),
      type: 'user'
    };

    this.messages.push(userMessage);
    const query = this.currentMessage;
    this.currentMessage = '';
    this.isLoading = true;
    this.now = new Date();

    this.hivemindService.sendQuery(query).subscribe({
      next: (response) => {
        this.isLoading = false;

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sender: 'Hivemind',
          content: this.formatResponse(response.results, response.masterEvaluation),
          timestamp: new Date(),
          type: 'assistant'
        };

        this.messages.push(assistantMessage);
        this.messageProcessed.emit({ query, results: response.results });
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sender: 'System',
          content: `Error: ${error.message || 'Failed to process query'}`,
          timestamp: new Date(),
          type: 'system'
        };
        this.messages.push(errorMessage);
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  canSendMessage(): boolean {
    return !!(this.currentMessage?.trim() && !this.isLoading);
  }

  private formatResponse(results: any[], masterEvaluation?: any): string {
    if (!results || results.length === 0) {
      return 'No response received from the models.';
    }

    let html = '<div class="response-summary">';

    // Master AI Evaluation Section
    if (masterEvaluation) {
      html += `<div class="master-evaluation">`;
      html += `<h4>🏆 Best Response: ${masterEvaluation.bestResponse}</h4>`;
      html += `<p class="evaluation-reasoning">${masterEvaluation.reasoning}</p>`;
      html += `</div>`;
    }

    html += `<div class="consultation-header">`;
    html += `<strong>Consulted ${results.length} AI model(s):</strong>`;
    html += `</div>`;

    results.forEach((result, index) => {
      const isBest = masterEvaluation?.bestResponse === result.model;
      html += `<div class="model-response ${isBest ? 'best-response' : ''}">`;

      if (isBest) {
        html += `<div class="best-badge">🏆 Best Response</div>`;
      }

      html += `<div class="model-header">`;
      html += `<strong>${result.model}</strong>`;
      if (result.processingTime) {
        html += ` <span class="processing-time">(${result.processingTime}ms)</span>`;
      }
      html += `</div>`;

      if (result.error) {
        html += `<div class="error">⚠️ Error: ${result.error}</div>`;
      } else {
        html += `<div class="response-content">${result.output}</div>`;
        if (result.confidence) {
          html += `<div class="confidence">Confidence: ${result.confidence}%</div>`;
        }
      }
      html += `</div>`;
    });

    // Rankings
    if (masterEvaluation?.ranking) {
      html += `<div class="rankings">`;
      html += `<h5>📊 Performance Ranking:</h5>`;
      html += `<ol class="ranking-list">`;
      masterEvaluation.ranking.forEach((rank: any) => {
        html += `<li>${rank.model} (Score: ${rank.score})</li>`;
      });
      html += `</ol>`;
      html += `</div>`;
    }

    html += '</div>';
    return html;
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  setSuggestion(suggestion: string) {
    this.currentMessage = suggestion;
  }

  getSenderName(type: string): string {
    const senderNames: Record<string, string> = {
      'user': 'You',
      'assistant': 'Hivemind',
      'system': 'System'
    };
    return senderNames[type] || 'Unknown';
  }

  autoResize(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }
}
