import { Injectable } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClientService } from '../services/http-client.service';

const API_KEY: string = 'ใส่_API_KEY_เดิมของคุณตรงนี้';

@Injectable({
  providedIn: 'root',
})
export class CoordinatesService {
  constructor(
    private decimalPipe: DecimalPipe,
    private httpClientService: HttpClientService,
  ) {}

  getLatLong(lat: string, long: string): string {
    const latText = this.getLat(lat);
    const longText = this.getLong(long);

    if (latText && longText) {
      return `${latText}, ${longText}`;
    }

    return '';
  }

  getLat(lat: string): string {
    return this.formatCoordinate(lat, 'N', 'S');
  }

  getLong(long: string): string {
    return this.formatCoordinate(long, 'E', 'W');
  }

  getUnitLat(lat: string): string {
    if (!lat || lat === '---') {
      return '';
    }

    return lat.indexOf('-') > -1 ? ' S' : ' N';
  }

  getUnitLong(long: string): string {
    if (!long || long === '---') {
      return '';
    }

    return long.indexOf('-') > -1 ? ' W' : ' E';
  }

  private formatCoordinate(value: string, positiveUnit: string, negativeUnit: string): string {
    if (!value || value === '---') {
      return '';
    }

    const isNegative = value.indexOf('-') > -1;

    const numberValue = Math.abs(Number(value));

    if (isNaN(numberValue)) {
      return '';
    }

    const formattedValue = this.decimalPipe.transform(numberValue, '0.0-5');

    if (!formattedValue) {
      return '';
    }

    return `${formattedValue} ${isNegative ? negativeUnit : positiveUnit}`;
  }

  async getNearby(vessel: any): Promise<string> {
    try {
      if (!vessel || !vessel.lat || !vessel.long) {
        return '';
      }

      const response: any = await this.httpClientService
        .getAddress(vessel.lat, vessel.long, API_KEY)
        .toPromise();

      if (
        response &&
        response.status === 'OK' &&
        response.results &&
        response.results.length > 0 &&
        response.results[0].address_components
      ) {
        const addressComponents = response.results[0].address_components;

        const routes = addressComponents.filter((component: any) => {
          return component.types && component.types.indexOf('locality') > -1;
        });

        if (routes.length > 0 && routes[0].short_name) {
          return routes[0].short_name;
        }
      }

      return '';
    } catch (ex) {
      return '';
    }
  }
}
