import { Component, OnInit } from '@angular/core';
import { ThemeModeService } from './shared/services/theme-mode.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  title = 'solaris-app';

  constructor(private themeModeService: ThemeModeService) {}

  ngOnInit(): void {
    // Initialize before routed pages render so Login and Dashboard use one theme state.
    this.themeModeService.init();
  }
}
