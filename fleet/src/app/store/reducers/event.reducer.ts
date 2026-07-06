import { createReducer, on } from '@ngrx/store';
import { EventSummaryModel } from '../../features/sites/models/event.model';
import { setEventSummary, clearEventSummary } from '../actions/event.actions';

export const initialState: EventSummaryModel[] = [];

export const eventReducer = createReducer(
  initialState,
  on(setEventSummary, (state, { payload }) => payload),
  on(clearEventSummary, () => [])
);
