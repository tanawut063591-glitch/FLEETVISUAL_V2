import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import type Highcharts from 'highcharts';

export interface PremiumPieChartPoint {
  name: string;
  value: number;
  displayValue?: number;
  percentageValue?: number;
  color?: string;
}

@Component({
  selector: 'app-premium-pie-chart',
  standalone: false,
  templateUrl: './premium-pie-chart.component.html',
  styleUrls: ['./premium-pie-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PremiumPieChartComponent implements OnInit, OnChanges, OnDestroy {
  @Input() title = '';
  @Input() eyebrow = 'MODE ANALYTICS';
  @Input() unit = '';
  @Input() data: readonly PremiumPieChartPoint[] = [];
  @Input() height = 350;
  @Input() decimalPlaces = 2;
  @Input() emptyText = 'No data available for this period.';

  chartOptions: Highcharts.Options = {};
  updateChart = false;
  hasData = false;

  private appearanceObserver: MutationObserver | null = null;

  private readonly paletteVariables = [
    '--report-mode-1',
    '--report-mode-2',
    '--report-mode-3',
    '--report-mode-4',
    '--report-mode-5',
    '--report-mode-6',
    '--report-mode-7',
    '--report-mode-8',
    '--report-mode-9',
    '--report-mode-10',
    '--report-mode-11',
    '--report-mode-12',
    '--report-mode-13',
    '--report-mode-14',
    '--report-mode-15',
    '--report-mode-16',
  ] as const;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.rebuildChart();
    this.observeAppearanceTokens();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['data'] ||
      changes['title'] ||
      changes['unit'] ||
      changes['height'] ||
      changes['decimalPlaces']
    ) {
      this.rebuildChart();
    }
  }

  ngOnDestroy(): void {
    this.appearanceObserver?.disconnect();
    this.appearanceObserver = null;
  }

  private observeAppearanceTokens(): void {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }

    this.appearanceObserver = new MutationObserver(() => {
      this.rebuildChart();
      this.changeDetector.markForCheck();
    });

    this.appearanceObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
  }

  private rebuildChart(): void {
    const palette = this.paletteVariables.map((name) => this.readCssVariable(name, 'currentColor'));
    const points = (this.data ?? [])
      .filter((item) => item && Number.isFinite(Number(item.value)) && Number(item.value) > 0)
      .map((item, index) => ({
        name: item.name,
        y: Number(item.value),
        color: item.color ? this.resolveCssColor(item.color) : palette[index % palette.length],
        custom: {
          displayValue: Number.isFinite(Number(item.displayValue))
            ? Number(item.displayValue)
            : Number(item.value),
          percentageValue: Number.isFinite(Number(item.percentageValue))
            ? Number(item.percentageValue)
            : null,
        },
      }));

    this.hasData = points.length > 0;

    const denseChart = points.length >= 10;
    const textColor = this.readCssVariable('--report-pie-text', this.readCssVariable('--primary-txt', 'currentColor'));
    const mutedColor = this.readCssVariable('--report-pie-muted', this.readCssVariable('--muted-txt', 'currentColor'));
    const connectorColor = this.readCssVariable('--report-pie-connector', this.readCssVariable('--border-color', 'currentColor'));
    const borderColor = this.readCssVariable('--report-pie-border', this.readCssVariable('--card-bg', 'transparent'));
    const tooltipBackground = this.readCssVariable('--report-pie-tooltip-bg', this.readCssVariable('--card-bg', 'transparent'));
    const tooltipBorder = this.readCssVariable('--report-pie-tooltip-border', this.readCssVariable('--border-color', 'currentColor'));
    const tooltipShadow = this.readCssVariable('--report-pie-tooltip-shadow', 'transparent');
    const decimals = Math.max(0, Math.min(4, Math.floor(this.decimalPlaces)));
    const unitSuffix = this.unit ? ` ${this.unit}` : '';

    this.chartOptions = {
      chart: {
        type: 'pie',
        height: Math.max(250, this.height),
        backgroundColor: 'transparent',
        spacingTop: 14,
        spacingRight: 34,
        spacingBottom: 14,
        spacingLeft: 34,
        animation: {
          duration: 700,
        },
        style: {
          fontFamily: 'inherit',
        },
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      exporting: {
        enabled: false,
      },
      accessibility: {
        enabled: false,
      },
      tooltip: {
        useHTML: true,
        backgroundColor: tooltipBackground,
        borderColor: tooltipBorder,
        borderRadius: 8,
        borderWidth: 1,
        padding: 10,
        shadow: {
          color: tooltipShadow,
          offsetX: 0,
          offsetY: 6,
          opacity: 0.2,
          width: 10,
        },
        formatter: function (): string {
          const point = this as unknown as Highcharts.Point;
          const custom = (point.options as any)?.custom || {};
          const percentage = Number.isFinite(Number(custom.percentageValue))
            ? Number(custom.percentageValue)
            : Number(point.percentage) || 0;
          const value = Number.isFinite(Number(custom.displayValue))
            ? Number(custom.displayValue)
            : Number(point.y) || 0;
          return [
            `<div style="min-width:140px;color:${textColor};font-size:12px;line-height:1.45">`,
            `<div style="font-weight:800;margin-bottom:4px">${point.name}</div>`,
            `<div style="color:${mutedColor}">${value.toLocaleString(undefined, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}${unitSuffix}</div>`,
            `<div style="font-weight:900;margin-top:2px">${percentage.toFixed(decimals)}%</div>`,
            `</div>`,
          ].join('');
        },
      },
      plotOptions: {
        pie: {
          animation: {
            duration: 850,
          },
          allowPointSelect: true,
          cursor: 'pointer',
          borderColor,
          borderWidth: 3,
          slicedOffset: 18,
          size: denseChart ? '70%' : '78%',
          center: ['50%', '50%'],
          dataLabels: {
            enabled: true,
            distance: denseChart ? 14 : 20,
            connectorColor,
            connectorWidth: 1,
            softConnector: true,
            crop: false,
            overflow: 'allow',
            padding: 3,
            style: {
              color: textColor,
              fontSize: denseChart ? '10px' : '11px',
              fontWeight: '600',
              textOutline: 'none',
            },
            formatter: function (): string {
              const point = this as unknown as Highcharts.Point;
              const custom = (point.options as any)?.custom || {};
              const percentage = Number.isFinite(Number(custom.percentageValue))
                ? Number(custom.percentageValue)
                : Number(point.percentage) || 0;
              // Dense 12-16 mode reports keep tiny slices available via tooltip,
              // but do not print every sub-2% label on top of neighbouring labels.
              if (denseChart && percentage < 2) return '';
              return `${point.name}: ${percentage.toFixed(decimals)}%`;
            },
          },
          states: {
            hover: {
              brightness: 0.06,
              halo: {
                opacity: 0.08,
                size: 6,
              },
            },
            inactive: {
              opacity: 0.45,
            },
          },
          point: {
            events: {
              click: function (): void {
                const point = this as Highcharts.Point;
                const series = point.series;

                series.points.forEach((item) => {
                  if (item !== point && item.selected) {
                    item.select(false, false);
                  }
                });
              },
            },
          },
        },
      },
      responsive: {
        rules: [
          {
            condition: { maxWidth: 900 },
            chartOptions: {
              chart: {
                height: Math.max(285, Math.min(this.height, 310)),
                spacingTop: 10,
                spacingRight: 24,
                spacingBottom: 10,
                spacingLeft: 24,
              },
              plotOptions: {
                pie: {
                  size: denseChart ? '66%' : '72%',
                  dataLabels: {
                    distance: denseChart ? 10 : 14,
                    padding: 2,
                    style: {
                      fontSize: denseChart ? '9px' : '10px',
                      fontWeight: '600',
                      textOutline: 'none',
                    },
                  },
                },
              },
            },
          },
          {
            condition: { maxWidth: 520 },
            chartOptions: {
              chart: {
                height: 292,
                spacingTop: 8,
                spacingRight: 16,
                spacingBottom: 8,
                spacingLeft: 16,
              },
              plotOptions: {
                pie: {
                  size: denseChart ? '58%' : '64%',
                  slicedOffset: 10,
                  dataLabels: {
                    distance: 8,
                    padding: 1,
                    connectorWidth: 1,
                    style: {
                      fontSize: '9px',
                      fontWeight: '600',
                      textOutline: 'none',
                    },
                  },
                },
              },
            },
          },
        ],
      },
      series: this.hasData
        ? [
            {
              type: 'pie',
              name: this.title || 'Distribution',
              data: points,
            },
          ]
        : [],
    };

    this.updateChart = true;
  }

  private readCssVariable(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  private resolveCssColor(value: string): string {
    const match = value.trim().match(/^var\((--[^,)]+)(?:,[^)]+)?\)$/);
    return match ? this.readCssVariable(match[1], 'currentColor') : value;
  }
}
