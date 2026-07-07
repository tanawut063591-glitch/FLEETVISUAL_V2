import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './core/components/login/login.component';
import { MainComponent } from './core/components/main/main.component';
import { NotFound } from './core/components/not-found/not-found';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  {
    path: 'login',
    component: LoginComponent,
  },

  {
    path: 'main',
    component: MainComponent,
  },

  {
    path: 'main/overview',
    redirectTo: 'main',
    pathMatch: 'full',
  },

  {
    path: 'notfound',
    component: NotFound,
  },

  {
    path: '**',
    redirectTo: 'notfound',
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