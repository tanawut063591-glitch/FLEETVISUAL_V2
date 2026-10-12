import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './core/components/login/login.component';
import { MainComponent } from './core/components/main/main.component';





import { PermissionGuard } from './core/guards/auth-guard';
import { LoginGuard } from './core/guards/login-guard';
import { SelectivePreloadingStrategy } from './core/strategies/selective-preloading.strategy';

// Stagger idle-only preloads to protect the first view's CPU/network budget.
// Explicit navigation still loads a feature immediately.
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [LoginGuard],
  },
  {
    path: 'main',
    component: MainComponent,
    canActivate: [PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: {
      timer: 5000,
    },
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full',
      },
      {
        path: 'overview',
        loadChildren: () =>
          import('./features/overview/overview.module').then(
            (module) => module.OverviewFeatureModule,
          ),
        data: {
          depth: 1,
          title: 'OVERVIEW',
        },
      },
      {
        path: 'realtime',
        loadChildren: () =>
          import('./features/realtime/realtime.module').then(
            (module) => module.RealtimeFeatureModule,
          ),
        data: {
          depth: 2,
          title: 'REALTIME',
          preload: true,
          preloadDelayMs: 600,
        },
      },
      {
        path: 'datalogger',
        redirectTo: 'data-logger',
        pathMatch: 'full',
      },
      {
        path: 'data-logger',
        loadChildren: () =>
          import('./features/data-logger/data-logger.module').then(
            (module) => module.DataLoggerFeatureModule,
          ),
        data: {
          depth: 3,
          title: 'DATA LOGGER',
        },
      },
      {
        path: 'chart',
        loadChildren: () =>
          import('./features/chart/chart.module').then((module) => module.ChartFeatureModule),
        data: {
          depth: 4,
          title: 'CHART',
        },
      },
      {
        path: 'diagram',
        loadChildren: () =>
          import('./features/diagram/diagram.module').then((module) => module.DiagramFeatureModule),
        data: {
          depth: 5,
          title: 'DIAGRAM',
          preload: true,
          preloadDelayMs: 12_000,
        },
      },
      {
        path: 'report',
        loadChildren: () =>
          import('./features/report/report.module').then((module) => module.ReportFeatureModule),
        data: {
          depth: 6,
          title: 'REPORT',
          preload: true,
          preloadDelayMs: 4_000,
        },
      },
      {
        path: 'alarm',
        loadChildren: () =>
          import('./features/alarm/alarm.module').then((module) => module.AlarmFeatureModule),
        data: {
          depth: 7,
          title: 'ALARM',
          preload: true,
          preloadDelayMs: 8_000,
        },
      },
      {
        path: 'alerts',
        redirectTo: 'alarm',
        pathMatch: 'full',
      },
      {
        path: 'log',
        loadChildren: () =>
          import('./features/activity-logs/activity-logs.module').then(
            (module) => module.ActivityLogsFeatureModule,
          ),
        data: {
          depth: 8,
          title: 'LOG',
          preload: true,
          preloadDelayMs: 16_000,
        },
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.module').then(
            (module) => module.SettingsFeatureModule,
          ),
        data: {
          depth: 10,
          title: 'SETTINGS',


          preload: true,
          preloadDelayMs: 20_000,
        },
      },

      {
        path: 'past-track',
        loadChildren: () =>
          import('./features/past-track/past-track.module').then(
            (module) => module.PastTrackFeatureModule,
          ),
        data: {
          depth: 9,
          title: 'PAST TRACK',
          preload: true,
          preloadDelayMs: 24_000,
        },
      },
      {
        path: '**',
        redirectTo: 'overview',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      preloadingStrategy: SelectivePreloadingStrategy,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
