import { Injectable } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeModeService {
  private readonly storageKey = 'fleet-theme-mode';
  private readonly defaultMode: ThemeMode = 'dark';

  init(): ThemeMode {
    const savedMode = this.getSavedMode();
    this.applyMode(savedMode);
    return savedMode;
  }

  getMode(): ThemeMode {
    return this.getSavedMode();
  }

  toggleMode(): ThemeMode {
    const nextMode: ThemeMode = this.getSavedMode() === 'dark' ? 'light' : 'dark';
    this.setMode(nextMode);
    return nextMode;
  }

  setMode(mode: ThemeMode): void {
    localStorage.setItem(this.storageKey, mode);
    this.applyMode(mode);
  }

  private getSavedMode(): ThemeMode {
    const mode = localStorage.getItem(this.storageKey);
    return mode === 'light' || mode === 'dark' ? mode : this.defaultMode;
  }

  private applyMode(mode: ThemeMode): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.classList.toggle('theme-dark', mode === 'dark');
    root.classList.toggle('theme-light', mode === 'light');

    if (document.body) {
      document.body.classList.toggle('theme-dark', mode === 'dark');
      document.body.classList.toggle('theme-light', mode === 'light');
    }
  }
}
