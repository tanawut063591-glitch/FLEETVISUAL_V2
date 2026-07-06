import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { SiteModel, SiteStateModel, ZoneModel } from '../../../shared/models/config.model';
import { DateStateModel, NavbarStateModel } from '../../../shared/models/navigate.model';
import { Observable, Subscription, timer } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { HttpService } from '../../../shared/services/http.service';
import { Router } from '@angular/router';
import { AppInitService } from '../../../shared/services/app-init.service';
import { Store } from '@ngrx/store';
import { AppStateModule } from '../../../store/app.state';
import { getNavState, getLastLocation } from '../../../store/selectors/nav.selectors';
import { addState } from '../../../store/actions/nav.actions';
import { setSite } from '../../../store/actions/site.actions';
import { ThemeService } from '../../../shared/services/theme.service';
import { getDateState } from '../../../store/selectors/date.selectors';
import { setDate, setDateEnable } from '../../../store/actions/date.actions';
import { resetLayoutState } from '../../../features/sites/store/actions/layout.action';
import { resetDashboardState } from '../../../features/sites/store/actions/dashboard.action';
import { resetEfficiencyState } from '../../../features/sites/store/actions/performance.action';
import { resetDiagramState } from '../../../features/sites/store/actions/diagram.action';
import { resetTags } from '../../../store/actions/tags.actions';
import { MessageService } from 'primeng/api';
import { ToastStateModel } from '../../../shared/models/toast.model';
import { getToastState } from '../../../store/selectors/toaster.selectors';
import { FloatingDialogService } from '../../../shared/pipes/floating-dialog.service';
import { EventSummaryModel } from '../../../features/sites/models/event.model';
import { setEventSummary } from '../../../store/actions/event.actions';
import { getEventSummary } from '../../../store/selectors/event.selectors';


@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  standalone: false
})
export class Navbar implements OnInit, OnDestroy {
  navState$: Observable<NavbarStateModel>;
  dateState$: Observable<DateStateModel>;
  toastState$: Observable<ToastStateModel>;
  eventSummary$: Observable<EventSummaryModel[]>;

  siteConfig = signal<SiteStateModel>({ name: '', number: 0, capacity: '', zoneList: [] });
  zoneList = signal<ZoneModel>({ title: '', number: 0, capacity: '', display: '', siteList: [] });
  currentNavState = signal<NavbarStateModel>({ name: '', location: '' });
  eventSummary = signal<EventSummaryModel[]>([]);
  isHided: boolean = false;
  seachText: string = '';
  zoneSelected: string = 'OVERVIEW';
  user: string | undefined = '';
  role: string | undefined = '';
  sub1?: Subscription;
  dateStateSubscription?: Subscription;
  navStateSubscription?: Subscription;
  toastStateSubscription?: Subscription;
  timerSubscription?: Subscription;
  siteName: string = "";
  timers: number = 10;
  mode = signal<'dark' | 'light'>('dark');
  logoUrl = signal<string>('assets/images/logo-dark.png');
  date: Date = new Date();
  enableDate = signal<boolean>(false);
  enableSite: string[] = [];
  enablePage = signal<string[]>([]);

  private auth =  inject(AuthService);
  private http =  inject(HttpService);
  private router =  inject(Router);
  private appInit =  inject(AppInitService);
  private store = inject(Store);
  private theme = inject(ThemeService);
  private messageService = inject(MessageService);
  private dialog = inject(FloatingDialogService);

  constructor(){
    this.navState$ = this.store.select(getNavState);
    this.dateState$ = this.store.select(getDateState);
    this.toastState$ = this.store.select(getToastState);
    this.eventSummary$ = this.store.select(getEventSummary);

    this.dateStateSubscription = this.dateState$.subscribe(state => {
      this.date = state.date;
      this.enableDate.set(state.enable);
    });
    this.navStateSubscription = this.navState$.subscribe(state => {
      this.currentNavState.set(state);
      //console.log('NAV STATE:', state);
      // if(!state.name && !state.location && !this.router.url.includes('billing')){
      //   this.router.navigate(['/'])
      // }
    });
    this.toastStateSubscription = this.toastState$.subscribe(state => {
      if(state && state.message){
        switch (state?.message?.severity) {
          case 'success':
            this.messageService.add({ severity: 'success', summary: 'Success', detail: state.message.detail });
            break;
          case 'info':
            this.messageService.add({ severity: 'info', summary: 'Info', detail: state.message.detail });
            break;
          case 'warn':
            this.messageService.add({ severity: 'warn', summary: 'Warn', detail: state.message.detail });
            break;
          case 'error':
            this.messageService.add({ severity: 'error', summary: 'Error', detail: state.message.detail });
            break;
          case 'secondary':
            this.messageService.add({ severity: 'secondary', summary: 'Secondary', detail: state.message.detail });
            break;
          default:
            break;
        }
      }
    });
    this.sub1 = this.eventSummary$.subscribe(data => {
      this.eventSummary.set(data);
    });
  }

