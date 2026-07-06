import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { FloatingDialogService } from '../../pipes/floating-dialog.service';
import { HttpService } from '../../services/http.service';
import { SiteModel } from '../../models/config.model';
import { Store } from '@ngrx/store';
import { getZoneConfig } from '../../../store/selectors/site.selectors';
import { ResponseTagsModel, TagsStateModel } from '../../models/tags.model';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-tag-dialog',
  standalone: false,
  templateUrl: './tag-dialog.html',
  styleUrl: './tag-dialog.scss',
})
export class TagDialog implements OnInit{
  searchInput = signal<string>('');
  seachText: string = '';
  tagList = signal<ResponseTagsModel[]>([]);
  siteList = signal<SiteModel[]>([]);
  siteSelected = signal<string>('');
  isLoading = signal<boolean>(false);
  filteredTags = signal<ResponseTagsModel[]>([]);

  private searchSubject = new Subject<string>();
  private dialogService = inject(FloatingDialogService);
  private httpService = inject(HttpService);
  private store = inject(Store);

  ngOnInit(): void {
    this.store.select(getZoneConfig('CENTRAL1')).subscribe(zone => {
      if(zone){
        this.siteList.set(zone.siteList);
      }
    });

    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        return new Promise<string>(resolve => resolve(searchTerm));
      })
    ).subscribe(searchTerm => {
      //console.log('Searching tags with term:', searchTerm);
      this.searchInput.set(searchTerm);
      this.updateFilteredTags();
    });
  }

  updateTagSearchInput(value: string) {
    //console.log('Tag search input changed:', value);
    this.searchSubject.next(value);
  }

  updateFilteredTags() {
    const search = this.searchInput().toLowerCase().trim();
    if (!search) {
      this.filteredTags.set(this.tagList());
    } else {
      const filtered = this.tagList().filter(x => 
        x.Name.toLowerCase().includes(search)
        || x.Group.toLowerCase().includes(search)
        || x.Description.toLowerCase().includes(search)
        || x.DataType.toLowerCase().includes(search)
      );
      this.filteredTags.set(filtered);
    }
  }

  async searchTag(siteCode?: string) {
    if(siteCode && siteCode.length > 0){
      this.siteSelected.set(siteCode);
    } else {
      this.siteSelected.set('');
      this.tagList.set([]);
      this.filteredTags.set([]);
      return;
    };

    this.isLoading.set(true);
    try {
      const tag: any = await this.httpService.getTagConfigByPointSource(siteCode || this.siteSelected());
      if(tag){
        //console.log(tag);
        this.tagList.set(Array.isArray(tag) ? tag : [tag]);
        this.filteredTags.set(this.tagList());
      } else {
        this.tagList.set([]);
      }
    } catch (error) {
      //console.error('Error searching tags:', error);
      this.tagList.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }


  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      //console.log('Tag name copied to clipboard:', text);
      // Optional: Show a toast notification here
    }).catch(err => {
      //console.error('Failed to copy to clipboard:', err);
    });
  }

  close() {
    this.dialogService.close();
  }
}
