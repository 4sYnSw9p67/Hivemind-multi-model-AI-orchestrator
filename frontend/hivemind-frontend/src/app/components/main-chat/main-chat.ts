import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HivemindService, MasterEvaluation, ModelResponse } from '../../services/hivemind.service';
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

  private formatResponse(results: ModelResponse[], masterEvaluation?: MasterEvaluation): string {
    if (!results || results.length === 0) {
      return 'No response received from the models.';
    }

    let html = '<div class="response-summary">';

    // Master AI Evaluation Section
    if (masterEvaluation) {
      const bestResult = results[masterEvaluation.bestResponseIndex];
      html += `<div class="master-evaluation">`;
      html += `<h4>🧠 Master AI Evaluation</h4>`;
      html += `<div class="best-response-summary">`;
      html += `<strong>🏆 Best Response:</strong> ${bestResult?.model || 'N/A'}<br>`;
      html += `<strong>📝 Reasoning:</strong> ${masterEvaluation.reasoning}`;
      html += `</div>`;
      html += `<div class="evaluation-stats">`;
      html += `<small>⏱️ Evaluation time: ${masterEvaluation.evaluationTime}ms</small>`;
      html += `</div>`;
      html += `</div>`;
    }

    html += `<div class="consultation-header">`;
    html += `<strong>🤖 Qwen Workers Consulted (${results.length}):</strong>`;
    html += `</div>`;

    results.forEach((result, index) => {
      const isBest = masterEvaluation?.bestResponseIndex === index;
      const ranking = masterEvaluation?.rankings.find(r => r.index === index);

      html += `<div class="model-response ${isBest ? 'best-response' : ''}">`;

      if (isBest) {
        html += `<div class="best-badge">🏆 Best Response</div>`;
      }

      html += `<div class="model-header">`;
      html += `<strong>${result.model}</strong>`;
      if (result.workerParams) {
        html += ` <span class="worker-params">(T:${result.workerParams.temperature.toFixed(2)}, K:${result.workerParams.top_k}, P:${result.workerParams.top_p.toFixed(2)})</span>`;
      }
      if (result.processingTime) {
        html += ` <span class="processing-time">(${(result.processingTime / 1000).toFixed(1)}s)</span>`;
      }
      html += `</div>`;

      if (result.error) {
        html += `<div class="error">⚠️ Error: ${result.error}</div>`;
      } else {
        // Clean up the response output (remove <think> tags if present)
        let cleanOutput = result.output || '';
        cleanOutput = cleanOutput.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        html += `<div class="response-content">${cleanOutput}</div>`;

        html += `<div class="response-metadata">`;
        if (result.confidence) {
          html += `<span class="confidence">Confidence: ${(result.confidence * 100).toFixed(1)}%</span>`;
        }
        if (ranking) {
          html += ` | <span class="ranking">Score: ${(ranking.score * 100).toFixed(0)}/100</span>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    });

    // Rankings Summary
    if (masterEvaluation?.rankings && masterEvaluation.rankings.length > 1) {
      html += `<div class="rankings">`;
      html += `<h5>📊 Worker Performance Ranking:</h5>`;
      html += `<ol class="ranking-list">`;
      masterEvaluation.rankings
        .sort((a, b) => b.score - a.score)
        .forEach((rank) => {
          const result = results[rank.index];
          html += `<li>${result?.model || 'Unknown'} - Score: ${(rank.score * 100).toFixed(0)}/100</li>`;
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
      'system': 'System Message'
    };
    return senderNames[type] || 'Unknown';
  }

  autoResize(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }
}
