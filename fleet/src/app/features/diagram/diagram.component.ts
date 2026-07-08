import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';

import { FvState } from '../../shared/state-managements/states/app.states';
import * as fvInfoActions from '../../shared/state-managements/actions/fv-info.action';
import * as fvInfoReducer from '../../shared/state-managements/reducers/fv-info.reducer';

interface DiagramDevice {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  tags: string[];
  mode: string;
}

@Component({
  selector: 'app-diagram',
    standalone: false,
  templateUrl: './diagram.component.html',
  styleUrls: ['./diagram.component.css']
})
export class DiagramComponent implements OnInit, OnDestroy {

  data$: Observable<any> | undefined;
  vessel$: Observable<any> | undefined;

  vesselName = 'SELECTED VESSEL';
  vesselPrefix = '';
  lastUpdated = '-';
  currentValues: { [key: string]: any } = {};

  devices: DiagramDevice[] = [
    { id: 'rut', title: 'RUT', subtitle: 'Router', icon: 'router', tags: ['RUT_ALIVE'], mode: 'alive' },
    { id: 'hmi', title: 'HMI', subtitle: 'Interface', icon: 'monitor', tags: ['HMI_ALIVE'], mode: 'alive' },
    { id: 'hub', title: 'HUB SWITCH', subtitle: 'Network Switch', icon: 'switch', tags: ['RUT_ALIVE', 'HMI_ALIVE', 'FV_API_ALIVE'], mode: 'alive-any' },
    { id: 'mini-pc', title: 'Mini PC', subtitle: 'Panel', icon: 'pc', tags: ['FV_API_ALIVE'], mode: 'alive' },
    { id: 'gps', title: 'GPS', subtitle: 'Antenna', icon: 'gps', tags: ['GPS_PANEL_ALIVE'], mode: 'alive' },

    { id: 'plc', title: 'PLC', subtitle: 'Controller', icon: 'plc', tags: ['DCP_PLC_ALIVE'], mode: 'alive' },
    { id: 'mtr-switch', title: 'MTR SWITCH', subtitle: 'Monitoring Switch', icon: 'switch', tags: ['DCP_GATEWAY_ALIVE', 'DCP_ET2251_ALIVE'], mode: 'alive-any' },
    { id: 'atop1', title: 'ATOP1', subtitle: 'Module', icon: 'module', tags: ['DCP_ATOP1_ALIVE'], mode: 'alive' },
    { id: 'atop2', title: 'ATOP2', subtitle: 'Module', icon: 'module', tags: ['DCP_ATOP2_ALIVE'], mode: 'alive' },
    { id: 'et2251', title: 'ET2251', subtitle: 'Gateway', icon: 'gateway', tags: ['DCP_ET2251_ALIVE'], mode: 'alive' },

    {
      id: 'gen1', title: 'GEN1 GATEWAY', subtitle: 'Generator 1', icon: 'generator',
      tags: ['GATEWAY_GEN1_KW_ALIVE', 'TGW_ECM_DG1_ALIVE', 'ANYBUS_ECM1_ALIVE'],
      mode: 'gateway'
    },
    {
      id: 'gen2', title: 'GEN2 GATEWAY', subtitle: 'Generator 2', icon: 'generator',
      tags: ['GATEWAY_GEN2_KW_ALIVE', 'TGW_ECM_DG2_ALIVE', 'ANYBUS_ECM2_ALIVE'],
      mode: 'gateway'
    },
    {
      id: 'gen3', title: 'GEN3 GATEWAY', subtitle: 'Generator 3', icon: 'generator',
      tags: ['GATEWAY_GEN3_KW_ALIVE', 'TGW_ECM_DG3_ALIVE', 'ANYBUS_ECM3_ALIVE'],
      mode: 'gateway'
    },
    {
      id: 'gen4', title: 'GEN4 GATEWAY', subtitle: 'Generator 4', icon: 'generator',
      tags: ['GATEWAY_GEN4_KW_ALIVE', 'TGW_ECM_DG4_ALIVE', 'ANYBUS_ECM4_ALIVE'],
      mode: 'gateway'
    }
  ];

  private subscription = new Subscription();