  ngOnInit(): void {
    this.user = localStorage.getItem('user') || '---';
    this.role = localStorage.getItem('role') || '---';
    const theme = localStorage.getItem('theme');
    if(theme){
      this.mode.set(theme as 'dark' | 'light');
      this.theme.setTheme(this.mode() as 'dark' | 'light');
      this.logoUrl.set(this.mode() === 'dark' ? 'assets/images/logo-dark.png' : 'assets/images/logo-light.png');
    } else {
      this.mode.set('dark');
      this.theme.setTheme('dark');
    }
    const pages = localStorage.getItem('pages');
    if(pages){
      this.enablePage.set(JSON.parse(pages));
    }
    this.getSiteConfig();
    this.getEventSummary();
    if(this.appInit.config.Timer){
      this.startTimer(this.appInit.config.Timer * 60000);
    }
  }

  ngOnDestroy(): void {
    this.dateStateSubscription?.unsubscribe();
    this.navStateSubscription?.unsubscribe();
    this.toastStateSubscription?.unsubscribe();
    this.sub1?.unsubscribe();
    this.timerSubscription?.unsubscribe();
  }

  show() {
    this.messageService.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: 'Message Content', 
      life: 3000 
    });
  }

  async getEventSummary(){
    const d = new Date();
    d.setHours(0,0,0,0);
    const tmr = new Date().setDate(d.getDate()+1);
    const request = {
      StartTime: new Date(d).toISOString(),
      EndTime: new Date(tmr).toISOString()
    }
    const result = await this.http.getSummaryAlarmEventData(request);
    if(result.length > 0){
      this.store.dispatch(setEventSummary({ payload: result }));
    } else {
      this.store.dispatch(setEventSummary({ payload: [] }));
    }
  }

  async getSiteConfig(){
    const storeData = localStorage.getItem('sites');
    const avaiableSites: string[] = storeData ? JSON.parse(storeData) : [];
    const config: SiteStateModel = await this.http.getConfig2('assets/sitelist.json');
    if(config){
      const filterSite: SiteStateModel = {
        ...config,
        zoneList: config.zoneList.map(x => {
          return {
            ...x,
            siteList: x.siteList.filter(y => avaiableSites.includes(y.id))
          }
        })
      }
      this.siteConfig.set(filterSite);
      this.store.dispatch(setSite({payload: filterSite}));
      if(filterSite && filterSite.zoneList.length == 1){
        const zonselected = filterSite.zoneList[0];
        this.zoneList.set(zonselected);
        this.store.dispatch(addState({
          payload: {
            name: 'zone',
            location: zonselected.title
          }
        }));
      } else {
        this.store.dispatch(addState({
          payload: {
            name: 'overall',
            location: 'TH'
          }
        }));
      }
    }
  }

  startTimer(dueTimer: number) {
    this.timerSubscription = timer(dueTimer, dueTimer).subscribe(x => {
      this.getEventSummary();
    });
  }

  logOut(){
    this.auth.logout();
  }

  openSettings(){
    this.router.navigate(['/main/setting'])
  }

  showProfileDialog = signal<boolean>(false);

  openProfile(): void {
    this.showProfileDialog.set(true);
  }

  closeProfile(): void {
    this.showProfileDialog.set(false);
  }

  getPlantStatus(pointSource: string){
    const summary = this.eventSummary().find(x => x.PointSource === pointSource);
    if(summary){
      if(summary.Major > 0){
        return 'major-icon'; 
      } else if(summary.Minor > 0){
        return 'minor-icon';
      } else if(summary.Warning > 0){
        return 'warning-icon';
      } else if(summary.Info > 0){
        return 'hide-icon';
      } else {
        return 'hide-icon';
      }
    } else {
      return 'hide-icon';
    } 
  }

  getZoneSelected(name: any){
    ////console.log();
    //const zone = this.store.selectSnapshot(SiteState.getZoneConfig(name));
    //if(zone){
    //  this.zoneList = zone;
    //  this.isChanged = true;
    //  this.store.dispatch(new AddState({
    //    name: 'zone',
    //    locaion: name
    //  }));
    //  this.navState.set({
    //    name: 'zone',
    //    locaion: name
    //  });
    //  this.router.navigate(['/main/sitelist'])
    //  ////console.log(name)
    //}
    ////console.log(this.zoneList)
  }

  zoneTrackBy(index: number, item: ZoneModel) {
    return item.title;
  }

  siteTrackBy(index: number, item: SiteModel) {
    return item.id;
  }

  changeSiteList(name: string){
    //this.isChanged = false;
    //this.navState.set({
    //  name: 'overall',
    //  locaion: name
    //});
    //this.store.dispatch(new AddState({
    //  name: 'overall',
    //  locaion: name
    //}));
    //this.router.navigate(['/main/overview']);
  }

  changeNavState(state: string, name: string, isEnabled: boolean = true){
    if(!isEnabled){
      this.messageService.add({ severity: 'warn', summary: 'Site Disabled', detail: 'This site is currently disabled.' });
      return;
    }
    if(state == 'site' && this.currentNavState().name != 'site'){
      this.store.dispatch(addState({
        payload: {
          name: state,
          location: name
        }
      }));
      this.clearPageState();
      this.router.navigate(['/main/layout'])
    } else {
      this.clearPageState();
      this.store.dispatch(addState({
        payload: {
          name: state,
          location: name
        }
      }));
    }
  }

  clearPageState(){
    this.store.dispatch(resetLayoutState());
    this.store.dispatch(resetDashboardState());
    this.store.dispatch(resetEfficiencyState());
    this.store.dispatch(resetDiagramState());
    this.store.dispatch(resetTags());
  }

  onSiteChange(event: Event) {
    const selectEl = event.target as HTMLSelectElement;
    const value = selectEl.value;
    this.changeNavState('site', value);
  }

  searchValue(){
    //const text:string = this.seachText;
    //const zone = [...new Set(this.siteConfig().zoneList.map(
    //  function(item){
    //    return item.siteList.filter(x => x.id.includes(text.toUpperCase()));
    //  }).flat())
    //].sort((a, b) => a.id.toUpperCase().localeCompare(b.id.toUpperCase()));
    //if(zone.length > 0 && text){
    //  this.isChanged = true;
    //  this.zoneList.set({...this.zoneList(), siteList: zone});
    //} else {
    //  this.isChanged = false;
    //}
  }

  toggleNavBarState(){
    this.isHided = !this.isHided;
  }

  getNumber(val: any) {
    if (typeof val === 'number') {
      const v = +val.toFixed(2);
      return v;
    }
    else {
      return parseInt(val);
    }
  }

  changeColor(name: string){
    if(name == this.currentNavState().location){
      const active = '#10FDD3';
      return active
    } else {
      return '#bcd'
    }
  }

  changeBgColor(name: string){
    if(name == this.currentNavState().location){
      const active = '#2C4549';
      return true;
    } else {
      return false;
    }
  }

  getActiveCard(){
    let result = false
    switch(this.currentNavState().name){
      case 'zone':
        result = true;
        break;
      default:
        result = false;
        break
    }
    if(this.currentNavState().location == 'THAILAND'){
      result = true;
    }
    return result;
  }

  changTheme(){
    if(this.mode() == 'dark'){
      this.theme.setTheme('light');
      this.logoUrl.set('assets/images/logo-light.png');
      this.mode.set('light');
    } else {
      this.theme.setTheme('dark');
      this.logoUrl.set('assets/images/logo-dark.png');
      this.mode.set('dark');
    }   
  }

  onDateSelect(event: any) {
    this.date = event;
    this.store.dispatch(setDate({ payload: this.date }));
  }

  openDialog() {
    this.dialog.open('assistant');
  }

  checkPageAvailable(page: string): boolean {
    if(this.enablePage().length == 0){
      return false;
    } else {
      return this.enablePage().includes(page);
    }
  }


}
