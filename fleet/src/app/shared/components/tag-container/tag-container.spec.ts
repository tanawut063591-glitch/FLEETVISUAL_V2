import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TagContainer } from './tag-container';

describe('TagContainer', () => {
  let component: TagContainer;
  let fixture: ComponentFixture<TagContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagContainer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TagContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
