import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VesselPopupService {
  private readonly vesselPopupSource = new Subject<any | null>();

  readonly vesselPopup$: Observable<any | null> = this.vesselPopupSource.asObservable();

  openPopup(vessel: any): void {
    if (!vessel) {
      return;
    }

    this.vesselPopupSource.next(vessel);
  }

  closePopup(): void {
    this.vesselPopupSource.next(null);
  }
}
