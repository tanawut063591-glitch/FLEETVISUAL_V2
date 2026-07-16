import {
  isPlatformServer
} from "./chunk-LWHMQREU.js";
import "./chunk-XVQ4GNIA.js";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  PendingTasks,
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
} from "./chunk-M2DAZTYR.js";
import "./chunk-HWYXSU2G.js";
import "./chunk-JRFR6BLO.js";
import "./chunk-MARUHEWW.js";
import "./chunk-GDDGRWFQ.js";

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
    this.sharedHighchartsPromise = null;
    this.moduleLoadCache = /* @__PURE__ */ new WeakMap();
  }
  async loadModules(modulesFactory) {
    if (!modulesFactory) {
      return;
    }
    const cachedLoad = this.moduleLoadCache.get(modulesFactory);
    if (cachedLoad) {
      return cachedLoad;
    }
    const moduleLoad = Promise.allSettled(modulesFactory()).then((moduleResults) => {
      const rejectedModules = moduleResults.filter((result) => result.status === "rejected");
      if (rejectedModules.length) {
        const reasons = rejectedModules.map(({
          reason
        }) => reason instanceof Error ? reason.message : String(reason));
        throw new Error(`Failed to load Highcharts modules: ${reasons.join("; ")}`);
      }
    });
    this.moduleLoadCache.set(modulesFactory, moduleLoad);
    moduleLoad.catch(() => {
      if (this.moduleLoadCache.get(modulesFactory) === moduleLoad) {
        this.moduleLoadCache.delete(modulesFactory);
      }
    });
    return moduleLoad;
  }
  async ensureSharedHighcharts() {
    if (!this.sharedHighchartsPromise) {
      const load = (async () => {
        const highcharts = await this.loader();
        await this.loadModules(this.globalModules);
        if (this.globalOptions) {
          highcharts.setOptions(this.globalOptions);
        }
        return highcharts;
      })();
      this.sharedHighchartsPromise = load;
      load.catch(() => {
        if (this.sharedHighchartsPromise === load) {
          this.sharedHighchartsPromise = null;
        }
      });
    }
    return this.sharedHighchartsPromise;
  }
  async load(partialConfig) {
    const highcharts = await this.ensureSharedHighcharts();
    await this.loadModules(partialConfig?.modules);
    this.highcharts.set(highcharts);
    return highcharts;
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
  getChartFactory(highcharts, constructorType) {
    if (constructorType === "chart") {
      return highcharts.chart;
    }
    const highchartsWithModuleConstructors = highcharts;
    const chartFactory = highchartsWithModuleConstructors[constructorType];
    if (!chartFactory) {
      throw new Error(`Highcharts constructor "${constructorType}" is not available. Did you load the required module?`);
    }
    return chartFactory;
  }
  createChart() {
    effect((onCleanup) => {
      const highcharts = this.loadedHighcharts();
      const constructorType = this.constructorType();
      if (!highcharts || this.isDestroyed) {
        return;
      }
      const callback = (chart2) => {
        if (chart2.renderer.forExport || this.isDestroyed) return;
        return this.chartInstance.emit(chart2);
      };
      const chart = this.getChartFactory(highcharts, constructorType)(
        this.el.nativeElement,
        // Read options without tracking them here: option changes should update
        // the existing chart, not tear it down and create a new one.
        untracked(() => this.options()),
        callback
      );
      this.chart.set(chart);
      onCleanup(() => {
        if (this.chart() === chart) {
          this.chart.set(null);
        }
        chart.destroy();
      });
    });
  }
  keepChartUpToDate() {
    let lastChart = null;
    effect(() => {
      const chart = this.chart();
      const update = this.update();
      const oneToOne = this.oneToOne();
      const options = this.options();
      if (!chart) {
        return;
      }
      if (chart !== lastChart) {
        lastChart = chart;
        return;
      }
      if (update) {
        chart.update(options, true, oneToOne);
      }
    });
  }
  async initializeHighcharts() {
    await this.pendingTasks.run(async () => {
      try {
        const highcharts = await this.highchartsChartService.load(this.relativeConfig);
        const delayMs = this.relativeConfig?.timeout ?? this.timeout ?? 0;
        if (delayMs > 0) {
          await this.delay(delayMs);
        }
        if (!this.isDestroyed) {
          this.loadedHighcharts.set(highcharts);
        }
      } catch (error) {
        console.error("Highcharts failed to load; chart was not created.", error);
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
    this.pendingTasks = inject(PendingTasks);
    this.loadedHighcharts = signal(null);
    this.chart = signal(null);
    this.isDestroyed = false;
    if (this.platformId && isPlatformServer(this.platformId)) {
      return;
    }
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
    });
    this.createChart();
    this.keepChartUpToDate();
    void this.initializeHighcharts();
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
