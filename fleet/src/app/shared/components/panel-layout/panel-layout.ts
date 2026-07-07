import { Component, effect, input, OnInit, signal } from '@angular/core';
import { ColorRangeModel, PanelConfigModel, PvGroupModel, PvPanelModel } from '../../models/panel.model';
import { DataRealtimeModel } from '../../models/response.model';
import { isNumber } from 'highcharts';
import { opacity } from 'html2canvas/dist/types/css/property-descriptors/opacity';

@Component({
  selector: 'app-panel-layout',
  standalone: false,
  templateUrl: './panel-layout.html',
  styleUrl: './panel-layout.scss'
})
export class PanelLayout implements OnInit {

  dataRealtime = input<DataRealtimeModel>({});
  panels = input.required<PanelConfigModel[]>();
  colors = input.required<ColorRangeModel[]>();
  displayPanel: PanelConfigModel = {} as PanelConfigModel;
  performaceList: any[] = [];
  selectedGroup: string = '';
  selectedString: string = '';
  hoverString: string | null = null;
  currentPanelIndex: number = 0;
  isReady = signal<boolean>(false);
  transletePosition = signal<string>('translate(0, 0)');

  constructor(){
    effect(() => {
      if(this.panels()){
        this.displayPanel= this.panels()[0];
      }
      if(this.dataRealtime()){
        ////console.log(this.dataRealtime())
        this.updatePanelData();
        //console.log(this.displayPanel)
      }
    });
  }

  ngOnInit(): void {
    
  }

  handleProvinceClick = (provinceId: string, group: string) => {
    if(!group.includes('INV')){
      return;
    };

    if(this.selectedGroup == group) {
      this.selectedString = '';
      this.selectedGroup = '';
    } else {
      this.selectedString = provinceId;
      this.selectedGroup = group;
    }
  };

  handleCloseCard(){
    this.selectedString = '';
    this.selectedGroup = '';
  }

  handleProvinceHover = (provinceId: string | null) => {
    this.hoverString = provinceId;
  };

  getProvinceStyle = (provinceId: string, group: string, pr: number | undefined) => {
    const isSelected = this.selectedString === provinceId || this.selectedGroup === group;
    const isHovered = this.hoverString === provinceId;
    if (isSelected) {
      return {
        fill: 'var(--map-selected)',
        stroke: 'white',
        strokeWidth: '2',
        cursor: 'pointer',
      };
    } else if (isHovered) {
      return {
        fill: group.includes('INV') ? this.getPanelColor(pr) : 'var(--map-bg)',
        stroke: 'white',
        strokeWidth: '2',
        cursor: 'pointer'
      };
    } else {
      return {
        fill: group.includes('INV') ? this.getPanelColor(pr) : 'var(--map-bg)',
        opacity: 0.9,
        strokeWidth: '0',
        cursor: 'pointer'
      };
    }
  };

  getPanelTransformStyle = (provinceId: string, group: string, position: string) => {
    const isSelected = this.selectedString === provinceId || this.selectedGroup === group;
    const isHovered = this.hoverString === provinceId;
    if (isSelected) {
      return {
        transform: position,
      };
    } else if (isHovered) {
      return {
        transform: position + ' scale(1.05)',
      };
    } else {
      return {
        transform: position,
      };
    }
  };
  
  getGradientId(percentage: number | undefined): string {
    const colors = this.colors() || [];

    if (percentage == null || !isNumber(percentage) || !colors?.length) {
      return 'gradient-default';
    }

    let findColor;

    if (percentage > 100) {
      // ใส่ initial value ป้องกัน reduce crash
      findColor = colors.reduce((max, current) =>
        current.maximum > max.maximum ? current : max,
        colors[0]
      );
    } else {
      findColor = colors.find(
        x => percentage >= x.minimum && percentage < x.maximum
      );
    }

    return findColor
      ? `gradient-${findColor.title.toLowerCase()}`
      : 'gradient-default';
  }

  getPanelColor(pr: number | undefined){
    if(pr != undefined && isNumber(pr) && this.colors() && this.colors().length > 0) {
      // const gradientId = this.getGradientId(pr);
      // return `url(#${gradientId})`;
      let findColor;
      if(pr > 100) {
        const res = this.colors().reduce((max, current) => 
          current.maximum > max.maximum ? current : max
        );
        return res.color;
      } else {
        const res = this.colors().find(x => pr >= x.minimum && pr < x.maximum);
        return res ? res.color : 'var(--map-hover)';
      }
    } else {
      return 'var(--map-hover)';
    }
  }

  getPanelStrokeColor(pr: number | undefined) {
    const colors = this.colors() || [];

    // กัน undefined / NaN / array ว่าง
    if (pr == null || !isNumber(pr) || !colors?.length) {
      return 'var(--map-bg)';
    }

    if (pr > 100) {
      const res = colors.reduce(
        (max, current) =>
          current.maximum > max.maximum ? current : max,
        colors[0] // 👈 สำคัญมาก
      );
      return 'var(--map-bg)';
      //return res.color;
      
    }

    const res = colors.find(x => pr >= x.minimum && pr < x.maximum);
    return 'var(--map-bg)';
    //return res ? res.color : 'var(--map-bg)';
  }
  
  getLabel(inv: string, str: string) {
    if(!inv.toLowerCase().includes('inverter')){
      return inv;
    }
    return `${inv} : STRING ${str.split('_').find(x => x.includes('STR'))?.replaceAll('STR', '')} : ${this.dataRealtime()[str]?.Value??'---'} A`;
  }

