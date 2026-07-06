import { createReducer, on } from '@ngrx/store';
import { NavbarStateModel } from '../../shared/models/navigate.model';
import { addState } from '../actions/nav.actions';


export const initialState: NavbarStateModel = {
  name: '',
  location: ''
};

export const navReducer = createReducer(
  initialState,
  on(addState, (state, { payload }) => ({
    ...state,
    ...payload
  }))
);