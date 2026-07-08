import { Injectable } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { HttpClientService } from "../services/http-client.service";

// API Key สำหรับเรียก Google Map / Address API
const API_KEY: string = "ใส่_API_KEY_เดิมของคุณตรงนี้";

@Injectable({
  providedIn: 'root',
})
export class CoordinatesService {
  constructor(
    private decimalPipe: DecimalPipe,
    private httpClientService: HttpClientService,
  ) {}

  // แสดง Latitude และ Longitude พร้อมทิศ เช่น 13.7563 N, 100.5018 E
  getLatLong(lat: string, long: string): string {
    const latText = this.getLat(lat);
    const longText = this.getLong(long);

    if (latText && longText) {
      return `${latText}, ${longText}`;
    }

    return "";
  }

  // แสดง Latitude พร้อม N หรือ S
  getLat(lat: string): string {
    return this.formatCoordinate(lat, "N", "S");
  }

  // แสดง Longitude พร้อม E หรือ W
  getLong(long: string): string {
    return this.formatCoordinate(long, "E", "W");
  }

  // คืนค่าเฉพาะหน่วยของ Latitude เช่น N หรือ S
  getUnitLat(lat: string): string {
    if (!lat || lat === "---") {
      return "";
    }

    return lat.indexOf("-") > -1 ? " S" : " N";
  }

  // คืนค่าเฉพาะหน่วยของ Longitude เช่น E หรือ W
  getUnitLong(long: string): string {
    if (!long || long === "---") {
      return "";
    }

    return long.indexOf("-") > -1 ? " W" : " E";
  }

  // จัดรูปแบบพิกัดให้สวย และใส่ทิศทางให้ถูกต้อง
  private formatCoordinate(
    value: string,
    positiveUnit: string,
    negativeUnit: string,
  ): string {
    if (!value || value === "---") {
      return "";
    }

    // เช็กว่าค่าเป็นลบหรือไม่ เพื่อเลือก N/S/E/W
    const isNegative = value.indexOf("-") > -1;

    // ใช้ค่าสัมบูรณ์ เพื่อไม่ให้แสดงเครื่องหมายลบซ้ำกับทิศทาง
    const numberValue = Math.abs(Number(value));

    if (isNaN(numberValue)) {
      return "";
    }

    // จัดทศนิยมไม่เกิน 5 ตำแหน่ง
    const formattedValue = this.decimalPipe.transform(numberValue, "0.0-5");

    if (!formattedValue) {
      return "";
    }

    return `${formattedValue} ${isNegative ? negativeUnit : positiveUnit}`;
  }

  // หา location / เมืองใกล้เคียงจากพิกัดเรือ
  async getNearby(vessel: any): Promise<string> {
    try {
      if (!vessel || !vessel.lat || !vessel.long) {
        return "";
      }

      // เรียก API เพื่อแปลง lat/long เป็นข้อมูลที่อยู่
      const response: any = await this.httpClientService
        .getAddress(vessel.lat, vessel.long, API_KEY)
        .toPromise();

      // เช็กว่า API ตอบกลับมาถูกต้องหรือไม่
      if (
        response &&
        response.status === "OK" &&
        response.results &&
        response.results.length > 0 &&
        response.results[0].address_components
      ) {
        const addressComponents = response.results[0].address_components;

        // หา address ที่เป็นประเภท locality เช่น เมือง / พื้นที่
        const routes = addressComponents.filter((component: any) => {
          return component.types && component.types.indexOf("locality") > -1;
        });

        // ถ้าเจอชื่อเมือง ให้ส่ง short_name กลับไป
        if (routes.length > 0 && routes[0].short_name) {
          return routes[0].short_name;
        }
      }

      return "";
    } catch (ex) {
      // ถ้า API error ให้คืนค่าว่าง เพื่อไม่ให้หน้า UI พัง
      return "";
    }
  }
}
