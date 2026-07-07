import { AfterViewInit, ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild, effect, inject, input, signal } from '@angular/core';
import { Record, ResponseHistorianModel } from '../../models/response.model';
import { ExportXls } from '../../services/export-xls';
import { Datetime } from '../../services/datetime';

@Component({
  selector: 'app-data-table',
  standalone: false,
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTable implements OnChanges {

  data = input([], {
    transform: (val:ResponseHistorianModel[]) => val.filter(x => x.records.length > 1).sort((a,b)=> a.Name.localeCompare(b.Name)),
  });
  start = input<string>('');
  end = input<string>('');
  dataTable = signal<ResponseHistorianModel[]>([]);
  pageList: string[] = [];
  tableRange:number = 20;
  lastIndex: number = 20;
  prevRange: number = 3;
  prevStart: number = 1;
  pageNumber: string = '1';
  //lastRange: number = -3; 
  recordHeader: any[] = [];
  timestampList: string[] = [];

  private excelExportService = inject(ExportXls);
  private dateTimeSrv = inject(Datetime);
  constructor(){
    // effect(() => {
    //   console.log(this.data())
    //   const data = this.data();
    //   if(data.length === 0) return; // Don't process if data is empty
      
    //   //this.dataTable.set([]);
    //   this.dataTable.set(
    //     data.map(function(item){
    //       return {
    //         Name: item.Name,
    //         Min: item.Min,
    //         Max: item.Max,
    //         Unit: item.Unit,
    //         records: item.records.slice(0,20)
    //       }
    //     })
    //   );
    //   const lenght = data[0].records.length/this.tableRange;
    //   this.pageList = Array(Math.ceil(lenght)).fill(0).map((_, i) => (i+1).toString());
    //   this.recordHeader = [];
    //   this.dataTable().forEach(item => {
    //     let findName = this.recordHeader.find(x => x.name == item.Name.split(".")[1]);
    //     if(findName){
    //       findName.count = findName.count + 1;
    //     } else {
    //       this.recordHeader.push({
    //         name: item.Name.split(".")[1],
    //         count: 1
    //       })
    //     }
    //   });

    //   this.tableRange = 20;
    //   this.pageNumber = "1";
    // })
  }

  generateTimestampList(): string[] {
    const startStr = this.start();
    const endStr = this.end();
    if (!startStr || !endStr) return [];
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    const list: string[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      list.push(current.toISOString());
      current = new Date(current.getTime() + 60000); // 1 minute
    }
    return list;
  }

  ngOnChanges(changes: SimpleChanges): void {
      console.log(this.data(), this.start(), this.end() )
      const data = this.data();
      if(data.length === 0) return; // Don't process if data is empty
      
      this.dataTable.set(data);
      const fullTimestamps = this.generateTimestampList();
      this.timestampList = fullTimestamps.slice(0, this.tableRange);
      const length = fullTimestamps.length / this.tableRange;
      this.pageList = Array(Math.ceil(length)).fill(0).map((_, i) => (i+1).toString());
      this.recordHeader = [];
      this.dataTable().forEach(item => {
        let findName = this.recordHeader.find(x => x.name == item.Name.split(".")[1]);
        if(findName){
          findName.count = findName.count + 1;
        } else {
          this.recordHeader.push({
            name: item.Name.split(".")[1],
            count: 1
          })
        }
      });
      console.log(this.timestampList, this.dataTable())
      this.tableRange = 20;
      this.pageNumber = "1";
  }

  getNumber(val: any) {
    // if (typeof val === 'number') {
    //   const v = +val.toFixed(2);
    //   return v;
    // }
    // else {
    //   const res = parseInt(val.replace(',', '')).toFixed(0);
    //   if(res != "NaN"){
    //     ////console.log(res)
    //     return res;
    //   } else if(val)  {
    //     return val; 
    //   } else {
    //     return "-";
    //   }
    // }
    if(val){
      if (typeof val === 'number') {
        const v = +val.toFixed(2);
        return v;
      }
      else {
        const res = parseFloat(val.replaceAll(',', ''));
        if(res > 0){
          return res.toFixed(1);
        } else if(val)  {
          return val; 
        }
      }
    } else {
      return "-";
    }
  }

  getTitle(name: string){
    const title = name.split('.')[2];
    return title;
  }

  getDescription(name: string){
    const title = name.split('.')[1];
    return title;
  }

  convertDate(day: string){
    const test = new Date(day).toLocaleString('en-GB', {
      hour12: false,
    });
    return test;
  }

  onSelectedRange(value: string){
    //console.log(value);
    this.tableRange = parseInt(value);
    this.pageNumber = "1";
    const fullTimestamps = this.generateTimestampList();
    this.timestampList = fullTimestamps.slice(0, this.tableRange);
    const length = fullTimestamps.length / this.tableRange;
    this.pageList = Array(Math.ceil(length)).fill(0).map((_, i) => (i+1).toString());
  }

  getForwardRange(){
    if(parseInt(this.pageNumber) < this.pageList.length){
      const pg = parseInt(this.pageNumber) + 1;
      this.pageNumber = pg.toString();
      const fullTimestamps = this.generateTimestampList();
      const st = (pg - 1) * this.tableRange;
      const en = pg * this.tableRange;
      this.timestampList = fullTimestamps.slice(st, en);
    }
  }

  getBackRange(){
    if(parseInt(this.pageNumber) > 1){
      const pg = parseInt(this.pageNumber) - 1;
      this.pageNumber = pg.toString();
      const fullTimestamps = this.generateTimestampList();
      const st = (pg - 1) * this.tableRange;
      const en = pg * this.tableRange;
      this.timestampList = fullTimestamps.slice(st, en);
    }
  }

  goFirstPage(){
    const fullTimestamps = this.generateTimestampList();
    this.pageNumber = "1";
    this.timestampList = fullTimestamps.slice(0, this.tableRange);
  }

  goLastPage(){
    const fullTimestamps = this.generateTimestampList();
    const totalPages = Math.ceil(fullTimestamps.length / this.tableRange);
    this.pageNumber = totalPages.toString();
    const st = (totalPages - 1) * this.tableRange;
    this.timestampList = fullTimestamps.slice(st);
  }

  goToPage(page: string){
    const pg = parseInt(page);
    if(this.pageList.indexOf(page) == -1){
      alert("page not found !")
    } else {
      this.pageNumber = page;
      const fullTimestamps = this.generateTimestampList();
      const st = (pg - 1) * this.tableRange;
      const en = pg * this.tableRange;
      this.timestampList = fullTimestamps.slice(st, en);
    }
  }

  goToNextPageGroup(){
    this.prevStart = parseInt(this.pageNumber) + 1;
  }

  exportToExcel(): void {
    const date = this.dateTimeSrv.getDateTime1(new Date());
    //console.log(this.data());
    this.excelExportService.exportToExcel(this.data().filter(x => x.records.length > 0), 'exported_data_'+date.slice(0,10));
  }

  getDataValue(tag: string, ts: string){
    const val = this.data().find(x => x.Name == tag)?.records?.find(x => x.TimeStamp == ts)?.Value;
    if(val != null){
      return val;
    } else {
      return '---';
    }
  }

}

