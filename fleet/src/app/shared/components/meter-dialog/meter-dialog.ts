import { Component, inject, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeviceDialogData, DeviceParameterModel } from '../../models/device.model';
import { HttpService } from '../../services/http.service';
import { DataRealtimeModel, ResponseHistorianModel, ResponseRealtimeModel } from '../../models/response.model';
import { RequestHistorianModel, RequestRealtimeModel } from '../../models/request.model';
import { SeriesAreaOptions, SeriesColumnOptions, SeriesLineOptions, SeriesOptionsType } from 'highcharts';
import { ChartService } from '../../services/chart.service';

@Component({
  selector: 'app-meter-dialog',
  standalone: false,
  templateUrl: './meter-dialog.html',
  styleUrl: './meter-dialog.scss'
})
export class MeterDialog implements OnInit {

  dataChart    = signal<any>({});
  dataRealtime = signal<DataRealtimeModel>({});
  activeChart  = '';

  // Groups ที่ exclude ออกจาก dynamic param section
  private readonly EXCLUDED_GROUPS = ['Major', 'Status'];

  private httpSrv      = inject(HttpService);
  private chartOptions = inject(ChartService);

  constructor(
    public dialogRef: MatDialogRef<MeterDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DeviceDialogData
  ) {}

  ngOnInit(): void {
    if (this.data.deviceConfig.Historical?.length > 0) {
      this.activeChart = this.data.deviceConfig.Historical[0].Name;
    }
    this.getRealtimeData();
    this.getHistorianData();
  }

  // ─── Derived Data ──────────────────────────────────────

  // ดึง unique groups จาก config โดย exclude Major & Status
  get paramGroups(): string[] {
    const seen = new Set<string>();
    return this.data.deviceConfig.Parameter
      .map(p => p.Group)
      .filter(g => {
        if (this.EXCLUDED_GROUPS.includes(g) || seen.has(g)) return false;
        seen.add(g);
        return true;
      });
  }

  // filter parameters ตาม group
  filterGroup(group: string): DeviceParameterModel[] {
    return this.data.deviceConfig.Parameter.filter(p => p.Group === group);
  }

  // map Title -> icon CSS class สำหรับ metric cards
  getIconClass(title: string): string {
    const map: Record<string, string> = {
      ActivePower: 'power',
      ReactivePower: 'reactive',
      PowerFactor:  'pf',
      Frequency:  'freq',
      WH:  'energy',
      WH_TODAY: 'energy-today'
    };
    return map[title] ?? 'default';
  }

  // ─── Chart ─────────────────────────────────────────────

  isChartReady(name: string): boolean {
    const c = this.dataChart()[name];
    return !!(
      c &&
      c.chart &&
      c.xAxis &&
      c.yAxis !== undefined &&
      Array.isArray(c.series) &&
      c.series.length > 0
    );
  }

  // ─── API Calls ─────────────────────────────────────────

  async getRealtimeData(): Promise<void> {
    const request: RequestRealtimeModel = {
      Tags: this.data.deviceConfig.Parameter.map(
        t => `${this.data.siteId}.${this.data.deviceId}.${t.Name}`
      )
    };

    if (request.Tags.length === 0) return;

    const response: ResponseRealtimeModel[] = await this.httpSrv.getRealtime(request);
    if (!response) return;

    response.forEach(res => {
      const conf = this.data.deviceConfig.Parameter.find(
        t => `${this.data.siteId}.${this.data.deviceId}.${t.Name}` === res.Name
      );
      if (conf) {
        this.dataRealtime.update(val => ({
          ...val,
          [conf.Title]: { ...res }
        }));
      }
    });

    //console.log('Realtime:', this.dataRealtime());
  }

  async getHistorianData(): Promise<void> {
    const st = new Date().setHours(0, 0, 0, 0);
    const ed = new Date(st);
    ed.setDate(ed.getDate() + 1);

    const requestGroup = this.data.deviceConfig.Historical.map(async item => {
      const request: RequestHistorianModel[] = item.Tags.map(x => ({
        Name: `${this.data.siteId}.${this.data.deviceId}.${x.Name}`,
        Options: {
          Time: '',
          StartTime: new Date(st).toISOString(),
          EndTime: ed.toISOString()
        }
      }));

      const response: ResponseHistorianModel[] = await this.httpSrv.getHistorian(request);
      if (!response) return;

      this.dataChart.update(val => {
        const newVal = { ...val };
        const series: SeriesOptionsType[] = [];

        item.Tags.forEach(x => {
          const tagName = `${this.data.siteId}.${this.data.deviceId}.${x.Name}`;
          const data    = response.find(d => d.Name === tagName);
          if (data?.records) {
            const options: any = {
              //yAxis: x.Axis,
              type: x.Type,
              color: x.Color,
              fillOpacity: x.Opacity
            }
            series.push(this.chartOptions.getSeriesOptions(tagName, options, data));
          }
        });

        newVal[item.Name] = {
          chart:       this.chartOptions.getChartOptions({}),
          title:       this.chartOptions.getTitleOptions({}),
          xAxis:       this.chartOptions.getXAxisoptions({}),
          yAxis:       this.chartOptions.getYAxisoptions({}),
          legend:      this.chartOptions.getLegendOptions({}),
          plotOptions: this.chartOptions.getPlotOptions({}),
          series:      [...series]
        };

        return newVal;
      });
    });

    await Promise.all(requestGroup);
    //console.log('Chart data:', this.dataChart());
  }

  onClose(): void {
    this.dialogRef.close();
  }

  checkStatus(data: any){
    if(data){
      if(data === 1 || parseInt(data) === 1){
        return true;
      } else if(data === 0 || parseInt(data) === 0){
        return false;
      } else if(typeof data == 'string'){
        if(data.toLowerCase() === 'true') {
          return true;
        } else if(data.toLowerCase() === 'false') {
          return false;
        } else {
          return data;
        }
      } else {
        return data;
      }
    } else {
      return false;
    }
  }
}