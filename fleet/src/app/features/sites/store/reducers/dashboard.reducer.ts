import { createReducer, on } from '@ngrx/store';
import { PageStateModel } from '../../../../shared/models/state.model';
import { PageConfigModel } from '../../../../shared/models/config.model';
import { GroupRequestAtTimeModel, GroupRequestHistorianModel, GroupRequestRealtimeModel } from '../../../../shared/models/request.model';
import { DataHistorianModel, DataRealtimeModel } from '../../../../shared/models/response.model';
import * as DashboardActions from '../actions/dashboard.action';

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

export const dashboardReducer = createReducer(
  initialState,

  // Timestamp Actions
  on(DashboardActions.loadDashboardConfigTimeStamp, (state, { timestamp }) => ({
    ...state,
    timestamp
  })),

  // Config Actions
  on(DashboardActions.loadDashboardConfigSuccess, (state, { config }) => ({
    ...state,
    config
  })),

  on(DashboardActions.loadDashboardConfigFailure, (state) => ({
    ...state,
    config: initialState.config
  })),

  // Realtime Data Actions
  on(DashboardActions.loadDashboardRealtimeData, (state, { requests }) => ({
    ...state,
    req_realtime: requests
  })),

  on(DashboardActions.loadDashboardRealtimeDataSuccess, (state, { data }) => ({
    ...state,
    data_realtime: data
  })),

  on(DashboardActions.loadDashboardRealtimeDataFailure, (state) => ({
    ...state,
    data_realtime: initialState.data_realtime
  })),

  // At Time Data Actions
  on(DashboardActions.loadDashboardAtTimeData, (state, { requests }) => ({
    ...state,
    req_attime: requests
  })),

  on(DashboardActions.loadDashboardAtTimeDataSuccess, (state, { data }) => ({
    ...state,
    data_realtime: { ...state.data_realtime, ...data }
  })),

  on(DashboardActions.loadDashboardAtTimeDataFailure, (state) => ({
    ...state
  })),

  // Historian Data Actions
  on(DashboardActions.loadDashboardHistorianData, (state, { requests }) => ({
    ...state,
    req_historian: requests
  })),

  on(DashboardActions.loadDashboardHistorianDataSuccess, (state, { data }) => ({
    ...state,
    data_historian: data
  })),

  on(DashboardActions.loadDashboardHistorianDataFailure, (state) => ({
    ...state,
    data_historian: initialState.data_historian
  })),

  // Chart Data Actions
  on(DashboardActions.loadDashboardChartDataSuccess, (state, { data }) => ({
    ...state,
    data_chart: data
  })),

  on(DashboardActions.loadDashboardChartDataFailure, (state) => ({
    ...state,
    data_chart: initialState.data_chart
  })),

  // Reset State
  on(DashboardActions.resetDashboardState, () => initialState)
);
