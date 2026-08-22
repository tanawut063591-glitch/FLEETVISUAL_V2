export interface MasterDataResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface PlantInformationModel {
  id: number;
  enable: number;
  siteid: string;
  name?: string;
  project?: string;
  location?: string;
  company?: string;
  company_th?: string;
  branch?: string;
  address?: string;
  address_th?: string;
  taxid?: string;
  position_lat?: number;
  position_long?: number;
  capacity?: number;
  cod?: string;
  group?: string;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface CreatePlantRequest extends Partial<PlantInformationModel> {
  siteid: string;
}

export interface UpdatePlantRequest extends Partial<PlantInformationModel> {
  id: number;
}

export interface FindPlantByIdRequest {
  id: number;
}

export interface FindPlantBySiteRequest {
  siteid: string;
}

export interface TogglePlantRequest {
  id: number;
  enable: boolean;
}

export interface DeletePlantRequest {
  id: number;
  hard?: boolean;
}

export interface PlantSlaModel {
  id: number;
  siteid: string;
  timestamp: string;
  energy_delivery?: number;
  availability?: number;
  performance?: number;
  capex?: number;
  opex?: number;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface CreateSlaRequest extends Partial<PlantSlaModel> {
  siteid: string;
  timestamp: string;
}

export interface UpdateSlaRequest extends Partial<PlantSlaModel> {
  id: number;
}

export interface FindSlaByIdRequest {
  id: number;
}

export interface FindSlaBySiteRequest {
  siteid: string;
  year?: number;
}

export interface FindSlaByDateRequest {
  start_time?: string;
  end_time?: string;
  siteid?: string;
}

export interface DeleteSlaRequest {
  id: number;
}

export interface PlantDiagramModel {
  id: number;
  siteid: string;
  path: string;
  file_type?: string;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface FindDiagramByIdRequest {
  id: number;
}

export interface FindDiagramsBySiteRequest {
  siteid: string;
}

export interface DeleteDiagramRequest {
  id: number;
}

export interface DownloadDiagramRequest {
  id: number;
}
