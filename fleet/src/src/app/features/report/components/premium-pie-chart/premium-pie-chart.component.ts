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

  private themeObserver: MutationObserver | null = null;

  private readonly palette = [
    '#63B5D8',
    '#6593DA',
    '#6674D9',
    '#7C63D9',
    '#9D60D9',
    '#C25DD7',
    '#DB61BF',
    '#4CB7A5',
  ] as const;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.rebuildChart();
    this.observeTheme();
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
    this.themeObserver?.disconnect();
    this.themeObserver = null;
  }

  private observeTheme(): void {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }

    this.themeObserver = new MutationObserver(() => {
      this.rebuildChart();
      this.changeDetector.markForCheck();
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
  }

  private rebuildChart(): void {
    const points = (this.data ?? [])
      .filter((item) => item && Number.isFinite(Number(item.value)) && Number(item.value) > 0)
      .map((item, index) => ({
        name: item.name,
        y: Number(item.value),
        color: item.color || this.palette[index % this.palette.length],
      }));

    this.hasData = points.length > 0;

    const dark = this.isDarkTheme();
    const textColor = dark ? '#EAF1FB' : '#172033';
    const mutedColor = dark ? '#93A4BA' : '#667085';
    const connectorColor = dark ? '#4A5D76' : '#CDD6E3';
    const borderColor = dark ? '#101A29' : '#FFFFFF';
    const tooltipBackground = dark ? 'rgba(15, 24, 38, 0.98)' : 'rgba(255, 255, 255, 0.98)';
    const tooltipBorder = dark ? '#31435B' : '#D5DEEA';
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
          color: dark ? 'rgba(0, 0, 0, 0.42)' : 'rgba(15, 23, 42, 0.16)',
          offsetX: 0,
          offsetY: 6,
          opacity: 0.2,
          width: 10,
        },
        formatter: function (): string {
          const point = this as unknown as Highcharts.Point;
          const percentage = Number(point.percentage) || 0;
          const value = Number(point.y) || 0;
          return [
            `<div style="min-width:140px;color:${textColor};font-size:12px;line-height:1.45">`,
            `<div style="font-weight:800;margin-bottom:4px">${point.name}</div>`,
            `<div style="color:${mutedColor}">${value.toLocaleString(undefined, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}${unitSuffix}</div>`,
            `<div style="font-weight:900;margin-top:2px">${percentage.toFixed(2)}%</div>`,
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
          size: '78%',
          center: ['50%', '50%'],
          dataLabels: {
            enabled: true,
            distance: 20,
            connectorColor,
            connectorWidth: 1,
            softConnector: true,
            crop: false,
            overflow: 'allow',
            padding: 3,
            style: {
              color: textColor,
              fontSize: '11px',
              fontWeight: '600',
              textOutline: 'none',
            },
            formatter: function (): string {
              const point = this as unknown as Highcharts.Point;
              const percentage = Number(point.percentage) || 0;
              return `${point.name}: ${percentage.toFixed(2)}%`;
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

  private isDarkTheme(): boolean {
    if (typeof document === 'undefined') {
      return false;
    }

    const root = document.documentElement;
    const body = document.body;
    const dataTheme = String(root.getAttribute('data-theme') || body?.getAttribute('data-theme') || '')
      .trim()
      .toLowerCase();

    return (
      dataTheme === 'dark' ||
      root.classList.contains('dark') ||
      root.classList.contains('dark-theme') ||
      body?.classList.contains('dark') ||
      body?.classList.contains('dark-theme') ||
      false
    );
  }
}
