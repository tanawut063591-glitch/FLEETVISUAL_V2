import { createReducer, on } from '@ngrx/store';
import { setSite } from '../actions/site.actions';
import { SiteStateModel } from '../../shared/models/config.model';

export const initialSiteState: SiteStateModel = {
  name: '',
  number: 0,
  capacity: '',
  zoneList: []
};

export const siteReducer = createReducer(
  initialSiteState,
  on(setSite, (state, { payload }) => ({ ...payload }))
);


