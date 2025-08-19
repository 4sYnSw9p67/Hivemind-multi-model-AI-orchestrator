import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HivemindService } from '../../services/hivemind.service';

@Component({
    selector: 'app-hivemind',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './hivemind.component.html',
    styleUrls: ['./hivemind.component.css']
})
export class HivemindComponent {
    query = '';
    results: any[] = [];
    loading = false;

    constructor(private hivemind: HivemindService) { }

    submitQuery() {
        if (!this.query.trim()) return;
        this.loading = true;
        this.hivemind.sendQuery(this.query).subscribe({
            next: (res) => {
                this.results = res.results;
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
            }
        });
    }
}
