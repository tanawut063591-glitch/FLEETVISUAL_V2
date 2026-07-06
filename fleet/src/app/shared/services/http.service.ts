import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AppInitService } from './app-init.service';
import { Router } from '@angular/router';
import { RequestAtTimeModel, RequestHistorianModel, RequestRealtimeModel } from '../models/request.model';
import { firstValueFrom, map, Observable } from 'rxjs';
import { AuthRespondModel } from '../models/auth.model';
import { ResponseTagsModel } from '../models/tags.model';
import { AddUserRequestModel, ChnagePasswordRequestModel, UpdateUserRequestModel, UserDataModel, UserRespondModel } from '../models/user.model';
import { BillingSessionModel } from '../models/billing.model';
import {
    BillingConfigByIdRequestModel,
    BillingConfigByIdResponseModel,
    BillingConfigBySiteIdRequestModel,
    BillingConfigBySiteIdResponseModel,
    BillingConfigResponseModel,
    BillingLogByIdRequestModel,
    BillingLogByIdResponseModel,
    BillingLogResponseModel,
    BillingLogsByBillingIdRequestModel,
    BillingLogsByBillingIdResponseModel,
    BillingLogsByTimestampRequestModel,
    BillingLogsByTimestampResponseModel,
    BillingResponseModel,
    BillingStateByIdRequestModel,
    BillingStateByIdResponseModel,
    BillingStateByPeriodRequestModel,
    BillingStateBySiteIdAndTimestampRequestModel,
    BillingStateBySiteIdAndTimestampResponseModel,
    BillingStateBySiteIdRequestModel,
    BillingStateBySiteIdResponseModel,
    BillingStateResponseModel,
    CreateBillingLogRequestModel,
    CreateBillingRequestModel,
    CreateBillingStateRequestModel,
    DeleteBillingLogRequestModel,
    DeleteBillingRequestModel,
    DeleteBillingStateRequestModel,
    GenerateConfirmationBillingRequestModel,
    GetBillingDocumentFileRequestModel,
    RejectConfirmationCustomerReviewRequestModel,
    RejectConfirmationInternalReviewRequestModel,
    UpdateBillingLogRequestModel,
    UpdateBillingRequestModel,
    UpdateBillingStateRequestModel,
    UpdateConfirmationCustomerReviewRequestModel,
    UpdateConfirmationInternalReviewRequestModel,
    UpdateInvoiceAccountingReviewRequestModel,
    UpdateInvoiceCustomerReviewRequestModel,
    UpdatePaymentAccountingReviewRequestModel,
    UpdatePaymentCustomerReviewRequestModel,
    UpdateReceiptAccountingReviewRequestModel,
    UpdateReceiptCustomerReviewRequestModel,
} from '../../features/central/models/billing.model';
import { CreateReportRequestModel, DeleteReportRequestModel, ReportConfigResponseModel, ReportResponseModel, UpdateReportRequestModel } from '../../features/central/models/report.model';
import { AddNotificationConfigModel, DeleteNotificationConfigModel, EventConfigModel, EventConfigResponseModel, EventDataModel, EventRequestModel, EventSummaryModel, ExpressionParseResultModel, FilterEventRequestModel, NotificationConfigModel, UpdateNotificationConfigModel } from '../../features/sites/models/event.model';
import { HolidayRequestModel, HolidayResponseModel, SetHolidayModel, SetHolidayRequestModel } from '../models/holiday.model';
import {
    MaintenanceResponse,
    PlantModel,
    GetPlantByIdRequest,
    MaintenanceUserModel,
    WorkOrderModel,
    GetWorkOrderByIdRequest,
    GetWorkOrdersByPlantRequest,
    GetWorkOrdersByStatusRequest,
    GetWorkOrdersByAssigneeRequest,
    GetWorkOrdersByDateRangeRequest,
    CreateWorkOrderRequest,
    UpdateWorkOrderRequest,
    UpdateWorkOrderStatusRequest,
    DeleteWorkOrderRequest,
    ChecklistItemModel,
    GetChecklistsByWorkOrderRequest,
    CreateChecklistRequest,
    UpdateChecklistRequest,
    ToggleChecklistRequest,
    DeleteChecklistRequest,
    WoReportModel,
    GetReportByWorkOrderRequest,
    CreateWoReportRequest,
    UpdateWoReportRequest,
    DeleteWoReportRequest,
    WoSignatureModel,
    GetSignatureByWorkOrderRequest,
    CreateSignatureRequest,
    DeleteSignatureRequest,
    MaintenanceScheduleModel,
    GetScheduleByIdRequest,
    GetSchedulesByPlantRequest,
    CreateScheduleRequest,
    UpdateScheduleRequest,
    DeleteScheduleRequest,
    MaintenanceLogModel,
    GetLogsByWorkOrderRequest,
    DeleteLogRequest,
    GetWorkOrderByDateRequest,
    GetLogsByDateRangeRequest,
} from '../models/maintenance.model';
import {
    MasterDataResponse,
    PlantInformationModel,
    CreatePlantRequest,
    UpdatePlantRequest,
    FindPlantByIdRequest,
    FindPlantBySiteRequest,
    TogglePlantRequest,
    DeletePlantRequest,
    PlantSlaModel,
    CreateSlaRequest,
    UpdateSlaRequest,
    FindSlaByIdRequest,
    FindSlaBySiteRequest,
    FindSlaByDateRequest,
    DeleteSlaRequest,
    PlantDiagramModel,
    FindDiagramByIdRequest,
    FindDiagramsBySiteRequest,
    DeleteDiagramRequest,
    DownloadDiagramRequest,
} from '../models/masterdata.model';
import {
    CreateInverterSessionRequest,
    DestroyInverterSessionRequest,
    GetInverterDevicesRequest,
    GetInverterStatusRequest,
    SendInverterCommandRequest,
    GetInverterCommandLogsRequest,
    InverterSessionResponse,
    InverterDevicesResponse,
    InverterStatusResponse,
    InverterCommandResponse,
    InverterCommandLogsResponse,
} from '../models/inverter.model';
import {
    MockInverterSession,
    MockDestroySession,
    MockInverterDevices,
    MockInverterStatus,
    MockCommandSuccess,
    MockInverterCommandLogs,
} from '../../mockup/inverter';

