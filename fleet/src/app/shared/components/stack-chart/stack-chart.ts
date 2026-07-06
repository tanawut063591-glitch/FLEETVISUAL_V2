import { ChangeDetectionStrategy, Component, input, OnChanges, OnInit, signal, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-stack-chart',
  standalone: false,
  templateUrl: './stack-chart.html',
  styleUrl: './stack-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StackChart implements OnInit {


  VerLabel = signal<boolean>(false);
  value = input<string>('0');
  unit = input<string>('---');
  minVal = input<number>(0);
  maxVal = input<number>(0);
  activeColor = input<string>('#0DDDB9'); 
  bgColor = input<string>(''); 
  bdRadius = input<string>('4px'); 
  rangeVal = input<number>(10);
  label = input<string>('');
  verLabel = input<boolean>(false);
  legend = input<boolean>(true);
  title = input<boolean>(true);
  height = input<number>(100);
  range?: number;
  active: string = '#0DDDB9'; 
  bg: string = '';
  radius: string = '0px';
  showItems: boolean[] = [];
  
  // chartItems: number[] = [];
  chartItems = signal<number[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    this.chartItems.set(Array(this.rangeVal()).fill(0).map((_, i) => i));
    const test = this.getPercentage();
    this.range = this.setRange();
    //console.log(this.value())
  }

  ngOnInit() {
    //this.getColor(0);
    const test = this.getPercentage();
    this.range = this.setRange();
    //this.chartItems = Array(this.range).fill(0).map((_, i) => i);
  }

  setActiveColor(): string{
    if(this.activeColor()){
      return this.activeColor();
    } else {
      return this.active;
    }
  }

  setBgColor(): string{
    if(this.bgColor()){
      return this.bgColor();
    } else {
      return this.bg;
    }
  }

  setRange(): number{
    if(this.rangeVal()){
      return this.rangeVal();
    } else {
      return 10;
    }
  }

  getPercentage(): number{
    if(this.value() && this.maxVal() && this.rangeVal() && parseInt(this.value()) >= 0){
      if(parseFloat(this.value().replaceAll(",","")) > this.maxVal()){
        return 100;
      } else {
        const percent = ((parseFloat(this.value().replaceAll(",",""))/this.maxVal())*this.rangeVal()).toFixed(0);
        //console.log(percent)
        return parseInt(percent);
      }
    } else {
      return 0;
    }
  }

  getColor(index: number): string {
    const atcColor = this.setActiveColor();
    const bgColor = this.setBgColor();
    let count = 0;
    // let setData = setInterval(()=> {
    //   count++;
    //   if(count == 90){
    //     clearInterval(setData);
    //   }
    // }, 1000);
    return index < this.getPercentage() ? atcColor : bgColor;
  }
  
  showItem(index: number): boolean {
    return this.showItems[index];
  }
  
  getNumber(val: any) {
    if (typeof val === 'number') {
      const v = +val.toFixed(2);
      return v;
    }
    else {
      if(val != null){
        return parseInt(val.replace(',', '')).toLocaleString();
      } else {
        return 'null'
      }
    }
  }

}
