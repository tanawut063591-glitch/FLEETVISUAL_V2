import { createFeatureSelector, createSelector } from '@ngrx/store';
import { NavbarStateModel } from '../../shared/models/navigate.model';


export const selectNavState = createFeatureSelector<NavbarStateModel>('nav');

export const getState = createSelector(
  selectNavState,
  (state: NavbarStateModel) => state
);

export const getLastLocation = createSelector(
  selectNavState,
  (state: NavbarStateModel) => state.location
);

export const getNavState = createSelector(
  selectNavState,
  (state: NavbarStateModel) => state
);