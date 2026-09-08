import { Injectable } from '@angular/core';

import { VesselReportAdapter } from './common/vessel-report-adapter';
import { ScGlory1ReportService } from './vessels/sc-glory-1/sc-glory-1-report.service';
import { ScGlory2ReportService } from './vessels/sc-glory-2/sc-glory-2-report.service';
import { ScGlory3ReportService } from './vessels/sc-glory-3/sc-glory-3-report.service';
import { ScEmeraldReportService } from './vessels/sc-emerald/sc-emerald-report.service';

/**
 * Central resolver for vessel-specific report services.
 *
 * SC GLORY 1, SC GLORY 2, SC GLORY 3, and SC EMERALD use dedicated historian/report adapters. Other
 * vessels continue to use the existing generic LiveReportService unchanged.
 */
@Injectable({ providedIn: 'root' })
export class ReportVesselServiceResolver {
  private readonly adapters: readonly VesselReportAdapter[];

  constructor(
    scGlory1ReportService: ScGlory1ReportService,
    scGlory2ReportService: ScGlory2ReportService,
    scGlory3ReportService: ScGlory3ReportService,
    scEmeraldReportService: ScEmeraldReportService,
  ) {
    this.adapters = [
      scGlory1ReportService,
      scGlory2ReportService,
      scGlory3ReportService,
      scEmeraldReportService,
    ];
  }

  resolve(vessel: any): VesselReportAdapter | null {
    return this.adapters.find((adapter) => adapter.supports(vessel)) || null;
  }
}
