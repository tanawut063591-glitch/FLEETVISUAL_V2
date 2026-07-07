import { Component, effect, EventEmitter, input, Output } from '@angular/core';
import { ResponseRealtimeModel } from '../../models/response.model';

@Component({
  selector: 'app-filter-table',
  standalone: false,
  templateUrl: './filter-table.html',
  styleUrl: './filter-table.scss'
})
export class FilterTable {
  isFilter = input<boolean>(true);
  Response = input<ResponseRealtimeModel[]>([]);
  Info = input<any[]>([]);
  text = input<string>('');
  key = input<string>('');
  index = input<number>(0);
  data: (string | number)[] | undefined = [];
  @Output() result = new EventEmitter();
  @Output() resultSort = new EventEmitter();
  constructor(){
    effect(() => {
      if(this.Response() && this.text()){
        this.getFilterData(this.text());
      }
      if(this.Info() && this.key()){
        this.getFilterInfo(this.key(), this.index());
      }
      if(this.data){
        this.data = this.data.filter((value, index, array) => array.indexOf(value) === index);
      }
    });
  }

  trackByData = (index: number, item: string) => item;

  selectAlias(item: string | number){
    this.result.emit({
      key: this.key(),
      text: item.toString()
    });
  }

  getFilterData(txt: string){
    this.data = this.Response().filter(x => x.Name.includes(txt)).map(function(item){
      return item.Value;
    });
  }

  submitSort(type: string){
    this.resultSort.emit({
      type: type,
      key: this.text()
    });
  }

  getFilterInfo(key: string, index: number){
    // switch(key){
    //   case "Id":
    //     this.data = this.Info?.map(function(i){
    //       return i['Id'];
    //     })
    //     break;
    //   case "Capacity":
    //     this.data = this.Info?.map(function(i){
    //       return i['Capacity'];
    //     })
    //     break;
    //   case "Province":
    //     this.data = this.Info?.map(function(i){
    //       return i['Province'];
    //     })
    //     break;
    //   case "Name":
    //     this.data = this.Info?.map(function(i){
    //       return i['Name'];
    //     })
    //     break;  
    //   case "District":
    //     this.data = this.Info?.map(function(i){
    //       return i['District'];
    //     })
    //     break;   
    //   default:
    //     this.data = [];
    //     break;  
    // }
  }

}