@Injectable({
    providedIn: 'root'
})
export class HttpService {

    private httpClient = inject(HttpClient);
    private appLoadService = inject(AppInitService);
    private router = inject(Router);


    async getRealtime(requests: RequestRealtimeModel) {
        const body = requests;
        const res: any = await firstValueFrom(
            this.httpClient.post( this.appLoadService.config.UrlApi + 'getrealtime', body)
        );
        return res;
    }

    async getAtTime(requests: RequestAtTimeModel[]) {
        const body = {
            Tags: requests[0].Tags,
            Options: {
                StartTime: requests[0].TimeStamp
            }
        };
        const res: any = await firstValueFrom(
            this.httpClient.post( this.appLoadService.config.UrlApi + 'getattime', body)
        );
        return res;
    }

    async getHistorian(requests: RequestHistorianModel[]) {
        const body = requests;
        const res: any = await firstValueFrom(
            this.httpClient.post( this.appLoadService.config.UrlApi + 'gethisdata', body)
        );
        return res;
    }

    getConfig(path: string): Promise<any[] | undefined> {
        return this.httpClient.get<any[]>(path).toPromise();
        
    }

    getConfig2(path: string): Promise<any> {
        return this.httpClient.get<any>(path).toPromise();
    }
    

    async getConfigFile(path: string) {
        const text = await this.httpClient.get(path, { responseType: 'text' }).toPromise();
        return text;
    }

    async authentication(username: string, password: string) {
        const body = {
            user : username,
            password : password
        };
        ////console.log(body)
        const res = await firstValueFrom(
            this.httpClient.post<AuthRespondModel>(this.appLoadService.config.UrlApiAuthen + 'userauthen', body)
        );
        
        return res;
    }

    async refreshtoken(token: string) {
        const body = {
            token : token
        };
        ////console.log(body)
        const res = await firstValueFrom(
            this.httpClient.post(this.appLoadService.config.UrlApiAuthen + 'refreshtoken', body)
        );
        
        return res;
    }

    async getTagConfigByPointSource(pointsource: string) {
        const body = {
            pointsource : pointsource,
            cal : 2
        };
        ////console.log(body)
        const res = await firstValueFrom(
            this.httpClient.post(this.appLoadService.config.UrlApi + 'getags', body)
        );
        
        return res;
    }

    async getAssistantMessage(qst: string, data: any) {
        try {
            const body = {
                Question: qst,
                Datas: data
            };
            const res = await this.httpClient.post(
                `${this.appLoadService.config.UrlApiBilling}ask`, 
                body
            ).toPromise();

            if (!res) {
                throw new Error('No file returned from server');
            }

            return res;
        } catch (error) {
            throw new Error('No file returned from server');
        }
    }

    async getReport(id: string, type: string, timestamp: string) {
        try {
            const body = {
                Type: type,
                ProjectId: id,
                Timestamp: timestamp
            };
            const res = await this.httpClient.post(
                `${this.appLoadService.config.UrlApiBilling}genreport`,
                body,
                { responseType: 'blob' }
            ).toPromise();

            if (!res) {
                throw new Error('No file returned from server');
            }

            return res;
        } catch (error) {
            throw new Error('No file returned from server');
        }
    }

