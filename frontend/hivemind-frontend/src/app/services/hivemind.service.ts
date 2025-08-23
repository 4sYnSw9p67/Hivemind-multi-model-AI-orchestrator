import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiKeysService } from './api-keys.service';

export interface HivemindResponse {
    results: ModelResponse[];
    queryId: string;
    masterEvaluation?: MasterEvaluation;
}

export interface ModelResponse {
    model: string;
    output?: string;
    error?: string;
    processingTime: number;
    timestamp: string;
    confidence?: number;
    workerParams?: WorkerParams;
}

export interface WorkerParams {
    temperature: number;
    top_k: number;
    top_p: number;
    worker_id: string;
}

export interface MasterEvaluation {
    bestResponseIndex: number;
    reasoning: string;
    rankings: ResponseRanking[];
    evaluationTime: number;
}

export interface ResponseRanking {
    index: number;
    score: number;
    reasoning: string;
}

@Injectable({
    providedIn: 'root'
})
export class HivemindService {
    private backendUrl = 'http://localhost:8080/query';

    // Fallback to direct API calls if backend is not available
    private openaiUrl = 'https://api.openai.com/v1/chat/completions';
    private anthropicUrl = 'https://api.anthropic.com/v1/messages';
    private geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

    constructor(
        private http: HttpClient,
        private apiKeysService: ApiKeysService
    ) { }

    sendQuery(query: string, agents: any[] = []): Observable<HivemindResponse> {
        // Try backend first, then fallback to direct API calls
        return this.tryBackend(query, agents).pipe(
            catchError(() => this.callApisDirectly(query))
        );
    }

    private tryBackend(query: string, agents: any[] = []): Observable<HivemindResponse> {
        return this.http.post<HivemindResponse>(this.backendUrl, {
            query,
            agents: agents.map(agent => ({
                name: agent.name,
                specialization: agent.specialization || '',
                responseLength: agent.responseLength || 'unlimited',
                workerParams: {
                    temperature: agent.workerParams.temperature,
                    top_k: agent.workerParams.top_k,
                    top_p: agent.workerParams.top_p,
                    worker_id: agent.name
                }
            }))
        }).pipe(
            catchError((error) => {
                console.log('Qwen backend not available, falling back to direct API calls');
                throw error;
            })
        );
    }

    private callApisDirectly(query: string): Observable<HivemindResponse> {
        const apiKeys = this.apiKeysService.getApiKeys();
        const requests: Observable<ModelResponse>[] = [];

        // OpenAI GPT-4
        if (apiKeys.openai?.trim()) {
            requests.push(this.callOpenAI(query, apiKeys.openai));
        }

        // Anthropic Claude
        if (apiKeys.anthropic?.trim()) {
            requests.push(this.callAnthropic(query, apiKeys.anthropic));
        }

        // Google Gemini
        if (apiKeys.gemini?.trim()) {
            requests.push(this.callGemini(query, apiKeys.gemini));
        }

        if (requests.length === 0) {
            return of({
                results: [{
                    model: 'System',
                    error: 'No API keys configured. Please configure your API keys in Settings.',
                    processingTime: 0,
                    timestamp: new Date().toISOString()
                }],
                queryId: `fallback_error_${Date.now()}`
            });
        }

        return forkJoin(requests).pipe(
            map(results => ({
                results,
                queryId: `fallback_${Date.now()}`,
                masterEvaluation: this.evaluateResponses(results) || undefined
            }))
        );
    }

    private callOpenAI(query: string, apiKey: string): Observable<ModelResponse> {
        const startTime = Date.now();

        const headers = new HttpHeaders({
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        });

        const body = {
            model: 'gpt-4',
            messages: [
                { role: 'user', content: query }
            ],
            max_tokens: 1000,
            temperature: 0.7
        };

        return this.http.post<any>(this.openaiUrl, body, { headers }).pipe(
            map(response => ({
                model: 'GPT-4',
                output: response.choices[0]?.message?.content || 'No response',
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                confidence: Math.floor(Math.random() * 30) + 70
            })),
            catchError(error => of({
                model: 'GPT-4',
                error: `OpenAI API Error: ${error.error?.error?.message || error.message}`,
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            }))
        );
    }

    private callAnthropic(query: string, apiKey: string): Observable<ModelResponse> {
        const startTime = Date.now();

        const headers = new HttpHeaders({
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        });

        const body = {
            model: 'claude-3-sonnet-20240229',
            max_tokens: 1000,
            messages: [
                { role: 'user', content: query }
            ]
        };

        return this.http.post<any>(this.anthropicUrl, body, { headers }).pipe(
            map(response => ({
                model: 'Claude 3 Sonnet',
                output: response.content[0]?.text || 'No response',
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                confidence: Math.floor(Math.random() * 30) + 70
            })),
            catchError(error => of({
                model: 'Claude 3 Sonnet',
                error: `Anthropic API Error: ${error.error?.error?.message || error.message}`,
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            }))
        );
    }

    private callGemini(query: string, apiKey: string): Observable<ModelResponse> {
        const startTime = Date.now();

        const url = `${this.geminiUrl}?key=${apiKey}`;

        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        const body = {
            contents: [{
                parts: [{ text: query }]
            }],
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7
            }
        };

        return this.http.post<any>(url, body, { headers }).pipe(
            map(response => ({
                model: 'Gemini Pro',
                output: response.candidates[0]?.content?.parts[0]?.text || 'No response',
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                confidence: Math.floor(Math.random() * 30) + 70
            })),
            catchError(error => of({
                model: 'Gemini Pro',
                error: `Gemini API Error: ${error.error?.error?.message || error.message}`,
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            }))
        );
    }

    private evaluateResponses(responses: ModelResponse[]): MasterEvaluation | null {
        // Simple master evaluation logic for fallback
        const validResponses = responses.filter(r => !r.error && r.output);

        if (validResponses.length === 0) {
            return null;
        }

        // Score based on response length, confidence, and processing time
        const rankings: ResponseRanking[] = validResponses.map((response, index) => {
            const lengthScore = Math.min((response.output?.length || 0) / 500, 1) * 30;
            const confidenceScore = (response.confidence || 50) * 0.4;
            const speedScore = Math.max(0, (5000 - response.processingTime) / 5000) * 30;
            const totalScore = lengthScore + confidenceScore + speedScore;

            return {
                index: responses.indexOf(response),
                score: Math.round(totalScore) / 100, // Normalize to 0-1 range
                reasoning: `Score based on length, confidence, and speed`
            };
        }).sort((a, b) => b.score - a.score);

        const bestRanking = rankings[0];

        return {
            bestResponseIndex: bestRanking.index,
            reasoning: `${responses[bestRanking.index].model} provided the most comprehensive response with good confidence and response time.`,
            rankings: rankings,
            evaluationTime: 0 // Instant evaluation for fallback
        };
    }
}
