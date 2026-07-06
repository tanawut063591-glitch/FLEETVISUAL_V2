import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TagDialog } from './tag-dialog';

describe('TagDialog', () => {
  let component: TagDialog;
  let fixture: ComponentFixture<TagDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TagDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
