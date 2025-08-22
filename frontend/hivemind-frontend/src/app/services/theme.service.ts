import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private currentTheme = new BehaviorSubject<Theme>('light');
    public theme$ = this.currentTheme.asObservable();

    constructor() {
        // Check for saved theme preference or default to light
        const savedTheme = localStorage.getItem('hivemind-theme') as Theme;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        this.setTheme(initialTheme);
    }

    setTheme(theme: Theme) {
        this.currentTheme.next(theme);
        localStorage.setItem('hivemind-theme', theme);

        // Apply theme to document root
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme.value === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    getCurrentTheme(): Theme {
        return this.currentTheme.value;
    }
}
