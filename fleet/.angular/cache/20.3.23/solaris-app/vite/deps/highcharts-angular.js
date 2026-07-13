import {
  isPlatformServer
} from "./chunk-TRDCCLPD.js";
import "./chunk-WT4MODDA.js";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  makeEnvironmentProviders,
  model,
  output,
  setClassMetadata,
  signal,
  untracked,
  ɵɵHostDirectivesFeature,
  ɵɵdefineComponent,
  ɵɵdefineDirective,
  ɵɵdefineInjectable
} from "./chunk-5PYD7ZWX.js";
import "./chunk-HWYXSU2G.js";
import "./chunk-JRFR6BLO.js";
import "./chunk-MARUHEWW.js";
import "./chunk-PCCZHGCK.js";

// node_modules/highcharts-angular/fesm2022/highcharts-angular.mjs
var HIGHCHARTS_LOADER = new InjectionToken("HIGHCHARTS_LOADER");
var HIGHCHARTS_ROOT_MODULES = new InjectionToken("HIGHCHARTS_ROOT_MODULES");
var HIGHCHARTS_OPTIONS = new InjectionToken("HIGHCHARTS_OPTIONS");
var HIGHCHARTS_CONFIG = new InjectionToken("HIGHCHARTS_CONFIG");
var HIGHCHARTS_TIMEOUT = new InjectionToken("HIGHCHARTS_TIMEOUT");
var _HighchartsChartService = class _HighchartsChartService {
  constructor() {
    this.highcharts = signal(null);
    this.loader = inject(HIGHCHARTS_LOADER);
    this.globalOptions = inject(HIGHCHARTS_OPTIONS, {
      optional: true
    });
    this.globalModules = inject(HIGHCHARTS_ROOT_MODULES, {
      optional: true
    });
  }
  async loadHighchartsWithModules(partialConfig) {
    const highcharts = await this.loader();
    await Promise.allSettled([...this.globalModules?.() ?? [], ...partialConfig?.modules?.() ?? []]);
    return highcharts;
  }
  load(partialConfig) {
    this.loadHighchartsWithModules(partialConfig).then((highcharts) => {
      if (this.globalOptions) {
        highcharts.setOptions(this.globalOptions);
      }
      this.highcharts.set(highcharts);
    });
  }
};
_HighchartsChartService.ɵfac = function HighchartsChartService_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _HighchartsChartService)();
};
_HighchartsChartService.ɵprov = ɵɵdefineInjectable({
  token: _HighchartsChartService,
  factory: _HighchartsChartService.ɵfac,
  providedIn: "root"
});
var HighchartsChartService = _HighchartsChartService;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(HighchartsChartService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();
var _HighchartsChartDirective = class _HighchartsChartDirective {
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  keepChartUpToDate() {
    effect(async () => {
      const update = this.update();
      const oneToOne = this.oneToOne();
      const options = this.options();
      this._chartInstance = await this.chart();
      if (!this.chartCreated) {
        if (this._chartInstance) {
          this.chartCreated = true;
        }
      } else {
        if (update) {
          this._chartInstance?.update(options, true, oneToOne);
        }
      }
    });
  }
  constructor() {
    this.constructorType = input("chart");
    this.oneToOne = input(false);
    this.options = input.required();
    this.update = model(true);
    this.chartInstance = output();
    this.destroyRef = inject(DestroyRef);
    this.el = inject(ElementRef);
    this.platformId = inject(PLATFORM_ID);
    this.relativeConfig = inject(HIGHCHARTS_CONFIG, {
      optional: true
    });
    this.timeout = inject(HIGHCHARTS_TIMEOUT, {
      optional: true
    });
    this.highchartsChartService = inject(HighchartsChartService);
    this.chartCreated = false;
    this.chart = computed(async () => {
      const highCharts = this.highchartsChartService.highcharts();
      const constructorType = this.constructorType();
      await this.delay(this.relativeConfig?.timeout ?? this.timeout ?? 500);
      if (!highCharts) return;
      const callback = (chart) => {
        return this.chartInstance.emit(chart);
      };
      const chartFactories = {
        chart: highCharts.chart,
        ganttChart: highCharts.ganttChart,
        mapChart: highCharts.mapChart,
        stockChart: highCharts.stockChart
      };
      return chartFactories[constructorType](
        this.el.nativeElement,
        // Use untracked, so we don't re-create new chart everytime options change
        untracked(() => this.options()),
        // Use Highcharts callback to emit chart instance, so it is available as early
        // as possible. So that Angular is already aware of the instance if Highcharts raise
        // events during the initialization that happens before coming back to Angular
        callback
      );
    });
    if (this.platformId && isPlatformServer(this.platformId)) {
      return;
    }
    this.highchartsChartService.load(this.relativeConfig);
    this.destroyRef.onDestroy(() => {
      this._chartInstance?.destroy();
      this._chartInstance = void 0;
    });
    this.keepChartUpToDate();
  }
};
_HighchartsChartDirective.ɵfac = function HighchartsChartDirective_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _HighchartsChartDirective)();
};
_HighchartsChartDirective.ɵdir = ɵɵdefineDirective({
  type: _HighchartsChartDirective,
  selectors: [["", "highchartsChart", ""]],
  inputs: {
    constructorType: [1, "constructorType"],
    oneToOne: [1, "oneToOne"],
    options: [1, "options"],
    update: [1, "update"]
  },
  outputs: {
    update: "updateChange",
    chartInstance: "chartInstance"
  }
});
var HighchartsChartDirective = _HighchartsChartDirective;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(HighchartsChartDirective, [{
    type: Directive,
    args: [{
      selector: "[highchartsChart]"
    }]
  }], () => [], null);
})();
var _HighchartsChartComponent = class _HighchartsChartComponent {
};
_HighchartsChartComponent.ɵfac = function HighchartsChartComponent_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _HighchartsChartComponent)();
};
_HighchartsChartComponent.ɵcmp = ɵɵdefineComponent({
  type: _HighchartsChartComponent,
  selectors: [["highcharts-chart"]],
  features: [ɵɵHostDirectivesFeature([{
    directive: HighchartsChartDirective,
    inputs: ["constructorType", "constructorType", "oneToOne", "oneToOne", "options", "options", "update", "update"],
    outputs: ["chartInstance", "chartInstance", "updateChange", "updateChange"]
  }])],
  decls: 0,
  vars: 0,
  template: function HighchartsChartComponent_Template(rf, ctx) {
  },
  encapsulation: 2,
  changeDetection: 0
});
var HighchartsChartComponent = _HighchartsChartComponent;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(HighchartsChartComponent, [{
    type: Component,
    args: [{
      selector: "highcharts-chart",
      template: "",
      hostDirectives: [{
        directive: HighchartsChartDirective,
        inputs: ["constructorType", "oneToOne", "options", "update"],
        outputs: ["chartInstance", "updateChange"]
      }],
      changeDetection: ChangeDetectionStrategy.OnPush
    }]
  }], null, null);
})();
var emptyModuleFactoryFunction = () => [];
var defaultInstanceFactoryFunction = () => import("./highcharts_esm_highcharts.js").then((m) => m.default);
function provideHighchartsInstance(instance) {
  return makeEnvironmentProviders([{
    provide: HIGHCHARTS_LOADER,
    useValue: instance ?? defaultInstanceFactoryFunction
  }]);
}
function provideHighchartsOptions(options) {
  return makeEnvironmentProviders([{
    provide: HIGHCHARTS_OPTIONS,
    useValue: options
  }]);
}
function provideHighchartsRootModules(modules) {
  return makeEnvironmentProviders([{
    provide: HIGHCHARTS_ROOT_MODULES,
    useValue: modules
  }]);
}
function providePartialHighcharts(config) {
  return {
    provide: HIGHCHARTS_CONFIG,
    useValue: config
  };
}
function provideHighcharts(config = {}) {
  const providers = [provideHighchartsInstance(config.instance), provideHighchartsRootModules(config.modules ?? emptyModuleFactoryFunction), {
    provide: HIGHCHARTS_TIMEOUT,
    useValue: config.timeout
  }];
  if (config.options) {
    providers.push(provideHighchartsOptions(config.options));
  }
  return makeEnvironmentProviders(providers);
}
export {
  HighchartsChartComponent,
  HighchartsChartDirective,
  provideHighcharts,
  providePartialHighcharts
};
//# sourceMappingURL=highcharts-angular.js.map
