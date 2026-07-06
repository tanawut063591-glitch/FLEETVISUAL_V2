import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SiteModel, SiteStateModel, ZoneModel } from '../../shared/models/config.model';

export const selectSiteState = createFeatureSelector<SiteStateModel>('site');

export const getAllConfig = () => createSelector(
  selectSiteState,
  (state: SiteStateModel) => state.zoneList
);

export const getZoneConfig = (name: string) => createSelector(
  selectSiteState,
  (state: SiteStateModel) => state.zoneList.find(s => s.title === name)
);

export const getSiteConfig = (name: string) => createSelector(
  selectSiteState,
  (state: SiteStateModel) => state.zoneList
    .map(zone => zone.siteList.find(i => i.id === name))
    .reduce<SiteModel | undefined>((acc, cur) => cur ?? acc, undefined) ?? ({
      id: '', name: '', project: '', location: '', capacity: '', invtype: ''
    } as SiteModel)
);

export const getProvinceWithZone = (zone: string) => createSelector(
  selectSiteState,
  (state: SiteStateModel) => {
    const result: ZoneModel[] = [];
    switch (zone) {
      case 'THAILAND':
        state.zoneList.forEach(z => {
          z.siteList.forEach(item => {
            const province = item.location.split(',')[2];
            let prev = result.find(i => i.title === province);
            if (prev) {
              prev.number += 1;
              prev.capacity = (parseFloat(prev.capacity) + parseFloat(item.capacity)).toFixed(2);
              if (!prev.siteList.find(x => x.id.startsWith(item.id))) {
                prev.siteList.push(item);
              }
            } else {
              result.push({
                title: province,
                number: 1,
                capacity: parseFloat(item.capacity).toFixed(2),
                display: '',
                siteList: [item]
              });
            }
          });
        });
        break;
      default:
        state.zoneList.find(x => x.title === zone)?.siteList.forEach(item => {
          const province = item.location.split(',')[2];
          let prev = result.find(i => i.title === province);
          if (prev) {
            prev.number += 1;
            prev.capacity = (parseFloat(prev.capacity) + parseFloat(item.capacity)).toFixed(2);
            prev.siteList.push(item);
          } else {
            result.push({
              title: province,
              number: 1,
              capacity: parseFloat(item.capacity).toFixed(2),
              display: '',
              siteList: [item]
            });
          }
        });
        break;
    }
    return result;
  }
);

export const getSiteWithProvidence = (province: string, zones: string[]) => createSelector(
  selectSiteState,
  (state: SiteStateModel) => {
    const result: ZoneModel = {
      title: province,
      number: 0,
      capacity: '0',
      display: '',
      siteList: []
    };
    zones.forEach(z => {
      state.zoneList.find(n => n.title === z)?.siteList.forEach(item => {
        const prov = item.location.split(',');
        if (prov && prov[2] === province) {
          result.siteList.push(item);
          result.number += 1;
          result.capacity = (parseFloat(result.capacity) + parseFloat(item.capacity)).toFixed(2);
        }
      });
    });
    return result;
  }
);


