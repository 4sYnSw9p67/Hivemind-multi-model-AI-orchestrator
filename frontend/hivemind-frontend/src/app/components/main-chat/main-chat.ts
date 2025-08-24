import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HivemindService, MasterEvaluation, ModelResponse } from '../../services/hivemind.service';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Agent } from '../agent-creator/agent-creator';
import * as Prism from 'prismjs';

// Import common language syntax highlighters
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';

import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';

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
        const processedResponse = this.processMiddleChatContent(rawResponse);

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sender: 'Hivemind',
          content: rawResponse,
          contentHtml: this.sanitizer.bypassSecurityTrustHtml(processedResponse),
          timestamp: new Date(),
          type: 'assistant'
        };

        this.messages.push(assistantMessage);

        // Apply syntax highlighting after DOM update with multiple attempts
        this.applySyntaxHighlightingWithRetry();

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

      // Configure marked with better options for professional rendering
      const markedOptions = {
        async: false,
        gfm: true, // GitHub Flavored Markdown
        breaks: true, // Line breaks become <br>
        sanitize: false, // We'll sanitize with DomSanitizer
        smartLists: true,
        smartypants: true, // Smart quotes and dashes
        headerIds: false, // Don't add IDs to headers
        mangle: false // Don't mangle email addresses
        // Note: No highlight function - we'll apply Prism.js after DOM insertion
      };

      const newMarkdownHtml = typeof marked.parse === 'function'
        ? marked.parse(processedMarkdown, markedOptions) as string
        : marked(processedMarkdown, markedOptions) as string;

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

  // Apply syntax highlighting with retry mechanism
  applySyntaxHighlightingWithRetry(attempt: number = 1, maxAttempts: number = 5): void {
    // Look specifically for UNPROCESSED code blocks
    const unprocessedCodeBlocks = document.querySelectorAll('.message-text pre code:not(.highlighted)');

    if (unprocessedCodeBlocks.length > 0) {
      // Found unprocessed code blocks, apply highlighting
      console.log(`🎨 Found ${unprocessedCodeBlocks.length} new code blocks to highlight`);
      this.applySyntaxHighlighting();
    } else if (attempt < maxAttempts) {
      // No unprocessed code blocks found yet, retry with increasing delay
      const delay = attempt * 100; // 100ms, 200ms, 300ms, etc.
      setTimeout(() => {
        this.applySyntaxHighlightingWithRetry(attempt + 1, maxAttempts);
      }, delay);
    } else {
      console.warn('⚠️ No new code blocks found after', maxAttempts, 'attempts');
    }
  }

  // Apply Prism.js syntax highlighting to code blocks
  applySyntaxHighlighting(): void {
    try {
      // Only process unprocessed code blocks for efficiency
      const unprocessedCodeBlocks = document.querySelectorAll('.message-text pre code:not(.highlighted)');
      let highlightedCount = 0;

      unprocessedCodeBlocks.forEach((block) => {
        // Check if it already has a language class
        const hasLanguageClass = block.className.includes('language-');

        if (!hasLanguageClass) {
          // Try to detect language from content
          const codeContent = block.textContent || '';
          const detectedLang = this.detectCodeLanguage(codeContent);

          if (detectedLang && Prism.languages[detectedLang]) {
            block.className = `language-${detectedLang}`;
          } else {
            block.className = 'language-none';
          }
        }

        // Apply Prism highlighting
        if (block.className.includes('language-') && !block.className.includes('language-none')) {
          try {
            Prism.highlightElement(block as HTMLElement);
            highlightedCount++;
          } catch (err) {
            console.warn(`Failed to highlight code block:`, err);
          }
        }

        // Mark as processed
        block.classList.add('highlighted');
      });

      if (highlightedCount > 0) {
        console.log(`✅ Applied syntax highlighting to ${highlightedCount} code blocks`);
      }
    } catch (error) {
      console.warn('Prism highlighting failed:', error);
    }
  }

  // Enhanced language detection based on code patterns
  detectCodeLanguage(code: string): string | null {
    // Clean up the code for better detection
    const cleanCode = code.trim();

    const patterns = [
      // Bash/Shell - check first since npm commands are common
      { lang: 'bash', regex: /\b(npm|node|echo|cd|ls|grep|curl|git|chmod|mkdir|rm|cp|mv|cat|sudo|apt|yum|brew)\b/ },
      { lang: 'bash', regex: /^[\$#]\s+/ }, // Shell prompts

      // JavaScript/Node.js - enhanced patterns
      { lang: 'javascript', regex: /\b(const|let|var|function|=>|require\(|console\.log|express|app\.get|app\.listen)\b/ },
      { lang: 'javascript', regex: /\b(npm|yarn|webpack|babel|react|vue|angular)\b/ },

      // TypeScript
      { lang: 'typescript', regex: /\b(interface|type|implements|extends|private|public|readonly)\b/ },

      // Python
      { lang: 'python', regex: /\b(def|import|from|print\(|if __name__|class|pip|python)\b/ },

      // Other languages
      { lang: 'java', regex: /\b(public class|private|protected|static|void|System\.out)\b/ },
      { lang: 'csharp', regex: /\b(using|namespace|public class|private|Console\.WriteLine)\b/ },
      { lang: 'go', regex: /\b(package|func|import|fmt\.Print|var|:=)\b/ },
      { lang: 'rust', regex: /\b(fn|let|mut|pub|use|println!)\b/ },
      { lang: 'sql', regex: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE)\b/i },
      { lang: 'json', regex: /^\s*[\{\[].*[\}\]]\s*$/s },
      { lang: 'yaml', regex: /^\s*\w+:\s*\w+/m },
      { lang: 'html', regex: /<[^>]+>/ },
      { lang: 'css', regex: /\{[^}]*\}/ }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(cleanCode)) {
        return pattern.lang;
      }
    }

    return null;
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
