import { createReducer, on } from '@ngrx/store';
import { DateStateModel } from '../../shared/models/navigate.model';
import { setDate, setDateEnable } from '../actions/date.actions';

export const initialSiteState: DateStateModel = {
  enable: false,
  date: new Date()
};

export const dateReducer = createReducer(
  initialSiteState,
  on(setDate, (state, { payload }) => ({ ...state, date: payload })),
  on(setDateEnable, (state, { payload }) => ({ ...state, enable: payload }))
);


