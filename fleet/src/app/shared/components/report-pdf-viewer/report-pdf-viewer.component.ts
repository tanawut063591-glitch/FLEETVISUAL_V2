import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-report-pdf-viewer',
  standalone: false,
  templateUrl: './report-pdf-viewer.component.html',
  styleUrls: ['./report-pdf-viewer.component.css'],
})
export class ReportPdfViewerComponent {
  @Input() src: string | null = null;
  @Input() fileName = '';
  @Input() zoom = 1;
  @Input() loading = false;
  @Input() canLoad = false;
  @Input() emptyTitle = 'No PDF Loaded';
  @Input() emptyMessage = 'Select filters and click Load Report to load the PDF from the backend.';

  @Output() reload = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();
  @Output() openNewTab = new EventEmitter<void>();
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() resetZoom = new EventEmitter<void>();
  @Output() load = new EventEmitter<void>();
  @Output() pdfError = new EventEmitter<any>();
}