    async downloadReport(id: string, type: string, timestamp: string) {
        try {
            const body = {
                Type: type,
                ProjectId: id,
                Timestamp: timestamp
            };
            const res = await this.httpClient.post(
                `${this.appLoadService.config.UrlApiBilling}genreport`,
                body,
                { responseType: 'blob' }
            ).toPromise();

            if (!res) {
                throw new Error('No file returned from server');
            }

            let blob: Blob = new Blob([res], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary link element
            const a = document.createElement('a');
            a.href = url;
            a.download = 'report.pdf';
            a.target = '_blank'; // Open in a new tab
            document.body.appendChild(a);
            
            // Trigger the download
            a.click();
            
            // Clean up
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            throw new Error('No file returned from server');
        }

    }

    async generateBilling(id: string, timestamp: string, type?: string) {
        try {
            const body = {
                ProjectId: id,
                Timestamp: timestamp,
                Type: type
            };
            const res = await this.httpClient.post(
                `${this.appLoadService.config.UrlApiBilling}genbill`,
                body
            ).toPromise();
            if (!res) {
                throw new Error('No file returned from server');
            }
            //console.log(res)
            return res;
        } catch (error) {
            throw new Error('No file returned from server');
        }
    }

    async getBilling(id: string, timestamp: string, type?: string) {
        try {
            const body = {
                ProjectId: id,
                Timestamp: timestamp,
                Type: type
            };
            const res = await this.httpClient.post(
                `${this.appLoadService.config.UrlApiBilling}getbill`,
                body
            ).toPromise();
            if (!res) {
                throw new Error('No file returned from server');
            }
            //console.log(res)
            return res;
        } catch (error) {
            throw new Error('No file returned from server');
        }
    }

    async downloadBilling(id: string, timestamp: string, type?: string) {
        try {
            const body = {
                ProjectId: id,
                Timestamp: timestamp,
                Type: type
            };
            const res = await this.httpClient.post<any>(
                `${this.appLoadService.config.UrlApiBilling}getbill`,
                body
            ).toPromise();

            if (!res) {
                throw new Error('No file returned from server');
            }

            const byteArray = new Uint8Array(res.data.data);
            let blob: Blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary link element
            const a = document.createElement('a');
            a.href = url;
            a.download = 'billing.pdf'
            a.target = '_blank'; // Open in a new tab
            document.body.appendChild(a);
            
            // Trigger the download
            a.click();
            
            // Clean up
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            throw new Error('No file returned from server');
        }

    }

    async approveBilling(id: string, timestamp: string, site: string) {
        try {
            const body = {
                siteId: site,
                timestamp: timestamp,
                sesseionId: id    
            };
            const res = await this.httpClient.post<any>(
                `${this.appLoadService.config.UrlApiBilling}approvebill`,
                body
            ).toPromise();

            if (!res) {
                throw new Error('No billing approved from server');
            }

            return res;
        } catch (error) {
            throw new Error('No billing approved from server');
        }

    }

    async uploadBilling(file: File, sesseionId: string, sietId: string) {
        try {
            if (!file) {
                throw new Error('No file provided for upload');
            }

            const formData = new FormData();
            formData.append('file', file, file.name);

            // server expects session id in query string as `sesseionId`
            const url = `${this.appLoadService.config.UrlApiBilling}uploadbill?sesseionId=${encodeURIComponent(sesseionId)}&siteId=${encodeURIComponent(sietId)}`;
            const res = await this.httpClient.post(url, formData).toPromise();

            if (!res) {
                throw new Error('Upload failed or no response from server');
            }

            return res;
        } catch (error: any) {
            throw new Error(error?.message || 'Upload failed');
        }

    }

    async getBillingSessionData(id: string) {
        try {
            const body = {
                sessionId: id    
            };
            const res = await this.httpClient.post<BillingSessionModel | any>(
                `${this.appLoadService.config.UrlApiBilling}getsession`,
                body
            ).toPromise();

            if (!res) {
                throw new Error('No session data returned from server');
            }

            return res;
        } catch (error) {
            throw new Error('No session data returned from server');
        }

    }

    async getBillingConfig() {
        const res = await firstValueFrom(
            this.httpClient.get<BillingConfigResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/get')
        );
        
        return res;
    };

    async getBillingConfigById(body: BillingConfigByIdRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingConfigByIdResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/find', body)
        );
        return res;
    };

