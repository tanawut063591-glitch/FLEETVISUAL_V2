import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
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

type DiagramProfileKey = 'default' | 'intan' | 'lazurit' | 'zamrud' | 'liberty233' | 'tongkam';

interface DiagramProfile {
  key: DiagramProfileKey;
  height: number;
  deviceIds: string[];
  groupPaths: string[];
  bluePaths: string[];
  greenPaths: string[];
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
export class DiagramComponent implements OnInit, AfterViewInit, OnDestroy {
  data$: Observable<any> | undefined;
  vessel$: Observable<any> | undefined;

  vesselName = 'SELECTED VESSEL';
  vesselPrefix = '';
  lastUpdated = '-';
  currentValues: { [key: string]: any } = {};

  @ViewChild('diagramViewport')
  private diagramViewport?: ElementRef<HTMLDivElement>;

  readonly diagramNaturalWidth = 750;
  diagramNaturalHeight = 755;
  readonly diagramBottomGutter = 28;
  diagramScale = 1;
  diagramStageWidth = this.diagramNaturalWidth;
  diagramStageHeight = this.diagramNaturalHeight + this.diagramBottomGutter;
  diagramZoomMode: 'fit' | 'full' = 'full';
  diagramProfile: DiagramProfileKey = 'default';

  private readonly allDevices: DiagramDevice[] = [
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
      id: 'dcp-gateway',
      title: 'DCP GATEWAY',
      subtitle: 'Gateway',
      icon: 'gateway',
      tags: ['DCP_GATEWAY_ALIVE'],
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
      tags: ['GATEWAY_GEN1_KW_ALIVE', 'TGW_ECM_DG1_ALIVE', 'ANYBUS_ECM1_ALIVE'],
      mode: 'gateway',
    },
    {
      id: 'gen2',
      title: 'GEN2 GATEWAY',
      subtitle: 'Generator 2',
      icon: 'generator',
      tags: ['GATEWAY_GEN2_KW_ALIVE', 'TGW_ECM_DG2_ALIVE', 'ANYBUS_ECM2_ALIVE'],
      mode: 'gateway',
    },
    {
      id: 'gen3',
      title: 'GEN3 GATEWAY',
      subtitle: 'Generator 3',
      icon: 'generator',
      tags: ['GATEWAY_GEN3_KW_ALIVE', 'TGW_ECM_DG3_ALIVE', 'ANYBUS_ECM3_ALIVE'],
      mode: 'gateway',
    },
    {
      id: 'gen4',
      title: 'GEN4 GATEWAY',
      subtitle: 'Generator 4',
      icon: 'generator',
      tags: ['GATEWAY_GEN4_KW_ALIVE', 'TGW_ECM_DG4_ALIVE', 'ANYBUS_ECM4_ALIVE'],
      mode: 'gateway',
    },
  ];

  private readonly commonTopGroup =
    'M567.018 0.6H191.524C188.197 0.6 185.5 3.326 185.5 6.688V219.773C185.5 223.135 188.197 225.861 191.524 225.861H567.018C570.345 225.861 573.042 223.135 573.042 219.773V6.688C573.042 3.326 570.345 0.6 567.018 0.6Z';

  private readonly commonLowerGroup =
    'M559.089 318.6H165.524C162.197 318.6 159.5 321.326 159.5 324.688V564.155C159.5 567.517 162.197 570.243 165.524 570.243H559.089C562.416 570.243 565.113 567.517 565.113 564.155V324.688C565.113 321.326 562.416 318.6 559.089 318.6Z';

  private readonly commonTopPaths = [
    'M114.5 53.6H257.067V134.775',
    'M114.5 178.407H202.851',
    'M315.301 174.347H393.612',
    'M257.062 262.292H697.062V144.292',
    'M257.066 212.906V347.859',
  ];

  private readonly commonLowerPaths = [
    'M114.5 382.359H202.851',
    'M315.301 382.359H409.676',
    'M369.516 382.359V484.842H409.675',
    'M257.066 418.887V470.636',
  ];

  private readonly fullGeneratorPaths = [
    'M228.979 553.6V614.481H108.5V651.01',
    'M257.09 553.6V614.481H303.274V651.01',
    'M289.219 553.6V587.085H486.002V651.01',
    'M289.219 587.084H662.704V651.01',
  ];

