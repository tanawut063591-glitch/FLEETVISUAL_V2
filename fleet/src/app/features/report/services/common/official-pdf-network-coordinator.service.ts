import { Injectable } from '@angular/core';
import { Observable, defer } from 'rxjs';
import { finalize, shareReplay } from 'rxjs/operators';

import { HttpClientService } from '../../../../shared/services/http-client.service';
import { NewHttpClientService } from '../../../../shared/services/http-client1.service';

/**
 * Coalesce concurrent reads of the SAME official PDF, without mixing API sources.
 * SC GLORY 6 needs page 1 (engine) and page 2 (mode), previously fetching the
 * entire remote PDF twice in parallel. The per-consumer parser and fallback
 * decision remain independent. No PDF blobs survive completed requests here.
 */
@Injectable({ providedIn: 'root' })
export class OfficialPdfNetworkCoordinatorService {
  private readonly inFlight = new Map<string, Observable<Blob>>();

  constructor(
    private readonly directHttp: NewHttpClientService,
    private readonly gatewayHttp: HttpClientService,
  ) {}

  getReport(
    source: 'direct' | 'gateway',
    reportType: string,
    timestamp: string,
    vesselName: string,
  ): Observable<Blob> {
    const key = JSON.stringify([source, reportType, timestamp, vesselName.trim().toUpperCase()]);
    const active = this.inFlight.get(key);
    if (active) return active;

    const request$ = defer(() =>
      source === 'direct'
        ? this.directHttp.getReport(reportType, timestamp, vesselName)
        : this.gatewayHttp.getReport(reportType, timestamp, vesselName),
    ).pipe(
      finalize(() => {
        if (this.inFlight.get(key) === request$) this.inFlight.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.inFlight.set(key, request$);
    return request$;
  }
}
