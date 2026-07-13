import { inject, Pipe, PipeTransform } from '@angular/core';
import { SiteModel } from '../models/config.model';
import { AuthService } from '../services/auth.service';

@Pipe({
  name: 'filtersite',
  standalone: false
})
export class FiltersitePipe implements PipeTransform {
  private auth = inject(AuthService);
  private enableSite = this.auth.getSites()??[];
  transform(sites: SiteModel[], searchText: string): SiteModel[] {

    const result = sites; //sites.filter(site => this.enableSite.includes(site.id));
    if (!result || !searchText) {
      return result;
    }
    
    const filteredSites = result.filter(site => 
      site.name.toUpperCase().includes(searchText.toUpperCase())
    );
    
    return filteredSites.sort((a, b) => 
      a.id.toUpperCase().localeCompare(b.id.toUpperCase())
    );
  }

}
