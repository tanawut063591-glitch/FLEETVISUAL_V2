import { Component, input, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-circle-progress',
  templateUrl: './circle-progress.html',
  styleUrl: './circle-progress.scss',
  standalone: false
})
export class CircleProgress implements OnInit, OnChanges {

  percent = input<number>(0);
  title = input<string>('');
  value = input<string>('');
  unit = input<string>('');

  constructor(){}

  ngOnChanges(changes: SimpleChanges): void {
    
  }

  ngOnInit(): void {
    
  }

  getProgressionPercentage(){
    return 140+((100-this.percent())*2.4);
  }

}
