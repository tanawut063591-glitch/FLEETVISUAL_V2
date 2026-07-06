import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DateStateModel } from '../../shared/models/navigate.model';


export const selectDateState = createFeatureSelector<DateStateModel>('date');

export const getDateState = createSelector(
  selectDateState,
  (state: DateStateModel) => state
);

export const getDate = createSelector(
  selectDateState,
  (state: DateStateModel) => state.date
);

export const getDateEnable = createSelector(
  selectDateState,
  (state: DateStateModel) => state.enable
);