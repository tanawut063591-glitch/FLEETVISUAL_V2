import {
  Component,
  OnInit,
  Input,
  ChangeDetectorRef,
} from '@angular/core';

import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthService } from '../../../shared/services/auth.service';

import {
  trigger,
  state,
  style,
  animate,
  transition,
  keyframes,
} from '@angular/animations';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  animations: [
    trigger('loginState', [
      state(
        'true',
        style({
          opacity: 0,
        })
      ),
      state(
        'false',
        style({
          opacity: 1,
        })
      ),
      transition(
        'true => false',
        animate(
          '500ms',
          keyframes([
            style({ opacity: 1, offset: 0.1 }),
            style({ transform: 'translateX(10px)', offset: 0.15 }),
            style({ transform: 'translateX(-10px)', offset: 0.3 }),
            style({ transform: 'translateX(10px)', offset: 0.45 }),
            style({ transform: 'translateX(-10px)', offset: 0.6 }),
            style({ transform: 'none', offset: 1 }),
          ])
        )
      ),
    ]),
  ],
})
export class LoginComponent implements OnInit {
  @Input() loginValid = true;

  loginForm!: FormGroup;

  showPassword = false;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.createForm();
  }

  ngOnInit(): void {}

  createForm(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    if (this.loginForm.invalid) {
      this.markFormTouched();
      this.showLoginError('กรุณากรอก Username และ Password');
      return;
    }

    const username = String(this.loginForm.get('username')?.value || '').trim();
    const password = String(this.loginForm.get('password')?.value || '').trim();

    if (!username || !password) {
      this.showLoginError('กรุณากรอก Username และ Password');
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const redirectUrl = await this.authService.loginAndGetRedirect(
        username,
        password
      );

      if (redirectUrl) {
        await this.router.navigateByUrl(redirectUrl);
        return;
      }

      this.showLoginError('Username หรือ Password ไม่ถูกต้อง');
    } catch (error) {
      console.error('Login error:', error);
      this.showLoginError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      this.isSubmitting = false;
    }
  }

  loginChange(): void {
    this.loginValid = true;
    this.errorMessage = '';
  }

  private showLoginError(message: string): void {
    this.errorMessage = message;

    this.loginValid = true;
    this.changeDetectorRef.detectChanges();

    this.loginValid = false;
  }

  private markFormTouched(): void {
    Object.keys(this.loginForm.controls).forEach((key: string) => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }
}