import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';

import { SettingsComponent } from './settings.component';

@Injectable({ providedIn: 'root' })
export class SettingsUnsavedGuard implements CanDeactivate<SettingsComponent> {
  canDeactivate(component: SettingsComponent): boolean {
    return component.canDeactivateSettings();
  }
}