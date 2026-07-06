import { Injectable } from '@angular/core';
import { PageDataModel } from '../models/page.model';

@Injectable({
  providedIn: 'root'
})
export class PagesService {
  private defaultPage = 'main';
  private pageList: PageDataModel[] = [
    {
      level: 'central',
      page: [ 
        { name: 'Overview', path: 'overview' }, { name: 'Performance', path: 'performance' }, { name: 'Trends', path: 'trend' }, { name: 'Tabular', path: 'tabular' }, { name: 'Events', path: 'events' }, { name: 'Billings', path: 'billing' }
        ,{ name: 'Report', path: 'reports' }, { name: 'Billing Admin', path: 'admin' }, { name: 'Report Admin', path: 'report-admin' }, { name: 'Settings', path: 'setting' }
      ]
    },
    {
      level: 'site',
      page: [ 
        { name: 'Overview', path: 'layout' }, { name: 'Dashboard', path: 'dashboard' }, { name: 'Performance', path: 'efficiency' }
        ,{ name: 'Realtime', path: 'realtime' }, { name: 'Diagram', path: 'diagram' }, /*{ name: 'Control', path: 'control' },*/ { name: 'Charts', path: 'charts' }
        ,{ name: 'Event', path: 'event' }, { name: 'Report', path: 'report' }
      ]
    }
  ];

  getPageList(): any[] {
    return this.pageList;
  };

  getCentralPages(): any[] {
    return this.pageList[0].page;
  };

  getSitePages(): any[] {
    return this.pageList[1].page;
  };

  isHasPage(path: string): boolean {
    return this.pageList.flatMap(x => x.page).map(x => x.path).includes(path);
  };

  
  
}
