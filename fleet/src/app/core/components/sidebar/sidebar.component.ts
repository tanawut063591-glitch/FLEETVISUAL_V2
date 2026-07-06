import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';

import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';

import { FvTimeService } from '../../../shared/services/fv-time.service';
import { CoordinatesService } from '../../../shared/services/coordinate.service';

interface VesselViewItem {
  raw: any;
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
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit, OnDestroy, OnChanges {
  @Input() vessels: any[] = [];
  @Input() activeVessel: any = null;

  @Output() selectedVessel = new EventEmitter<any>();

  keyword = '';
  isShowMenu = true;
  isSm = false;

  allVessels: any[] = [];
  visibleVessels: VesselViewItem[] = [];

  selectedVesselKey = '';

  private breakpointSub: Subscription | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private fvTimeService: FvTimeService,
    private coordinatesService: CoordinatesService,
    private breakpointObserver: BreakpointObserver,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.breakpointSub = this.breakpointObserver
      .observe(['(max-width: 991px)'])
      .subscribe((state: BreakpointState) => {
        this.isSm = state.matches;
        this.isShowMenu = !state.matches;
        this.cdr.markForCheck();
      });

    this.allVessels = Array.isArray(this.vessels) ? this.vessels : [];
    this.syncActiveVessel();
    this.buildVisibleVessels();

    this.timer = setInterval(() => {
      this.buildVisibleVessels();
    }, 60000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vessels']) {
      this.allVessels = Array.isArray(this.vessels) ? this.vessels : [];
      this.buildVisibleVessels();
    }

    if (changes['activeVessel']) {
      this.syncActiveVessel();
      this.buildVisibleVessels();
    }
  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();

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
    if (!item || !item.raw) {
      return;
    }

    this.selectedVesselKey = item.key;
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
      if (!keyword) {
        return true;
      }

      const normalized = this.normalizeVessel(vessel);

      const name = String(normalized.name || '').toLowerCase();
      const desc = String(normalized.desc || '').toLowerCase();
      const prefix = String(normalized.prefix || '').toLowerCase();

      return (
        name.includes(keyword) ||
        desc.includes(keyword) ||
        prefix.includes(keyword)
      );
    });

    this.visibleVessels = filtered.map((vessel: any, index: number) => {
      const normalized = this.normalizeVessel(vessel);
      const key = this.getVesselKey(normalized, index);
      const status = this.getStatus(normalized);

      return {
        raw: vessel,
        key,
        name: normalized.name || '-',
        type: normalized.desc || normalized.prefix || 'AHTS',
        image: normalized.img || 'assets/images/no-ship.png',
        coordinate: this.getCoordinate(normalized),
        status,
        statusClass: this.getStatusClass(status),
        lastSeen: this.getLastSeenText(normalized),
        isActive:
          this.selectedVesselKey !== '' &&
          this.selectedVesselKey === key,
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
    } catch {
      return '-';
    }
  }

  getLastSeenMinute(vessel: any): number {
    if (!vessel || !vessel.timestamp) {
      return 999999;
    }

    const now = new Date().getTime();
    const last = new Date(vessel.timestamp).getTime();

    if (Number.isNaN(last)) {
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
    } catch {
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
    return item?.key || index;
  }

  private syncActiveVessel(): void {
    if (!this.activeVessel) {
      return;
    }

    const active = this.normalizeVessel(this.activeVessel);
    this.selectedVesselKey = this.getVesselKey(active, 0);
  }

  private normalizeVessel(vessel: any): any {
    if (!vessel) {
      return {};
    }

    const fvInfo = vessel?.fvInfo || vessel;

    return {
      id: fvInfo.id || vessel.id,
      _id: fvInfo._id || vessel._id,
      name: fvInfo.name || vessel.name,
      desc:
        fvInfo.desc ||
        fvInfo.description ||
        vessel.desc ||
        vessel.description,
      prefix: fvInfo.prefix || vessel.prefix,
      img: fvInfo.img || fvInfo.image || vessel.img || vessel.image,
      lat: fvInfo.lat || fvInfo.lattitude || vessel.lat || vessel.lattitude,
      long:
        fvInfo.long ||
        fvInfo.longtitude ||
        vessel.long ||
        vessel.longtitude,
      timestamp: fvInfo.timestamp || vessel.timestamp,
    };
  }
}