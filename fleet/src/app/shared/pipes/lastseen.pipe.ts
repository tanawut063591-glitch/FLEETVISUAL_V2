import { Pipe, PipeTransform } from '@angular/core';
import { isDate } from 'moment';

@Pipe({
  name: 'lastseen',
  standalone: false
})
export class LastseenPipe implements PipeTransform {

  transform(timestamp: string, nowtinme: Date): unknown {
    if(timestamp && timestamp !== '---' && isDate(new Date(timestamp))){
      const ts = new Date(timestamp);
      if(nowtinme > ts ){
        const time = nowtinme.getTime() - (ts.getTime());
        const m = time/(60 * 1000);
        let lastTime: string = "0";
        switch(true){
          case m >= 60 && m < 1440:
            lastTime = parseInt((m/60).toString())+"H";
            break;
          case m >= 1440:
            lastTime = parseInt((m/1440).toString())+"D";
            break;
          default:
            lastTime = parseInt(m.toString())+"M";
            break;
        }
        return lastTime;
      } else {
        return "0M";
      }
    } else {
      //console.log("---")
      return "---";
    }
  }

}
