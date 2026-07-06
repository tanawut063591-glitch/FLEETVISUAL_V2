import { Injectable, Injector } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
//import { Assistant } from '../../core/components/assistant/assistant';
//import { TagDialog } from '../components/tag-dialog/tag-dialog';

@Injectable({ providedIn: 'root' })
export class FloatingDialogService {
  private overlayRef?: OverlayRef;

  constructor(private overlay: Overlay, private injector: Injector) {}

  open(name: string) {
    if (this.overlayRef) return;

    this.overlayRef = this.overlay.create({
      hasBackdrop: false, // ไม่ให้มี backdrop
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically()
    });

    /*if (name === 'assistant') {
      const portal = new ComponentPortal(Assistant, null, this.injector);
      this.overlayRef.attach(portal);
    } else if (name === 'tag-dialog') {
      // เพิ่มกรณีสำหรับ tag-dialog ที่นี่
      const portal = new ComponentPortal(TagDialog, null, this.injector);
      this.overlayRef.attach(portal);
    }*/
  }

  close() {
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
  }
}
