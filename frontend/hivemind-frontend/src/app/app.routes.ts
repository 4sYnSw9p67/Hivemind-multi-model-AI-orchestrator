import { Routes } from '@angular/router';
import { HivemindComponent } from './components/hivemind/hivemind.component';

export const routes: Routes = [
    { path: '', redirectTo: 'hivemind', pathMatch: 'full' },
    { path: 'hivemind', component: HivemindComponent }
];
