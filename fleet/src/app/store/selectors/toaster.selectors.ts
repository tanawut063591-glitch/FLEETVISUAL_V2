import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ToastStateModel } from '../../shared/models/toast.model';


export const selectToastState = createFeatureSelector<ToastStateModel>('toast');

export const getToastState = createSelector(
  selectToastState,
  (state: ToastStateModel) => state
);