  private readonly diagramProfiles: Record<DiagramProfileKey, DiagramProfile> = {
    default: {
      key: 'default',
      height: 755,
      deviceIds: [
        'rut', 'hmi', 'hub', 'mini-pc', 'gps', 'plc', 'mtr-switch', 'atop1', 'atop2',
        'et2251', 'gen1', 'gen2', 'gen3', 'gen4',
      ],
      groupPaths: [this.commonTopGroup, this.commonLowerGroup],
      bluePaths: [...this.commonTopPaths, ...this.commonLowerPaths],
      greenPaths: [...this.fullGeneratorPaths],
    },
    intan: {
      key: 'intan',
      height: 755,
      deviceIds: [
        'rut', 'hmi', 'hub', 'mini-pc', 'gps', 'plc', 'mtr-switch', 'atop1', 'atop2',
        'et2251', 'gen1', 'gen2', 'gen3', 'gen4',
      ],
      groupPaths: [this.commonTopGroup, this.commonLowerGroup],
      bluePaths: [...this.commonTopPaths, ...this.commonLowerPaths],
      greenPaths: [...this.fullGeneratorPaths],
    },
    lazurit: {
      key: 'lazurit',
      height: 585,
      deviceIds: [
        'rut', 'hmi', 'hub', 'mini-pc', 'gps', 'plc', 'mtr-switch', 'atop1', 'atop2',
        'et2251',
      ],
      groupPaths: [this.commonTopGroup, this.commonLowerGroup],
      bluePaths: [...this.commonTopPaths, ...this.commonLowerPaths],
      greenPaths: [],
    },
    zamrud: {
      key: 'zamrud',
      height: 585,
      deviceIds: [
        'rut', 'hmi', 'hub', 'mini-pc', 'gps', 'plc', 'dcp-gateway', 'mtr-switch',
        'atop1', 'atop2', 'et2251',
      ],
      groupPaths: [this.commonTopGroup, this.commonLowerGroup],
      bluePaths: [
        ...this.commonTopPaths,
        ...this.commonLowerPaths,
        'M114.5 502H159.5V382.359',
      ],
      greenPaths: [],
    },
    liberty233: {
      key: 'liberty233',
      height: 650,
      deviceIds: [
        'rut', 'hmi', 'hub', 'mini-pc', 'gps', 'plc', 'mtr-switch',
        'gen1', 'gen2', 'gen3', 'gen4',
      ],
      groupPaths: [
        this.commonTopGroup,
        'M559.089 318.6H165.524C162.197 318.6 159.5 321.326 159.5 324.688V445.155C159.5 448.517 162.197 451.243 165.524 451.243H559.089C562.416 451.243 565.113 448.517 565.113 445.155V324.688C565.113 321.326 562.416 318.6 559.089 318.6Z',
      ],
      bluePaths: [...this.commonTopPaths, 'M114.5 382.359H202.851'],
      greenPaths: [
        'M228.979 442V500H130V535',
        'M257.09 442V500H319V535',
        'M289.219 442V478H498V535',
        'M289.219 478H671V535',
      ],
    },
    tongkam: {
      key: 'tongkam',
      height: 755,
      deviceIds: [
        'rut', 'hmi', 'hub', 'mini-pc', 'gps', 'plc', 'dcp-gateway', 'mtr-switch',
        'atop1', 'atop2', 'et2251', 'gen1', 'gen2', 'gen3',
      ],
      groupPaths: [this.commonTopGroup, this.commonLowerGroup],
      bluePaths: [
        ...this.commonTopPaths,
        ...this.commonLowerPaths,
        'M114.5 502H159.5V382.359',
      ],
      greenPaths: this.fullGeneratorPaths.slice(0, 3),
    },
  };

  devices: DiagramDevice[] = this.filterDevices(this.diagramProfiles.default.deviceIds);
  groupPaths: string[] = [...this.diagramProfiles.default.groupPaths];
  bluePaths: string[] = [...this.diagramProfiles.default.bluePaths];
  greenPaths: string[] = [...this.diagramProfiles.default.greenPaths];

  private subscription = new Subscription();
  private activeVesselIdentity = '';
  private diagramResizeObserver?: ResizeObserver;
  private diagramFitFrameId: number | null = null;

  constructor(
    private store: Store<any>,
    private route: ActivatedRoute,
    private fvRealtimeService: FvRealtimeService,
  ) {}

  ngOnInit(): void {
    this.watchRouteVessel();
    this.watchActiveVessel();
    this.watchRealtimeData();
  }

