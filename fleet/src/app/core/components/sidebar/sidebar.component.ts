import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';

import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';

import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';

import { FvState } from '../../../shared/state-managements/states/app.states';
import { FvInfo, FV } from '../../../shared/state-managements/models/fv.model';

import * as fvInfoReducer from '../../../shared/state-managements/reducers/fv-info.reducer';
import * as fvInfoActions from '../../../shared/state-managements/actions/fv-info.action';

import { FvTimeService } from '../../../shared/services/fv-time.service';
import { CoordinatesService } from '../../../shared/services/coordinate.service';

interface VesselViewItem {
  raw: any;
  fvInfo: any;
  key: string;
  name: string;
  type: string;
  image: string;
  coordinate: string;
  status: string;
  statusClass: string;
  lastSeen: string;
  isActive: boolean;
}

@Component({
  selector: '[app-sidebar]',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() selectedVessel = new EventEmitter<any>();

  fvinfos$: Observable<any[]>;
  fvActive$: Observable<any>;

  keyword = '';
  isShowMenu = true;
  isSm = false;

  allVessels: any[] = [];
  visibleVessels: VesselViewItem[] = [];

  selectedVesselKey = '';

  private breakpointSub: Subscription | null = null;
  private listSub: Subscription | null = null;
  private timer: any = null;

  constructor(
    private store: Store<FvState>,
    private fvTimeService: FvTimeService,
    private coordinatesService: CoordinatesService,
    private breakpointObserver: BreakpointObserver,
    private cdr: ChangeDetectorRef
  ) {
    this.fvinfos$ = this.store.select(fvInfoReducer.getFvInfos) as Observable<any[]>;
    this.fvActive$ = this.store.select(fvInfoReducer.getFvInfosActive) as Observable<any>;
  }

  ngOnInit(): void {
    this.breakpointSub = this.breakpointObserver
      .observe(['(max-width: 991px)'])
      .subscribe((state: BreakpointState) => {
        this.isSm = state.matches;
        this.isShowMenu = !state.matches;
        this.cdr.markForCheck();
      });

    this.listSub = this.fvinfos$.subscribe((vessels: any[]) => {
      this.allVessels = Array.isArray(vessels) ? vessels : [];
      this.buildVisibleVessels();
    });

    this.timer = setInterval(() => {
      this.buildVisibleVessels();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.breakpointSub && !this.breakpointSub.closed) {
      this.breakpointSub.unsubscribe();
    }

    if (this.listSub && !this.listSub.closed) {
      this.listSub.unsubscribe();
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  toggle(): void {
    this.isShowMenu = !this.isShowMenu;
    this.cdr.markForCheck();
  }

  closeMobileSidebar(): void {
    if (this.isSm) {
      this.isShowMenu = false;
      this.cdr.markForCheck();
    }
  }

  onSearch(value: string): void {
    this.keyword = value || '';
    this.buildVisibleVessels();
  }

  selectVessel(item: VesselViewItem): void {
    if (!item || !item.fvInfo) {
      return;
    }

    this.selectedVesselKey = item.key;

    this.store.dispatch(new fvInfoActions.SetFvActive(item.fvInfo));
    this.selectedVessel.emit(item.raw);

    if (this.isSm) {
      this.isShowMenu = false;
    }

    this.buildVisibleVessels();
    this.cdr.markForCheck();
  }

  buildVisibleVessels(): void {
    const keyword = (this.keyword || '').toLowerCase().trim();

    const filtered = this.allVessels.filter((vessel: any) => {
      const fvInfo = this.getFvInfo(vessel);

      if (!keyword) {
        return true;
      }

      const name = String(fvInfo.name || '').toLowerCase();
      const desc = String(fvInfo.desc || '').toLowerCase();
      const prefix = String(fvInfo.prefix || '').toLowerCase();

      return (
        name.indexOf(keyword) > -1 ||
        desc.indexOf(keyword) > -1 ||
        prefix.indexOf(keyword) > -1
      );
    });

    this.visibleVessels = filtered.map((vessel: any, index: number) => {
      const fvInfo = this.getFvInfo(vessel);
      const key = this.getVesselKey(fvInfo, index);
      const status = this.getStatus(fvInfo);

      return {
        raw: vessel,
        fvInfo,
        key,
        name: fvInfo.name || '-',
        type: fvInfo.desc || fvInfo.prefix || 'AHTS',
        image: fvInfo.img || 'assets/images/no-ship.png',
        coordinate: this.getCoordinate(fvInfo),
        status,
        statusClass: this.getStatusClass(status),
        lastSeen: this.getLastSeenText(fvInfo),
        isActive: this.selectedVesselKey !== '' && this.selectedVesselKey === key,
      };
    });

    this.cdr.markForCheck();
  }

  getStatus(vessel: any): string {
    const minute = this.getLastSeenMinute(vessel);

    if (!vessel || !vessel.timestamp) {
      return 'Offline';
    }

    if (minute > 120) {
      return 'Offline';
    }

    if (minute > 30) {
      return 'Idle';
    }

    return 'Online';
  }

  getStatusClass(status: string): string {
    if (status === 'Offline') {
      return 'offline';
    }

    if (status === 'Idle') {
      return 'idle';
    }

    return 'online';
  }

  getLastSeenText(vessel: any): string {
    if (!vessel || !vessel.timestamp) {
      return '-';
    }

    try {
      return this.fvTimeService.getLastSeen(vessel.timestamp);
    } catch (error) {
      return '-';
    }
  }

  getLastSeenMinute(vessel: any): number {
    if (!vessel || !vessel.timestamp) {
      return 999999;
    }

    const now = new Date().getTime();
    const last = new Date(vessel.timestamp).getTime();

    if (isNaN(last)) {
      return 999999;
    }

    const diff = Math.floor((now - last) / 60000);

    return diff < 0 ? 0 : diff;
  }

  getCoordinate(vessel: any): string {
    if (!vessel) {
      return '-';
    }

    try {
      return this.coordinatesService.getLatLong(vessel.lat, vessel.long);
    } catch (error) {
      return '-';
    }
  }

  getVesselKey(vessel: any, index: number): string {
    if (!vessel) {
      return String(index);
    }

    if (vessel.id) {
      return String(vessel.id);
    }

    if (vessel._id) {
      return String(vessel._id);
    }

    if (vessel.name) {
      return String(vessel.name);
    }

    if (vessel.prefix) {
      return String(vessel.prefix);
    }

    return String(index);
  }

  trackByVessel(index: number, item: VesselViewItem): string | number {
    return item.key || index;
  }

  private getFvInfo(vessel: any): any {
    if (!vessel) {
      return {};
    }

    return vessel.fvInfo || vessel;
  }
}