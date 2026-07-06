import { createReducer, on } from '@ngrx/store';
import { PageStateModel } from '../../../../shared/models/state.model';
import { PageConfigModel } from '../../../../shared/models/config.model';
import { GroupRequestAtTimeModel, GroupRequestHistorianModel, GroupRequestRealtimeModel } from '../../../../shared/models/request.model';
import { DataHistorianModel, DataRealtimeModel } from '../../../../shared/models/response.model';
import * as EfficiencyActions from '../actions/performance.action';

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

export const efficiencyReducer = createReducer(
  initialState,

  // Timestamp Actions
  on(EfficiencyActions.loadEfficiencyConfigTimeStamp, (state, { timestamp }) => ({
    ...state,
    timestamp
  })),

  // Config Actions
  on(EfficiencyActions.loadEfficiencyConfigSuccess, (state, { config }) => ({
    ...state,
    config
  })),

  on(EfficiencyActions.loadEfficiencyConfigFailure, (state) => ({
    ...state,
    config: initialState.config
  })),

  // Realtime Data Actions
  on(EfficiencyActions.loadEfficiencyRealtimeData, (state, { requests }) => ({
    ...state,
    req_realtime: requests
  })),

  on(EfficiencyActions.loadEfficiencyRealtimeDataSuccess, (state, { data }) => ({
    ...state,
    data_realtime: data
  })),

  on(EfficiencyActions.loadEfficiencyRealtimeDataFailure, (state) => ({
    ...state,
    data_realtime: initialState.data_realtime
  })),

  // At Time Data Actions
  on(EfficiencyActions.loadEfficiencyAtTimeData, (state, { requests }) => ({
    ...state,
    req_attime: requests
  })),

  on(EfficiencyActions.loadEfficiencyAtTimeDataSuccess, (state, { data }) => ({
    ...state,
    data_realtime: { ...state.data_realtime, ...data }
  })),

  on(EfficiencyActions.loadEfficiencyAtTimeDataFailure, (state) => ({
    ...state
  })),

  // Historian Data Actions
  on(EfficiencyActions.loadEfficiencyHistorianData, (state, { requests }) => ({
    ...state,
    req_historian: requests
  })),

  on(EfficiencyActions.loadEfficiencyHistorianDataSuccess, (state, { data }) => ({
    ...state,
    data_historian: data
  })),

  on(EfficiencyActions.loadEfficiencyHistorianDataFailure, (state) => ({
    ...state,
    data_historian: initialState.data_historian
  })),

  // Chart Data Actions
  on(EfficiencyActions.loadEfficiencyChartDataSuccess, (state, { data }) => ({
    ...state,
    data_chart: data
  })),

  on(EfficiencyActions.loadEfficiencyChartDataFailure, (state) => ({
    ...state,
    data_chart: initialState.data_chart
  })),

  // Reset State
  on(EfficiencyActions.resetEfficiencyState, () => initialState)
);
