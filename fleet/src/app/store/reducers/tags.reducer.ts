import { createReducer, on } from '@ngrx/store';
import { SiteStateModel } from '../../shared/models/config.model';
import { TagsStateModel } from '../../shared/models/tags.model';
import { resetTags, setTags, updateTags } from '../actions/tags.actions';

export const initialState: TagsStateModel = {
  name: '',
  tags: []
};

export const tagsReducer = createReducer(
  initialState,
  on(setTags, (state, { payload }) => ({ ...payload })),
  on(updateTags, (state, { payload }) => ({ ...payload })),
  on(resetTags, () => initialState)
);