  ngAfterViewInit(): void {
    this.scheduleDiagramFit();

    if (typeof ResizeObserver !== 'undefined' && this.diagramViewport?.nativeElement) {
      this.diagramResizeObserver = new ResizeObserver(() => this.scheduleDiagramFit());
      this.diagramResizeObserver.observe(this.diagramViewport.nativeElement);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.scheduleDiagramFit();
  }

  ngOnDestroy(): void {
    this.diagramResizeObserver?.disconnect();

    if (this.diagramFitFrameId !== null) {
      cancelAnimationFrame(this.diagramFitFrameId);
      this.diagramFitFrameId = null;
    }

    this.subscription.unsubscribe();
  }

  trackByDevice(_index: number, device: DiagramDevice): string {
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

  setDiagramZoom(mode: 'fit' | 'full'): void {
    if (this.diagramZoomMode === mode) {
      return;
    }

    this.diagramZoomMode = mode;
    this.scheduleDiagramFit();
  }

  private scheduleDiagramFit(): void {
    if (this.diagramFitFrameId !== null) {
      cancelAnimationFrame(this.diagramFitFrameId);
    }

    this.diagramFitFrameId = requestAnimationFrame(() => {
      this.diagramFitFrameId = null;
      this.fitDiagramToViewport();
    });
  }

  private fitDiagramToViewport(): void {
    const viewport = this.diagramViewport?.nativeElement;

    if (!viewport) {
      return;
    }

    const styles = window.getComputedStyle(viewport);
    const horizontalPadding =
      (Number.parseFloat(styles.paddingLeft) || 0) + (Number.parseFloat(styles.paddingRight) || 0);
    const availableWidth = Math.max(220, viewport.clientWidth - horizontalPadding);
    const isMobile = window.matchMedia('(max-width: 560px)').matches;

    const fitScale = Math.min(1, availableWidth / this.diagramNaturalWidth);
    const minimumFitScale = isMobile ? 0.24 : 0.28;
    const nextScale = this.diagramZoomMode === 'full' ? 1 : fitScale;
    const roundedScale = Math.max(
      this.diagramZoomMode === 'full' ? 1 : minimumFitScale,
      Math.round(nextScale * 1000) / 1000,
    );

    this.diagramScale = roundedScale;
    this.diagramStageWidth = Math.ceil(this.diagramNaturalWidth * roundedScale);
    this.diagramStageHeight = Math.ceil(
      (this.diagramNaturalHeight + this.diagramBottomGutter) * roundedScale,
    );

    requestAnimationFrame(() => {
      const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      viewport.scrollLeft =
        this.diagramZoomMode === 'fit' ? 0 : Math.min(viewport.scrollLeft, maxScrollLeft);
    });
  }

  private watchRouteVessel(): void {
    const routeSubscription = combineLatest([
      this.route.paramMap.pipe(
        map((params) => (params.get('id') || '').trim()),
        distinctUntilChanged(),
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
      distinctUntilChanged(
        (prev, curr) => this.getVesselIdentity(prev) === this.getVesselIdentity(curr),
      ),
    );

    const vesselSubscription = this.vessel$.subscribe((data) => {
      const info = this.getVesselInfo(data);

      if (!info) {
        this.vesselName = 'SELECTED VESSEL';
        this.vesselPrefix = '';
        this.applyDiagramProfile('default');
        return;
      }

      this.vesselName = info.name || info.prefix || 'SELECTED VESSEL';
      this.vesselPrefix = info.prefix || '';
      this.applyDiagramProfile(this.resolveDiagramProfile(info));

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
      }),
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

    return String(info?.prefix || info?.id || info?.name || '').toLowerCase();
  }

  private resolveDiagramProfile(info: VesselInfoLike): DiagramProfileKey {
    const identity = [info.prefix, info.name, info.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (identity.includes('liberty 233') || identity.includes('liberty233')) {
      return 'liberty233';
    }

    if (identity.includes('tongkam')) {
      return 'tongkam';
    }

    if (identity.includes('lazurit')) {
      return 'lazurit';
    }

    if (identity.includes('zamrud')) {
      return 'zamrud';
    }

    if (identity.includes('intan')) {
      return 'intan';
    }

    return 'default';
  }

  private applyDiagramProfile(key: DiagramProfileKey): void {
    const profile = this.diagramProfiles[key] || this.diagramProfiles.default;

    this.diagramProfile = profile.key;
    this.diagramNaturalHeight = profile.height;
    this.devices = this.filterDevices(profile.deviceIds);
    this.groupPaths = [...profile.groupPaths];
    this.bluePaths = [...profile.bluePaths];
    this.greenPaths = [...profile.greenPaths];
    this.scheduleDiagramFit();
  }

  private filterDevices(ids: string[]): DiagramDevice[] {
    const allowed = new Set(ids);
    return this.allDevices.filter((device) => allowed.has(device.id));
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

      if (this.vesselPrefix && maybePrefix.toLowerCase() === this.vesselPrefix.toLowerCase()) {
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
        tag.timestamp || tag.dateTime || tag.TimeStamp || tag.timeStamp || tag.datetime;

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
