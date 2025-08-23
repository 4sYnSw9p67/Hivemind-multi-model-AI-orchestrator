import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WorkerResponse {
  id: string;
  model: string;
  output?: string;
  error?: string;
  query: string;
  timestamp: Date;
  processingTime?: number;
  confidence?: number;
  rating?: 'good' | 'bad' | null;
}

@Component({
  selector: 'app-worker-responses',
  imports: [CommonModule],
  templateUrl: './worker-responses.html',
  styleUrl: './worker-responses.css'
})
export class WorkerResponsesComponent {
  @Input() responses: WorkerResponse[] = [];

  trackByResponseId(index: number, response: WorkerResponse): string {
    return response.id;
  }

  rateResponse(response: WorkerResponse, rating: 'good' | 'bad') {
    if (response.rating === rating) {
      response.rating = null; // Toggle off if same rating clicked
    } else {
      response.rating = rating;
    }
  }

  getSuccessRate(): number {
    if (this.responses.length === 0) return 0;
    const successCount = this.responses.filter(r => !r.error).length;
    return Math.round((successCount / this.responses.length) * 100);
  }

  getAverageResponseTime(): number {
    const responsesWithTime = this.responses.filter(r => r.processingTime);
    if (responsesWithTime.length === 0) return 0;

    const total = responsesWithTime.reduce((sum, r) => sum + (r.processingTime || 0), 0);
    return Math.round(total / responsesWithTime.length);
  }

  getBestModel(): string {
    if (this.responses.length === 0) return 'N/A';

    const modelStats = this.responses.reduce((stats, response) => {
      if (!stats[response.model]) {
        stats[response.model] = { good: 0, bad: 0, total: 0 };
      }
      stats[response.model].total++;
      if (response.rating === 'good') {
        stats[response.model].good++;
      } else if (response.rating === 'bad') {
        stats[response.model].bad++;
      }
      return stats;
    }, {} as Record<string, { good: number; bad: number; total: number }>);

    let bestModel = 'N/A';
    let bestScore = -1;

    Object.entries(modelStats).forEach(([model, stats]) => {
      // Score based on success rate and positive ratings
      const successRate = (stats.total - this.responses.filter(r => r.model === model && r.error).length) / stats.total;
      const ratingScore = stats.good / Math.max(1, stats.good + stats.bad);
      const combinedScore = (successRate * 0.7) + (ratingScore * 0.3);

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestModel = model;
      }
    });

    return bestModel;
  }

  getModelDisplayName(model: string): string {
    const modelNames: Record<string, string> = {
      'gpt-4': 'GPT-4',
      'claude-3-sonnet': 'Claude 3 Sonnet',
      'llama-3.1': 'LLaMA 3.1',
      'deepseek-coder': 'DeepSeek Coder'
    };

    // Handle Qwen worker names
    if (model.startsWith('Qwen-Worker-')) {
      return model.replace('Qwen-Worker-', 'Qwen W');
    }

    return modelNames[model] || model;
  }

  formatResponse(output: string): string {
    if (!output) return '';

    // Clean up Qwen's thinking tags
    let cleaned = output.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Basic HTML formatting - convert newlines to <br> and handle basic markdown-like formatting
    let formatted = cleaned
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    return formatted;
  }
}
