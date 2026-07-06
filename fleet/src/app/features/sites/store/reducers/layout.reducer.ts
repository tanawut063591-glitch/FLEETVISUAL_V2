import { createReducer, on } from '@ngrx/store';
import { PageStateModel } from '../../../../shared/models/state.model';
import { PageConfigModel } from '../../../../shared/models/config.model';
import { GroupRequestAtTimeModel, GroupRequestHistorianModel, GroupRequestRealtimeModel } from '../../../../shared/models/request.model';
import { DataHistorianModel, DataRealtimeModel } from '../../../../shared/models/response.model';
import * as LayoutActions from '../actions/layout.action';

// Initial state using PageStateModel structure
const initialState: PageStateModel = {
  config: {
    realtimeConfig: [],
    historianConfig: [],
    chartConfig: []
  } as PageConfigModel,
  req_realtime: [] as GroupRequestRealtimeModel[],
  req_attime: [] as GroupRequestAtTimeModel[],
  req_historian: [] as GroupRequestHistorianModel[],
  data_chart: null,
  data_realtime: {} as DataRealtimeModel,
  data_historian: {} as DataHistorianModel,
  timestamp: new Date()
};

export const layoutReducer = createReducer(
  initialState,

  // Timestamp Actions
  on(LayoutActions.loadLayoutConfigTimeStamp, (state, { timestamp }) => ({
    ...state,
    timestamp
  })),

  // Config Actions
  on(LayoutActions.loadLayoutConfigSuccess, (state, { config }) => ({
    ...state,
    config
  })),

  on(LayoutActions.loadLayoutConfigFailure, (state) => ({
    ...state,
    config: initialState.config
  })),

  // Realtime Data Actions
  on(LayoutActions.loadLayoutRealtimeData, (state, { requests }) => ({
    ...state,
    req_realtime: requests
  })),

  on(LayoutActions.loadLayoutRealtimeDataSuccess, (state, { data }) => ({
    ...state,
    data_realtime: data
  })),

  on(LayoutActions.loadLayoutRealtimeDataFailure, (state) => ({
    ...state,
    data_realtime: initialState.data_realtime
  })),

  // At Time Data Actions
  on(LayoutActions.loadLayoutAtTimeData, (state, { requests }) => ({
    ...state,
    req_attime: requests
  })),

  on(LayoutActions.loadLayoutAtTimeDataSuccess, (state, { data }) => ({
    ...state,
    data_realtime: { ...state.data_realtime, ...data }
  })),

  on(LayoutActions.loadLayoutAtTimeDataFailure, (state) => ({
    ...state
  })),

  // Historian Data Actions
  on(LayoutActions.loadLayoutHistorianData, (state, { requests }) => ({
    ...state,
    req_historian: requests
  })),

  on(LayoutActions.loadLayoutHistorianDataSuccess, (state, { data }) => ({
    ...state,
    data_historian: data
  })),

  on(LayoutActions.loadLayoutHistorianDataFailure, (state) => ({
    ...state,
    data_historian: initialState.data_historian
  })),

  // Chart Data Actions
  on(LayoutActions.loadLayoutChartDataSuccess, (state, { data }) => ({
    ...state,
    data_chart: data
  })),

  on(LayoutActions.loadLayoutChartDataFailure, (state) => ({
    ...state,
    data_chart: initialState.data_chart
  })),

  // Reset State
  on(LayoutActions.resetLayoutState, () => initialState)
);