  isSelectedGreoup(id: string) {
    return this.selectedGroup === id;
  }

  getGroupStyle = (provinceId: string) => {
    const isSelected = this.selectedGroup === provinceId;
    if (isSelected) {
      return {
        stroke: 'white',
        strokeWidth: '1.5',
        cursor: 'pointer',
      };
    } else {
      return {
        fill: '#005F60',
        cursor: 'pointer'
      };
    }
  };

  getInverterNumber(): string {
    const group = this.displayPanel?.group.findIndex(item => item.id === this.selectedGroup);
    if (group) {
      const num = group;
      return num < 10 ? `0${num}` : `${num}`;
    }
    return '';
  }

  getSelectedGroupData() {
    if (!this.selectedGroup) return null;
    
    const group = this.displayPanel?.group.find(item => item.id === this.selectedGroup);
    if (!group) return null;

    // Mock data - replace with actual performance data
    const totalStrings = group.panel.length; 
    const prList = this.colors().map(c => {
      return {
        title: c.title,
        color: c.color,
        value:  c.maximum >= 100 ? group.panel.filter(y =>  y.percentage != undefined && y.percentage >= c.minimum ).length
        : group.panel.filter(y =>  y.percentage != undefined && y.percentage >= c.minimum && y.percentage < c.maximum ).length
      }
    })

    // Mock inverter metrics - replace with actual data
    const basePower = this.dataRealtime()[group.id + '_POWER']?.Value??'---';
    const baseEnergy = this.dataRealtime()[group.id + '_ENERGY']?.Value??'---';
    const baseEff = this.dataRealtime()[group.id + '_PR']?.Value??'---';
  

    return {
      title: group.name,
      totalStrings,
      power: basePower, // kW
      energy: baseEnergy, // kWh
      efficiency: baseEff, // %
      performance: prList
    }
  }

  // Helper method to get color data with additional properties for HTML template
  getColorData() {
    if (!this.colors()) return [];
    
    return this.colors().map((color, index) => {
      // Mock count data - replace with actual data
      const counts = [60, 25, 15, 25, 15]; // excellent, good, fair, poor, critical
      const labels = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'];
      
      return {
        ...color,
        range: `${color.maximum} - ${color.minimum} %`,
        label: labels[index] || color.title,
        count: counts[index] || 0
      };
    });
  }

  // Navigation methods for changing displayPanel
  navigateToPrevious() {
    this.isReady.set(false);
    if (this.panels() && this.panels().length > 0) {
      this.currentPanelIndex = this.currentPanelIndex > 0 
        ? this.currentPanelIndex - 1 
        : this.panels().length - 1;
      this.displayPanel = this.panels()[this.currentPanelIndex];
      this.updatePanelData();
      this.clearSelection();
    }
  }

  navigateToNext() {
    this.isReady.set(false);
    if (this.panels() && this.panels().length > 0) {
      this.currentPanelIndex = this.currentPanelIndex < this.panels().length - 1 
        ? this.currentPanelIndex + 1 
        : 0;
      this.displayPanel = this.panels()[this.currentPanelIndex];
      this.updatePanelData();
      this.clearSelection();
    }
  }

  clearSelection() {
    this.selectedGroup = '';
    this.selectedString = '';
    this.hoverString = null;
  }

  canNavigatePrevious(): boolean {
    return this.panels() && this.panels().length > 1;
  }

  canNavigateNext(): boolean {
    return this.panels() && this.panels().length > 1;
  }

  updatePanelData(){
    this.displayPanel = { ...this.displayPanel,
      group: this.displayPanel?.group.map(item => {
        const avg = item.panel?.reduce((acc: number, cur:PvPanelModel) => { 
          acc = acc + (this.dataRealtime()[`${cur.id}`]?.Value??0)
          return acc; 
        }, 0)/item.panel.length;
        //console.log(avg);
        const panels = item.panel.map(x => {
          let val = this.dataRealtime()[`${x.id}`]?.Value??0;
          return {
            ...x,
            average: avg??0,
            value: val,
            percentage: x.id.includes('STR') ? (val/avg)*100 : undefined
          }
        });
        return {
          ...item,
          panel: panels
        };
      })
    };
    this.performaceList = this.colors().map(c => {
      return {
        title: c.title,
        color: c.color,
        value: c.maximum >= 100 ? this.displayPanel.group
          .map(x => x.panel)
            .flat()
              .filter(y =>  
                y.percentage != undefined 
                && y.percentage >= c.minimum
              ).length
          : 
          this.displayPanel.group
          .map(x => x.panel)
            .flat()
              .filter(y =>  
                y.percentage != undefined 
                && y.percentage >= c.minimum 
                && y.percentage < c.maximum 
              ).length
      }
    });
    this.isReady.set(true);
    setTimeout(() => this.getCenterTransform('gbox'), 0);
  };

  getCenterTransform(id: string = 'gbox') {
    const el: any = document.getElementById(id);
    if (!el) return '';

    const box = el.getBBox();

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const svgCenterX = 1234 / 2;
    const svgCenterY = (681 / 2) + 80;
    
    el.setAttribute('transform', `translate(${svgCenterX - centerX}, ${svgCenterY - centerY})`);
    return true;
    //return `translate(${svgCenterX - centerX}, ${svgCenterY - centerY})`;
  }
}
