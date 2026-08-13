import { Injectable } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeModeService {
  private readonly storageKey = 'fleet-theme-mode';
  private readonly defaultVersionKey = 'fleet-theme-default-version';
  private readonly defaultVersion = 'light-default-v1';
  private readonly defaultMode: ThemeMode = 'light';

  init(): ThemeMode {
    const isCurrentDefaultVersion =
      localStorage.getItem(this.defaultVersionKey) === this.defaultVersion;



    const mode = isCurrentDefaultVersion ? this.getSavedMode() : this.defaultMode;

    if (!isCurrentDefaultVersion) {
      this.persistMode(mode);
    }

    this.applyMode(mode, false);
    return mode;
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
    this.persistMode(mode);
    this.applyMode(mode, true);
  }

  private persistMode(mode: ThemeMode): void {
    localStorage.setItem(this.storageKey, mode);
    localStorage.setItem(this.defaultVersionKey, this.defaultVersion);
  }

  private getSavedMode(): ThemeMode {
    const mode = localStorage.getItem(this.storageKey);
    return mode === 'light' || mode === 'dark' ? mode : this.defaultMode;
  }

  private applyMode(mode: ThemeMode, animate: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    if (animate) {
      root.classList.add('theme-changing');
      window.setTimeout(() => root.classList.remove('theme-changing'), 260);
    }

    root.setAttribute('data-theme', mode);
    root.classList.toggle('theme-dark', mode === 'dark');
    root.classList.toggle('theme-light', mode === 'light');

    if (document.body) {
      document.body.classList.toggle('theme-dark', mode === 'dark');
      document.body.classList.toggle('theme-light', mode === 'light');
    }
  }
}
