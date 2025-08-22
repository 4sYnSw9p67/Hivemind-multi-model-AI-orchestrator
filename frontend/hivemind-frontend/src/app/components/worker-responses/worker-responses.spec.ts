import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkerResponses } from './worker-responses';

describe('WorkerResponses', () => {
  let component: WorkerResponses;
  let fixture: ComponentFixture<WorkerResponses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkerResponses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkerResponses);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
