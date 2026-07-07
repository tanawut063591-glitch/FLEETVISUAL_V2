import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigModel } from '../models/config.model';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppInitService {
  config: ConfigModel = {
    UrlApi: undefined,
    UrlApiAuthen: undefined,
    UrlApiBilling: undefined,
    UrlApiNotification: undefined,
    UrlApiMaintenance: undefined,
    UrlApiMasterData: undefined,
    Timer: 60,
  };

  defaultRoute: string = '/main/overview';
  
  constructor(private http: HttpClient) {}
  
  async getConfigs(): Promise<ConfigModel> {
    try {
      // Convert Observable to Promise using firstValueFrom
      const data: any = await firstValueFrom(
        this.http.get('assets/config.json')
      );
      
      //console.log('Config loaded:', data);
      
      // Update config object
      this.config.UrlApi = data.UrlApi;
      this.config.UrlApiAuthen = data.UrlApiAuthen;
      this.config.UrlApiBilling = data.UrlApiBilling;
      this.config.UrlApiNotification = data.UrlApiNotification;
      this.config.UrlApiMaintenance = data.UrlApiMaintenance;
      this.config.UrlApiMasterData = data.UrlApiMasterData;
      this.config.Timer = data.Timer;
      
      return this.config;
    } catch (error) {
      //console.error('Failed to load config:', error);
      // Return default config on error
      return this.config;
    }
  }
}