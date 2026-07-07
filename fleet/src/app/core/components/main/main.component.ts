import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface VesselItem {
  id: string;
  name: string;
  type: string;
  status: 'Online' | 'Idle' | 'Offline';
  coordinate: string;
  speed: string;
  lastSeen: string;
}

@Component({
  selector: 'app-main',
  standalone: false,
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
})
export class MainComponent {
  username = localStorage.getItem('username') || 'User';

  activeMenu = 'OVERVIEW';

  vessels: VesselItem[] = [
    {
      id: 'BHI',
      name: 'BAHTERA INTAN',
      type: 'AHTS',
      status: 'Online',
      coordinate: '8.86558 N 101.39729 E',
      speed: '6.5 kn',
      lastSeen: '2M',
    },
    {
      id: 'BHL',
      name: 'BAHTERA LAZURIT',
      type: 'AHTS',
      status: 'Idle',
      coordinate: '8.70119 N 101.74720 E',
      speed: '3.2 kn',
      lastSeen: '5M',
    },
    {
      id: 'BHM',
      name: 'BAHTERA MAKMUR',
      type: 'AHTS',
      status: 'Offline',
      coordinate: '2.55878 N 115.25758 E',
      speed: '0.0 kn',
      lastSeen: '2H',
    },
  ];

  selectedVessel: VesselItem = this.vessels[0];

  constructor(private router: Router) {}

  selectMenu(menu: string): void {
    this.activeMenu = menu;
  }

  selectVessel(vessel: VesselItem): void {
    this.selectedVessel = vessel;
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  get onlineCount(): number {
    return this.vessels.filter((vessel) => vessel.status === 'Online').length;
  }

  get idleCount(): number {
    return this.vessels.filter((vessel) => vessel.status === 'Idle').length;
  }

  get offlineCount(): number {
    return this.vessels.filter((vessel) => vessel.status === 'Offline').length;
  }
}