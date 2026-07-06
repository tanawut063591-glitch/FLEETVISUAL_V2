import { createReducer, on } from '@ngrx/store';
import { PageStateModel } from '../../../../shared/models/state.model';
import { PageConfigModel } from '../../../../shared/models/config.model';
import { GroupRequestAtTimeModel, GroupRequestHistorianModel, GroupRequestRealtimeModel } from '../../../../shared/models/request.model';
import { DataHistorianModel, DataRealtimeModel } from '../../../../shared/models/response.model';
import * as DiagramActions from '../actions/diagram.action';

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

export const diagramReducer = createReducer(
  initialState,

  // Timestamp Actions
  on(DiagramActions.loadDiagramConfigTimeStamp, (state, { timestamp }) => ({
    ...state,
    timestamp
  })),

  // Config Actions
  on(DiagramActions.loadDiagramConfigSuccess, (state, { config }) => ({
    ...state,
    config
  })),

  on(DiagramActions.loadDiagramConfigFailure, (state) => ({
    ...state,
    config: initialState.config
  })),

  // Realtime Data Actions
  on(DiagramActions.loadDiagramRealtimeData, (state, { requests }) => ({
    ...state,
    req_realtime: requests
  })),

  on(DiagramActions.loadDiagramRealtimeDataSuccess, (state, { data }) => ({
    ...state,
    data_realtime: data
  })),

  on(DiagramActions.loadDiagramRealtimeDataFailure, (state) => ({
    ...state,
    data_realtime: initialState.data_realtime
  })),

  // At Time Data Actions
  on(DiagramActions.loadDiagramAtTimeData, (state, { requests }) => ({
    ...state,
    req_attime: requests
  })),

  on(DiagramActions.loadDiagramAtTimeDataSuccess, (state, { data }) => ({
    ...state,
    data_realtime: { ...state.data_realtime, ...data }
  })),

  on(DiagramActions.loadDiagramAtTimeDataFailure, (state) => ({
    ...state
  })),

  // Historian Data Actions
  on(DiagramActions.loadDiagramHistorianData, (state, { requests }) => ({
    ...state,
    req_historian: requests
  })),

  on(DiagramActions.loadDiagramHistorianDataSuccess, (state, { data }) => ({
    ...state,
    data_historian: data
  })),

  on(DiagramActions.loadDiagramHistorianDataFailure, (state) => ({
    ...state,
    data_historian: initialState.data_historian
  })),

  // Chart Data Actions
  on(DiagramActions.loadDiagramChartDataSuccess, (state, { data }) => ({
    ...state,
    data_chart: data
  })),

  on(DiagramActions.loadDiagramChartDataFailure, (state) => ({
    ...state,
    data_chart: initialState.data_chart
  })),

  // Reset State
  on(DiagramActions.resetDiagramState, () => initialState)
);
