import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ApiKeys {
    openai: string;
    anthropic: string;
    gemini: string;
}

export interface UserPreferences {
    enableMasterAI: boolean;
    autoCreateAgents: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ApiKeysService {
    private apiKeys = new BehaviorSubject<ApiKeys>({
        openai: '',
        anthropic: '',
        gemini: ''
    });

    public apiKeys$ = this.apiKeys.asObservable();

    constructor() {
        this.loadApiKeys();
    }

    private loadApiKeys() {
        const saved = localStorage.getItem('hivemind-api-keys');
        if (saved) {
            try {
                const keys = JSON.parse(saved);
                this.apiKeys.next(keys);
            } catch (error) {
                console.warn('Failed to load API keys from localStorage:', error);
            }
        }
    }

    updateApiKeys(keys: Partial<ApiKeys>) {
        const currentKeys = this.apiKeys.value;
        const updatedKeys = { ...currentKeys, ...keys };

        this.apiKeys.next(updatedKeys);
        localStorage.setItem('hivemind-api-keys', JSON.stringify(updatedKeys));
    }

    getApiKeys(): ApiKeys {
        return this.apiKeys.value;
    }

    hasValidKeys(): boolean {
        const keys = this.apiKeys.value;
        return !!(keys.openai?.trim() || keys.anthropic?.trim() || keys.gemini?.trim());
    }

    saveApiKeys(keys: ApiKeys) {
        this.apiKeys.next(keys);
        localStorage.setItem('hivemind-api-keys', JSON.stringify(keys));
    }

    clearApiKeys() {
        const emptyKeys: ApiKeys = {
            openai: '',
            anthropic: '',
            gemini: ''
        };
        this.apiKeys.next(emptyKeys);
        localStorage.removeItem('hivemind-api-keys');
    }

    getPreferences(): UserPreferences {
        const saved = localStorage.getItem('hivemind-preferences');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.warn('Failed to load preferences from localStorage:', error);
            }
        }
        return {
            enableMasterAI: true,
            autoCreateAgents: false
        };
    }

    savePreferences(preferences: UserPreferences) {
        localStorage.setItem('hivemind-preferences', JSON.stringify(preferences));
    }
}