    async getBillingConfigBySiteId(body: BillingConfigBySiteIdRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingConfigBySiteIdResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/getbyid', body)
        );
        return res;
    };

    async addBillingConfig(body: CreateBillingRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/set', body)
        );
        
        return res;
    };

    async updateBillingConfig(body: UpdateBillingRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/update', body)
        );
        
        return res;
    };

    async deleteBillingConfig(body: DeleteBillingRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/delete', body)
        );
        
        return res;
    };

    // billings logs
    async getAllBillingLogs() {
        const res = await firstValueFrom(
            this.httpClient.get<BillingLogResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/log/get')
        );
        return res;
    };

    async getBillingLogById(body: BillingLogByIdRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingLogByIdResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/log/find', body)
        );
        return res;
    };

    async getBillingLogsByBillingId(body: BillingLogsByBillingIdRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingLogsByBillingIdResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/log/find-by-billing', body)
        );
        return res;
    };

    async getBillingLogsByTimestamp(body: BillingLogsByTimestampRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingLogsByTimestampResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/log/find-by-timestamp', body)
        );
        return res;
    };

    async createBillingLog(body: CreateBillingLogRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/log/set', body)
        );
        return res;
    };

    async updateBillingLog(body: UpdateBillingLogRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/log/update', body)
        );
        return res;
    };

    async deleteBillingLog(body: DeleteBillingLogRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/log/delete', body)
        );
        return res;
    };

    async getReportConfig() {
        const res = await firstValueFrom(
            this.httpClient.get<ReportConfigResponseModel>(this.appLoadService.config.UrlApiBilling + 'report/get')
        );
        
        return res;
    };

    async addReportConfig(body: CreateReportRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<ReportResponseModel>(this.appLoadService.config.UrlApiBilling + 'report/set', body)
        );
        
        return res;
    };

    async updateReportConfig(body: UpdateReportRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<ReportResponseModel>(this.appLoadService.config.UrlApiBilling + 'report/update', body)
        );
        
        return res;
    };

    async deleteReportConfig(body: DeleteReportRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<ReportResponseModel>(this.appLoadService.config.UrlApiBilling + 'report/delete', body)
        );
        
        return res;
    };


    async getUserConfig() {
        const res = await firstValueFrom(
            this.httpClient.get<UserDataModel[]>(this.appLoadService.config.UrlApi + 'user/get', {})
        );
        
        return res;
    };

    async addUserConfig(body: AddUserRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<UserRespondModel>(this.appLoadService.config.UrlApi + 'user/create', body)
        );
        
        return res;
    };

    async updateUserConfig(body: UpdateUserRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<UserRespondModel>(this.appLoadService.config.UrlApi + 'user/update', body)
        );
        
        return res;
    };

    async deleteUserConfig(userId: string) {
        const body = {
            _id: userId
        };
        const res = await firstValueFrom(
            this.httpClient.post<UserRespondModel>(this.appLoadService.config.UrlApi + 'user/delete', body)
        );
        return res;
    }

    async updatePassword(body: ChnagePasswordRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<UserRespondModel>(this.appLoadService.config.UrlApi + 'user/changepassword', body)
        );
        
        return res;
    };

    async getUserSignature(user: string) {
        const body = {
            username: user
        };
        const res = await firstValueFrom(
            this.httpClient.post<UserRespondModel | string>(this.appLoadService.config.UrlApi + 'user/signature', body)
        );
        
        return res;
    };

    async getAlarmEventData(request: EventRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<EventDataModel[]>(this.appLoadService.config.UrlApiNotification + 'event/data', request)
        );
        
        return res;
    };
    
    async getFilteredAlarmEventData(request: FilterEventRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<EventDataModel[]>(this.appLoadService.config.UrlApiNotification + 'event/filter', request)
        );
        
        return res;
    };

    async getSummaryAlarmEventData(request: EventRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<EventSummaryModel[]>(this.appLoadService.config.UrlApiNotification + 'event/summary', request)
        );
        
        return res;
    };


    async getAlarmEventConfig() {
        const res = await firstValueFrom(
            this.httpClient.get<EventConfigModel[] | any>(this.appLoadService.config.UrlApiNotification + 'event/gettag')
        );
        
        return res;
    };

    async setAlarmEventConfig(request: EventConfigModel[]) {
        const res = await firstValueFrom(
            this.httpClient.post<EventConfigResponseModel>(this.appLoadService.config.UrlApiNotification + 'event/settag', request)
        );
        
        return res;
    };


    async getNotificationConfig() {
        const res = await firstValueFrom(
            this.httpClient.get<NotificationConfigModel[] | any>(this.appLoadService.config.UrlApiNotification + 'config/notification')
        );
        
        return res;
    };

    async addNotificationConfig(request: AddNotificationConfigModel) {
        const res = await firstValueFrom(
            this.httpClient.post<EventConfigResponseModel>(this.appLoadService.config.UrlApiNotification + 'config/notification', request)
        );
        
        return res;
    };

    async updateNotificationConfig(request: UpdateNotificationConfigModel) {
        const res = await firstValueFrom(
            this.httpClient.put<EventConfigResponseModel>(this.appLoadService.config.UrlApiNotification + 'config/notification', request)
        );
        
        return res;
    };

    async deleteNotificationConfig(request: DeleteNotificationConfigModel) {
        const res = await firstValueFrom(
            this.httpClient.delete<EventConfigResponseModel>(
                this.appLoadService.config.UrlApiNotification + 'config/notification',
                {
                    body: request   // 👈 สำคัญมาก
                }
            )
        );

        return res;
    }
    
    async parseExpression(expr: string) {
        const request = {
            expression: expr
        };
        const res = await firstValueFrom(
            this.httpClient.post<ExpressionParseResultModel>(this.appLoadService.config.UrlApiNotification + 'calc/expression', request)
        );
        
        return res;
    };

    // billings state
    async getAllBillingStates() {
        const res = await firstValueFrom(
            this.httpClient.get<BillingStateResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/state/get')
        );
        return res;
    };

    async getBillingStateById(body: BillingStateByIdRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingStateByIdResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/state/find', body)
        );
        return res;
    };

    async getBillingStatesBySiteId(body: BillingStateBySiteIdRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingStateBySiteIdResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/state/find-by-site', body)
        );
        return res;
    };

    async getBillingStatesBySiteIdAndTimestamp(body: BillingStateBySiteIdAndTimestampRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingStateBySiteIdAndTimestampResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/state/find-by-timestamp', body)
        );
        return res;
    };

    async getBillingStatesByPeriod(body: BillingStateByPeriodRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingStateBySiteIdAndTimestampResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/state/find-by-period', body)
        );
        return res;
    };

    async getBillingStateData(timestamp: string) {
        const body = {
            timestamp: timestamp
        };
        const res = await firstValueFrom(
            this.httpClient.post<BillingStateResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/state/find-by-timestamp-only', body)
        );
        
        return res;
    };

    async getBillingLogData(billingId: string, billingTimestamp: string) {
        const body = {
            billingId: billingId,
            billingTimestamp: billingTimestamp
        };
        const res = await firstValueFrom(
            this.httpClient.post<BillingLogResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/log/find-by-timestamp', body)
        );
        
        return res;
    };

    async createBillingState(body: CreateBillingStateRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/state/set', body)
        );
        return res;
    };

    async updateBillingState(body: UpdateBillingStateRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/state/update', body)
        );
        return res;
    };

    async deleteBillingState(body: DeleteBillingStateRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/state/delete', body)
        );
        return res;
    };

    // billings workflow (confirmation/invoice/payment/receipt)
    async generateConfirmationBilling(body: GenerateConfirmationBillingRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/confirmation/generate', body)
        );
        return res;
    };

    async updateConfirmationInternalReview(body: UpdateConfirmationInternalReviewRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/confirmation/update-internal', body)
        );
        return res;
    };

    async rejectConfirmationInternalReview(body: RejectConfirmationInternalReviewRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/confirmation/reject-internal', body)
        );
        return res;
    };

    async updateConfirmationCustomerReview(body: UpdateConfirmationCustomerReviewRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/confirmation/update-customer', body)
        );
        return res;
    };

    async rejectConfirmationCustomerReview(body: RejectConfirmationCustomerReviewRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/confirmation/reject-customer', body)
        );
        return res;
    };

    async updateInvoiceAccountingReview(body: UpdateInvoiceAccountingReviewRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/invoice/update-accounting', body)
        );
        return res;
    };

    async updateInvoiceCustomerReview(body: UpdateInvoiceCustomerReviewRequestModel) {
        const formData = new FormData();
        if(body.file){
            formData.append('file', body.file, body.file.name);
        }
        formData.append('timestamp', body.timestamp);
        formData.append('pointsource', body.pointsource);
        if (body.status) formData.append('status', body.status);
        if (body.sitename) formData.append('sitename', body.sitename);
        if (body.username) formData.append('username', body.username);
        if (body.sendDate) formData.append('sendDate', body.sendDate);

        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/invoice/update-customer', formData)
        );
        return res;
    };

    async updatePaymentAccountingReview(body: UpdatePaymentAccountingReviewRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/payment/update-accounting', body)
        );
        return res;
    };

    async updatePaymentCustomerReview(body: UpdatePaymentCustomerReviewRequestModel) {
        const formData = new FormData();
        formData.append('file', body.file, body.file.name);
        formData.append('timestamp', body.timestamp);
        formData.append('pointsource', body.pointsource);
        if (body.status) formData.append('status', body.status);
        if (body.sitename) formData.append('sitename', body.sitename);
        if (body.username) formData.append('username', body.username);
        if (body.sendDate) formData.append('sendDate', body.sendDate);

        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/payment/update-customer', formData)
        );
        return res;
    };

    async updateReceiptAccountingReview(body: UpdateReceiptAccountingReviewRequestModel) {
        const formData = new FormData();
        if(body.file){
            formData.append('file', body.file, body.file.name);
        }
        formData.append('timestamp', body.timestamp);
        formData.append('pointsource', body.pointsource);
        if (body.status) formData.append('status', body.status);
        if (body.sitename) formData.append('sitename', body.sitename);
        if (body.username) formData.append('username', body.username);
        if (body.sendDate) formData.append('sendDate', body.sendDate);

        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/receipt/update-accounting', formData)
        );
        return res;
    };

    async updateReceiptCustomerReview(body: UpdateReceiptCustomerReviewRequestModel) {
        const res = await firstValueFrom(
            this.httpClient.post<BillingResponseModel>(this.appLoadService.config.UrlApiBilling + 'billings/receipt/update-customer', body)
        );
        return res;
    };

    // billings documents (PDF buffer)
    async getBillingDocumentFile(body: GetBillingDocumentFileRequestModel): Promise<Blob> {
        const res = await firstValueFrom(
            this.httpClient.post(this.appLoadService.config.UrlApiBilling + 'billings/document/get', body, { responseType: 'blob' })
        );
        return res as Blob;
    };

    async getReportHoliday(req: HolidayRequestModel) {
        const body = req;
        const res = await firstValueFrom(
            this.httpClient.post<HolidayResponseModel[]>(this.appLoadService.config.UrlApi + 'getholidays', body)
        );
        return res;
    }

    async setReportHoliday(item: SetHolidayRequestModel) {
        const body = item;

        const res = await firstValueFrom(
            this.httpClient.post(this.appLoadService.config.UrlApi + 'customholidays' ,body)
        );
        return res;
    }

    // ─── Plants ────────────────────────────────────────────────────────────────

    async getPlants() {
        const res = await firstValueFrom(
            this.httpClient.get<MaintenanceResponse<any>>(this.appLoadService.config.UrlApiMaintenance + 'plants/get')
        );
        return res;
    }

    async getPlantById(body: GetPlantByIdRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<PlantModel>>(this.appLoadService.config.UrlApiMaintenance + 'plants/find', body)
        );
        return res;
    }

    // ─── Users ─────────────────────────────────────────────────────────────────

    async getMaintenanceUsers() {
        const res = await firstValueFrom(
            this.httpClient.get<MaintenanceResponse<MaintenanceUserModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'users/get')
        );
        return res;
    }

    // ─── Work Orders ───────────────────────────────────────────────────────────

    async getAllWorkOrders() {
        const res = await firstValueFrom(
            this.httpClient.get<MaintenanceResponse<WorkOrderModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/work-orders/get')
        );
        return res;
    }

    async getWorkOrderByDate(body: GetWorkOrderByDateRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<WorkOrderModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/work-orders/find-by-date', body)
        );
        return res;
    }

    async getWorkOrderById(body: GetWorkOrderByIdRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<WorkOrderModel>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/work-orders/find', body)
        );
        return res;
    }

    async getWorkOrdersByPlant(body: GetWorkOrdersByPlantRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<WorkOrderModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/work-orders/find-by-plant', body)
        );
        return res;
    }

    async getWorkOrdersByStatus(body: GetWorkOrdersByStatusRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<WorkOrderModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/work-orders/find-by-status', body)
        );
        return res;
    }

    async getWorkOrdersByAssignee(body: GetWorkOrdersByAssigneeRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<WorkOrderModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/work-orders/find-by-assignee', body)
        );
        return res;
    }

    async createWorkOrder(body: CreateWorkOrderRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/work-orders/set', body)
        );
        return res;
    }

    async updateWorkOrder(body: UpdateWorkOrderRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/work-orders/update', body)
        );
        return res;
    }

    async updateWorkOrderStatus(body: UpdateWorkOrderStatusRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/work-orders/update-status', body)
        );
        return res;
    }

    async deleteWorkOrder(body: DeleteWorkOrderRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/work-orders/delete', body)
        );
        return res;
    }

    async getWorkOrdersByDateRange(body: GetWorkOrdersByDateRangeRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<WorkOrderModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/work-orders/find-by-date', body)
        );
        return res;
    }

    // ─── Checklists ────────────────────────────────────────────────────────────

    async getChecklistsByWorkOrder(body: GetChecklistsByWorkOrderRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<ChecklistItemModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/checklists/find-by-wo', body)
        );
        return res;
    }

    async createChecklist(body: CreateChecklistRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/checklists/set', body)
        );
        return res;
    }

    async updateChecklist(body: UpdateChecklistRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/checklists/update', body)
        );
        return res;
    }

    async toggleChecklist(body: ToggleChecklistRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/checklists/toggle', body)
        );
        return res;
    }

    async deleteChecklist(body: DeleteChecklistRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/checklists/delete', body)
        );
        return res;
    }

    // ─── WO Reports ────────────────────────────────────────────────────────────

    async getWoReport(body: GetReportByWorkOrderRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<WoReportModel>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/reports/find-by-wo', body)
        );
        return res;
    }

    async createWoReport(body: CreateWoReportRequest) {
        const formData = new FormData();
        formData.append('work_order_id', String(body.work_order_id));
        formData.append('submitted_by', body.submitted_by);
        formData.append('work_date', body.work_date);
        if (body.start_time) formData.append('start_time', body.start_time);
        if (body.end_time) formData.append('end_time', body.end_time);
        if (body.duration_min != null) formData.append('duration_min', String(body.duration_min));
        if (body.summary) formData.append('summary', body.summary);
        if (body.findings) formData.append('findings', body.findings);
        if (body.spare_parts_used) formData.append('spare_parts_used', body.spare_parts_used);
        if (body.followup_action) formData.append('followup_action', body.followup_action);
        if (body.file) formData.append('file', body.file, body.file.name);
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/reports/set', formData)
        );
        return res;
    }

    async updateWoReport(body: UpdateWoReportRequest) {
        const formData = new FormData();
        formData.append('id', String(body.id));
        if (body.work_date) formData.append('work_date', body.work_date);
        if (body.start_time) formData.append('start_time', body.start_time);
        if (body.end_time) formData.append('end_time', body.end_time);
        if (body.duration_min != null) formData.append('duration_min', String(body.duration_min));
        if (body.summary) formData.append('summary', body.summary);
        if (body.findings) formData.append('findings', body.findings);
        if (body.spare_parts_used) formData.append('spare_parts_used', body.spare_parts_used);
        if (body.followup_action) formData.append('followup_action', body.followup_action);
        if (body.file) formData.append('file', body.file, body.file.name);
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/reports/update', formData)
        );
        return res;
    }

    async deleteWoReport(body: DeleteWoReportRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/reports/delete', body)
        );
        return res;
    }

    // ─── Signatures ────────────────────────────────────────────────────────────

    async getSignatureByWorkOrder(body: GetSignatureByWorkOrderRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<WoSignatureModel>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/signatures/find-by-wo', body)
        );
        return res;
    }

    async createSignature(body: CreateSignatureRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/signatures/set', body)
        );
        return res;
    }

    async deleteSignature(body: DeleteSignatureRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/signatures/delete', body)
        );
        return res;
    }

    // ─── Maintenance Schedules ─────────────────────────────────────────────────

    async getAllMaintenanceSchedules() {
        const res = await firstValueFrom(
            this.httpClient.get<MaintenanceResponse<MaintenanceScheduleModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/schedules/get')
        );
        return res;
    }

    async getMaintenanceScheduleById(body: GetScheduleByIdRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<MaintenanceScheduleModel>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/schedules/find', body)
        );
        return res;
    }

    async getMaintenanceSchedulesByPlant(body: GetSchedulesByPlantRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<MaintenanceScheduleModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/schedules/find-by-plant', body)
        );
        return res;
    }

    async createMaintenanceSchedule(body: CreateScheduleRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/schedules/set', body)
        );
        return res;
    }

    async updateMaintenanceSchedule(body: UpdateScheduleRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/schedules/update', body)
        );
        return res;
    }

    async deleteMaintenanceSchedule(body: DeleteScheduleRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/schedules/delete', body)
        );
        return res;
    }

    // ─── Audit Logs ────────────────────────────────────────────────────────────

    async getAllMaintenanceLogs() {
        const res = await firstValueFrom(
            this.httpClient.get<MaintenanceResponse<MaintenanceLogModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/logs/get')
        );
        return res;
    }

    async getMaintenanceLogsByWorkOrder(body: GetLogsByWorkOrderRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<MaintenanceLogModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/logs/find-by-wo', body)
        );
        return res;
    }

    async getMaintenanceLogsByDateRange(body: GetLogsByDateRangeRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse<MaintenanceLogModel[]>>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/logs/find-by-date', body)
        );
        return res;
    }


    async deleteMaintenanceLog(body: DeleteLogRequest) {
        const res = await firstValueFrom(
            this.httpClient.post<MaintenanceResponse>(this.appLoadService.config.UrlApiMaintenance + 'maintenance/logs/delete', body)
        );
        return res;
    }

    // ─── Inverter Control ──────────────────────────────────────────────────────
    // ตั้ง INVERTER_MOCK = true เพื่อใช้ mock data แทน API จริง
    private readonly INVERTER_MOCK = true;

    async createInverterSession(body: CreateInverterSessionRequest): Promise<InverterSessionResponse> {
        if (this.INVERTER_MOCK) return MockInverterSession;
        const res = await firstValueFrom(
            this.httpClient.post<InverterSessionResponse>(this.appLoadService.config.UrlApiMaintenance + 'inverter/auth', body)
        );
        return res;
    }

    async destroyInverterSession(body: DestroyInverterSessionRequest): Promise<InverterSessionResponse> {
        if (this.INVERTER_MOCK) return MockDestroySession;
        const res = await firstValueFrom(
            this.httpClient.post<InverterSessionResponse>(this.appLoadService.config.UrlApiMaintenance + 'inverter/auth/destroy', body)
        );
        return res;
    }

    async getInverterDevices(body: GetInverterDevicesRequest): Promise<InverterDevicesResponse> {
        if (this.INVERTER_MOCK) return MockInverterDevices;
        const res = await firstValueFrom(
            this.httpClient.post<InverterDevicesResponse>(this.appLoadService.config.UrlApiMaintenance + 'inverter/devices', body)
        );
        return res;
    }

    async getInverterStatus(body: GetInverterStatusRequest): Promise<InverterStatusResponse> {
        if (this.INVERTER_MOCK) {
            const reqIds = Array.isArray(body.devIds)
                ? body.devIds
                : body.devIds.split(',').map(s => s.trim());
            const filtered = (MockInverterStatus.data ?? []).filter(
                s => reqIds.includes(s.devId ?? '')
            );
            return { status: 'success', data: filtered };
        }
        const res = await firstValueFrom(
            this.httpClient.post<InverterStatusResponse>(this.appLoadService.config.UrlApiMaintenance + 'inverter/status', body)
        );
        return res;
    }

    async sendInverterCommand(body: SendInverterCommandRequest): Promise<InverterCommandResponse> {
        if (this.INVERTER_MOCK) return MockCommandSuccess(body.command, body.deviceSn);
        const res = await firstValueFrom(
            this.httpClient.post<InverterCommandResponse>(this.appLoadService.config.UrlApiMaintenance + 'inverter/control', body)
        );
        return res;
    }

    async getInverterCommandLogs(body: GetInverterCommandLogsRequest): Promise<InverterCommandLogsResponse> {
        if (this.INVERTER_MOCK) {
            const logs = body.siteId
                ? (MockInverterCommandLogs.data ?? []).filter(l => l.site_id === body.siteId)
                : (MockInverterCommandLogs.data ?? []);
            const limit = body.limit ?? 50;
            return { status: 'success', data: logs.slice(0, limit) };
        }
        const res = await firstValueFrom(
            this.httpClient.post<InverterCommandLogsResponse>(this.appLoadService.config.UrlApiMaintenance + 'inverter/logs', body)
        );
        return res;
    }

    // ─── Master Data: Plant Information ───────────────────────────────────────
    async getMasterPlants(includeDisabled: boolean = false) {
        const url = this.appLoadService.config.UrlApiMasterData + 'plants/get' + (includeDisabled ? '?all=true' : '');
        return await firstValueFrom(
            this.httpClient.get<MasterDataResponse<PlantInformationModel[]>>(url)
        );
    }

    async findPlant(body: FindPlantByIdRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse<PlantInformationModel>>(this.appLoadService.config.UrlApiMasterData + 'plants/find', body)
        );
    }

    async findPlantBySite(body: FindPlantBySiteRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse<PlantInformationModel>>(this.appLoadService.config.UrlApiMasterData + 'plants/find-by-site', body)
        );
    }

    async createPlant(body: CreatePlantRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse>(this.appLoadService.config.UrlApiMasterData + 'plants/set', body)
        );
    }

    async updatePlant(body: UpdatePlantRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse>(this.appLoadService.config.UrlApiMasterData + 'plants/update', body)
        );
    }

    async togglePlant(body: TogglePlantRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse>(this.appLoadService.config.UrlApiMasterData + 'plants/toggle', body)
        );
    }

    async deletePlant(body: DeletePlantRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse>(this.appLoadService.config.UrlApiMasterData + 'plants/delete', body)
        );
    }

    // ─── Master Data: Plant SLA (yearly) ──────────────────────────────────────
    async getAllSla() {
        return await firstValueFrom(
            this.httpClient.get<MasterDataResponse<PlantSlaModel[]>>(this.appLoadService.config.UrlApiMasterData + 'sla/get')
        );
    }

    async findSla(body: FindSlaByIdRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse<PlantSlaModel>>(this.appLoadService.config.UrlApiMasterData + 'sla/find', body)
        );
    }

    async findSlaBySite(body: FindSlaBySiteRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse<PlantSlaModel[]>>(this.appLoadService.config.UrlApiMasterData + 'sla/find-by-site', body)
        );
    }

    async findSlaByDate(body: FindSlaByDateRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse<PlantSlaModel[]>>(this.appLoadService.config.UrlApiMasterData + 'sla/find-by-date', body)
        );
    }

    async createSla(body: CreateSlaRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse>(this.appLoadService.config.UrlApiMasterData + 'sla/set', body)
        );
    }

    async updateSla(body: UpdateSlaRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse>(this.appLoadService.config.UrlApiMasterData + 'sla/update', body)
        );
    }

    async deleteSla(body: DeleteSlaRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse>(this.appLoadService.config.UrlApiMasterData + 'sla/delete', body)
        );
    }

    // ─── Master Data: Plant Diagram (SLD) ─────────────────────────────────────
    async getDiagrams() {
        return await firstValueFrom(
            this.httpClient.get<MasterDataResponse<PlantDiagramModel[]>>(this.appLoadService.config.UrlApiMasterData + 'diagrams/get')
        );
    }

    async findDiagram(body: FindDiagramByIdRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse<PlantDiagramModel>>(this.appLoadService.config.UrlApiMasterData + 'diagrams/find', body)
        );
    }

    async findDiagramsBySite(body: FindDiagramsBySiteRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse<PlantDiagramModel[]>>(this.appLoadService.config.UrlApiMasterData + 'diagrams/find-by-site', body)
        );
    }

    async createDiagram(siteid: string, file: File, user?: string) {
        const formData = new FormData();
        formData.append('siteid', siteid);
        formData.append('file', file, file.name);
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse>(this.appLoadService.config.UrlApiMasterData + 'diagrams/set', formData, { headers: user ? { user } : {} })
        );
    }

    async updateDiagram(id: number, file: File, user?: string) {
        const formData = new FormData();
        formData.append('id', String(id));
        formData.append('file', file, file.name);
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse>(this.appLoadService.config.UrlApiMasterData + 'diagrams/update', formData, { headers: user ? { user } : {} })
        );
    }

    async deleteDiagram(body: DeleteDiagramRequest) {
        return await firstValueFrom(
            this.httpClient.post<MasterDataResponse>(this.appLoadService.config.UrlApiMasterData + 'diagrams/delete', body)
        );
    }

    async downloadDiagram(body: DownloadDiagramRequest): Promise<Blob> {
        return await firstValueFrom(
            this.httpClient.post(this.appLoadService.config.UrlApiMasterData + 'diagrams/download', body, { responseType: 'blob' })
        );
    }

}