import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class HivemindService {
    private apiUrl = 'http://localhost:8080/query';

    constructor(private http: HttpClient) { }

    sendQuery(query: string): Observable<any> {
        return this.http.post<any>(this.apiUrl, { query });
    }
}
