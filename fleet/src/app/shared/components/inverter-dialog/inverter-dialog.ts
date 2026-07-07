import { Component, inject, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeviceDialogData, DeviceParameterModel } from '../../models/device.model';
import { HttpService } from '../../services/http.service';
import { DataRealtimeModel, ResponseHistorianModel, ResponseRealtimeModel } from '../../models/response.model';
import { RequestHistorianModel, RequestRealtimeModel } from '../../models/request.model';
import { SeriesAreaOptions, SeriesColumnOptions, SeriesLineOptions, SeriesOptionsType } from 'highcharts';
import { ChartService } from '../../services/chart.service';

@Component({
  selector: 'app-inverter-dialog',
  standalone: false,
  templateUrl: './inverter-dialog.html',
  styleUrl: './inverter-dialog.scss'
})
export class InverterDialog implements OnInit {

  dataChart = signal<any>({});
  dataRealtime = signal<DataRealtimeModel>({});

  activeChart: string = '';

  private httpSrv = inject(HttpService);
  private chartOptions = inject(ChartService);

  constructor(
    public dialogRef: MatDialogRef<InverterDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DeviceDialogData
  ) {}

  ngOnInit(): void {
    if (this.data.deviceConfig.Historical?.length > 0) {
      this.activeChart = this.data.deviceConfig.Historical[0].Name;
    }
    this.getRealtimeData();
    this.getHistorianData();
  }

  async getRealtimeData(){
    const request: RequestRealtimeModel = {
      Tags: this.data.deviceConfig.Parameter.map(t => `${this.data.siteId}.${this.data.deviceId}.${t.Name}`)
    };

    if(request.Tags.length > 0){
      const response: ResponseRealtimeModel[] = await this.httpSrv.getRealtime(request);
      if(response){
        response.map(res => {
          const conf = this.data.deviceConfig.Parameter.find(t => `${this.data.siteId}.${this.data.deviceId}.${t.Name}` === res.Name);
          if (conf) {
            this.dataRealtime.update(val => ({
              ...val,
              [conf.Title]: {
                ...res,
                Value: res.Value
              }
            }));
          }
        });
      }
    }
    //console.log(this.dataRealtime())
  }

  async getHistorianData(){
    const st = new Date().setHours(0,0,0);
    const ed = new Date(st).setDate(new Date().getDate()+1);
    const requestGroup = this.data.deviceConfig.Historical.map(async(item) => {
      const request: RequestHistorianModel[] = item.Tags.map(x => ({
        Name: `${this.data.siteId}.${this.data.deviceId}.${x.Name}`,
        Options: {
          Time: '',
          StartTime: new Date(st).toISOString(),
          EndTime: new Date(ed).toISOString()
        }
      })) 
      const response:ResponseHistorianModel[] = await this.httpSrv.getHistorian(request); 
      if(response){
        // สร้าง object ใหม่แทนการ update
        this.dataChart.update(val => {
          // Clone object เดิมก่อน
          const newVal = { ...val };
          
          let series: SeriesOptionsType[] | SeriesLineOptions[] | SeriesAreaOptions[] | SeriesColumnOptions[] = []; 
          if(item.Tags.length > 0){
            item.Tags.forEach((x, index) => {   
              const tagName =  `${this.data.siteId}.${this.data.deviceId}.${x.Name}`;             
              let data = response.find(d => d.Name === tagName);
              if(data && data.records){
                const options: any = {
                  //yAxis: x.Axis,
                  type: x.Type,
                  color: x.Color,
                  fillOpacity: x.Opacity
                }
                let res = this.chartOptions.getSeriesOptions(tagName, options, data);
                series.push(res);
              }
            })
           
            
            // สร้าง chart config object ใหม่
            newVal[item.Name] = {
              chart: this.chartOptions.getChartOptions({}),
              title: this.chartOptions.getTitleOptions({}),
              xAxis: this.chartOptions.getXAxisoptions({}),
              yAxis: this.chartOptions.getYAxisoptions({}),
              legend: this.chartOptions.getLegendOptions({}),
              plotOptions: this.chartOptions.getPlotOptions({}),
              series: [...series] // Clone array
            };
          }
          // Return object ใหม่ทั้งหมด
          return newVal;
        });
        
      }
    });
    await Promise.all(requestGroup);
    //console.log(this.dataChart())
  }

