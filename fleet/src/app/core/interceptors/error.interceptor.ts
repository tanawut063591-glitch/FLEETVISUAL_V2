import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      if (error.status === 401) {
        localStorage.clear();
        sessionStorage.clear();
        router.navigate(['/login']);
      } else if (error.status === 403) {
        localStorage.clear();
        sessionStorage.clear();
        router.navigate(['/login']);
      } else 
      if (error.status >= 700) {
        router.navigate(['/server-error']);
      }

      return throwError(() => error);
    })
  );
};
