import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiKeysService } from './api-keys.service';

export interface HivemindResponse {
    results: ModelResponse[];
    masterEvaluation?: {
        bestResponse: string;
        reasoning: string;
        ranking: { model: string; score: number }[];
    };
}

export interface ModelResponse {
    model: string;
    output?: string;
    error?: string;
    processingTime: number;
    confidence?: number;
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

    sendQuery(query: string): Observable<HivemindResponse> {
        // Try backend first, then fallback to direct API calls
        return this.tryBackend(query).pipe(
            catchError(() => this.callApisDirectly(query))
        );
    }

    private tryBackend(query: string): Observable<HivemindResponse> {
        const apiKeys = this.apiKeysService.getApiKeys();

        return this.http.post<HivemindResponse>(this.backendUrl, {
            query,
            apiKeys
        }).pipe(
            catchError((error) => {
                console.log('Backend not available, falling back to direct API calls');
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
                    processingTime: 0
                }]
            });
        }

        return forkJoin(requests).pipe(
            map(results => ({
                results,
                masterEvaluation: this.evaluateResponses(results)
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
                confidence: Math.floor(Math.random() * 30) + 70
            })),
            catchError(error => of({
                model: 'GPT-4',
                error: `OpenAI API Error: ${error.error?.error?.message || error.message}`,
                processingTime: Date.now() - startTime
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
                confidence: Math.floor(Math.random() * 30) + 70
            })),
            catchError(error => of({
                model: 'Claude 3 Sonnet',
                error: `Anthropic API Error: ${error.error?.error?.message || error.message}`,
                processingTime: Date.now() - startTime
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
                confidence: Math.floor(Math.random() * 30) + 70
            })),
            catchError(error => of({
                model: 'Gemini Pro',
                error: `Gemini API Error: ${error.error?.error?.message || error.message}`,
                processingTime: Date.now() - startTime
            }))
        );
    }

    private evaluateResponses(responses: ModelResponse[]): any {
        // Simple master evaluation logic
        const validResponses = responses.filter(r => !r.error && r.output);

        if (validResponses.length === 0) {
            return null;
        }

        // Score based on response length, confidence, and processing time
        const rankings = validResponses.map(response => {
            const lengthScore = Math.min((response.output?.length || 0) / 500, 1) * 30;
            const confidenceScore = (response.confidence || 50) * 0.4;
            const speedScore = Math.max(0, (5000 - response.processingTime) / 5000) * 30;

            return {
                model: response.model,
                score: Math.round(lengthScore + confidenceScore + speedScore)
            };
        }).sort((a, b) => b.score - a.score);

        const bestResponse = rankings[0];

        return {
            bestResponse: bestResponse.model,
            reasoning: `${bestResponse.model} provided the most comprehensive response with good confidence and response time.`,
            ranking: rankings
        };
    }
}
