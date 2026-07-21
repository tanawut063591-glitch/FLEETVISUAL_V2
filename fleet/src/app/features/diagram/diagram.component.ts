import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import * as fvInfoActions from '../../store/actions/fv-info.action';
import * as fvInfoReducer from '../../store/reducers/fv-info.reducer';
import { FvRealtimeService } from '../../shared/services/fv-realtime.service';

interface DiagramDevice {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  tags: string[];
  mode: 'alive' | 'alive-any' | 'gateway';
}

interface VesselInfoLike {
  id?: string;
  desc?: string;
  img?: string;
  lat?: string;
  long?: string;
  name?: string;
  prefix?: string;
  active?: boolean;
  timestamp?: Date | string;
}

@Component({
  selector: 'app-diagram',
  standalone: false,
  templateUrl: './diagram.component.html',
  styleUrls: ['./diagram.component.css'],
})
export class DiagramComponent implements OnInit, OnDestroy {
  data$: Observable<any> | undefined;
  vessel$: Observable<any> | undefined;

  vesselName = 'SELECTED VESSEL';
  vesselPrefix = '';
  lastUpdated = '-';
  currentValues: { [key: string]: any } = {};

  devices: DiagramDevice[] = [
    {
      id: 'rut',
      title: 'RUT',
      subtitle: 'Router',
      icon: 'router',
      tags: ['RUT_ALIVE'],
      mode: 'alive',
    },
    {
      id: 'hmi',
      title: 'HMI',
      subtitle: 'Interface',
      icon: 'monitor',
      tags: ['HMI_ALIVE'],
      mode: 'alive',
    },
    {
      id: 'hub',
      title: 'HUB SWITCH',
      subtitle: 'Network Switch',
      icon: 'switch',
      tags: ['RUT_ALIVE', 'HMI_ALIVE', 'FV_API_ALIVE'],
      mode: 'alive-any',
    },
    {
      id: 'mini-pc',
      title: 'Mini PC',
      subtitle: 'Panel',
      icon: 'pc',
      tags: ['FV_API_ALIVE'],
      mode: 'alive',
    },
    {
      id: 'gps',
      title: 'GPS',
      subtitle: 'Antenna',
      icon: 'gps',
      tags: ['GPS_PANEL_ALIVE'],
      mode: 'alive',
    },
    {
      id: 'plc',
      title: 'PLC',
      subtitle: 'Controller',
      icon: 'plc',
      tags: ['DCP_PLC_ALIVE'],
      mode: 'alive',
    },
    {
      id: 'mtr-switch',
      title: 'MTR SWITCH',
      subtitle: 'Monitoring Switch',
      icon: 'switch',
      tags: ['DCP_GATEWAY_ALIVE', 'DCP_ET2251_ALIVE'],
      mode: 'alive-any',
    },
    {
      id: 'atop1',
      title: 'ATOP1',
      subtitle: 'Module',
      icon: 'module',
      tags: ['DCP_ATOP1_ALIVE'],
      mode: 'alive',
    },
    {
      id: 'atop2',
      title: 'ATOP2',
      subtitle: 'Module',
      icon: 'module',
      tags: ['DCP_ATOP2_ALIVE'],
      mode: 'alive',
    },
    {
      id: 'et2251',
      title: 'ET2251',
      subtitle: 'Gateway',
      icon: 'gateway',
      tags: ['DCP_ET2251_ALIVE'],
      mode: 'alive',
    },
    {
      id: 'gen1',
      title: 'GEN1 GATEWAY',
      subtitle: 'Generator 1',
      icon: 'generator',
      tags: [
        'GATEWAY_GEN1_KW_ALIVE',
        'TGW_ECM_DG1_ALIVE',
        'ANYBUS_ECM1_ALIVE',
      ],
      mode: 'gateway',
    },
    {
      id: 'gen2',
      title: 'GEN2 GATEWAY',
      subtitle: 'Generator 2',
      icon: 'generator',
      tags: [
        'GATEWAY_GEN2_KW_ALIVE',
        'TGW_ECM_DG2_ALIVE',
        'ANYBUS_ECM2_ALIVE',
      ],
      mode: 'gateway',
    },
    {
      id: 'gen3',
      title: 'GEN3 GATEWAY',
      subtitle: 'Generator 3',
      icon: 'generator',
      tags: [
        'GATEWAY_GEN3_KW_ALIVE',
        'TGW_ECM_DG3_ALIVE',
        'ANYBUS_ECM3_ALIVE',
      ],
      mode: 'gateway',
    },
    {
      id: 'gen4',
      title: 'GEN4 GATEWAY',
      subtitle: 'Generator 4',
      icon: 'generator',
      tags: [
        'GATEWAY_GEN4_KW_ALIVE',
        'TGW_ECM_DG4_ALIVE',
        'ANYBUS_ECM4_ALIVE',
      ],
      mode: 'gateway',
    },
  ];

