import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionDialog } from './permission-dialog';

describe('PermissionDialog', () => {
  let component: PermissionDialog;
  let fixture: ComponentFixture<PermissionDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermissionDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
