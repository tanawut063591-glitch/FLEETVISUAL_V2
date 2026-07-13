import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil, timeout } from 'rxjs/operators';

import { HttpClientService } from '../../shared/services/http-client.service';
import { NewHttpClientService } from '../../shared/services/http-client1.service';
import { FvRealtimeService } from '../../shared/services/fv-realtime.service';
import { DateFormatService } from '../../shared/services/date-format.service';
import { PdfFileService } from '../../shared/services/pdf-file.service';
import { VesselStorageService } from '../../shared/services/vessel-storage.service';
import * as fvInfoReducer from '../../store/reducers/fv-info.reducer';

type ReportType = 'd' | 'm';

interface ReportOption {
  value: ReportType;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
}

interface ReportMetaItem {
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-report',
  standalone: false,
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css'],
})
export class ReportComponent implements OnInit, OnDestroy {
  readonly reportOptions: ReportOption[] = [
    {
      value: 'd',
      label: 'Daily Report',
      shortLabel: 'Daily',
      description: 'Daily PDF report for the selected vessel.',
      icon: 'fa fa-calendar-check-o',
    },
    {
      value: 'm',
      label: 'Monthly Report',
      shortLabel: 'Monthly',
      description: 'Monthly summary PDF report for the selected vessel.',
      icon: 'fa fa-calendar',
    },
  ];

  selectedReportType: ReportType = 'd';
  selectedDate = '';
  selectedMonth = '';
  selectedVesselName = '';

  pdfUrl: string | null = null;
  pdfBlob: Blob | null = null;
  reportFileName = '';

  loading = false;
  errorMessage = '';
  successMessage = '';

