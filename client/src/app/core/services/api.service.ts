import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  get<T>(path: string, params?: Record<string, string | number | boolean>) {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, { withCredentials: true });
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body, { withCredentials: true });
  }

  delete<T>(path: string) {
    return this.http.delete<T>(`${this.baseUrl}${path}`, { withCredentials: true });
  }
}
