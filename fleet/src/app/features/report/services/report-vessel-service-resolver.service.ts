import { Injectable } from '@angular/core';

import { VesselReportAdapter } from './common/vessel-report-adapter';
import { ScGlory1ReportService } from './vessels/sc-glory-1/sc-glory-1-report.service';
import { ScGlory2ReportService } from './vessels/sc-glory-2/sc-glory-2-report.service';
import { ScGlory3ReportService } from './vessels/sc-glory-3/sc-glory-3-report.service';
import { ScGlory6ReportService } from './vessels/sc-glory-6/sc-glory-6-report.service';
import { ScGlory7ReportService } from './vessels/sc-glory-7/sc-glory-7-report.service';
import { ScEmeraldReportService } from './vessels/sc-emerald/sc-emerald-report.service';
import { MvGemiaReportService } from './vessels/mv-gemia/mv-gemia-report.service';
import { ScCholuedeeReportService } from './vessels/sc-choluedee/sc-choluedee-report.service';
import { ScBraveReportService } from './vessels/sc-brave/sc-brave-report.service';
import { ScPailinReportService } from './vessels/sc-pailin/sc-pailin-report.service';
import { ScRajaReportService } from './vessels/sc-raja/sc-raja-report.service';
import { ScSultanReportService } from './vessels/sc-sultan/sc-sultan-report.service';
import { ScWinterReportService } from './vessels/sc-winter/sc-winter-report.service';
import { ScBongkotReportService } from './vessels/sc-bongkot/sc-bongkot-report.service';
import { BahteraIntanReportService } from './vessels/bahtera-intan/bahtera-intan-report.service';
import { BahteraLazuritReportService } from './vessels/bahtera-lazurit/bahtera-lazurit-report.service';
import { BahteraZamrudReportService } from './vessels/bahtera-zamrud/bahtera-zamrud-report.service';
import { BbLiberty233ReportService } from './vessels/bb-liberty-233/bb-liberty-233-report.service';

/**
 * Central resolver for vessel-specific report services.
 *
 * SC GLORY 1, SC GLORY 2, SC GLORY 3, SC GLORY 6, SC GLORY 7, SC EMERALD, MV GEMIA, SC CHOLUEDEE, SC BRAVE, SC PAILIN, SC RAJA, SC SULTAN, SC WINTER, SC BONGKOT, BAHTERA INTAN, BAHTERA LAZURIT, BAHTERA ZAMRUD, and BB LIBERTY 233 use dedicated historian/report adapters. Other
 * vessels continue to use the existing generic LiveReportService unchanged.
 */
@Injectable({ providedIn: 'root' })
export class ReportVesselServiceResolver {
  private readonly adapters: readonly VesselReportAdapter[];

  constructor(
    scGlory1ReportService: ScGlory1ReportService,
    scGlory2ReportService: ScGlory2ReportService,
    scGlory3ReportService: ScGlory3ReportService,
    scGlory6ReportService: ScGlory6ReportService,
    scGlory7ReportService: ScGlory7ReportService,
    scEmeraldReportService: ScEmeraldReportService,
    mvGemiaReportService: MvGemiaReportService,
    scCholuedeeReportService: ScCholuedeeReportService,
    scBraveReportService: ScBraveReportService,
    scPailinReportService: ScPailinReportService,
    scRajaReportService: ScRajaReportService,
    scSultanReportService: ScSultanReportService,
    scWinterReportService: ScWinterReportService,
    scBongkotReportService: ScBongkotReportService,
    bahteraIntanReportService: BahteraIntanReportService,
    bahteraLazuritReportService: BahteraLazuritReportService,
    bahteraZamrudReportService: BahteraZamrudReportService,
    bbLiberty233ReportService: BbLiberty233ReportService,
  ) {
    this.adapters = [
      scGlory1ReportService,
      scGlory2ReportService,
      scGlory3ReportService,
      scGlory6ReportService,
      scGlory7ReportService,
      scEmeraldReportService,
      mvGemiaReportService,
      scCholuedeeReportService,
      scBraveReportService,
      scPailinReportService,
      scRajaReportService,
      scSultanReportService,
      scWinterReportService,
      scBongkotReportService,
      bahteraIntanReportService,
      bahteraLazuritReportService,
      bahteraZamrudReportService,
      bbLiberty233ReportService,
    ];
  }

  resolve(vessel: any): VesselReportAdapter | null {
    return this.adapters.find((adapter) => adapter.supports(vessel)) || null;
  }
}