  onClose(): void {
    this.dialogRef.close();
  }

  filterTable(group: string, data: DeviceParameterModel[]){
    return data.filter(x => x.Group === group);
  }

  filterString(data: DeviceParameterModel[]){
    return data.filter(x => x.Group === "PV Input" && x.Description.toLowerCase().includes('current'))
      .map(x => (x.Name.slice(1)));
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

  getStatusInfo(value: any): { message: string, color: string } {
    if (value === null || value === undefined) {
      return { message: 'Unknown', color: '#808080' };
    }
    const status = invstatus.find(s => s.value === parseInt(value));
    if (status) {
      return { message: status.message, color: status.color };
    }
    return { message: 'Unknown', color: '#808080' };
  }

  getStatusType(value: any): 'normal' | 'warning' | 'error' {
    if (value === null || value === undefined) {
      return 'error';
    }
    const status = invstatus.find(s => s.value === parseInt(value));
    if (status) {
      if (status.color === '#00FF00') {
        return 'normal';
      } else if (status.color === '#FFFF00' || status.color === '#FFA500') {
        return 'warning';
      } else if (status.color === '#FF0000') {
        return 'error';
      }
    }
    return 'error';
  }

}

export const invstatus = [
	{ "value": 0, "message": "Init standby", "color": "#B0B0B0" },
	{ "value": 1, "message": "Check insulation", "color": "#B0B0B0" },
	{ "value": 2, "message": "Check irradiation", "color": "#B0B0B0" },
	{ "value": 3, "message": "Check grid", "color": "#B0B0B0" },
	{ "value": 256, "message": "Starting", "color": "#FFFF00" },
	{ "value": 512, "message": "On-grid", "color": "#00FF00" },
	{ "value": 513, "message": "Power limited", "color": "#00FF00" },
	{ "value": 514, "message": "Self-derating", "color": "#00FF00" },
	{ "value": 515, "message": "Off-grid run", "color": "#00FF00" },

	{ "value": 768, "message": "Fault shutdown", "color": "#FF0000" },
	{ "value": 769, "message": "Cmd shutdown", "color": "#FF0000" },
	{ "value": 770, "message": "OVGR shutdown", "color": "#FF0000" },
	{ "value": 771, "message": "Comm fail", "color": "#FF0000" },
	{ "value": 772, "message": "PL shutdown", "color": "#FF0000" },
	{ "value": 773, "message": "Manual start req", "color": "#FF0000" },
	{ "value": 774, "message": "DC switch off", "color": "#FF0000" },
	{ "value": 775, "message": "Rapid cutoff", "color": "#FF0000" },
	{ "value": 776, "message": "Low input power", "color": "#FF0000" },

	{ "value": 1025, "message": "cosφ-P ctrl", "color": "#0000FF" },
	{ "value": 1026, "message": "Q-U ctrl", "color": "#0000FF" },
	{ "value": 1027, "message": "PF-U ctrl", "color": "#0000FF" },
	{ "value": 1028, "message": "Dry contact", "color": "#0000FF" },
	{ "value": 1029, "message": "Q-P ctrl", "color": "#0000FF" },

	{ "value": 1280, "message": "Spot ready", "color": "#FFA500" },
	{ "value": 1281, "message": "Spot checking", "color": "#FFA500" },
	{ "value": 1536, "message": "Inspecting", "color": "#FFA500" },
	{ "value": 1792, "message": "AFCI check", "color": "#FFA500" },
	{ "value": 2048, "message": "I-V scan", "color": "#FFA500" },
	{ "value": 2304, "message": "DC detect", "color": "#FFA500" },
	{ "value": 2560, "message": "Off-grid charge", "color": "#FFA500" },

	{ "value": 40960, "message": "No irradiation", "color": "#808080" }
];



