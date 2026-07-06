import { AfterViewInit, Component, effect, input, inject, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { DataRealtimeModel } from '../../models/response.model';
import { SiteModel } from '../../models/config.model';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { EventSummaryModel } from '../../../features/sites/models/event.model';
//import { getEventSummary } from '../../../store/selectors/event.selectors';

@Component({
  selector: 'app-map-container',
  templateUrl: './map-container.html',
  styleUrls: ['./map-container.scss'],
  standalone: false
})
export class MapContainer implements AfterViewInit, OnDestroy {

  private map!: L.Map;
  private markerLayer = L.layerGroup();
 // private eventSummary$: Observable<EventSummaryModel[]>;
  private eventSub?: Subscription;
  private eventSummaryData: EventSummaryModel[] = [];

  dataRealtime = input<DataRealtimeModel>();
  siteList = input<SiteModel[]>([]);
  theme = 'dark';

  private store = inject(Store);

  constructor() {
    //this.eventSummary$ = this.store.select(getEventSummary);
    //this.eventSub = this.eventSummary$.subscribe(data => {
      //console.log('Received event summary data:', data);
      //this.eventSummaryData = data;
    //});

    effect(() => {
      const sites = this.siteList();

      // 🔒 กัน crash
      if (!this.map || !sites || sites.length === 0) return;

      this.markerLayer.clearLayers();

      for (const site of sites) {
        if (!site.position) continue;
        const realtime = this.dataRealtime()?.[site.id+'_POWER']?.Value;
        const energy = this.dataRealtime()?.[site.id+'_ENERGY']?.Value;
        const pr = this.dataRealtime()?.[site.id+'_PR']?.Value;

        // Get event data for this site
        const eventData = this.eventSummaryData.find(e => e.PointSource === site.id);
        //console.log('Event data for site', site.id, eventData);

        // Determine status based on realtime data and events
        let status: string;
        if (eventData && eventData.Major > 0) {
          status = 'critical';
        } else if (eventData && eventData.Minor > 0) {
          status = 'warning';
        } else if (eventData && eventData.Warning > 0) {
          status = 'warning';
        } else {
          status = realtime > 0 ? 'normal' : realtime === 0 ? 'offline' : 'nodata';
        }

        const marker = L.marker(
          [site.position.lat, site.position.lng],
          {
            icon: this.createSolarIcon(this.getColorByStatus(status)),
            title: site.name
          }
        );

        marker.bindPopup(`
          <div style="
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-width: 280px;
          ">
            <div style="
              font-weight: 700;
              font-size: 16px;
              color: var(--primary-txt);
              margin-bottom: 8px;
              border-bottom: 2px solid ${this.getColorByStatus(status)};
              padding-bottom: 8px;
            ">${site.name}</div>
            
            <div style="
              font-size: 13px;
              color: var(--secondary-txt);
              margin-bottom: 12px;
            ">📍 ${site.location}</div>
            
            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 10px;
            ">
              <div style="
                background: var(--primary-bg);
                padding: 8px;
                border-radius: 6px;
                font-size: 12px;
                color: var(--secondary-txt);
                border: 1px solid var(--border-color);
              ">
                <div style="color: var(--secondary-txt); font-size: 11px; margin-bottom: 2px;">⚡ Capacity</div>
                <div style="font-weight: 600; color: var(--primary-txt);">${site.capacity} MW</div>
              </div>
              <div style="
                background: var(--primary-bg);
                padding: 8px;
                border-radius: 6px;
                font-size: 12px;
                color: var(--secondary-txt);
                border: 1px solid var(--border-color);
              ">
                <div style="color: var(--secondary-txt); font-size: 11px; margin-bottom: 2px;">📊 Status</div>
                <div style="
                  font-weight: 700;
                  color: ${this.getColorByStatus(status)};
                  text-transform: uppercase;
                  font-size: 13px;
                ">${status}</div>
              </div>
            </div>
            
            <div style="
              background: var(--primary-bg);
              padding: 10px;
              border-radius: 6px;
              border-left: 3px solid ${this.getColorByStatus(status)};
              border: 1px solid var(--border-color);
              border-left: 3px solid ${this.getColorByStatus(status)};
            ">
              <div style="
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid var(--border-color);
                font-size: 13px;
              ">
                <span style="color: var(--secondary-txt);">🔌 Power</span>
                <span style="font-weight: 600; color: var(--primary-txt);">
                  ${realtime?.toFixed(2) ?? 'N/A'} ${realtime !== undefined ? 'kW' : ''}
                </span>
              </div>
              <div style="
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid var(--border-color);
                font-size: 13px;
              ">
                <span style="color: var(--secondary-txt);">⚙️ Energy</span>
                <span style="font-weight: 600; color: var(--primary-txt);">
                  ${energy?.toFixed(2) ?? 'N/A'} ${energy !== undefined ? 'kWh' : ''}
                </span>
              </div>
              <div style="
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                font-size: 13px;
              ">
                <span style="color: var(--secondary-txt);">📈 PR</span>
                <span style="font-weight: 600; color: var(--primary-txt);">
                  ${pr?.toFixed(2) ?? 'N/A'} ${pr !== undefined ? '%' : ''}
                </span>
              </div>
            </div>
          </div>
        `);

        this.markerLayer.addLayer(marker);
      }

      this.markerLayer.addTo(this.map);
    });
  }

  ngAfterViewInit(): void {

    const thailandBounds = L.latLngBounds(
      [5.5, 97.3],
      [20.5, 105.7]
    );

    this.map = L.map('map', {
      center: [13.7563, 100.5018],
      zoom: 6,
      minZoom: 5,
      // maxBounds: thailandBounds,
      maxBoundsViscosity: 1.0,
      attributionControl: false,
    });

    const theme = localStorage.getItem('theme');
    if (theme) {
      this.theme = theme;
    }

    if (this.theme === 'dark') {
      // 🌑 dark theme
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png')
        .addTo(this.map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png')
        .addTo(this.map);

    } else {
      // 🌞 light theme
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        .addTo(this.map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        .addTo(this.map);
    }

    this.markerLayer.addTo(this.map);

    const defaultCenter: [number, number] = [13.7563, 100.5018];
    const defaultZoom = 6;

    const resetControl = new L.Control({ position: 'topleft' });

    resetControl.onAdd = () => {
      const btn = L.DomUtil.create('button', 'reset-map-btn');
      btn.innerHTML = '⟳';

      btn.onclick = () => {
        this.map.setView(defaultCenter, defaultZoom);
      };

      return btn;
    };

    resetControl.addTo(this.map);

    // 🔥 test marker (กันพลาด)
    // L.marker([13.7563, 100.5018], { icon: this.createIcon() })
    //   .addTo(this.map)
    //   .bindPopup('Bangkok')
    //   .openPopup();
  }

  ngOnDestroy(): void {
    this.eventSub?.unsubscribe();
  }

  // ✅ icon ที่ขึ้นแน่นอน
  // private createIcon(): L.Icon {
  //   return L.icon({
  //     iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  //     iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  //     shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  //     iconSize: [25, 41],
  //     iconAnchor: [12, 41],
  //     popupAnchor: [0, -30]
  //   });
  // }
  // private createIcon(): L.DivIcon {
  //   return L.divIcon({
  //     className: '', // 🔥 ไม่ใช้ class default
  //     html: `
  //       <div style="
  //         width:14px;
  //         height:14px;
  //         background:#FBE134;
  //         border-radius:50%;
  //         box-shadow:0 0 10px #FBE134;
  //       ">
          
  //       </div>
  //     `,
  //     iconSize: [20, 20],
  //     iconAnchor: [10, 10]
  //   });
  // }
  private createIcon(color: string = '#FBE134'): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `
        <div style="width:30px;height:30px;">
          <svg viewBox="0 0 24 24" width="30" height="30">
            <path 
              d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" 
              fill="${color}"
            />
            <circle cx="12" cy="9" r="3" fill="#16171B"/>
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });
  }

  private createSolarIcon(color: string = '#ff3b3b'): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `
        <div style="width:40px;height:40px;">
          <svg viewBox="0 0 48 48" width="40" height="40">
            
            <!-- pin shape -->
            <path 
              d="M24 2C14 2 7 9 7 19c0 12 17 27 17 27s17-15 17-27c0-10-7-17-17-17z"
              fill="${color}"
            />

            <!-- inner circle -->
            <circle cx="24" cy="19" r="13" fill="#ffffff">
            </circle>

            <!-- solar panel icon -->
            <g transform="translate(16,11)">
              <rect x="0" y="4" width="16" height="10" fill="#16171B" rx="1"/>
              
              <!-- grid lines -->
              <line x1="4" y1="4" x2="4" y2="14" stroke="#ffffff" stroke-width="0.5"/>
              <line x1="8" y1="4" x2="8" y2="14" stroke="#ffffff" stroke-width="0.5"/>
              <line x1="12" y1="4" x2="12" y2="14" stroke="#ffffff" stroke-width="0.5"/>

              <line x1="0" y1="7" x2="16" y2="7" stroke="#ffffff" stroke-width="0.5"/>
              <line x1="0" y1="10" x2="16" y2="10" stroke="#ffffff" stroke-width="0.5"/>

              <!-- stand -->
              <line x1="8" y1="14" x2="8" y2="18" stroke="#16171B" stroke-width="1"/>
              <line x1="4" y1="18" x2="12" y2="18" stroke="#16171B" stroke-width="1"/>
            </g>

          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });
  }

  private getColorByStatus(status: string): string {
    switch (status) {
      case 'critical': return '#ff3b3b';   // 🔴 alarm
      case 'warning': return '#FBE134';    // 🟡 warning
      case 'normal': return '#22c55e';     // 🟢 normal
      default: return '#667079';           // ⚪ offline
    }
  }
}