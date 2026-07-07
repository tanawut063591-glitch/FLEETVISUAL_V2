import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AppInitService {
  defaultRoute = '/login';

  getConfigs(): Promise<boolean> {
    return Promise.resolve(true);
  }
}