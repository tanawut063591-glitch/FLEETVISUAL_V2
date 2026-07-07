import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  standalone: false
})
export class NotFound {
  constructor(
    private router: Router,
    private location: Location
  ) {}

  goHome(): void {
    this.router.navigate(['/']);
  }

  goBack(): void {
    this.location.back();
  }
}