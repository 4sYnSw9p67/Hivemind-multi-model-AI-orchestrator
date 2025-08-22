import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentCreator } from './agent-creator';

describe('AgentCreator', () => {
  let component: AgentCreator;
  let fixture: ComponentFixture<AgentCreator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentCreator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgentCreator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
