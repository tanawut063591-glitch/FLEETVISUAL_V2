import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

/*
  Stable MaterialModule
  --------------------
  The current UI does not use Angular Material components directly.
  Keeping this module lightweight prevents NG6002 / NG6003 errors from
  legacy Material imports while preserving the same import path for future use.
*/
@NgModule({
  imports: [CommonModule],
  exports: [CommonModule],
})
export class MaterialModule {}
