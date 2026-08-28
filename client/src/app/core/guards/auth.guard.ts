import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return auth.checkAuth().pipe(
    map((result) => {
      if (result) return true;
      router.navigate(['/admin/login']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/admin/login']);
      return of(false);
    })
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    router.navigate(['/admin/dashboard']);
    return false;
  }
  return true;
};