  loadedAt: Date | null = null;
  pdfZoom = 0.94;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private http: HttpClientService,
    private newHttp: NewHttpClientService,
    private realtimeService: FvRealtimeService,
    private store: Store<any>,
    private dateFormat: DateFormatService,
    private pdfFile: PdfFileService,
    private vesselStorage: VesselStorageService
  ) {
    const defaultDate = this.dateFormat.addDays(new Date(), -1);
    this.selectedDate = this.dateFormat.formatDateInput(defaultDate);
    this.selectedMonth = this.dateFormat.formatMonthInput(defaultDate);
  }

  ngOnInit(): void {
    this.loadStoredVessel();
    this.watchActiveVessel();
  }

  ngOnDestroy(): void {
    this.revokePdfUrl();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedReport(): ReportOption {
    return this.reportOptions.find((item) => item.value === this.selectedReportType) || this.reportOptions[0];
  }

  get selectedReportLabel(): string {
    return this.selectedReport.label;
  }

  get selectedReportDescription(): string {
    return this.selectedReport.description;
  }

  get selectedReportIcon(): string {
    return this.selectedReport.icon;
  }

  get selectedTimestamp(): string {
    return this.dateFormat.buildBackendTimestamp(
      this.selectedReportType,
      this.selectedDate,
      this.selectedMonth
    );
  }

  get selectedPeriodLabel(): string {
    if (this.selectedReportType === 'm') {
      return this.selectedMonth || '-';
    }

    return this.selectedDate || '-';
  }

  get canLoadReport(): boolean {
    return !this.loading && !!this.selectedVesselName && !!this.selectedTimestamp;
  }

  get pdfSizeLabel(): string {
    return this.pdfFile.formatBlobSize(this.pdfBlob);
  }

  get loadedAtLabel(): string {
    return this.dateFormat.formatLoadedAt(this.loadedAt);
  }

  get hasPdf(): boolean {
    return !!this.pdfUrl;
  }

  get pdfMetaItems(): ReportMetaItem[] {
    return [
      {
        label: 'Report Type',
        value: this.selectedReportLabel,
        icon: 'fa fa-file-text-o',
      },
      {
        label: 'Period',
        value: this.selectedPeriodLabel,
        icon: 'fa fa-calendar-o',
      },
      {
        label: 'Vessel',
        value: this.selectedVesselName || '-',
        icon: 'fa fa-ship',
      },
      {
        label: 'File Size',
        value: this.pdfSizeLabel,
        icon: 'fa fa-hdd-o',
      },
    ];
  }

  onReportTypeChange(): void {
    this.resetPreviewState();
  }

  onReportDateChange(value: string, type: ReportType): void {
    if (type === 'd') {
      this.selectedDate = value;
    } else {
      this.selectedMonth = value;
    }

    this.resetPreviewState();
  }

  clearError(): void {
    this.errorMessage = '';
  }

  clearSuccess(): void {
    this.successMessage = '';
  }

  loadReport(): void {
    if (this.loading) {
      return;
    }

    this.clearMessages();
    this.revokePdfUrl();

    const fvName = this.selectedVesselName.trim();

    if (!fvName) {
      this.errorMessage = 'Please select a vessel from the sidebar before loading a report.';
      return;
    }

    this.loading = true;
    this.loadedAt = null;
    this.reportFileName = this.buildReportFileName();

    this.requestReport(this.selectedReportType, this.selectedTimestamp, fvName)
      .pipe(
        timeout(20000),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (blob: Blob) => {
          if (!this.pdfFile.isValidPdfBlob(blob)) {
            this.errorMessage = 'No PDF file was returned by the backend for this period.';
            return;
          }

          this.pdfBlob = blob;
          this.pdfUrl = this.pdfFile.createObjectUrl(blob);
          this.loadedAt = new Date();
          this.successMessage = 'Report PDF loaded successfully.';
        },
        error: (error: any) => {
          console.error('[ReportComponent] load report error:', error);
          this.errorMessage = 'Report not found, or the backend did not return a PDF file.';
        },
      });
  }

  reloadReport(): void {
    if (this.canLoadReport) {
      this.loadReport();
    }
  }

  download(): void {
    if (!this.pdfFile.download(this.pdfUrl, this.reportFileName || 'fleet-report.pdf')) {
      this.errorMessage = 'There is no PDF file available to download.';
    }
  }

  openPdfNewTab(): void {
    if (!this.pdfFile.openNewTab(this.pdfUrl)) {
      this.errorMessage = 'There is no PDF file available to open.';
    }
  }

  zoomIn(): void {
    this.pdfZoom = Math.min(1.35, Number((this.pdfZoom + 0.08).toFixed(2)));
  }

  zoomOut(): void {
    this.pdfZoom = Math.max(0.7, Number((this.pdfZoom - 0.08).toFixed(2)));
  }

  resetZoom(): void {
    this.pdfZoom = 0.94;
  }

  onPdfError(error: any): void {
    console.warn('[ReportComponent] PDF viewer error:', error);
    this.errorMessage = 'Unable to preview this PDF. Please try downloading it or reload the report.';
  }

  private requestReport(
    reportType: ReportType,
    timestamp: string,
    fvName: string
  ): Observable<Blob> {
    return this.newHttp.getReport(reportType, timestamp, fvName).pipe(
      switchMap((blob: Blob) => {
        if (this.pdfFile.isValidPdfBlob(blob)) {
          return of(blob);
        }

        return throwError(() => new Error('API2 returned empty PDF'));
      }),
      catchError((firstError: any) => {
        console.warn('[ReportComponent] API2 getReport failed, fallback to API1:', firstError);

        return this.http.getReport(reportType, timestamp, fvName).pipe(
          switchMap((blob: Blob) => {
            if (this.pdfFile.isValidPdfBlob(blob)) {
              return of(blob);
            }

            return throwError(() => new Error('API1 returned empty PDF'));
          })
        );
      })
    );
  }

  private watchActiveVessel(): void {
    this.store
      .select(fvInfoReducer.getFvInfosActive)
      .pipe(takeUntil(this.destroy$))
      .subscribe((active: any) => {
        this.setSelectedVessel(active);
      });

    this.realtimeService.activeVessel$
      .pipe(takeUntil(this.destroy$))
      .subscribe((vessel: any) => {
        this.setSelectedVessel(vessel);
      });
  }

  private setSelectedVessel(vessel: any): void {
    const name = this.vesselStorage.extractVesselName(vessel);

    if (!name || name === this.selectedVesselName) {
      return;
    }

    this.selectedVesselName = name;
    this.vesselStorage.setSelectedVessel(vessel, 'reportVessel');
    this.resetPreviewState();
  }

  private loadStoredVessel(): void {
    this.selectedVesselName = this.vesselStorage.getStoredVesselName();
  }

  private buildReportFileName(): string {
    const dateText = this.selectedReportType === 'd' ? this.selectedDate : this.selectedMonth;
    return this.pdfFile.buildFileName(this.selectedVesselName, this.selectedReportLabel, dateText);
  }

  private resetPreviewState(): void {
    this.clearMessages();
    this.revokePdfUrl();
    this.reportFileName = '';
    this.loadedAt = null;
  }

  private revokePdfUrl(): void {
    this.pdfFile.revokeObjectUrl(this.pdfUrl);
    this.pdfUrl = null;
    this.pdfBlob = null;
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
