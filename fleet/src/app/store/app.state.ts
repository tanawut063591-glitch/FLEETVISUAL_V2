/*import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { navReducer } from './reducers/nav.reducer';
import { siteReducer } from './reducers/site.reducer';
import { dateReducer } from './reducers/date.reducer';
import { eventReducer } from './reducers/event.reducer';
import { overviewReducer } from '../features/central/store/reducers/overview.reducer';
import { trendReducer } from '../features/central/store/reducers/trend.reducer';
import { performanceReducer } from '../features/central/store/reducers/performance.reducer';
import { layoutReducer } from '../features/sites/store/reducers/layout.reducer';
import { dashboardReducer } from '../features/sites/store/reducers/dashboard.reducer';
import { efficiencyReducer } from '../features/sites/store/reducers/performance.reducer';
import { tagsReducer } from './reducers/tags.reducer';
import { diagramReducer } from '../features/sites/store/reducers/diagram.reducer';
import { toastReducer } from './reducers/toaster.reducer';
import { tabularReducer } from '../features/central/store/reducers/tabular.reducer';


@NgModule({
  imports: [
    StoreModule.forRoot({
      nav: navReducer,
      site: siteReducer,
      tags: tagsReducer,
      date: dateReducer,
      event: eventReducer,
      overview: overviewReducer,
      trend: trendReducer ,
      performance: performanceReducer,
      tabular: tabularReducer,
      layout: layoutReducer,
      dashboard: dashboardReducer,
      efficiency: efficiencyReducer,
      diagram: diagramReducer,
      toast: toastReducer
    })
    // or for feature module:
    // StoreModule.forFeature('nav', navReducer)
  ]
})
export class AppStateModule {}*/