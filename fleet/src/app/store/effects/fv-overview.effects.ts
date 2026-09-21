import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import {
  Observable,
  of,
  catchError,
  exhaustMap,
  map,
  timeout
} from 'rxjs';

import * as fvOverviewActions from '../actions/fv-overview.action';
import { ResponseRealtime } from '../models/response';
import { NewHttpClientService } from '../../shared/services/http-client1.service';


interface OverviewRequest {
  Name: string[];
}


interface OverviewDataItem {
  tagName: string;
  name: string;
  value: string;
  dateTime: any;
  cal: boolean;
}


@Injectable()
export class FvOverviewEffects {

  /*
   * ใช้ Observable ชัดเจน
   * เพื่อป้องกันปัญหา Actions ไม่มี .pipe()
   */
  private readonly actions$: Observable<any> =
    inject(Actions) as unknown as Observable<any>;

  private readonly newHttp =
    inject(NewHttpClientService);


  /**
   * GET FV OVERVIEW
   */
  setFvDataActive$ = createEffect(() =>
    this.actions$.pipe(

      ofType(fvOverviewActions.GET_FV_OVERVIEW),

      exhaustMap((action: any) => {

        /*
         * ตรวจสอบ payload
         */
        const payload: any[] =
          Array.isArray(action?.payload)
            ? action.payload
            : [];


        /*
         * Clone ข้อมูล
         * เพื่อไม่แก้ State เดิมโดยตรง
         */
        const overviewItems =
          this.cloneOverviewPayload(payload);


        /*
         * สร้าง Request สำหรับ API
         */
        const request =
          this.buildOverviewRequest(overviewItems);


        /*
         * ถ้าไม่มี Tag
         * ไม่จำเป็นต้อง Call API
         */
        if (request.Name.length === 0) {

          return of(
            new fvOverviewActions.GetFvOverviewSuccess(
              overviewItems
            )
          );
        }


        /*
         * Call API
         */
        return this.newHttp
          .getOverviewCurrentsValues(request)
          .pipe(

            /*
             * Timeout 15 วินาที
             */
            timeout(15000),


            /*
             * API Success
             */
            map((res: any) => {

              const realtimeResponse =
                this.extractRealtimeArray(res);


              const result =
                this.mapRealtimeToOverview(
                  overviewItems,
                  realtimeResponse
                );


              return new fvOverviewActions
                .GetFvOverviewSuccess(result);
            }),


            /*
             * API Error
             */
            catchError((error: any) => {

              console.error(
                '[FvOverviewEffects] GET_FV_OVERVIEW error:',
                error
              );


              return of(
                new fvOverviewActions
                  .GetFvOverviewFailure(error)
              );
            })
          );
      })
    )
  );


  /**
   * Clone Overview Payload
   */
  private cloneOverviewPayload(
    payload: any[]
  ): any[] {

    if (!Array.isArray(payload)) {
      return [];
    }


    return payload.map((item: any) => ({

      ...item,

      tags:
        Array.isArray(item?.tags)
          ? [...item.tags]
          : [],

      datas: []

    }));
  }


  /**
   * Build API Request
   *
   * ตัวอย่าง:
   *
   * {
   *   Name: [
   *      "SC-GLORY-1-ME1-RPM",
   *      "SC-GLORY-1-SPEED"
   *   ]
   * }
   */
  private buildOverviewRequest(
    items: any[]
  ): OverviewRequest {

    /*
     * ใช้ Set
     * เพื่อป้องกัน Tag ซ้ำ
     */
    const names =
      new Set<string>();


    for (const item of items) {

      const tags =
        Array.isArray(item?.tags)
          ? item.tags
          : [];


      for (const tag of tags) {

        const tagName =
          typeof tag?.tagName === 'string'
            ? tag.tagName.trim()
            : '';


        if (tagName.length > 0) {
          names.add(tagName);
        }
      }
    }


    return {
      Name: Array.from(names)
    };
  }


