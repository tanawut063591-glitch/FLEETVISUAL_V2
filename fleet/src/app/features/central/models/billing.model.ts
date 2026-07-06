export interface AlarmTag {
  id: number;
  name: string;
  description: string;
  message: string;
  expression: string;
  tagSync: string;
  destination: {
    telegram: boolean;
    msteam: boolean;
    email: boolean;
  };
}

export interface NotificationConfig {
  telegram: {
    enabled: boolean;
    chatIds: string[];
    display: boolean;
  };
  msteam: {
    enabled: boolean;
    webhookUrls: string[];
    display: boolean;
  };
  email:{
    enabled: boolean;
    address: string[];
    display: boolean;
  };
}

export interface User {
  id: number;
  username: string;
  password: string;
  role: 'administrator' | 'user' ;
  pageAccess: string[];
  siteAccess: string[];
}

export interface BillingConfigModel {
  id: number;
  siteId: string;
  meterType: 'normal' | 'tou';
  billingMode: 'auto' | 'manual';
  energyCost: number;
  onpeakCost: number;
  offpeakCost: number;
  discountRate: number;
  ftRate: number;
  scheduleDate: string;
  scheduleTime: string;

  contactType: string;
  contactCost: string;
  
  confirmation_user: string[];
  confirmation_account: string[];
  confirmation_customer: string[];
  invoice_user: string[];
  invoice_account: string[];
  invoice_customer: string[];
  receipt_user: string[];
  receipt_account: string[];
  receipt_customer: string[];

  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateBillingRequestModel extends Omit<BillingConfigModel, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>{

}

export interface UpdateBillingRequestModel extends Omit<BillingConfigModel, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>{

}

export interface DeleteBillingRequestModel extends Pick<BillingConfigModel, 'id'>{

}

export interface BillingResponseModel {
  StatusCode: string;
  Message: string;
}

// Common API response shapes used by SOLARIS_REPORT/billingsController.js
export interface ApiSuccessResponseModel<T> {
  status: 'success';
  data: T;
}

export interface BillingConfigResponseModel {
  status: string;
  data: BillingConfigModel[];
}

export interface BillingConfigByIdRequestModel {
  id: number;
}

export interface BillingConfigByIdResponseModel extends ApiSuccessResponseModel<BillingConfigModel> {}

export interface BillingConfigBySiteIdRequestModel {
  siteId: string;
}

export interface BillingConfigBySiteIdResponseModel extends ApiSuccessResponseModel<BillingConfigModel> {}

export interface BillingStateDataModel {
  id: number;
  siteId: string;
  timestamp: string;
  createdAt: string;
  createdBy: string;
  status: string;
  payment_id: string;
  energy_amount: number;
  price_amount: number;
  forced_energy_amount: number;
  billing_process: string;
  confirmation_status: string;
  confirmation_updateAt: string;
  confirmation_updateBy: string;
  invoice_status: string;
  invoice_updateAt: string;
  invoice_updateBy: string;
  invoice_sendDate: string;
  payment_status: string;
  payment_updateAt: string;
  payment_updateBy: string;
  reciept_status: string;
  reciept_updateAt: string;
  reciept_updateBy: string;
  reciept_sendDate: string;
}

export interface BillingStateRequestModel {
  timestamp: string;
}

export interface BillingStateResponseModel {
  status: string;
  data: BillingStateDataModel[];
}

export interface BillingStateByIdRequestModel {
  id: number;
}

export interface BillingStateByIdResponseModel extends ApiSuccessResponseModel<BillingStateDataModel> {}

export interface BillingStateBySiteIdRequestModel {
  siteId: string;
}

export interface BillingStateBySiteIdResponseModel extends ApiSuccessResponseModel<BillingStateDataModel[]> {}

export interface BillingStateBySiteIdAndTimestampRequestModel {
  siteId: string;
  timestamp: string;
}

export interface BillingStateByPeriodRequestModel {
  start: string;
  end: string;
}

export interface BillingStateBySiteIdAndTimestampResponseModel extends ApiSuccessResponseModel<BillingStateDataModel[]> {}

export interface BillingStateByTimestampOnlyRequestModel {
  timestamp: string;
}

export interface BillingStateByTimestampOnlyResponseModel extends ApiSuccessResponseModel<BillingStateDataModel[]> {}

export interface BillingStateFindLatestRequestModel {
  siteId: string;
  timestamp: string;
}

export interface BillingStateFindLatestResponseModel extends ApiSuccessResponseModel<BillingStateDataModel> {}

export interface CreateBillingStateRequestModel extends Omit<BillingStateDataModel, 'id' | 'createdAt'> {
  user?: string;
}

export interface UpdateBillingStateRequestModel extends Partial<Omit<BillingStateDataModel, 'createdAt'>> {
  id: number;
  user?: string;
}

export interface DeleteBillingStateRequestModel {
  id: number;
}

export interface BillingLogDataModel {
  id: number;
  billingId: string;
  billingTimestamp: string;
  processType: string;
  action: string;
  from_action: string;
  user: string;
  timestamp: string;
}

export interface BillingLogRequestModel {
  billingId: string;
  billingTimestamp: string;
}

export interface BillingLogResponseModel {
  status: string;
  data: BillingLogDataModel[];
}

export interface BillingLogByIdRequestModel {
  id: number;
}

export interface BillingLogByIdResponseModel extends ApiSuccessResponseModel<BillingLogDataModel> {}

export interface BillingLogsByBillingIdRequestModel {
  billingId: string;
}

export interface BillingLogsByBillingIdResponseModel extends ApiSuccessResponseModel<BillingLogDataModel[]> {}

export interface BillingLogsByTimestampRequestModel {
  billingId: string;
  billingTimestamp: string;
}

export interface BillingLogsByTimestampResponseModel extends ApiSuccessResponseModel<BillingLogDataModel[]> {}

export interface CreateBillingLogRequestModel extends Omit<BillingLogDataModel, 'id' | 'timestamp' | 'user'> {
  user?: string;
  timestamp?: string;
}

export interface UpdateBillingLogRequestModel extends Partial<Omit<BillingLogDataModel, 'timestamp'>> {
  id: number;
  user?: string;
  timestamp?: string;
}

export interface DeleteBillingLogRequestModel {
  id: number;
}

// Billing workflow (confirmation/invoice/payment/receipt)
export interface GenerateConfirmationBillingRequestModel {
  timestamp: string;
  pointsource: string;
  sitename: string;
}

export interface UpdateConfirmationInternalReviewRequestModel {
  timestamp: string;
  pointsource: string;
  status?: string;
  sitename?: string;
  username?: string;
}

export interface RejectConfirmationInternalReviewRequestModel {
  timestamp: string;
  pointsource: string;
  sitename?: string;
  reason?: string;
  forceValue?: any;
  username?: string;
}

export interface UpdateConfirmationCustomerReviewRequestModel {
  timestamp: string;
  pointsource: string;
  status?: string;
  sitename?: string;
  username?: string;
}

export interface RejectConfirmationCustomerReviewRequestModel {
  timestamp: string;
  pointsource: string;
  sitename?: string;
  reason?: string;
  forceValue?: any;
  username?: string;
}

export interface UpdateInvoiceAccountingReviewRequestModel {
  timestamp: string;
  pointsource: string;
  status?: string;
  sitename?: string;
  username?: string;
}

export interface UpdateInvoiceCustomerReviewRequestModel {
  timestamp: string;
  pointsource: string;
  file?: File;
  status?: string;
  sitename?: string;
  username?: string;
  sendDate?: string;
}

export interface UpdatePaymentAccountingReviewRequestModel {
  timestamp: string;
  pointsource: string;
  status?: string;
  sitename?: string;
  username?: string;
  paymentId?: string;
  bank?: string;
  paymentType?: string;
  paymentDate?: string;
}

export interface UpdatePaymentCustomerReviewRequestModel {
  timestamp: string;
  pointsource: string;
  file: File;
  status?: string;
  sitename?: string;
  username?: string;
  sendDate?: string;
}

export interface UpdateReceiptAccountingReviewRequestModel {
  timestamp: string;
  pointsource: string;
  file?: File;
  status?: string;
  sitename?: string;
  username?: string;
  sendDate?: string;
}

export interface UpdateReceiptCustomerReviewRequestModel {
  timestamp: string;
  pointsource: string;
  status?: string;
  sitename?: string;
  username?: string;
}

// Document download (returns PDF buffer)
export type BillingDocumentProcessType = 'confirmation' | 'invoice' | 'payment' | 'receipt';
export type BillingDocumentType = 'signed' | 'unsigned';

export interface GetBillingDocumentFileRequestModel {
  timestamp: string;
  pointsource: string;
  process: string;
  type: string;
}