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
  @Output() messageProcessed = new EventEmitter<{query: string, results: any[]}>();
  
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

  constructor(private hivemindService: HivemindService) {}

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
          content: this.formatResponse(response.results),
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

  private formatResponse(results: any[]): string {
    if (!results || results.length === 0) {
      return 'No response received from the models.';
    }
    
    let html = '<div class="response-summary">';
    html += `<strong>Consulted ${results.length} model(s):</strong><br>`;
    
    results.forEach((result, index) => {
      html += `<div class="model-response">`;
      html += `<strong>${result.model}:</strong> `;
      if (result.error) {
        html += `<span class="error">Error: ${result.error}</span>`;
      } else {
        html += `<span class="response">${result.output}</span>`;
      }
      html += `</div>`;
    });
    
    html += '</div>';
    return html;
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }
}
