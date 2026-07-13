import { ToastMessageOptions } from "primeng/api";

export interface ToastStateModel{
    message: ToastMessageOptions
}

export interface ToastMessageModel{
    text: string;
    type: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';
}