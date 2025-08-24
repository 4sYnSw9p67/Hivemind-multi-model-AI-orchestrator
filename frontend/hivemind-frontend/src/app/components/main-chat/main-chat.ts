import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HivemindService, MasterEvaluation, ModelResponse } from '../../services/hivemind.service';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Agent } from '../agent-creator/agent-creator';

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  contentHtml?: SafeHtml;
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

  constructor(
    private hivemindService: HivemindService,
    private sanitizer: DomSanitizer
  ) { }

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

    this.hivemindService.sendQuery(query, this.activeAgents).subscribe({
      next: (response) => {
        this.isLoading = false;

        // Process the response for the middle chat panel (with nested markdown handling)
        const rawResponse = this.formatResponse(response.results, response.masterEvaluation);
        console.log('🔵 DEBUG: Raw HTML contains worker-container class:', rawResponse.includes('class="worker-container'));
        console.log('🔵 DEBUG: Raw HTML contains blue border:', rawResponse.includes('border: 2px solid blue'));
        const processedResponse = this.processMiddleChatContent(rawResponse);
        console.log('🔵 DEBUG: Processed HTML contains worker-container class:', processedResponse.includes('class="worker-container'));

        // Log a sample of the HTML to verify structure
        const workerContainerMatch = processedResponse.match(/<div class="worker-container[^>]*>/);
        if (workerContainerMatch) {
          console.log('🔵 DEBUG: Found worker-container element:', workerContainerMatch[0]);
        }

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sender: 'Hivemind',
          content: rawResponse,
          contentHtml: this.sanitizer.bypassSecurityTrustHtml(processedResponse),
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

      // Worker header (OUTSIDE container - part of main evaluation)
      if (isBest) {
        html += `<div class="best-response-marker">🏆 Best Response</div>`;
      }
      html += `<div class="worker-info">`;
      html += `<strong>${result.model}</strong>`;
      if (result.workerParams) {
        html += ` <span class="worker-params">(T:${result.workerParams.temperature.toFixed(2)}, K:${result.workerParams.top_k}, P:${result.workerParams.top_p.toFixed(2)})</span>`;
      }
      if (result.processingTime) {
        html += ` <span class="processing-time">(${(result.processingTime / 1000).toFixed(1)}s)</span>`;
      }
      html += `</div>`;

      if (result.error) {
        html += `<div class="worker-error">⚠️ Error: ${result.error}</div>`;
      } else {
        // Clean up the response output (remove <think> tags if present)
        let cleanOutput = result.output || '';
        cleanOutput = cleanOutput.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        // Worker response content container - ONLY THE AGENT'S ACTUAL RESPONSE
        // Apply beautiful styling directly inline to avoid CSS selector issues
        const containerStyle = isBest
          ? "background: rgba(34, 197, 94, 0.1) !important; border: 1px solid rgb(34, 197, 94) !important;"
          : "background: rgb(39, 39, 42) !important; border: 1px solid rgb(63, 63, 70) !important;";

        html += `<div class="worker-container ${isBest ? 'best-response' : ''}" style="${containerStyle} padding: 16px !important; margin: 8px 0 16px 0 !important; border-radius: 8px !important; display: block !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;">`;
        html += `<div class="worker-response-content" data-raw-content="${encodeURIComponent(cleanOutput)}">`;
        // Temporary escaped content - will be replaced with rendered markdown
        const escapedOutput = cleanOutput
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        html += escapedOutput;
        html += `</div>`;
        html += `</div>`; // Close worker-container

        // Worker metadata (OUTSIDE container - part of main evaluation)
        html += `<div class="worker-metadata">`;
        if (result.confidence) {
          html += `<span class="confidence">Confidence: ${(result.confidence * 100).toFixed(1)}%</span>`;
        }
        if (ranking) {
          html += ` | <span class="ranking">Score: ${(ranking.score * 100).toFixed(1)}/100</span>`;
          if (ranking.reasoning && masterEvaluation && ranking.reasoning !== `Ranked #${masterEvaluation.rankings.findIndex(r => r.index === index) + 1} by master evaluation`) {
            html += ` <span class="ranking-detail">(${ranking.reasoning})</span>`;
          }
        }
        html += `</div>`;
      }
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

  // Convert markdown to safe HTML
  renderMarkdown(content: string): SafeHtml {
    const cleanContent = this.cleanThinkTags(content);
    // Use synchronous parsing for immediate rendering
    const htmlContent = typeof marked.parse === 'function'
      ? marked.parse(cleanContent, { async: false }) as string
      : marked(cleanContent) as string;
    return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  }

  // Check if content likely contains markdown
  hasMarkdown(content: string): boolean {
    const markdownPatterns = [
      /```[\s\S]*?```/,           // Code blocks
      /`[^`\n]+`/,                // Inline code
      /^\s*#{1,6}\s/m,            // Headers
      /^\s*\*\s+/m,               // Bullet lists
      /^\s*\d+\.\s+/m,            // Numbered lists
      /\*\*[^*]+\*\*/,            // Bold
      /\*[^*]+\*/,                // Italic
      /\[[^\]]+\]\([^)]+\)/       // Links
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
  }

  // Process content specifically for middle chat panel display
  processMiddleChatContent(htmlContent: string): string {
    // Look for worker-response-content divs with raw content data
    const workerResponsePattern = /<div class="worker-response-content"[^>]*data-raw-content="([^"]*)"[^>]*>[\s\S]*?<\/div>/g;
    let processedHtml = htmlContent;

    let match;
    while ((match = workerResponsePattern.exec(htmlContent)) !== null) {
      const originalDiv = match[0];
      const rawContentEncoded = match[1];

      // Decode the raw content
      const rawContent = decodeURIComponent(rawContentEncoded);

      // Process any markdown content (both regular and nested)
      const processedMarkdown = this.processNestedMarkdown(rawContent);

      const newMarkdownHtml = typeof marked.parse === 'function'
        ? marked.parse(processedMarkdown, { async: false }) as string
        : marked(processedMarkdown) as string;

      const newDiv = `<div class="worker-response-content markdown-content">${newMarkdownHtml}</div>`;
      processedHtml = processedHtml.replace(originalDiv, newDiv);
    }

    return processedHtml;
  }

  // Check specifically for nested markdown patterns
  hasNestedMarkdown(content: string): boolean {
    return /```markdown\s*[\s\S]*?\s*```/.test(content);
  }

  // Process nested markdown content properly
  processNestedMarkdown(content: string): string {
    let processedContent = content;
    let foundNested = false;

    // Case 1: Extract content from outer ```markdown ... ``` blocks
    // Use a more precise regex that handles the structure properly
    const outerMarkdownPattern = /^```markdown\s*\n([\s\S]*?)\n```$/;
    const match = content.match(outerMarkdownPattern);

    if (match) {
      const innerMarkdown = match[1];
      processedContent = innerMarkdown;
      foundNested = true;
    }

    if (foundNested) {
      return processedContent.trim();
    }

    // Case 2: Handle mixed content (text + markdown block)
    // Look for pattern: "Some text:\n\n```markdown\n# Content\n```"
    const mixedPattern = /([\s\S]*?)\n\n```markdown\s*([\s\S]*?)\s*```([\s\S]*)/;
    const mixedMatch = processedContent.match(mixedPattern);
    if (mixedMatch) {
      const [, beforeText, markdownContent, afterText] = mixedMatch;
      processedContent = beforeText.trim() + '\n\n' + markdownContent.trim() + '\n\n' + afterText.trim();
      return processedContent.trim();
    }

    // If no nested markdown patterns were found, return the original content
    // This ensures regular markdown still gets processed
    return processedContent.trim();
  }

  // Clean Qwen thinking tags
  cleanThinkTags(content: string): string {
    return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
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
