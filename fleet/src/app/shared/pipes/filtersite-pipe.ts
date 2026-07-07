import { Pipe, PipeTransform } from '@angular/core';
import { SiteModel } from '../models/config.model';

@Pipe({
  name: 'filtersite',
  standalone: false,
})
export class FiltersitePipe implements PipeTransform {
  transform(sites: SiteModel[] | null | undefined, searchText: string): SiteModel[] {
    if (!Array.isArray(sites)) {
      return [];
    }

    const keyword = (searchText || '').trim().toUpperCase();

    let result = [...sites];

    if (keyword) {
      result = result.filter((site: SiteModel) => {
        const siteName = site?.name || '';
        return siteName.toUpperCase().includes(keyword);
      });
    }

    return result.sort((a: SiteModel, b: SiteModel) => {
      const idA = a?.id || '';
      const idB = b?.id || '';

      return idA.toUpperCase().localeCompare(idB.toUpperCase());
    });
  }
}