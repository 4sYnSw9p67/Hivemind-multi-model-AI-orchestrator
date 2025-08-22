import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainChat } from './main-chat';

describe('MainChat', () => {
  let component: MainChat;
  let fixture: ComponentFixture<MainChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainChat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainChat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
