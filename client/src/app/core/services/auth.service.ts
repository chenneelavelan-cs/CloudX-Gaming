import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);

  login(email: string, password: string) {
    return this.api.post<{ user: User; token: string }>('/auth/login', { email, password }).pipe(
      tap((res) => {
        this.currentUser.set(res.user);
        this.isAuthenticated.set(true);
        if (res.token) {
          localStorage.setItem('token', res.token);
        }
      })
    );
  }

  logout() {
    return this.api.post('/auth/logout', {}).pipe(
      tap(() => {
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        localStorage.removeItem('token');
        this.router.navigate(['/admin/login']);
      }),
      catchError(() => {
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        localStorage.removeItem('token');
        this.router.navigate(['/admin/login']);
        return of(null);
      })
    );
  }

  checkAuth() {
    return this.api.get<{ user: User }>('/auth/me').pipe(
      tap((res) => {
        this.currentUser.set(res.user);
        this.isAuthenticated.set(true);
      }),
      catchError(() => {
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        return of(null);
      })
    );
  }
}
