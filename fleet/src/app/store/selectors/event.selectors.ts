import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EventSummaryModel } from '../../features/sites/models/event.model';

export const selectEventState = createFeatureSelector<EventSummaryModel[]>('event');

export const getEventSummary = createSelector(
  selectEventState,
  (state: EventSummaryModel[]) => state
);

export const getEventBySite = (siteId: string) => createSelector(
  selectEventState,
  (state: EventSummaryModel[]) => state.find(x => x.PointSource === siteId)
);
