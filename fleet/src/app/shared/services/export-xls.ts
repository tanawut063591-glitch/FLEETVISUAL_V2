import { Injectable } from '@angular/core';
import { ResponseHistorianModel } from '../models/response.model';

@Injectable({
  providedIn: 'root'
})
export class ExportXls {
  async exportToExcel(data: ResponseHistorianModel[], fileName: string): Promise<void> {
    const headers = ['TimeStamp'];
    const rows:any[] = [];

    if(data.length > 0){
      const XLSX = await import('xlsx');

      data.forEach(record => {
        headers.push(record.Name);
      });

      data[0].records.forEach((item, index)=> {
        const row = [item.TimeStamp];
        data.forEach( x => {
          row.push(x.records[index]?.Value??'-');
        });
        rows.push(row);
      })

      const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = { Sheets: { 'data': sheet }, SheetNames: ['data'] };
      const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, fileName);
    }
  }

  async exportBillingReport(
    siteName: string,
    rows: { month: Date; unitPrice: number | null; energy: number | null; amount: number | null; vat: number | null; total: number | null }[],
    totals: { energy: number; amount: number; vat: number; total: number },
    fileName: string
  ): Promise<void> {
    const XLSX = await import('xlsx');

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtMonth = (d: Date) => `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    const n3 = (v: number | null) => v !== null ? Math.round(v * 1000) / 1000 : null;
    const n2 = (v: number | null) => v !== null ? Math.round(v * 100) / 100 : null;

    const header = ['Month', 'Units (kWh)', 'Unit Price (THB)', 'Amount', 'VAT 7%', 'Total'];
    const dataRows = rows.map(r => [
      fmtMonth(r.month),
      n3(r.energy),
      n3(r.unitPrice),
      n2(r.amount),
      n2(r.vat),
      n2(r.total)
    ]);
    const totalRow = ['', n3(totals.energy), '', n2(totals.amount), n2(totals.vat), n2(totals.total)];

    const aoa = [
      [siteName],
      ['Electricity Usage'],
      header,
      ...dataRows,
      totalRow
    ];

    const sheet = XLSX.utils.aoa_to_sheet(aoa);

    // Merge site name & subtitle across all 6 columns
    sheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
    ];

    // Set column widths
    sheet['!cols'] = [
      { wch: 14 }, // Month
      { wch: 16 }, // Units (kWh)
      { wch: 18 }, // Unit Price (THB)
      { wch: 16 }, // Amount
      { wch: 14 }, // VAT 7%
      { wch: 16 }  // Total
    ];

    const workbook = { Sheets: { Report: sheet }, SheetNames: ['Report'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.saveAsExcelFile(excelBuffer, fileName);
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: 'application/octet-stream' });
    const link: HTMLAnchorElement = document.createElement('a');
    link.href = window.URL.createObjectURL(data);
    link.download = fileName + '.xlsx';
    link.click();
  }
}