  constructor(
    private store: Store<FvState>,
    private route: ActivatedRoute
  ) {
    const routeSubscription = this.route.params.pipe(
      withLatestFrom(this.store.select(fvInfoReducer.getFvInfos)),
      map(([route, store]) => {
        return {
          route: route,
          store: store
        };
      })
    ).subscribe(result => {
      if (result && result.store && result.store.length > 0 && result.route && result.route.hasOwnProperty('id')) {
        const id = result.route['id'];
        const match = result.store.filter(x => x.prefix && x.prefix.toLowerCase() === id.toLowerCase());
        if (match && match.length > 0) {
          this.store.dispatch(new fvInfoActions.SetFvActive(match[0]));
        }
      }
    });

    this.subscription.add(routeSubscription);
  }

  ngOnInit() {
    this.vessel$ = this.store.select(fvInfoReducer.getFvInfosActive);
    const vesselSubscription = this.vessel$.subscribe(data => {
      if (data && data.fvInfo) {
        this.vesselName = data.fvInfo.name || data.fvInfo.prefix || 'SELECTED VESSEL';
        this.vesselPrefix = data.fvInfo.prefix || '';
      }
    });
    this.subscription.add(vesselSubscription);

    this.data$ = this.store.select(fvInfoReducer.getFvRealtimeData);
    const dataSubscription = this.data$.subscribe(data => {
      this.currentValues = data || {};
      this.lastUpdated = this.findLastUpdated();
    });
    this.subscription.add(dataSubscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  trackByDevice(index: number, device: DiagramDevice) {
    return device.id;
  }

  statusClass(device: DiagramDevice): string {
    return 'status-' + this.getStatus(device);
  }

  statusText(device: DiagramDevice): string {
    const status = this.getStatus(device);
    if (status === 'online') {
      return 'Online';
    }
    if (status === 'offline') {
      return 'Offline';
    }
    return 'No Data';
  }

  getSummary(type: string): number {
    let total = 0;
    this.devices.forEach(device => {
      if (this.getStatus(device) === type) {
        total++;
      }
    });
    return total;
  }

  private getStatus(device: DiagramDevice): string {
    const values: number[] = [];
    const failValues: number[] = [];

    device.tags.forEach(tag => {
      const raw = this.getTagValue(tag);
      if (raw !== null && raw !== undefined && raw !== '') {
        const numberValue = Number(raw);
        if (!isNaN(numberValue)) {
          if (tag.indexOf('_COM_FAIL') >= 0) {
            failValues.push(numberValue);
          } else {
            values.push(numberValue);
          }
        }
      }
    });

    if (device.mode === 'gateway') {
      if (values.length > 0) {
        return values.some(value => value === 1) ? 'online' : 'offline';
      }
      if (failValues.length > 0) {
        return failValues.some(value => value === 1) ? 'offline' : 'online';
      }
      return 'unknown';
    }

    if (device.mode === 'alive-any') {
      if (values.length === 0) {
        return 'unknown';
      }
      return values.some(value => value === 1) ? 'online' : 'offline';
    }

    if (values.length === 0) {
      return 'unknown';
    }

    return values[0] === 1 ? 'online' : 'offline';
  }

  private getTagValue(tagName: string): any {
    const tag = this.currentValues ? this.currentValues[tagName] : null;
    if (!tag) {
      return null;
    }
    if (tag.value !== undefined && tag.value !== null) {
      return tag.value;
    }
    if (tag.ivalue !== undefined && tag.ivalue !== null) {
      return tag.ivalue;
    }
    return tag;
  }

  private findLastUpdated(): string {
    if (!this.currentValues) {
      return '-';
    }

    const keys = Object.keys(this.currentValues);
    for (let i = 0; i < keys.length; i++) {
      const tag = this.currentValues[keys[i]];
      if (tag && tag.timestamp) {
        return this.formatDate(tag.timestamp);
      }
    }

    return '-';
  }

  private formatDate(value: any): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return '-';
    }

    // Keep the same Bangkok time handling as the original code,
    // but show full date + time for Last Update.
    const localTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));

    const day = this.padTime(localTime.getUTCDate());
    const month = this.padTime(localTime.getUTCMonth() + 1);
    const year = localTime.getUTCFullYear();
    const hours = this.padTime(localTime.getUTCHours());
    const minutes = this.padTime(localTime.getUTCMinutes());
    const seconds = this.padTime(localTime.getUTCSeconds());

    return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes + ':' + seconds;
  }

  private padTime(value: number): string {
    return ('0' + value).slice(-2);
  }
}
