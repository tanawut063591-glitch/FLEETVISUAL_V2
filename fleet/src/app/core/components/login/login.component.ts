import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import {
  trigger,
  state,
  style,
  animate,
  transition,
  keyframes,
} from '@angular/animations';

import {
  AuthService,
  LoginError,
} from '../../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
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
          500,
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

    public authService: AuthService,


    public router: Router,


    private fb: FormBuilder,


    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.createForm();
  }

  ngOnInit(): void {}





  createForm(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
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
      this.showLoginError('Please enter your username and password.');
      return;
    }


    const username = String(this.loginForm.get('username')?.value ?? '').trim();
    const password = String(this.loginForm.get('password')?.value ?? '');


    if (!username || !password) {
      this.showLoginError('Please enter your username and password.');
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
        const navigated = await this.router.navigateByUrl(redirectUrl, {
          replaceUrl: true,
        });

        if (navigated) {
          this.settleAuthenticatedLayout();
        }
      } else {
        this.showLoginError('The username or password is incorrect.');
      }
    } catch (error: unknown) {

      this.isSubmitting = false;
      this.showLoginError(this.getLoginErrorMessage(error));
    } finally {

      this.isSubmitting = false;
      this.changeDetectorRef.markForCheck();
    }
  }







  private settleAuthenticatedLayout(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const notifyLayout = (): void => {
      window.dispatchEvent(new Event('resize'));
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(notifyLayout);
    });

    window.setTimeout(notifyLayout, 300);
  }




  private getLoginErrorMessage(error: unknown): string {
    if (!(error instanceof LoginError)) {
      return 'Unable to sign in right now. Please try again.';
    }

    switch (error.reason) {
      case 'invalid_credentials':
        return 'The username or password is incorrect.';
      case 'timeout':
        return 'The login server took too long to respond. Please try again.';
      case 'network':
        return 'Unable to connect to the login server. Please check the server or network.';
      case 'invalid_response':
        return 'The login server returned an invalid response. Please contact support.';
      default:
        return 'The login server is temporarily unavailable. Please try again.';
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
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });
  }
}