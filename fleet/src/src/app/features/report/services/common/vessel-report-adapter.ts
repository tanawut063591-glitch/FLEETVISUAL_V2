import {
  LiveReportProfileDocument,
  LiveReportSnapshot,
} from '../../models/live-report.model';

export type VesselModeHistoryKind = 'none' | 'direct' | 'derived';

export interface VesselModeHistoryConfig {
  enabled: boolean;
  kind: VesselModeHistoryKind;
  sourceTag: string | null;
  eyebrow: string;
  title: string;
  description: string;
  qualityLabel: string;
}

export interface VesselReportAdapter {
  readonly id: string;
  readonly serviceLabel: string;
  readonly profileLabel: string;

  supports(vessel: any): boolean;

  prepareProfileDocument(baseDocument: LiveReportProfileDocument): LiveReportProfileDocument;

  enhanceSnapshot(
    snapshot: LiveReportSnapshot,
    currentData: Record<string, any> | null | undefined,
  ): LiveReportSnapshot;

  getModeHistoryConfig(snapshot: LiveReportSnapshot): VesselModeHistoryConfig;

  resolveHistorianModeLabel(rawValue: unknown): string | null;
}
