import { NgModule, Optional, SkipSelf } from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Login } from './components/login/login';
import { Navbar } from './components/navbar/navbar';
import { NotFound } from './components/not-found/not-found';
import { MaterialModule } from './module/material-module';
import { AppStateModule } from '../store/app.state';
import { ShareModule } from '../shared/shared.module';
import { errorInterceptor } from './interceptors/error.interceptor';
import { tokenInterceptor } from './interceptors/token.interceptor';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { Assistant } from './components/assistant/assistant';
import { BillingUpload } from './components/billing-upload/billing-upload';
import { ChartsModule } from '../shared/chart.module';
import { PaymentUpload } from './components/payment-upload/payment-upload';
import { ProfileDialog } from './components/profile-dialog/profile-dialog';



@NgModule({
    imports: [
        DragDropModule,
        OverlayModule,
        PortalModule,
        CommonModule,
        RouterModule,
        FormsModule,
        MaterialModule,
        AppStateModule,
        ReactiveFormsModule,
        ShareModule,
        //ChartsModule
    ],
    declarations: [
        Login,
        Navbar,
        NotFound,
        Assistant,
        BillingUpload,
        PaymentUpload,
        ProfileDialog
    ],
    providers: [
        DatePipe,
        DecimalPipe,
        provideHttpClient(
          withInterceptors([tokenInterceptor, errorInterceptor])
        ),
    ]
})
export class CoreModule {
  // Prevent re-importing
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it only in AppModule.');
    }
  }
}
