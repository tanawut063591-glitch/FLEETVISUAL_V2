import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TagsStateModel } from '../../shared/models/tags.model';

export const selectTagsState = createFeatureSelector<TagsStateModel>('tags');

export const getAllTagsGroup = createSelector(
  selectTagsState,
  (state: TagsStateModel) => state
);

export const getTagsGroupWithName = (name: string) => createSelector(
  selectTagsState,
  (state: TagsStateModel) => state.name === name ? state.tags : []
);