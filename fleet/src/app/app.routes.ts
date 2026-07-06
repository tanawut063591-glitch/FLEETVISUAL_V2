import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { NotFound } from './core/components/not-found/not-found';
import { Login } from './core/components/login/login';
import { Navbar } from './core/components/navbar/navbar';
import { PermissionGuard } from './core/guards/auth.guard';
import { BillingUpload } from './core/components/billing-upload/billing-upload';
import { PaymentUpload } from './core/components/payment-upload/payment-upload';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/main/overview',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: Login,
    },
    {
        path: 'main',
        component: Navbar,
        children: [
            // Centralize Pages
            {
                path: 'overview',
                loadChildren: () => import('./features/central/pages/overview/overview-module').then(m => m.OverviewModule)
            },
            {
                path: 'performance',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/central/pages/performance/performance-module').then(m => m.PerformanceModule)
            },
            {
                path: 'trend',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/central/pages/trend/trend-module').then(m => m.TrendModule)
            },
            {
                path: 'tabular',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/central/pages/tabular/tabular-module').then(m => m.TabularModule)
            },
            {
                path: 'events',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/central/pages/events/events-module').then(m => m.Events2Module)
            },
            {
                path: 'billing/:id',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/central/pages/billing/billing-module').then(m => m.BillingModule)
            },
            {
                path: 'reports',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/central/pages/reports/reports-module').then(m => m.ReportsModule)
            },
            {
                path: 'admin',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/central/pages/admin/admin-module').then(m => m.AdminModule)
            },
            {
                path: 'setting',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/central/pages/setting/setting-module').then(m => m.SettingModule)
            },
            {
                path: 'maintenance',
                //canActivate: [PermissionGuard],
                loadChildren: () => import('./features/central/pages/maintenance/maintenance-module').then(m => m.MaintenanceModule)
            },

            // Plant Ifomation Pages
            {
                path: 'layout',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/sites/pages/layout/layout-module').then(m => m.LayoutModule)
            },
            {
                path: 'dashboard',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/sites/pages/dashboard/dashboard-module').then(m => m.DashboardModule)
            },
            {
                path: 'efficiency',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/sites/pages/performance/performance-module').then(m => m.PerformanceModule)
            },
            {
                path: 'realtime',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/sites/pages/realtime/realtime-module').then(m => m.RealtimeModule)
            },
            {
                path: 'diagram',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/sites/pages/diagram/diagram-module').then(m => m.DiagramModule)
            },
            {
                path: 'control',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/sites/pages/control/control-module').then(m => m.ControlModule)
            },
            {
                path: 'charts',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/sites/pages/chart/chart-module').then(m => m.ChartModule)
            },
            {
                path: 'event',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/sites/pages/event/event-module').then(m => m.EventModule)
            },
            {
                path: 'report',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/sites/pages/report/report-module').then(m => m.ReportModule)
            },
            {
                path: 'report-admin',
                canActivate: [PermissionGuard],
                loadChildren: () => import('./features/sites/pages/report-admin/report-admin-module').then(m => m.ReportAdminModule)
            },
        ]
    },
    // {
    //     path: 'billing/:id',
    //     canActivate: [PermissionGuard],
    //     loadChildren: () => import('./features/central/pages/billing/billing-module').then(m => m.BillingModule)
    // },
    {
        path: 'billing-upload/:id',
        //canActivate: [PermissionGuard],
        component: BillingUpload,
    },
    {
        path: 'payment-upload/:id',
        //canActivate: [PermissionGuard],
        component: PaymentUpload,
    },

    {
        path: 'notfound',
        component: NotFound
    },
    {
        path: '**',
        redirectTo: '/notfound'
    }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    useHash: true,
    preloadingStrategy: PreloadAllModules
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }