import { Component, effect, EventEmitter, inject, input, OnChanges, OnDestroy, Output, signal, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { EmitPeriodResult, TagsListConfig } from '../../models/realtime.model';
import { Equipments, GroupTags, Parameters, TagsItem, TagsStateModel } from '../../models/tags.model';
import { Datetime } from '../../services/datetime';
import { HttpService } from '../../services/http.service';
import { Store } from '@ngrx/store';
import { RequestHistorian2Model, RequestHistorianModel } from '../../models/request.model';
import { ResponseHistorianModel } from '../../models/response.model';
import * as TagsAction from '../../../store/actions/tags.actions';
import * as TagsSelectors from '../../../store/selectors/tags.selectors';

@Component({
  selector: 'app-tag-container',
  standalone: false,
  templateUrl: './tag-container.html',
  styleUrl: './tag-container.scss'
})
export class TagContainer implements OnChanges, OnDestroy {

  dateSelect: boolean = false;
  startDate: Date = new Date(new Date().setHours(0,0,0,0));
  endDate: Date = new Date(new Date().setDate(new Date().getDate() +1));
  btnLoadingState = signal<boolean>(false);
  public selectedMoment2 = new FormControl(new Date());
  tagConfig = input<TagsListConfig[]>([]);
  siteName = input<string>('');
  tagsGroupStatus = signal<boolean>(true);
  @Output() clrDatas = new EventEmitter();
  @Output() emitResponse = new EventEmitter();
  @Output() isLoading = new EventEmitter();
  @Output() emitDate = new EventEmitter();
  tagsGroup = signal<GroupTags[]>([]);

  private dateTime = inject(Datetime);
  private http = inject(HttpService);
  private store = inject(Store);

  constructor(){
    // effect(() => {
    //   if(this.siteName()){
    //     //console.log(this.tagConfig())
    //     const tagState: any = this.store.select(TagsSelectors.getTagsGroupWithName(this.siteName()))
    //       .subscribe((tag) => {
    //         //console.log(tag)
    //         if(tag && tag.length > 0){
    //           this.tagsGroup.set(tag);
    //         } else {
    //           const tags = this.getTagsGroup();
    //           this.tagsGroup.set(tags);
    //         }
    //       });
    //   }
    // });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(this.tagConfig()){
      const tagState: any = this.store.select(TagsSelectors.getTagsGroupWithName(this.siteName()))
        .subscribe((tag) => {
          //console.log(tag)
          if(tag && tag.length > 0){
            //this.tagsGroup.set(tag);
            const tags = this.getTagsGroup();
            this.tagsGroup.set(tags);
          } else {
            const tags = this.getTagsGroup();
            this.tagsGroup.set(tags);
          }
        });
    }
    this.emitDate.emit({
      type: 'start',
      value: this.startDate.toISOString()
    });
    this.emitDate.emit({
      type: 'end',
      value: this.endDate.toISOString()
    });
  }

  ngOnDestroy(): void {
    const tagsGroup: TagsStateModel = {
      name: this.siteName(),
      tags: this.tagsGroup()
    }
    this.store.dispatch(TagsAction.setTags({ payload: tagsGroup }));
  }

  onDateSelect(event: any, type: string = 'start'){
    if(type == 'start'){
      this.startDate = event;
    } else if(type == 'end'){
      this.endDate = event;
    }
    this.emitDate.emit({
      type: type,
      value: event.toISOString()
    })
  }

  getTagsGroup(): GroupTags[] {
    let index: number = 0;
    let res: GroupTags[] = this.tagConfig().map(function(x){
      let groupArr: any[] = [];
      let aliasArr: Parameters[] = [];
      let eqmnt:Equipments[] = [];
      let status: boolean = false;
      if(index == 0){status = true;}
      else{status = false;}
      eqmnt = x.equipments.reduce((acc, cur) => {
        if(cur.groupName){
          if(acc.find( ac => ac.name == cur.groupName)){
            acc.find( ac => ac.name == cur.groupName).alias.push({name: cur.name, status: false});
          } else {
            acc.push({name: cur.groupName, status: false, alias: [{name: cur.name, status: false}]});
          }
        } else {
          if(index == 0){acc.push({name: cur.name, status: false});}
          else{acc.push({name: cur.name, status: false});}
        }
        return acc;
      }, groupArr); 
      let param: Parameters[] = [];
      param = x.parameters.reduce((acc, cur) => {
        if(cur.groupName && cur.dataType != "string"){
          if(acc.find( ac => ac.name == cur.groupName)){
            acc.find( ac => ac.name == cur.groupName)?.alias?.push({name: cur.name, status: false, type: cur.scale || ''});
          } else {
            acc.push({name: cur.groupName, status: false, type: '', alias: [{name: cur.name, status: false, type: cur.scale || ''}]});
          }
        } else if(!cur.dataType) {
          acc.push({name: cur.name, status: false, type: cur.scale || ''});
        } else {
          acc.push({name: cur.name, status: false, type: cur.scale || ''});
        }
        return acc;
      }, aliasArr); 
      index++;
      return {
        name: x.name,
        status: status,
        equipments: eqmnt,
        parameters: param,
      };
    });
    //console.log(res);
    return res;
  }

  selectGroup(idx: number){
    this.tagsGroup().forEach((item, index) => {
      if(index == idx){
        item.status = true;
      } else {item.status = false;}
      return item;
    })
  }

  selectAllEquipment(item: any, name:string, value: any){
    if(item.name == "ALL"){
      this.tagsGroup().find(x => x.name == name)?.equipments.forEach(i => {return i.status = value.currentTarget.checked;});
    } else {
      return item.status = value.currentTarget.checked;
    }
  }

  selectEquipment(item: any, aliasname:string,  eqmnt:string ,value: any){
    const res = this.tagsGroup().find(x => x.name == eqmnt)?.equipments
    .find(d => d.name == aliasname && d.alias && d.alias.length > 0)?.alias;
    if(item.name == "ALL" && res){
      res.forEach(i => {return i.status = value.currentTarget.checked;});
    } else {
      return item.status = value.currentTarget.checked;
    }
  }

  // selectParameter(item: any, value: any){
  //   const checked = value.currentTarget.checked;
  //   // update the nested parameters/alias immutably to avoid mutating read-only objects
  //   const updated = this.tagsGroup().map(group => {
  //     const newParameters = group.parameters.map(param => {
  //       // if parameter has aliases, either the param itself or one of its aliases might match
  //       if(param.alias && param.alias.length > 0){
  //         if(param.name === item.name){
  //           return {...param, status: checked};
  //         }
  //         const aliasIndex = param.alias.findIndex(a => a.name === item.name);
  //         if(aliasIndex > -1){
  //           const newAlias = param.alias.map(a => a.name === item.name ? {...a, status: checked} : a);
  //           return {...param, alias: newAlias};
  //         }
  //         return param;
  //       } else {
  //         if(param.name === item.name){
  //           return {...param, status: checked};
  //         }
  //         return param;
  //       }
  //     });
  //     return {...group, parameters: newParameters};
  //   });
  //   this.tagsGroup.set(updated);
  // }

  selectParameter(item: any, paramName: string, groupName: string, value: any){
    const checked = value.currentTarget.checked;
    if(item.name === "ALL"){
      if(paramName){
        // "ALL" in alias of a parameter
        const group = this.tagsGroup().find(g => g.name === groupName);
        const param = group?.parameters.find(p => p.name === paramName);
        if(param && param.alias){
          param.alias.forEach(alias => alias.status = checked);
        }
      } else {
        // "ALL" in main parameters
        const group = this.tagsGroup().find(g => g.name === groupName);
        if(group){
          group.parameters.forEach(param => {
            param.status = checked;
            if(param.alias){
              param.alias.forEach(alias => alias.status = checked);
            }
          });
        }
      }
    } else {
      item.status = checked;
    }
  }

  ckeckParamStatus(name: string){
    const check = this.tagsGroup().find(x => x.name == name)?.parameters.filter(x => x.status == true && !x.alias);
    if(check && check.length > 0){
      return true;
    } else {
      return false;
    }
  }

  ckeckGroupParamStatus(item: any[]){
    const check = item.filter(x => x.status == true );
    if(check && check.length > 0){
      return true;
    } else {
      return false;
    }
  }

  clearParamStatus(name: string){
    this.tagsGroup().find(x => x.name == name)?.parameters.forEach(i => {
      if(i.alias){
        return i.status;
      } else {
        return i.status = false;
      }
    })
  }

  clearGroupParamStatus(item: any[]){
    return item.forEach(x => {return x.status = false;});
  }

  showItems(item: any){
    item.status = !item.status;
    return item;
  }

  checkResult(){
    //console.log(this.tagsGroup())
  }

  sunmitTags(){
    let startDate = this.dateTime.getDateTime(this.startDate);
    let endDate = this.dateTime.getDateTime(this.endDate);
    let site = this.siteName();
    let request: RequestHistorianModel[][] = [];
    this.tagsGroup().forEach((item, index) => {
      const result: EmitPeriodResult = {
        startDate: this.dateTime.getDateTime(this.startDate),
        endDate: this.dateTime.getDateTime(this.endDate),
        tagsList: []
      }
      let group: string[] = [];
      let alias: any[] = [];
      item.equipments.forEach(i => {
        if(i.status && !i.alias && i.name != 'ALL' ){group.push(i.name)}
        else if(i.status && i.alias && i.alias.length > 0){
          let arrItems: TagsItem[] = i.alias;
          arrItems.forEach(x => {
            if(x.status && x.name != 'ALL'){group.push(x.name)}
          });
        }
      });
      let req: RequestHistorian2Model = {};
      let param = item.parameters.reduce((acc, cur) => {
        if( acc[cur.type] && cur.status && !cur.alias ){
          acc[cur.type] = acc[cur.type].concat(group.map(function(x){
            let res: RequestHistorianModel = {
              Name: site + '.' + x + '.' + cur.name,
              Options: {Time:'', StartTime: startDate, EndTime: endDate}
            }
            return res;
          }));
        } else if( !acc[cur.type] && cur.status && !cur.alias ) {
          acc[cur.type] = group.map(function(x){
            let res: RequestHistorianModel = {
              Name: site + '.' + x + '.' + cur.name,
              Options: {Time:'', StartTime: startDate, EndTime: endDate}
            }
            return res;
          }); 
        } else if(cur.alias && cur.alias.length > 0){
          let arrItems: TagsItem[] = cur.alias;
          arrItems.forEach(x =>{
            if(x.type && acc[x.type] && x.status){
              acc[x.type] = acc[x.type].concat(group.map(function(d){
                let res: RequestHistorianModel = {
                  Name: site + '.' + d + '.' + x.name,
                  Options: {Time:'', StartTime: startDate, EndTime: endDate}
                }
                return res;
              }));
            } else if(x.type && !acc[x.type] && x.status){
              acc[x.type] = group.map(function(d){
                let res: RequestHistorianModel = {
                  Name: site + '.' + d + '.' + x.name,
                  Options: {Time:'', StartTime: startDate, EndTime: endDate}
                }
                return res;
              }); 
            }
          })
        }
        return acc;
      }, req);
      alias = Object.entries(param).map(([key, value]) => value);
      request = request.concat(alias);
    });
    //console.log(request);
    this.clrDatas.emit()
    this.getHisData(request);
  } 

  getHisData(req: RequestHistorianModel[][]){
   
    req.forEach( async item => {
      this.btnLoadingState.set(true);
      this.isLoading.emit(true);
      await this.http.getHistorian(item)
      .then(response => response)
      .then(data => {
        const rawData: ResponseHistorianModel[] = data;
        this.emitResponse.emit(rawData);
        this.btnLoadingState.set(false);
         this.emitDate.emit({
          type: 'start',
          value: this.startDate.toISOString()
        });
        this.emitDate.emit({
          type: 'end',
          value: this.endDate.toISOString()
        });
        this.isLoading.emit(false);
        return data;
      })
      .catch( err => console.log(err));
    });
  }

  clearTagsStatus(){
    this.tagsGroupStatus.set(false);
    this.tagsGroup().forEach(item => {
      item.equipments.forEach(x => { x.alias?.forEach(d => d.status = false); x.status = false; });
      item.parameters.forEach(x => { x.alias?.forEach(d => d.status = false); x.status = false; });
    })
  }

}