  private subscription = new Subscription();
  private activeVesselIdentity = '';

  constructor(
    private store: Store<any>,
    private route: ActivatedRoute,
    private fvRealtimeService: FvRealtimeService
  ) {}

  ngOnInit(): void {
    // Diagram ใช้ข้อมูล live ชุดเดียวกับหน้า Realtime
    // service จะยิง /getcurrentvalues ทุก 5 วินาทีเอง ไม่ต้อง refresh browser
    this.fvRealtimeService.ensureStarted(5000);

    this.watchRouteVessel();
    this.watchActiveVessel();
    this.watchRealtimeData();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  trackByDevice(index: number, device: DiagramDevice): string {
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

    for (const device of this.devices) {
      if (this.getStatus(device) === type) {
        total++;
      }
    }

    return total;
  }

  private watchRouteVessel(): void {
    const routeSubscription = combineLatest([
      this.route.paramMap.pipe(
        map((params) => (params.get('id') || '').trim()),
        distinctUntilChanged()
      ),
      this.store.select(fvInfoReducer.getFvInfos),
    ]).subscribe(([id, vessels]) => {
      if (!id || !Array.isArray(vessels) || vessels.length === 0) {
        return;
      }
      
      const match = vessels.find((item: any) => {
        const info = this.getVesselInfo(item);

        return this.isSameVessel(info, id);
      });

      if (!match) {
        return;
      }

      const selectedInfo = this.getVesselInfo(match);

      if (!selectedInfo) {
        return;
      }

      if (this.isCurrentActiveVessel(selectedInfo)) {
        return;
      }

      this.store.dispatch(new fvInfoActions.SetFvActive(match));
    });

    this.subscription.add(routeSubscription);
  }

  private watchActiveVessel(): void {
    this.vessel$ = combineLatest([
      this.store.select(fvInfoReducer.getFvInfosActive),
      this.fvRealtimeService.activeVessel$,
    ]).pipe(
      map(([storeActive, serviceActive]) => serviceActive || storeActive),
      distinctUntilChanged((prev, curr) =>
        this.getVesselIdentity(prev) === this.getVesselIdentity(curr)
      )
    );

    const vesselSubscription = this.vessel$.subscribe((data) => {
      const info = this.getVesselInfo(data);

      if (!info) {
        this.vesselName = 'SELECTED VESSEL';
        this.vesselPrefix = '';
        return;
      }

      this.vesselName = info.name || info.prefix || 'SELECTED VESSEL';
      this.vesselPrefix = info.prefix || '';

      const identity = this.getVesselIdentity(data);

      if (identity && identity !== this.activeVesselIdentity) {
        this.activeVesselIdentity = identity;
        this.fvRealtimeService.setActiveVessel(data);
      }
    });

    this.subscription.add(vesselSubscription);
  }

  private watchRealtimeData(): void {
    this.data$ = combineLatest([
      this.store.select(fvInfoReducer.getFvRealtimeData),
      this.fvRealtimeService.currentData$,
    ]).pipe(
      map(([storeData, liveData]) => {
        const normalizedLiveData = this.normalizeRealtimeData(liveData);
        const normalizedStoreData = this.normalizeRealtimeData(storeData);

        return Object.keys(normalizedLiveData).length > 0
          ? normalizedLiveData
          : normalizedStoreData;
      })
    );

    const dataSubscription = this.data$.subscribe((data) => {
      this.currentValues = this.normalizeRealtimeData(data);
      this.lastUpdated = this.findLastUpdated();
    });

    this.subscription.add(dataSubscription);
  }

  private getVesselInfo(item: any): VesselInfoLike | null {
    if (!item) {
      return null;
    }

    if (item.fvInfo) {
      return item.fvInfo;
    }

    return item;
  }

  private isSameVessel(info: VesselInfoLike | null, id: string): boolean {
    if (!info || !id) {
      return false;
    }

    const target = id.toLowerCase();

    const prefix = (info.prefix || '').toLowerCase();
    const name = (info.name || '').toLowerCase();
    const vesselId = (info.id || '').toLowerCase();

    return prefix === target || name === target || vesselId === target;
  }

  private isCurrentActiveVessel(info: VesselInfoLike): boolean {
    const currentPrefix = (this.vesselPrefix || '').toLowerCase();
    const nextPrefix = (info.prefix || '').toLowerCase();

    if (currentPrefix && nextPrefix && currentPrefix === nextPrefix) {
      return true;
    }

    const currentName = (this.vesselName || '').toLowerCase();
    const nextName = (info.name || '').toLowerCase();

    return !!currentName && !!nextName && currentName === nextName;
  }

  private getVesselIdentity(vessel: any): string {
    const info = this.getVesselInfo(vessel);

    return String(
      info?.prefix ||
        info?.id ||
        info?.name ||
        ''
    ).toLowerCase();
  }

  private normalizeRealtimeData(data: any): { [key: string]: any } {
    if (!data) {
      return {};
    }

    if (data.data && typeof data.data === 'object') {
      return data.data;
    }

    if (typeof data === 'object') {
      return data;
    }

    return {};
  }

  private getStatus(device: DiagramDevice): string {
    const values: number[] = [];
    const failValues: number[] = [];

    for (const tag of device.tags) {
      const raw = this.getTagValue(tag);

      if (raw === null || raw === undefined || raw === '') {
        continue;
      }

      const numberValue = Number(raw);

      if (isNaN(numberValue)) {
        continue;
      }

      if (tag.indexOf('_COM_FAIL') >= 0) {
        failValues.push(numberValue);
      } else {
        values.push(numberValue);
      }
    }

    if (device.mode === 'gateway') {
      if (values.length > 0) {
        return values.some((value) => value === 1) ? 'online' : 'offline';
      }

      if (failValues.length > 0) {
        return failValues.some((value) => value === 1) ? 'offline' : 'online';
      }

      return 'unknown';
    }

    if (device.mode === 'alive-any') {
      if (values.length === 0) {
        return 'unknown';
      }

      return values.some((value) => value === 1) ? 'online' : 'offline';
    }

    if (values.length === 0) {
      return 'unknown';
    }

    return values[0] === 1 ? 'online' : 'offline';
  }

  private getTagValue(tagName: string): any {
    if (!this.currentValues) {
      return null;
    }

    const targetKey = this.normalizeTagKey(tagName);
    const keys = Object.keys(this.currentValues);

    for (const key of keys) {
      if (this.normalizeTagKey(key) === targetKey) {
        const tag = this.currentValues[key];

        if (!tag) {
          return null;
        }

        if (tag.value !== undefined && tag.value !== null) {
          return tag.value;
        }

        if (tag.ivalue !== undefined && tag.ivalue !== null) {
          return tag.ivalue;
        }

        if (tag.Value !== undefined && tag.Value !== null) {
          return tag.Value;
        }

        return tag;
      }
    }

    return null;
  }

  private normalizeTagKey(key: string): string {
    let normalizedKey = key || '';

    if (this.vesselPrefix) {
      const prefixDash = this.vesselPrefix + '-';
      const prefixUnderscore = this.vesselPrefix + '_';

      if (normalizedKey.indexOf(prefixDash) === 0) {
        normalizedKey = normalizedKey.substring(prefixDash.length);
      }

      if (normalizedKey.indexOf(prefixUnderscore) === 0) {
        normalizedKey = normalizedKey.substring(prefixUnderscore.length);
      }
    }

    const firstDashIndex = normalizedKey.indexOf('-');

    if (firstDashIndex >= 0) {
      const maybePrefix = normalizedKey.substring(0, firstDashIndex);

      if (
        this.vesselPrefix &&
        maybePrefix.toLowerCase() === this.vesselPrefix.toLowerCase()
      ) {
        normalizedKey = normalizedKey.substring(firstDashIndex + 1);
      }
    }

    return normalizedKey.replace(/-/g, '_').toUpperCase();
  }

  private findLastUpdated(): string {
    if (!this.currentValues) {
      return '-';
    }

    const keys = Object.keys(this.currentValues);

    for (const key of keys) {
      const tag = this.currentValues[key];

      if (!tag) {
        continue;
      }

      const timestamp =
        tag.timestamp ||
        tag.dateTime ||
        tag.TimeStamp ||
        tag.timeStamp ||
        tag.datetime;

      if (timestamp) {
        return this.formatDate(timestamp);
      }
    }

    return '-';
  }

  private formatDate(value: any): string {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return '-';
    }

    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date);
    } catch (error) {
      const day = this.padTime(date.getDate());
      const month = this.padTime(date.getMonth() + 1);
      const year = date.getFullYear();
      const hours = this.padTime(date.getHours());
      const minutes = this.padTime(date.getMinutes());
      const seconds = this.padTime(date.getSeconds());

      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }
  }

  private padTime(value: number): string {
    return ('0' + value).slice(-2);
  }
}