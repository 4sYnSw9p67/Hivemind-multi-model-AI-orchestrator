import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HivemindComponent } from './components/hivemind/hivemind.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HivemindComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('hivemind-frontend');
}
