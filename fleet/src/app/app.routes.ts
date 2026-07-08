import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './core/components/login/login.component';
import { MainComponent } from './core/components/main/main.component';
import { OverviewComponent } from './features/overview/overview.component';

//import { RealtimeComponent } from './shared/components/realtime/realtime.component';
//import { DataLoggerComponent } from './shared/components/data-logger/data-logger.component';
//import { ChartComponent } from './shared/components/chart/chart.component';
import { DiagramComponent } from './features/diagram/diagram.component';
//import { ReportComponent } from './shared/components/report/report.component';
import { PastTrackComponent } from './features/past-track/past-track.component';


import { PermissionGuard } from './core/guards/auth-guard';
import { LoginGuard } from './core/guards/login-guard';

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
        component: OverviewComponent,
        data: {
          depth: 1,
          title: 'OVERVIEW',
        },
      },
      // {
      //   path: 'realtime',
      //   component: RealtimeComponent,
      //   data: {
      //     depth: 2,
      //     title: 'REALTIME',
      //   },
      // },
      // {
      //   path: 'realtime/:id',
      //   component: RealtimeComponent,
      //   data: {
      //     depth: 2,
      //     title: 'REALTIME',
      //   },
      // },
      // {
      //   path: 'data-logger',
      //   component: DataLoggerComponent,
      //   data: {
      //     depth: 3,
      //     title: 'DATA LOGGER',
      //   },
      // },
      {
        path: 'datalogger',
        redirectTo: 'data-logger',
        pathMatch: 'full',
      },
      // {
      //   path: 'chart',
      //   component: ChartComponent,
      //   data: {
      //     depth: 4,
      //     title: 'CHART',
      //   },
      // },
      {
        path: 'diagram',
        component: DiagramComponent,
        data: {
          depth: 5,
          title: 'DIAGRAM',
        },
      },
      // {
      //   path: 'report',
      //   component: ReportComponent,
      //   data: {
      //     depth: 6,
      //     title: 'REPORT',
      //   },
      // },
  
      {
        path: 'past-track',
        component: PastTrackComponent,
        data: {
          depth: 9,
          title: 'PAST TRACK',
        },
      },
      {
        path: 'past-track/:id',
        component: PastTrackComponent,
        data: {
          depth: 9,
          title: 'PAST TRACK',
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
      preloadingStrategy: PreloadAllModules,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
