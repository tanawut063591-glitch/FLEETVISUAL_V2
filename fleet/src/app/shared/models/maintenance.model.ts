// ─── Common ───────────────────────────────────────────────────────────────────

export interface MaintenanceResponse<T = any> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
}

// ─── Plants ───────────────────────────────────────────────────────────────────

export interface PlantModel {
    id: string;
    name: string;
    location?: string;
    [key: string]: any;
}

export interface GetPlantByIdRequest {
    id: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface MaintenanceUserModel {
    id: string | number;
    username: string;
    name?: string;
    Email?: string;
    email?: string;
    role?: string;
    [key: string]: any;
}

// ─── Work Orders ──────────────────────────────────────────────────────────────

export type WorkOrderStatus = 'draft' | 'assigned' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderType = 'preventive' | 'corrective' | 'inspection' | 'emergency';

export interface WorkOrderModel {
    id: number;
    wo_number: string;
    plant_id: string;
    created_by: string;
    assigned_to?: string;
    type: WorkOrderType;
    priority: WorkOrderPriority;
    status: WorkOrderStatus;
    title: string;
    description?: string;
    equipment_id?: string;
    due_date?: string;
    created_at?: string;
    updated_at?: string;
}

export interface GetWorkOrderByDateRequest {
    start_time: string;
    end_time: string;
}


export interface GetWorkOrderByIdRequest {
    id: number;
    start_time?: string;
    end_time?: string;
}

export interface GetWorkOrdersByPlantRequest {
    plant_id: string;
    start_time?: string;
    end_time?: string;
}

export interface GetWorkOrdersByStatusRequest {
    status: WorkOrderStatus;
    start_time?: string;
    end_time?: string;
}

export interface GetWorkOrdersByAssigneeRequest {
    assigned_to: string;
    start_time?: string;
    end_time?: string;
}

export interface GetWorkOrdersByDateRangeRequest {
    start_time?: string;
    end_time?: string;
}

export interface ChecklistInlineRequest {
    label: string;
    seq?: number;
    sub_label?: string;
}

export interface CreateWorkOrderRequest {
    plant_id: string;
    created_by: string;
    title: string;
    description?: string;
    type?: WorkOrderType;
    priority?: WorkOrderPriority;
    status?: WorkOrderStatus;
    assigned_to?: string;
    equipment_id?: string;
    due_date?: string;
    checklists?: ChecklistInlineRequest[];
}

export interface UpdateWorkOrderRequest {
    id: number;
    title?: string;
    description?: string;
    type?: WorkOrderType;
    priority?: WorkOrderPriority;
    assigned_to?: string | null;
    equipment_id?: string;
    due_date?: string;
}

export interface UpdateWorkOrderStatusRequest {
    id: number;
    status: WorkOrderStatus;
}

export interface DeleteWorkOrderRequest {
    id: number;
}

// ─── Checklists ───────────────────────────────────────────────────────────────

export interface ChecklistItemModel {
    id: number;
    work_order_id: number;
    seq: number;
    label: string;
    sub_label?: string;
    is_done: number;
    done_at?: string;
}

export interface GetChecklistsByWorkOrderRequest {
    work_order_id: number;
}

export interface CreateChecklistRequest {
    work_order_id: number;
    label: string;
    seq?: number;
    sub_label?: string;
}

export interface UpdateChecklistRequest {
    id: number;
    label?: string;
    seq?: number;
    sub_label?: string;
    is_done?: number;
}

export interface ToggleChecklistRequest {
    id: number;
}

export interface DeleteChecklistRequest {
    id: number;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export type FollowupAction = 'none' | 'monitor' | 'schedule_next' | 'escalate';

export interface WoReportModel {
    id: number;
    work_order_id: number;
    submitted_by: string;
    work_date: string;
    start_time?: string;
    end_time?: string;
    duration_min?: number;
    summary?: string;
    findings?: string;
    spare_parts_used?: string;
    report_path?: string;
    followup_action: FollowupAction;
    submitted_at?: string;
}

export interface GetReportByWorkOrderRequest {
    work_order_id: number;
}

export interface CreateWoReportRequest {
    work_order_id: number;
    submitted_by: string;
    work_date: string;
    start_time?: string;
    end_time?: string;
    duration_min?: number;
    summary?: string;
    findings?: string;
    spare_parts_used?: string;
    followup_action?: FollowupAction;
    file?: File;
}

export interface UpdateWoReportRequest {
    id: number;
    work_date?: string;
    start_time?: string;
    end_time?: string;
    duration_min?: number;
    summary?: string;
    findings?: string;
    spare_parts_used?: string;
    followup_action?: FollowupAction;
    file?: File;
}

export interface DeleteWoReportRequest {
    id: number;
}

// ─── Signatures ───────────────────────────────────────────────────────────────

export interface WoSignatureModel {
    id: number;
    work_order_id: number;
    signed_by: string;
    signer_name?: string;
    signature_data?: string;
    signed_at?: string;
}

export interface GetSignatureByWorkOrderRequest {
    work_order_id: number;
}

export interface CreateSignatureRequest {
    work_order_id: number;
    signed_by: string;
    signer_name?: string;
    signature_data?: string;
}

export interface DeleteSignatureRequest {
    id: number;
}

// ─── Maintenance Schedules ────────────────────────────────────────────────────

export type ScheduleTaskType = 'preventive' | 'inspection' | 'cleaning' | 'calibration' | 'other';
export type ScheduleRecurrence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface MaintenanceScheduleModel {
    id: number;
    plant_id: string;
    task_type: ScheduleTaskType;
    title: string;
    description?: string;
    recurrence: ScheduleRecurrence;
    next_due_date?: string;
    is_active: number;
}

export interface GetScheduleByIdRequest {
    id: number;
}

export interface GetSchedulesByPlantRequest {
    plant_id: string;
}

export interface CreateScheduleRequest {
    plant_id: string;
    title: string;
    task_type?: ScheduleTaskType;
    description?: string;
    recurrence?: ScheduleRecurrence;
    next_due_date?: string;
    is_active?: number;
}

export interface UpdateScheduleRequest {
    id: number;
    title?: string;
    task_type?: ScheduleTaskType;
    description?: string;
    recurrence?: ScheduleRecurrence;
    next_due_date?: string;
    is_active?: number;
}

export interface DeleteScheduleRequest {
    id: number;
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export interface MaintenanceLogModel {
    id: number;
    work_order_id?: number;
    wo_number?: string;
    action: string;
    from_status?: string;
    to_status?: string;
    user?: string;
    note?: string;
    timestamp?: string;
}

export interface GetLogsByWorkOrderRequest {
    work_order_id: number;
}

export interface GetLogsByDateRangeRequest {
    start_date?: string;
    end_date?: string;
}

export interface DeleteLogRequest {
    id: number;
}
