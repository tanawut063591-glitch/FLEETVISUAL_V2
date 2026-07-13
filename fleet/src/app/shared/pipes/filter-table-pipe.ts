import { Pipe, PipeTransform } from '@angular/core';
import { ResponseTagsModel } from '../models/tags.model';

@Pipe({
  name: 'filterTable',
  standalone: false
})
export class FilterTablePipe implements PipeTransform {

  transform(data: ResponseTagsModel[], searchText: string): ResponseTagsModel[] {
    if (!data || !searchText) {
      return data;
    }
    return data.filter(item =>
      item.Name.toLowerCase().includes(searchText.toLowerCase())
      || item.Group.toLowerCase().includes(searchText.toLowerCase())
      || item.Description.toLowerCase().includes(searchText.toLowerCase())
      || item.DataType.toLowerCase().includes(searchText.toLowerCase())
    );
  }

}
