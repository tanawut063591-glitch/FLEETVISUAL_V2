import { DecimalPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberFomat',
  standalone: false
})
export class NumberFomatPipe implements PipeTransform {

  constructor(private decimalPipe: DecimalPipe) { }
    transform(value: any, format: string): any {
        if (typeof value === 'number') {
          const val = this.decimalPipe.transform(value, format);
          return val;
        } else if(typeof value === 'string' && Number(value.replaceAll(",",""))){
          const val = this.decimalPipe.transform(parseFloat(value.replaceAll(",","")), format);
          if(val && parseFloat(val) > 0){
            return val;
          } else{
            return 0;
          }
        } else if(typeof value === 'string' && !Number(value.replaceAll(",",""))){
          if(value && parseInt(value) != 0){
            return value;
          } else{
            return 0;
          }
        } else if(  typeof value === 'boolean' ){
          if(value){
            return 1;
          } else {
            return 0;
          }
        } else {
          return "---";
        }
    }

}
