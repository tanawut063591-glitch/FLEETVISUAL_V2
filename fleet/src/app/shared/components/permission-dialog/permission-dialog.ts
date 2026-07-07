import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface PermissionDialogData {
  routePath?: string;
  requiredPermission?: string;
  message?: string;
}

@Component({
  selector: 'app-permission-dialog',
  standalone: false,
  templateUrl: './permission-dialog.html',
  styleUrl: './permission-dialog.scss'
})
export class PermissionDialog {
  constructor(
    public dialogRef: MatDialogRef<PermissionDialog>,
    @Inject(MAT_DIALOG_DATA) public data: PermissionDialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}