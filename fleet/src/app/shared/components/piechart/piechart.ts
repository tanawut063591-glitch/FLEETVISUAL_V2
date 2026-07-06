import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import type { Chart, Options } from 'highcharts';

export interface PlantStatusData {
  label: string;
  count: number;
  percentage: number;
  color: string;
  unit: string;
}

@Component({
  selector: 'app-piechart',
  standalone: false,
  templateUrl: './piechart.html',
  styleUrl: './piechart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Piechart implements OnInit, OnChanges {
  
  chartOptions?: Options;
  //ref?: Highcharts3D.default.Chart;
  @Input() vertical?: boolean = false;
  @Input() high?: number = 120;
  @Input() enable3D?: boolean = true;
  @Input() statusData: PlantStatusData[] = [];

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['statusData'] && !changes['statusData'].firstChange) {
      this.initChart();
    }
  }

  getTotalSites(): number {
    return this.statusData.reduce((sum, item) => sum + item.count, 0);
  }

  initChart() {
    // เตรียมข้อมูลสำหรับ Highcharts
    const chartData = this.statusData.map(item => ({
      name: item.label,
      x: item.percentage,
      y: item.percentage,
      color: item.color,
      count: item.count
    }));

    const options: Options = {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        height: this.high,
        margin: [0, 0, 0 , 0],
        // options3d: {
        //   enabled: this.enable3D,
        //   alpha: 45,
        //   beta: 0,
        //   depth: 20,
        //   viewDistance: 25
        // }
      },
      title: {
        text: undefined
      },
      credits: {
        enabled: false
      },
      tooltip: {
        formatter: function() {
          const point: any = this;
          return `<div style="text-align: center;">
            <div style="font-weight: 500; color: ${point.color}; font-size: 14px;">${point.name}</div>
            <div style="color: var(--primary-txt); font-size: 12px; margin-top: 3px;">${point.count.toFixed(0)} item</div>
            <div style="color: var(--primary-txt); font-size: 12px; margin-top: 3px;">${point.percentage.toFixed(2)}%</div>
          </div>`;
        },
        useHTML: true,
        backgroundColor: 'var(--chart-tlp)',
        borderRadius: 8,
        shadow: false,
        style: {
          padding: '12px'
        }
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          innerSize: '60%',
          depth: this.enable3D ? 20 : 20,
          startAngle: 0,
          endAngle: 360,
          dataLabels: {
            enabled: false,
            distance: 10
          },
          showInLegend: true,
          borderWidth: 0,
          states: {
            hover: {
              brightness: 0.1
            }
          }
        }
      },
      legend: {
        enabled: false,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        itemMarginBottom: 12,
        useHTML: false,
        labelFormatter: function() {
          const point: any = this.options;
          return `<div style="display: flex; align-items: center; gap: 12px; width: 150px;">
            <span style="color: #BBCCDD; font-size: 12.8px; font-weight: 500; min-width: 90px;">${point.name}</span>
            <span style="color: ${point.color}; font-size: 16px; font-weight: 500; min-width: 30px; text-align: right;">${point.count}</span>
            <span style="color: #BBCCDD; font-size: 11.2px; font-weight: 500;">Sites</span>
          </div>`;
        },
        itemStyle: {
          color: '#BBCCDD',
          fontWeight: '500',
          fontSize: '12px'
        },
        itemHoverStyle: {
          color: '#FFFFFF'
        },
        symbolHeight: 0,
        symbolWidth: 0,
        symbolRadius: 0
      },
      series: [{
        type: 'pie',
        name: 'Plant Status',
        data: chartData
      }]
    };

    this.chartOptions = options;
    this.changeDetectorRef.markForCheck();
  }

  onChartInstance(_chart: Chart) {
    this.changeDetectorRef.markForCheck();
  }

  updateData(newData: PlantStatusData[]) {
    this.statusData = newData;
    this.initChart();
    this.changeDetectorRef.markForCheck();
  }
}