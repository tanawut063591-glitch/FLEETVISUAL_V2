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

import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],

  /*
    Animation สำหรับเขย่ากล่อง login ตอนกรอกผิด
    loginValid = true  คือปกติ
    loginValid = false คือให้เล่น animation
  */
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
  // ใช้คุม animation ตอน login ไม่ผ่าน
  @Input() loginValid = true;

  // ฟอร์ม login
  loginForm!: FormGroup;

  // คุมการแสดง/ซ่อน password
  showPassword = false;

  // กันกดปุ่ม login ซ้ำระหว่างกำลังส่งข้อมูล
  isSubmitting = false;

  // ข้อความ error ที่แสดงหน้า login
  errorMessage = '';

  constructor(
    // service สำหรับ login กับหลังบ้าน
    public authService: AuthService,

    // ใช้เปลี่ยนหน้า หลัง login สำเร็จ
    public router: Router,

    // ใช้สร้าง Reactive Form
    private fb: FormBuilder,

    // ใช้บังคับ refresh animation/error state
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.createForm();
  }

  ngOnInit(): void {}

  /*
    สร้างฟอร์ม login
    username และ password เป็น required
  */
  createForm(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  /*
    สลับแสดง/ซ่อนรหัสผ่าน
  */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /*
    ทำงานตอนกดปุ่ม Login
    เช็ก form → ส่ง username/password ไป AuthService → redirect
  */
  async onSubmit(): Promise<void> {
    // กันกด login ซ้ำ
    if (this.isSubmitting) {
      return;
    }

    // ถ้าฟอร์มไม่ครบ ให้โชว์ error
    if (this.loginForm.invalid) {
      this.markFormTouched();
      this.showLoginError('Invalid username or password');
      return;
    }

    // ดึงค่า username/password จาก form
    const username = String(this.loginForm.get('username')?.value ?? '').trim();
    const password = String(this.loginForm.get('password')?.value ?? '');

    // กันค่าว่าง
    if (!username || !password) {
      this.showLoginError('กรุณากรอก Username และ Password');
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      // login กับหลังบ้าน และรับ route ที่ต้อง redirect กลับมา
      const redirectUrl = await this.authService.loginAndGetRedirect(
        username,
        password
      );

      // ถ้า login สำเร็จ ให้ไปหน้าที่หลังบ้าน/Service กำหนด
      if (redirectUrl) {
        await this.router.navigateByUrl(redirectUrl);
      } else {
        this.showLoginError('Invalid username or password.');
      }
    } catch (error) {
      // กรณี service error หรือ backend มีปัญหา
      console.error('[LoginComponent] submit error:', error);
      this.showLoginError('Something went wrong. Please try again.');
    } finally {
      // ปิด loading ไม่ว่าจะสำเร็จหรือ error
      this.isSubmitting = false;
    }
  }

  /*
    เรียกตอนผู้ใช้เริ่มพิมพ์ใหม่
    เพื่อล้าง error เดิม
  */
  loginChange(): void {
    this.loginValid = true;
    this.errorMessage = '';
  }

  /*
    แสดง error และ trigger animation เขย่า
  */
  private showLoginError(message: string): void {
    this.errorMessage = message;

    this.loginValid = true;
    this.changeDetectorRef.detectChanges();
    this.loginValid = false;
  }

  /*
    mark form ให้ touched ทั้งหมด
    เพื่อให้ validation แสดงผลทันที
  */
  private markFormTouched(): void {
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });
  }
}