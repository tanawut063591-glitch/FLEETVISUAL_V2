import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';

export interface PermissionDialogData {
  routePath?: string;
  requiredPermission?: string;
  message?: string;
}

@Component({
  selector: 'app-permission-dialog',
  templateUrl: './permission-dialog.html',
  styleUrls: ['./permission-dialog.scss'],
  standalone: false,
})
export class PermissionDialog {
  constructor(
    @Inject(MatDialogRef)
    public dialogRef: MatDialogRef<PermissionDialog>,

    @Inject(MAT_DIALOG_DATA)
    public data: PermissionDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}