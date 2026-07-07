import { Component, effect, inject, input, output, signal } from '@angular/core';
import { ChartParameters } from '../../models/highchart.model';
import { Datetime } from '../../services/datetime';
import { ResponseHistorianModel } from '../../models/response.model';
import { ExportXls } from '../../services/export-xls';

export interface ChartPickerModel{
  name: string;
  start: Date;
  end: Date;
  mode: 'd' | 'w' | 'm' | 'y';
}

@Component({
  selector: 'app-chart-card',
  standalone: false,
  templateUrl: './chart-card.html',
  styleUrl: './chart-card.scss'
})
export class ChartCard {

  name = input<string>('');
  chartData = input<ChartParameters>({} as ChartParameters);
  dateChange = output<ChartPickerModel>();

  isLoading = input<string>('');
  fixedMode = input<'d' | 'w' | 'm' | 'y'>();
  
  chartItems = signal<ChartParameters>({} as ChartParameters);
  date: Date = new Date();
  mode = signal<'d' | 'w' | 'm' | 'y'>('d');
  uniqueId: string = `datepicker-${Math.random().toString(36).substr(2, 9)}`;

  loadingImg = signal<boolean>(false);
  loadingData = signal<boolean>(false);
  loadingChart = signal<boolean>(false);

  private dateTimeSrv = inject(Datetime);
  private excelExportService = inject(ExportXls);

  constructor(){
    effect(() => {
      if(this.chartData()){
        const base = this.cloneChartData(this.chartData());
        switch(this.mode()){
          case 'w':
            this.chartItems.set({
              ...base,
              xAxis: base.xAxis?.categories ? base.xAxis : {
                ...base.xAxis,
                tickInterval: 86400000,
                labels: {
                  ...base.xAxis?.labels,
                  format: '{value:%a}'
                }
              }
            });
            break;
          case 'm':
            this.chartItems.set({
              ...base,
              xAxis: base.xAxis?.categories ? base.xAxis : {
                ...base.xAxis,
                tickInterval: 604800000,
                labels: {
                  ...base.xAxis?.labels,
                  format: '{value:%d}'
                }
              }
            });
            break;
          case 'y':
            this.chartItems.set({
              ...base,
              xAxis: base.xAxis?.categories ? base.xAxis : {
                ...base.xAxis,
                tickInterval: 2678400000,
                labels: {
                  ...base.xAxis?.labels,
                  format: '{value:%b}'
                }
              }
            });
            break;
          default:
            this.chartItems.set({
              ...base,
              xAxis: base.xAxis?.categories ? base.xAxis : {
                ...base.xAxis,
                tickInterval: 7200000,
                labels: {
                  ...base.xAxis?.labels,
                  format: '{value:%H}'
                }
              }
            });
            break;
        }
      } else {
        this.chartItems.update(prev => {
          return {} as ChartParameters;
        });
        //console.log('YYYYY')
      }
      if(this.fixedMode()){
        this.mode.set(this.fixedMode()!);
      }
    })
  }

  private cloneChartData(data: ChartParameters): ChartParameters {
    return {
      ...data,
      series: data.series?.map((s: any) => ({
        ...s,
        data: Array.isArray(s.data)
          ? s.data.map((d: any) => Array.isArray(d) ? [d[0], d[1]] : d)
          : s.data
      }))
    };
  }

  captureChart(): void {
    this.loadingImg.set(true);
    const chartElement = document.getElementById(this.name());
    if (chartElement) {
      this.captureElement(chartElement, this.name());
    } else {
      this.loadingImg.set(false);
    };
  }

  private captureElement(element: HTMLElement, filename: string): void {
    // Using html2canvas library
    import('html2canvas').then(html2canvas => {
      html2canvas.default(element, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        logging: false,
        useCORS: true
      }).then((canvas: any) => {
        const link = document.createElement('a');
        const date = this.dateTimeSrv.getDateTime1(new Date());
        link.download = `${filename}_${date.slice(0, 10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.loadingImg.set(false);
      }).catch((err: any) => {
        //console.error('Error capturing chart:', err);
        this.loadingImg.set(false);
      });
    });
  }

  exportAllToExcel(): void {
    this.loadingData.set(true);
    const data: any[] = this.chartData()?.series || [];
    let res:ResponseHistorianModel[] = [];
    if(this.chartData().xAxis?.categories){
      const categories = this.chartData()?.xAxis?.categories || [];
      res = data[0].data.map((x: any, index: number) => {
        return {
          Name: categories[index] || '-',
          Unit: '-',
          Min: 0,
          Max: 100,
          records: [
            {
              Value: x,
              TimeStamp: new Date(this.date).toISOString()
            }
          ]
        }
      });
    } else {
      res = data.map((x: any) => {
        return {
          Name: x.name.split('*')[0] || '-',
          Unit: '-',
          Min: 0,
          Max: 100,
          records: x.data.map((y: any) => ({
            Value: y[1],
            TimeStamp: new Date(y[0]).toISOString()
          }))
        }
      });
    }
    const date = this.dateTimeSrv.getDateTime1(this.date);
    this.excelExportService.exportToExcel(res, 'exported_data_'+date.slice(0,10));
    this.loadingData.set(false);
  }

  setTimeRange(range: 'd' | 'w' | 'm' | 'y') {
    this.mode.set(range);
    this.emitDateChangeEvent();
  }

  onDateSelect(event: any) {
    this.date = event;
    this.emitDateChangeEvent();
  }

  emitDateChangeEvent(){
    let res: ChartPickerModel = {
      name: this.name(),
      start: new Date(),
      end: new Date(),
      mode: this.mode()
    };
    switch(this.mode()) {
      case 'd':
        const dt = new Date(this.date);
        res.start = new Date(dt.setHours(0,0,0,0));
        res.end = new Date(dt.setHours(23,59,59,0));
        break;
      case 'w':
        const dtw = new Date(this.date);
        const first = dtw.getDate() - dtw.getDay();
        const last = first + 6;
        res.start = new Date(dtw.setDate(first));
        res.start = new Date(res.start.setHours(0,0,0,0));
        res.end = new Date(dtw.setDate(last));
        res.end = new Date(res.end.setHours(23,59,59,0));
        break;
      case 'm':
        const dt1 = new Date(this.date.setHours(0,0,0,0))
        this.date = new Date(dt1.setDate(1));
        res.start = this.date;
        res.end = new Date(dt1.setMonth(this.date.getMonth()+1, 1));
        res.end = new Date(res.end.setHours(23,59,59,0));
        res.end = new Date(res.end.setDate(res.end.getDate()-1));
        break;
      case 'y':
        const dt2 = new Date(this.date.setHours(0,0,0,0))
        res.start = new Date(dt2.setMonth(0, 1));
        res.end = new Date(dt2.setFullYear( dt2.getFullYear()+1, 0, 1 ));
        break;
    }
    this.dateChange.emit(res);
  }

}
