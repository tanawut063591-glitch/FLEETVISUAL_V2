import { Injectable } from '@angular/core';

import { VesselReportAdapter } from './common/vessel-report-adapter';
import { ScGlory1ReportService } from './vessels/sc-glory-1/sc-glory-1-report.service';
import { ScGlory2ReportService } from './vessels/sc-glory-2/sc-glory-2-report.service';
import { ScGlory3ReportService } from './vessels/sc-glory-3/sc-glory-3-report.service';
import { ScGlory7ReportService } from './vessels/sc-glory-7/sc-glory-7-report.service';
import { ScEmeraldReportService } from './vessels/sc-emerald/sc-emerald-report.service';
import { ScCholuedeeReportService } from './vessels/sc-choluedee/sc-choluedee-report.service';
import { ScBraveReportService } from './vessels/sc-brave/sc-brave-report.service';
import { ScPailinReportService } from './vessels/sc-pailin/sc-pailin-report.service';
import { ScRajaReportService } from './vessels/sc-raja/sc-raja-report.service';
import { ScSultanReportService } from './vessels/sc-sultan/sc-sultan-report.service';
import { ScWinterReportService } from './vessels/sc-winter/sc-winter-report.service';
import { ScBongkotReportService } from './vessels/sc-bongkot/sc-bongkot-report.service';

/**
 * Central resolver for vessel-specific report services.
 *
 * SC GLORY 1, SC GLORY 2, SC GLORY 3, SC GLORY 7, SC EMERALD, SC CHOLUEDEE, SC BRAVE, SC PAILIN, SC RAJA, SC SULTAN, SC WINTER, and SC BONGKOT use dedicated historian/report adapters. Other
 * vessels continue to use the existing generic LiveReportService unchanged.
 */
@Injectable({ providedIn: 'root' })
export class ReportVesselServiceResolver {
  private readonly adapters: readonly VesselReportAdapter[];

  constructor(
    scGlory1ReportService: ScGlory1ReportService,
    scGlory2ReportService: ScGlory2ReportService,
    scGlory3ReportService: ScGlory3ReportService,
    scGlory7ReportService: ScGlory7ReportService,
    scEmeraldReportService: ScEmeraldReportService,
    scCholuedeeReportService: ScCholuedeeReportService,
    scBraveReportService: ScBraveReportService,
    scPailinReportService: ScPailinReportService,
    scRajaReportService: ScRajaReportService,
    scSultanReportService: ScSultanReportService,
    scWinterReportService: ScWinterReportService,
    scBongkotReportService: ScBongkotReportService,
  ) {
    this.adapters = [
      scGlory1ReportService,
      scGlory2ReportService,
      scGlory3ReportService,
      scGlory7ReportService,
      scEmeraldReportService,
      scCholuedeeReportService,
      scBraveReportService,
      scPailinReportService,
      scRajaReportService,
      scSultanReportService,
      scWinterReportService,
      scBongkotReportService,
    ];
  }

  resolve(vessel: any): VesselReportAdapter | null {
    return this.adapters.find((adapter) => adapter.supports(vessel)) || null;
  }
}
