import { createReducer, on } from '@ngrx/store';
import { ToastStateModel } from '../../shared/models/toast.model';
import { sendMessage } from '../actions/toaster.actions';


export const initialSiteState: ToastStateModel = {
  message: { 
    severity: 'info', 
    summary: 'Info', 
    detail: 'Message Content', 
    life: 3000 
  }
};

export const toastReducer = createReducer(
  initialSiteState,
  on(sendMessage, (state, { payload }) => ({ ...state, message: {
    ...state.message,
    severity: payload.type,
    detail: payload.text,
    summary: payload.type == 'info' ? 'Info' : payload.type == 'success' ? 'Success' : payload.type == 'warn' ? 'Warn': payload.type == 'error' ? 'Error' : payload.type == 'secondary' ? 'Secondary' : 'Contrast',
  } }))
);


