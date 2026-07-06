export interface ReportConfigModel {
  id: number;
  siteId: string;
  receivedBy: string;
  receivedCc: string;
  receivedBcc: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateReportRequestModel extends Pick<ReportConfigModel, 'siteId'>{
  reciever: string;
  carboncopy: string;
  blindcarboncopy: string;
}

export interface UpdateReportRequestModel extends CreateReportRequestModel{
  id: number;
}

export interface DeleteReportRequestModel extends Pick<ReportConfigModel, 'id'>{

}

export interface ReportResponseModel {
  StatusCode: string;
  Message: string;
}

export interface ReportConfigResponseModel {
  status: string;
  data: ReportConfigModel[];
}