  /**
   * Extract Realtime Array
   *
   * รองรับ Response หลายรูปแบบ
   */
  private extractRealtimeArray(
    response: any
  ): ResponseRealtime[] {

    /*
     * Case 1:
     *
     * [
     *   {...},
     *   {...}
     * ]
     */
    if (Array.isArray(response)) {

      return response as ResponseRealtime[];
    }


    /*
     * Case 2:
     *
     * {
     *   body: [...]
     * }
     */
    if (Array.isArray(response?.body)) {

      return response.body as ResponseRealtime[];
    }


    /*
     * Case 3
     */
    const candidates: any[] = [

      response?.data,
      response?.Data,

      response?.result,
      response?.Result,

      response?.results,
      response?.Results,

      response?.items,
      response?.Items,

      response?.values,
      response?.Values

    ];


    for (const candidate of candidates) {

      if (Array.isArray(candidate)) {

        return candidate as ResponseRealtime[];
      }
    }


    /*
     * Case 4
     *
     * {
     *   body: {
     *      data: [...]
     *   }
     * }
     */
    const bodyCandidates: any[] = [

      response?.body?.data,
      response?.body?.Data,

      response?.body?.result,
      response?.body?.Result,

      response?.body?.results,
      response?.body?.Results,

      response?.body?.items,
      response?.body?.Items,

      response?.body?.values,
      response?.body?.Values

    ];


    for (const candidate of bodyCandidates) {

      if (Array.isArray(candidate)) {

        return candidate as ResponseRealtime[];
      }
    }


    console.warn(
      '[FvOverviewEffects] Realtime response array not found:',
      response
    );


    return [];
  }


  /**
   * Map Realtime Data
   * เข้า Overview
   */
  private mapRealtimeToOverview(
    overviewItems: any[],
    response: ResponseRealtime[] = []
  ): any[] {

    const responseList: ResponseRealtime[] =
      Array.isArray(response)
        ? response
        : [];


    /*
     * Key = TagName
     *
     * ทำให้ค้นหาข้อมูลเร็วขึ้น
     */
    const dataByTagName =
      new Map<string, OverviewDataItem>();


    /*
     * Convert Response จาก API
     */
    for (const item of responseList) {

      /*
       * Tag Name
       */
      const tagName =
        item?.Name !== null &&
        item?.Name !== undefined
          ? String(item.Name).trim()
          : '';


      /*
       * ไม่มี Tag Name
       * ไม่เอาข้อมูลนี้
       */
      if (tagName.length === 0) {
        continue;
      }


      /*
       * Realtime Value
       */
      const realtimeValue =
        item?.Value !== null &&
        item?.Value !== undefined
          ? String(item.Value)
          : '0';


      /*
       * Realtime Timestamp
       */
      const realtimeDateTime =
        item?.TimeStamp !== null &&
        item?.TimeStamp !== undefined
          ? item.TimeStamp
          : '';


      /*
       * บันทึกเข้า Map
       */
      dataByTagName.set(
        tagName,
        {

          tagName: tagName,

          name:
            this.convertTagNameToDataName(
              tagName
            ),

          value:
            realtimeValue,

          dateTime:
            realtimeDateTime,

          cal: false
        }
      );
    }


    /*
     * Map ข้อมูลกลับไปแต่ละ Overview
     */
    return overviewItems.map(
      (overviewItem: any) => {

        const tags =
          Array.isArray(overviewItem?.tags)
            ? overviewItem.tags
            : [];


        const datas: OverviewDataItem[] =
          [];


        /*
         * Loop Tag ของ Overview
         */
        for (const tag of tags) {

          const tagName =
            typeof tag?.tagName === 'string'
              ? tag.tagName.trim()
              : '';


          /*
           * ไม่มี Tag
           */
          if (tagName.length === 0) {
            continue;
          }


          /*
           * หา Realtime Data
           */
          const realtimeData =
            dataByTagName.get(tagName);


          /*
           * Server มีข้อมูล
           */
          if (realtimeData) {

            datas.push({
              ...realtimeData
            });

          } else {

            /*
             * Server ไม่มีข้อมูล
             *
             * ยังสร้าง Tag ไว้
             * เพื่อไม่ให้ข้อมูลหายจากหน้า UI
             */
            datas.push({

              tagName: tagName,

              name:
                this.convertTagNameToDataName(
                  tagName
                ),

              value: '0',

              dateTime: '',

              cal: false

            });
          }
        }


        /*
         * Return Overview Item
         */
        return {

          ...overviewItem,

          datas: datas

        };
      }
    );
  }


  /**
   * Convert Tag Name
   *
   * ตัวอย่าง:
   *
   * SC-GLORY-1-ME1-RPM
   *
   * =>
   *
   * GLORY_1_ME1_RPM
   */
  private convertTagNameToDataName(
    tagName: string
  ): string {

    /*
     * กัน undefined / null
     */
    if (!tagName) {
      return '';
    }


    /*
     * หาตำแหน่ง "-"
     * ตัวแรก
     */
    const firstDashIndex =
      tagName.indexOf('-');


    /*
     * ตัด Prefix ด้านหน้า
     */
    const nameWithoutPrefix =
      firstDashIndex >= 0
        ? tagName.substring(
            firstDashIndex + 1
          )
        : tagName;


    /*
     * เปลี่ยน - เป็น _
     */
    return nameWithoutPrefix.replace(
      /-/g,
      '_'
    );
  }

}