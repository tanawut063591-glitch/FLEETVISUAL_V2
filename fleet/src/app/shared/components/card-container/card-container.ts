import { Component, ContentChild, Input, OnChanges, OnInit, SimpleChanges, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-card-container',
  standalone: false,
  templateUrl: './card-container.html',
  styleUrl: './card-container.scss'
})
export class CardContainer implements OnInit, OnChanges {

  @Input() enable?: boolean;
  @Input() title?: string;
  @ContentChild('container') containerTmp!: TemplateRef<any>;

  check: boolean | undefined = false;
  constructor(){}

  ngOnChanges(changes: SimpleChanges): void {
    
  }

  ngOnInit(): void {
    
  }

}
