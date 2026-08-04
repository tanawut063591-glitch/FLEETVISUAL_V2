import { Injectable } from '@angular/core';

import { CardConfiguration } from '../../features/realtime/card-config';
import { CardDetail, CardInfo } from '../../features/realtime/models/card-info.model';
import {
  EngineProfileCategory,
  VesselEngineAssignment,
  VesselSettingsRecord,
} from '../models/settings.model';

export interface RealtimeMachineryPosition {
  key: string;
  prefix: string;
  title: string;
  type: string;
  row: number;
  col: number;
  category: EngineProfileCategory;
  suggestedProfileId: string;
}

@Injectable({ providedIn: 'root' })
export class RealtimeMachineryService {
  private readonly configurations: CardInfo[] = new CardConfiguration().getConfig();

  getForPrefix(prefix: string): RealtimeMachineryPosition[] {
    const normalizedPrefix = this.normalizePrefix(prefix);
    if (!normalizedPrefix) return [];

    const config = this.configurations.find(
      (item) => this.normalizePrefix(item.prefix) === normalizedPrefix,
    );
    if (!config) return [];

    return config.details
      .filter((detail) => this.isMachinery(detail))
      .sort((a, b) => a.row - b.row || a.col - b.col)
      .map((detail) => this.toPosition(config.prefix, detail));
  }

  hydrateVessel(vessel: VesselSettingsRecord): VesselSettingsRecord {
    const positions = this.getForPrefix(vessel.prefix);
    if (!positions.length) return vessel;

    const assignments = this.mergeAssignments(vessel.engineAssignments || [], positions);
    return {
      ...vessel,
      engineAssignments: assignments,
      engines: this.engineNames(assignments),
    };
  }

  mergeAssignments(
    existingAssignments: VesselEngineAssignment[],
    positions: RealtimeMachineryPosition[],
  ): VesselEngineAssignment[] {
    const existing = existingAssignments.map((assignment) => ({ ...assignment }));
    const usedIds = new Set<string>();

    const realtimeAssignments = positions.map((position) => {
      const match = existing.find((assignment) => {
        if (usedIds.has(assignment.id)) return false;
        if (assignment.realtimeKey && assignment.realtimeKey === position.key) return true;
        if (
          Number(assignment.realtimeRow) === position.row &&
          Number(assignment.realtimeCol) === position.col
        ) return true;
        return this.normalizeLabel(assignment.position) === this.normalizeLabel(position.title);
      });

      if (match) usedIds.add(match.id);
      return this.createAssignment(position, match);
    });

    const manualAssignments = existing.filter(
      (assignment) => !usedIds.has(assignment.id) && assignment.source !== 'realtime',
    );

    return [...realtimeAssignments, ...manualAssignments];
  }

  createAssignment(
    position: RealtimeMachineryPosition,
    existing?: VesselEngineAssignment,
  ): VesselEngineAssignment {
    const profileId = existing?.profileId || position.suggestedProfileId;
    return {
      id: existing?.id || `rt-${position.key}`,
      profileId,
      displayName: existing?.displayName || this.defaultProfileName(profileId),
      position: position.title,
      quantity: 1,
      realtimeKey: position.key,
      realtimeRow: position.row,
      realtimeCol: position.col,
      realtimeType: position.type,
      source: 'realtime',
    };
  }

  engineNames(assignments: VesselEngineAssignment[]): string[] {
    return Array.from(
      new Set(
        assignments
          .map((assignment) => assignment.position || assignment.displayName)
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ),
    );
  }

  categoryForAssignment(assignment: VesselEngineAssignment): EngineProfileCategory {
    return this.categoryFor(assignment.realtimeType || '', assignment.position || '');
  }

  normalizePrefix(prefix: string): string {
    return String(prefix || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  private toPosition(prefix: string, detail: CardDetail): RealtimeMachineryPosition {
    const category = this.categoryFor(detail.type, detail.title);
    const normalizedPrefix = this.normalizePrefix(prefix).toLowerCase();
    return {
      key: `${normalizedPrefix}-${detail.row}-${detail.col}`,
      prefix,
      title: detail.title.trim(),
      type: detail.type.trim(),
      row: detail.row,
      col: detail.col,
      category,
      suggestedProfileId: this.suggestedProfileId(category, detail.type),
    };
  }

  private categoryFor(type: string, title: string): EngineProfileCategory {
    const normalizedType = String(type || '').trim().toUpperCase();
    const normalizedTitle = String(title || '').trim().toUpperCase();
    if (normalizedType === 'ME1' || normalizedTitle.includes('MAIN ENGINE')) return 'main';
    if (normalizedType === 'AE1' || normalizedTitle.includes('AUX. ENGINE')) return 'auxiliary';
    if (normalizedType.startsWith('DG') || normalizedTitle.includes('DIESEL GENERATOR')) return 'generator';
    return 'other';
  }

  private suggestedProfileId(category: EngineProfileCategory, type: string): string {
    if (category === 'main') return 'generic-main-diesel';
    if (category === 'auxiliary' || category === 'generator') return 'generic-generator-engine';
    if (String(type || '').trim().toUpperCase() === 'MOTOR') return 'telemetry-only-engine';
    return 'telemetry-only-engine';
  }

  private defaultProfileName(profileId: string): string {
    switch (profileId) {
      case 'generic-main-diesel':
        return 'Generic Main Diesel Engine';
      case 'generic-generator-engine':
        return 'Generic Generator Engine';
      case 'telemetry-only-engine':
        return 'Direct Telemetry — No Calculation';
      default:
        return profileId;
    }
  }

  private isMachinery(detail: CardDetail): boolean {
    return Boolean(String(detail.title || '').trim() && String(detail.type || '').trim());
  }

  private normalizeLabel(value: string): string {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }
}
