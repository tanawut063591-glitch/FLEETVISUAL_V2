import { Component, effect, inject, input } from '@angular/core';
import type { Chart, Options } from 'highcharts';
import { isDate } from 'moment';
import { ChartParameters } from '../../models/highchart.model';
import { Datetime } from '../../services/datetime';

@Component({
  selector: 'app-highchart',
  standalone: false,
  templateUrl: './highchart.html',
  styleUrl: './highchart.scss'
})
export class Highchart  {
  
  chartOptions?: Options;
  ref?: Chart;
  chartParameter = input.required<ChartParameters>({});
  today = new Date(new Date().setHours(23,59,0,0)).getTime() + 7 * 60 * 60 * 1000;
  yester = new Date(new Date().setHours(0,0,0,0)).getTime() + 7 * 60 * 60 * 1000;

  private dateTimeSrv = inject(Datetime);
  constructor() {
    effect(() => {
      if( this.chartParameter() && this.chartParameter()?.series && this.chartParameter()?.yAxis != undefined  && this.chartParameter()?.chart && this.chartParameter()?.xAxis ){
        this.init();
      } else {
        this.chartOptions = undefined;
        this.ref = undefined;
      }
    });
  }

  addPoint() {
    if (this.ref?.series[0]) {
      this.ref.series[0].addPoint(Math.floor(Math.random() * 10), false, false);
    } else {
      alert('init chart, first!');
    }
  }

  addSerie() {
    this.ref?.addSeries({
      type: 'line',
      name: 'Line ' + Math.floor(Math.random() * 10),
      data: [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10)
      ]
    }, false, false);
  }

  removePoint() {
    const s0 = this.ref?.series[0];
    if (s0 && s0.data.length > 0) {
      s0.removePoint(s0.data.length - 1, true);
    }
  }

  removeSerie() {
    const last = this.ref?.series.at(-1);
    if (last) {
      last.remove(true);
    }
  }

  onChartInstance(chart: Chart) {
    this.ref = chart;
  }

  splitName(txt: string, idx: number){
    const name = txt.split("_")[idx];
    if(name){
      return name;
    } else {
      return "-";
    }
  }

  init() {
    const options: Options = {
      chart: this.chartParameter()?.chart,
      title: {
        text: undefined,
        style: this.chartParameter()?.title?.style,
        align: this.chartParameter()?.title?.align,
        floating: this.chartParameter()?.title?.floating,
        margin: this.chartParameter()?.title?.margin
      },
      credits: {
        enabled: false
      },
      legend: this.chartParameter()?.legend || {
        layout: "vertical",
        align: "right",
        verticalAlign: "top",
        floating: true,
        x: +80, // -ve = left, +ve = right
        y: -20, // -ve = up, +ve = down
        itemStyle:{
          fontWeight: 'bolder',
          fontSize: '12px'
        },
        labelFormatter: function() {
          let d:any = this.options;
          let color = d.color;
          let lastValue = 0;;
          if(d.data[d.data.length - 1] && d.data[d.data.length - 1].length > 1){
            lastValue = d.data[d.data.length - 1][1];
            lastValue = parseInt(lastValue.toFixed(0));
          }
          //let s = `<div style="margin-bottom:5px;"><div style="font-weight:500;color:#6DDBEB;"></div></div>`;
          let s: any = '<div class="d-flex-sb w-100 b" style="width: 80px;" ><span class="bz" style="color:'+ color +';font-weight:500">' + this.name.split("*")[0] + '</span> <span class="bz" style="padding-left:6px;font-weight:500;color:#bcd;"> ' + lastValue + '  ' + this.name.split("*")[1] + ' </span></div>';
          return s;
        },
        itemWidth: 150,
        useHTML: true,
        borderColor: 'red',
        symbolHeight: 0,
        symbolWidth: 0
        // borderWidth: 2,
        // backgroundColor: 'white'
      },
      xAxis: this.chartParameter()?.xAxis,
      yAxis: this.chartParameter()?.yAxis,
      series: this.chartParameter()?.series, 
      tooltip: this.chartParameter()?.tooltip || {
        formatter: function () {
          let dateTime: Date = new Date();
          if(this.x){
            dateTime = new Date(this.x);
          }
          let dt = new DateTime();
          let montnFormat = dt.getMonth(dateTime.getMonth());
          let dateFormat = ('0' + dateTime.getDate()).slice(-2);
          let yearFormat = ('0' + dateTime.getFullYear()).slice(-2);
          let hourFormat = ((dateTime.getHours()-7));
          let minFormat = ('0' +dateTime.getMinutes()).slice(-2);
          let timeStamp = (dateTime.getFullYear() > 1500) ? `${dateFormat}-${montnFormat}-${yearFormat} ${hourFormat}:${minFormat}` : '';
          let ts = isDate(dateTime) ? dateTime.toISOString().slice(0,16).replace("T"," ") : '---';
          let s = `<div class="chart-tooltip" style="margin-bottom:5px;"><div style="font-weight:500;color:var(--primary-txt);">${ts}</div></div>`;
          s += '<table style="font-size:11px">';
          
          // Handle both shared tooltip (multiple points) and single point tooltip
          let pointsToProcess = this.points || [this];
          
          if (pointsToProcess && pointsToProcess.length > 0) {
            pointsToProcess.forEach((p: any) => {
              let unit = p.series.name.split("*")[1]??'';
              let seriesName = p.series.name.split("*")[0];
              // Check if it's a valid date or scatter chart
              if(dateTime.toString() == 'Invalid Date' || dateTime.getFullYear() < 2000 || dateTime.getFullYear() > 3000)
              { 
                // For scatter charts or non-time-based charts
                if(p.y != null){
                  s += '<tr><td class="chart-tooltip" style="color:' + p.color + ';font-weight:500">' + seriesName + ' :' + '</td> <td class="chart-tooltip" style="padding-left:6px;font-weight:500;color: ' + p.color + '"> ' + +(p.y).toFixed(2) + ' ' + unit + '</td></tr>';
                }
              }
              else{
                // For time-based charts
                if(p.y != null){
                  s += '<tr><td class="chart-tooltip" style="color:' + p.color + ';font-weight:500">' + seriesName + ' :' + '</td> <td class="chart-tooltip" style="padding-left:6px;font-weight:500;color: ' + p.color + '"> ' +(p.y).toFixed(2) + ' ' + unit + ' </td></tr>';
                }
              }
            });
          }
          s += '</table>';
          return s;
        },
        useHTML: true,
        valueDecimals: 2,
        shared: true,
        headerFormat: '',
        shadow: false,
        shape: 'rect',
        backgroundColor: 'var(--chart-tlp)',
      },
      plotOptions: this.chartParameter()?.plotOptions,
      responsive: this.chartParameter()?.responsive || {},
    };
    this.chartOptions = options;
  }

}

export class DateTime {
  constructor() { }

  getMonth(index: number) {
    const month = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return month[index];
  }
}

export interface ChartData{
  Timestamp:string;
  Value:string;
}
