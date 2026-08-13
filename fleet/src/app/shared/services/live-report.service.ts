import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';

import {
  LiveReportEngineProfile,
  LiveReportEngineSnapshot,
  LiveReportMetric,
  LiveReportModeConfidence,
  LiveReportModeSource,
  LiveReportProfileDocument,
  LiveReportSnapshot,
  LiveReportVesselProfile,
} from '../../features/report/live-report.model';

interface BoundedNumberResult {
  value: number | null;
  hadInvalidValue: boolean;
  sourceTag: string | null;
}

interface ModeResolution {
  label: string | null;
  rawValue: string | null;
  sourceTag: string | null;
  source: LiveReportModeSource;
  confidence: LiveReportModeConfidence;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class LiveReportService {
  readonly profileDocument$: Observable<LiveReportProfileDocument>;

  constructor(private http: HttpClient) {
    this.profileDocument$ = this.http
      .get<LiveReportProfileDocument>('/report-live-profiles.json')
      .pipe(
        map((document: LiveReportProfileDocument) => this.normalizeDocument(document)),
        catchError((error: unknown) => {
          console.warn('[LiveReportService] Unable to load report profiles.', error);
          return of(this.getFallbackDocument());
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
  }

  buildSnapshot(
    vessel: any,
    currentData: Record<string, any> | null | undefined,
    lastUpdated: Date | null,
    document: LiveReportProfileDocument
  ): LiveReportSnapshot {
    const vesselInfo = this.getVesselInfo(vessel);
    const vesselName = this.readText(
      vesselInfo?.name,
      vesselInfo?.Name,
      vesselInfo?.vesselName,
      vesselInfo?.VesselName,
      'Selected Vessel'
    );
    const vesselPrefix = this.readText(
      vesselInfo?.prefix,
      vesselInfo?.Prefix,
      vesselInfo?.id,
      vesselInfo?.Id,
      ''
    );
    const profile = this.resolveProfile(vesselName, vesselPrefix, document);
    const data = this.normalizeData(currentData);
    const engines = profile.engines.map((engine) => this.buildEngineSnapshot(engine, data));

    const totalFuelDirect = this.readBoundedNumber(
      data,
      ['VES_CONS_TODAY', 'VES_FUEL_CONS_TODAY', 'TOTAL_FUEL_USED_TODAY'],
      0,
      10_000_000
    ).value;
    const totalFuelFromEngines = this.sumAvailable(engines.map((engine) => engine.fuelToday));
    const totalFuel = totalFuelDirect ?? totalFuelFromEngines;
    const totalFuelRate = this.sumAvailable(engines.map((engine) => engine.fuelRate));

    const distance = this.readBoundedNumber(
      data,
      ['VES_GPS_DIS_TODAY', 'VES_DISTANCE_TODAY'],
      0,
      100_000
    ).value;
    const currentSpeed = this.readBoundedNumber(
      data,
      ['VES_GPS_SPEED', 'GPS_SPEED'],
      0,
      80
    ).value;
    const averageSpeed = this.readBoundedNumber(
      data,
      ['VES_GPS_SPEED_AVG', 'GPS_SPEED_AVG'],
      0,
      80
    ).value;
    const maximumSpeed = this.readBoundedNumber(
      data,
      ['VES_GPS_SPEED_MAX', 'GPS_SPEED_MAX'],
      0,
      80
    ).value;
    const heading = this.readBoundedNumber(
      data,
      ['VES_GPS_HEAD', 'GPS_HEADING', 'VES_HEADING'],
      0,
      360
    ).value;
    const latitude = this.readBoundedNumber(
      data,
      ['VES_GPS_LAT', 'GPS_LAT', 'LATITUDE'],
      -90,
      90
    ).value;
    const longitude = this.readBoundedNumber(
      data,
      ['VES_GPS_LONG', 'VES_GPS_LON', 'GPS_LONG', 'LONGITUDE'],
      -180,
      180
    ).value;
    const mode = this.resolveMode(profile, data, vesselInfo, engines, currentSpeed);

    const invalidEngineSpeedCount = engines.filter(
      (engine) => engine.speedQuality === 'invalid'
    ).length;
    const availableEngineCount = engines.filter((engine) => engine.state !== 'no-data').length;
    const runningEngineCount = engines.filter((engine) => engine.state === 'running').length;
    const availableChecks = [
      totalFuel !== null,
      totalFuelRate !== null,
      distance !== null,
      currentSpeed !== null,
      averageSpeed !== null,
      maximumSpeed !== null,
      heading !== null,
      latitude !== null && longitude !== null,
      availableEngineCount > 0,
      invalidEngineSpeedCount === 0,
    ];
    const completeness = Math.round(
      (availableChecks.filter(Boolean).length / availableChecks.length) * 100
    );

    const now = lastUpdated || new Date();
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    const telemetryAgeSeconds = lastUpdated
      ? Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
      : null;
    const hasTelemetryData = Object.keys(data).length > 0;
    const telemetryState = this.resolveTelemetryState(telemetryAgeSeconds, hasTelemetryData);

    return {
      vesselName,
      vesselPrefix,
      profileLabel: profile.label,
      sourceReport: profile.sourceReport || '',
      periodStart,
      periodEnd: now,
      updatedAt: lastUpdated,
      telemetryState,
      telemetryAgeSeconds,
      currentMode: mode.label,
      currentModeRawValue: mode.rawValue,
      modeSourceTag: mode.sourceTag,
      modeSource: mode.source,
      modeConfidence: mode.confidence,
      modeReason: mode.reason,
      dataCompleteness: completeness,
      invalidEngineSpeedCount,
      availableEngineCount,
      runningEngineCount,
      totalFuelRate,
      metrics: [
        this.metric('fuel', 'Total Fuel Used', totalFuel, 'L', 'fa fa-tint', 'orange', 2),
        this.metric('fuel-rate', 'Live Fuel Rate', totalFuelRate, 'L/h', 'fa fa-fire', 'violet', 2),
        this.metric('distance', 'Distance Today', distance, 'NM', 'fa fa-arrows-h', 'blue', 2),
        this.metric('speed', 'Current Speed', currentSpeed, 'knots', 'fa fa-tachometer', 'cyan', 2),
        this.metric('average', 'Average Speed', averageSpeed, 'knots', 'fa fa-line-chart', 'green', 2),
        this.metric('maximum', 'Maximum Speed', maximumSpeed, 'knots', 'fa fa-area-chart', 'violet', 2),
        this.metric('heading', 'Course Over Ground', heading, '°', 'fa fa-location-arrow', 'slate', 2),
      ],
      tracking: {
        latitude,
        longitude,
        distanceToday: distance,
        currentSpeed,
        averageSpeed,
        maximumSpeed,
        heading,
      },
      engines,
      modes: profile.modes.map((profileMode) => ({
        key: profileMode.key,
        label: profileMode.label,
        isCurrent: mode.label
          ? this.normalizeKey(mode.label) === this.normalizeKey(profileMode.label) ||
            this.normalizeKey(mode.label) === this.normalizeKey(profileMode.key)
          : false,
      })),
    };
  }

  formatNumber(value: number | null, digits = 2): string {
    if (value === null || !Number.isFinite(value)) {
      return '—';
    }

    return value.toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }










  getOverviewMetricTagSuffixes(
    vessel: any,
    document: LiveReportProfileDocument
  ): string[] {
    const vesselInfo = this.getVesselInfo(vessel);
    const vesselName = this.readText(
      vesselInfo?.name,
      vesselInfo?.Name,
      vesselInfo?.vesselName,
      vesselInfo?.VesselName,
      'Selected Vessel'
    );
    const vesselPrefix = this.readText(
      vesselInfo?.prefix,
      vesselInfo?.Prefix,
      vesselInfo?.id,
      vesselInfo?.Id,
      ''
    );
    const profile = this.resolveProfile(vesselName, vesselPrefix, document);

    const headlineTags = [
      'VES_CONS_TODAY',
      'VES_FUEL_CONS_TODAY',
      'TOTAL_FUEL_USED_TODAY',
      'VES_GPS_DIS_TODAY',
      'VES_DISTANCE_TODAY',
      'VES_GPS_SPEED',
      'GPS_SPEED',
      'VES_GPS_SPEED_AVG',
      'GPS_SPEED_AVG',
      'VES_GPS_SPEED_MAX',
      'GPS_SPEED_MAX',
    ];

    const engineFuelTags = (profile.engines || []).flatMap((engine) => [
      ...(engine.fuelTodayTags || []),
      ...(engine.fuelRateTags || []),
      ...(engine.flowSupplyTags || []),
      ...(engine.flowReturnTags || []),
    ]);

    return Array.from(
      new Set(
        [...headlineTags, ...engineFuelTags]
          .map((tag) => this.normalizeKey(String(tag || '')))
          .filter((tag) => tag.length > 0)
      )
    );
  }

  private buildEngineSnapshot(
    profile: LiveReportEngineProfile,
    data: Record<string, any>
  ): LiveReportEngineSnapshot {
    const fuelToday = this.readNonNegativeNumber(data, profile.fuelTodayTags || []);
    const directFuelRate = this.readBoundedNumber(
      data,
      profile.fuelRateTags || [],
      0,
      100000
    ).value;
    const supplyFlow = this.readBoundedNumber(
      data,
      profile.flowSupplyTags || [],
      0,
      100000
    ).value;
    const returnFlow = this.readBoundedNumber(
      data,
      profile.flowReturnTags || [],
      0,
      100000
    ).value;
    const calculatedFuelRate =
      supplyFlow !== null && returnFlow !== null && supplyFlow >= returnFlow
        ? supplyFlow - returnFlow
        : null;
    const fuelRate = directFuelRate ?? calculatedFuelRate;
    const speedLimitRpm = this.resolveSpeedLimit(profile);
    const speedResult = this.readBoundedNumber(
      data,
      profile.speedTags || [],
      0,
      speedLimitRpm
    );
    const speed = speedResult.value;
    const load = this.readBoundedNumber(data, profile.loadTags || [], 0, 150).value;
    const power = this.readBoundedNumber(data, profile.powerTags || [], 0, 1000000).value;
    const liveSignals = [fuelRate, speed, load, power];
    const hasLiveSignal = liveSignals.some((value) => value !== null);
    const isRunning = liveSignals.some(
      (value) => value !== null && Math.abs(value) > 0.01
    );

    return {
      key: profile.key,
      label: profile.label,
      kind: profile.kind,
      state: hasLiveSignal ? (isRunning ? 'running' : 'stopped') : 'no-data',
      fuelToday,
      fuelRate,
      speed,
      speedQuality:
        speed !== null ? 'valid' : speedResult.hadInvalidValue ? 'invalid' : 'no-data',
      speedLimitRpm,
      speedSourceTag: speedResult.sourceTag,
      load,
      power,
    };
  }

  private resolveSpeedLimit(profile: LiveReportEngineProfile): number {
    if (profile.maxSpeedRpm && Number.isFinite(profile.maxSpeedRpm) && profile.maxSpeedRpm > 0) {
      return profile.maxSpeedRpm;
    }

    switch (profile.kind) {
      case 'main':
        return 3000;
      case 'auxiliary':
      case 'generator':
        return 4000;
      case 'motor':
        return 12000;
      case 'other':
        return 6000;
    }
  }

  private resolveTelemetryState(
    ageSeconds: number | null,
    hasTelemetryData: boolean
  ): LiveReportSnapshot['telemetryState'] {
    if (ageSeconds === null || !hasTelemetryData) {
      return 'offline';
    }

    if (ageSeconds <= 90) {
      return 'live';
    }

    if (ageSeconds <= 300) {
      return 'delayed';
    }

    return 'stale';
  }

  private metric(
    key: string,
    label: string,
    value: number | null,
    unit: string,
    icon: string,
    tone: LiveReportMetric['tone'],
    digits: number
  ): LiveReportMetric {
    return {
      key,
      label,
      value: this.formatNumber(value, digits),
      unit,
      icon,
      tone,
      available: value !== null,
    };
  }

  private resolveMode(
    profile: LiveReportVesselProfile,
    data: Record<string, any>,
    vesselInfo: any,
    engines: LiveReportEngineSnapshot[],
    currentSpeed: number | null
  ): ModeResolution {



    const verifiedFromTelemetry = this.resolveCurrentMode(profile, data);
    if (verifiedFromTelemetry) {
      return verifiedFromTelemetry;
    }







    if (profile.modeVerification?.kind === 'direct-telemetry-tag') {
      const expectedTag = profile.modeVerification.tagSuffix || 'VES-MODE';
      return this.unavailableMode(
        `Waiting for a valid direct ${expectedTag} value. Estimated mode is intentionally disabled for this vessel.`
      );
    }

    const vesselRecordRaw =
      vesselInfo?.currentMode ??
      vesselInfo?.CurrentMode ??
      vesselInfo?.operationMode ??
      vesselInfo?.OperationMode ??
      vesselInfo?.mode ??
      vesselInfo?.Mode;
    const vesselRecordMode = this.resolveModeValue(profile, vesselRecordRaw);
    if (vesselRecordMode) {
      return {
        label: vesselRecordMode,
        rawValue: String(vesselRecordRaw),
        sourceTag: null,
        source: 'vessel-record',
        confidence: 'medium',
        reason:
          'Mode was supplied by the vessel record, but no direct live vessel-mode telemetry tag was available for verification.',
      };
    }

    return this.estimateCurrentMode(profile, data, engines, currentSpeed);
  }

  private estimateCurrentMode(
    profile: LiveReportVesselProfile,
    data: Record<string, any>,
    engines: LiveReportEngineSnapshot[],
    currentSpeed: number | null
  ): ModeResolution {
    const explicitActivity = this.resolveExplicitActivityMode(profile, data);
    if (explicitActivity) {
      return {
        label: explicitActivity,
        rawValue: null,
        sourceTag: null,
        source: 'estimated-telemetry',
        confidence: 'high',
        reason: 'Detected from a live operational activity signal; a verified mode tag still takes priority.',
      };
    }

    const runningMainCount = engines.filter(
      (engine) => engine.kind === 'main' && engine.state === 'running'
    ).length;
    const runningSupportCount = engines.filter(
      (engine) =>
        (engine.kind === 'auxiliary' || engine.kind === 'generator' || engine.kind === 'motor') &&
        engine.state === 'running'
    ).length;
    const totalFuelRate = this.sumAvailable(engines.map((engine) => engine.fuelRate)) ?? 0;
    const maximumLoad = this.maxAvailable(engines.map((engine) => engine.load)) ?? 0;
    const hasAnyEquipmentData = engines.some((engine) => engine.state !== 'no-data');
    const isOffshoreProfile = this.hasMode(profile, 'Underway (ECO Speed)');

    if (currentSpeed === null && !hasAnyEquipmentData) {
      return {
        label: null,
        rawValue: null,
        sourceTag: null,
        source: 'unavailable',
        confidence: null,
        reason: 'GPS speed and machinery telemetry are not available for a safe mode estimate.',
      };
    }

    if (isOffshoreProfile) {
      if (currentSpeed !== null && currentSpeed >= 8) {
        return this.estimatedMode(
          profile,
          'Underway (Full Speed)',
          'high',
          `GPS speed is ${this.formatCompact(currentSpeed)} knots, indicating sustained high-speed transit.`
        );
      }

      if (currentSpeed !== null && currentSpeed >= 1) {
        return this.estimatedMode(
          profile,
          'Underway (ECO Speed)',
          'medium',
          `GPS speed is ${this.formatCompact(currentSpeed)} knots, indicating the vessel is underway.`
        );
      }

      if (currentSpeed !== null && currentSpeed >= 0.3) {
        return this.estimatedMode(
          profile,
          'Port Movements',
          'medium',
          `Low GPS speed of ${this.formatCompact(currentSpeed)} knots indicates controlled low-speed movement.`
        );
      }

      if (runningMainCount === 0 && totalFuelRate < 30 && maximumLoad < 20) {
        return this.estimatedMode(
          profile,
          'Standby at mooring buoy',
          'medium',
          'The vessel is stationary and propulsion demand is low.'
        );
      }

      if (runningMainCount > 0 || runningSupportCount > 0 || totalFuelRate >= 30) {
        return this.estimatedMode(
          profile,
          'Other',
          'low',
          'The vessel is stationary with machinery activity. A dedicated work-status tag is required to distinguish cargo, towing, anchor handling, DP or alongside operations.'
        );
      }

      return this.unavailableMode(
        'The vessel is stationary, but available telemetry cannot distinguish the configured offshore work modes.'
      );
    }

    const hasSeaPassageEconomics = this.hasMode(profile, 'Sea Passage Economics');

    if (currentSpeed !== null && currentSpeed >= 10.5) {
      return this.estimatedMode(
        profile,
        'Passage',
        'medium',
        `GPS speed is ${this.formatCompact(currentSpeed)} knots, indicating high-speed passage.`
      );
    }

    if (currentSpeed !== null && currentSpeed >= 4) {
      return this.estimatedMode(
        profile,
        hasSeaPassageEconomics ? 'Sea Passage Economics' : 'Passage',
        'medium',
        `GPS speed is ${this.formatCompact(currentSpeed)} knots, indicating sustained transit.`
      );
    }

    if (currentSpeed !== null && currentSpeed >= 0.5) {
      return this.estimatedMode(
        profile,
        'Manoeuvring',
        'medium',
        `GPS speed is ${this.formatCompact(currentSpeed)} knots, indicating low-speed vessel movement.`
      );
    }

    if (runningMainCount > 0) {
      return this.estimatedMode(
        profile,
        'Manoeuvring',
        'low',
        'The vessel is nearly stationary while a main engine is active.'
      );
    }

    if (runningSupportCount > 0 && (totalFuelRate >= 50 || maximumLoad >= 35)) {
      return this.estimatedMode(
        profile,
        'Cargo Operation',
        'low',
        'The vessel is stationary with elevated auxiliary machinery activity.'
      );
    }

    return this.estimatedMode(
      profile,
      'Standby',
      'medium',
      'The vessel is stationary and live propulsion demand is low.'
    );
  }

  private estimatedMode(
    profile: LiveReportVesselProfile,
    desiredLabel: string,
    confidence: Exclude<LiveReportModeConfidence, null>,
    reason: string
  ): ModeResolution {
    const matched = this.findMode(profile, desiredLabel);

    if (!matched) {
      return this.unavailableMode(
        `${reason} The matching mode is not configured in this vessel profile.`
      );
    }

    return {
      label: matched.label,
      rawValue: null,
      sourceTag: null,
      source: 'estimated-telemetry',
      confidence,
      reason,
    };
  }

  private unavailableMode(reason: string): ModeResolution {
    return {
      label: null,
      rawValue: null,
      sourceTag: null,
      source: 'unavailable',
      confidence: null,
      reason,
    };
  }

  private resolveExplicitActivityMode(
    profile: LiveReportVesselProfile,
    data: Record<string, any>
  ): string | null {
    const activityRules: Array<{ label: string; tags: string[] }> = [
      {
        label: 'Dynamic Positioning (DP)',
        tags: ['VES_DP_ACTIVE', 'DP_ACTIVE', 'DP_MODE_ACTIVE', 'DYNAMIC_POSITIONING_ACTIVE'],
      },
      {
        label: 'Anchor Handling operation',
        tags: ['ANCHOR_HANDLING_ACTIVE', 'VES_ANCHOR_HANDLING_ACTIVE'],
      },
      {
        label: 'Towing operation',
        tags: ['TOWING_ACTIVE', 'VES_TOWING_ACTIVE'],
      },
      {
        label: 'Cargo Operation',
        tags: ['CARGO_OPERATION_ACTIVE', 'VES_CARGO_ACTIVE'],
      },
      {
        label: 'Snatching for Cargo operation',
        tags: ['SNATCHING_ACTIVE', 'VES_SNATCHING_ACTIVE'],
      },
      {
        label: 'Berth at Jetty (Cargo/Bunker/Maintenance)',
        tags: ['BERTH_ACTIVE', 'JETTY_ACTIVE', 'VES_BERTH_ACTIVE'],
      },
      {
        label: 'Moored with another Vessel for transferring',
        tags: ['MOORED_TRANSFER_ACTIVE', 'VES_TRANSFER_ACTIVE'],
      },
      {
        label: 'Alongside FSO',
        tags: ['ALONGSIDE_FSO_ACTIVE', 'VES_ALONGSIDE_FSO_ACTIVE'],
      },
      {
        label: 'Alongside Tender Rig',
        tags: ['ALONGSIDE_TENDER_RIG_ACTIVE', 'VES_ALONGSIDE_TENDER_ACTIVE'],
      },
      {
        label: 'Alongside Jack up Rig (BDB)',
        tags: ['ALONGSIDE_JACKUP_ACTIVE', 'VES_ALONGSIDE_JACKUP_ACTIVE'],
      },
    ];

    for (const rule of activityRules) {
      if (this.readBoolean(data, rule.tags)) {
        const matched = this.findMode(profile, rule.label);
        if (matched) {
          return matched.label;
        }
      }
    }

    return null;
  }

  private resolveCurrentMode(
    profile: LiveReportVesselProfile,
    data: Record<string, any>
  ): ModeResolution | null {
    const candidates = profile.modeTags || [
      'VES_MODE',
      'VES_OPERATION_MODE',
      'OPERATION_MODE',
      'CURRENT_MODE',
    ];

    for (const candidate of candidates) {
      const item = data[this.normalizeKey(candidate)];
      if (item === null || item === undefined || item?.hasValue === false) {
        continue;
      }

      const raw =
        item?.value ??
        item?.Value ??
        item?.IValue ??
        item?.iValue ??
        item?.CurrentValue ??
        item?.currentValue ??
        item;
      if (raw === null || raw === undefined || raw === '') {
        continue;
      }

      const label = this.resolveModeValue(profile, raw);
      if (!label) {
        continue;
      }

      const sourceTag = this.readText(item?.tagName, item?.TagName, candidate);
      const rawValue = String(raw).trim();
      return {
        label,
        rawValue,
        sourceTag,
        source: 'verified-tag',
        confidence: 'high',
        reason: `Verified directly from ${sourceTag || candidate}${rawValue ? ` (mode ${rawValue})` : ''}.`,
      };
    }

    return null;
  }

  private resolveModeValue(profile: LiveReportVesselProfile, raw: unknown): string | null {
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }

    const rawText = String(raw).trim();
    const normalizedRaw = this.normalizeKey(rawText);

    for (const mode of profile.modes) {
      const codeMatch = (mode.codes || []).some(
        (code) => this.normalizeKey(String(code)) === normalizedRaw
      );
      const labelMatch = this.normalizeKey(mode.label) === normalizedRaw;
      const keyMatch = this.normalizeKey(mode.key) === normalizedRaw;

      if (codeMatch || labelMatch || keyMatch) {
        return mode.label;
      }
    }



    return null;
  }

  private hasMode(profile: LiveReportVesselProfile, label: string): boolean {
    return !!this.findMode(profile, label);
  }

  private findMode(profile: LiveReportVesselProfile, label: string) {
    const normalized = this.normalizeKey(label);
    return profile.modes.find(
      (mode) =>
        this.normalizeKey(mode.label) === normalized || this.normalizeKey(mode.key) === normalized
    );
  }

  private resolveProfile(
    vesselName: string,
    vesselPrefix: string,
    document: LiveReportProfileDocument
  ): LiveReportVesselProfile {
    const normalizedName = this.normalizeIdentity(vesselName);
    const normalizedPrefix = this.normalizeIdentity(vesselPrefix);



    if (normalizedName) {
      const nameMatch = document.profiles.find((item) =>
        (item.aliases || []).some(
          (alias) => this.normalizeIdentity(alias) === normalizedName
        )
      );

      if (nameMatch) {
        return nameMatch;
      }
    }

    if (normalizedPrefix) {
      const prefixMatch = document.profiles.find((item) =>
        (item.prefixes || []).some(
          (prefix) => this.normalizeIdentity(prefix) === normalizedPrefix
        )
      );

      if (prefixMatch) {
        return prefixMatch;
      }
    }

    return document.defaultProfile;
  }

  private normalizeDocument(document: LiveReportProfileDocument): LiveReportProfileDocument {
    if (!document || !document.defaultProfile || !Array.isArray(document.profiles)) {
      return this.getFallbackDocument();
    }

    const fallback = this.getFallbackDocument();
    const normalizeProfile = (
      profile: LiveReportVesselProfile | null | undefined,
      fallbackProfile: LiveReportVesselProfile
    ): LiveReportVesselProfile => {
      if (!profile || typeof profile !== 'object') {
        return fallbackProfile;
      }

      const uniqueByKey = <T extends { key: string }>(items: T[] | null | undefined): T[] => {
        const seen = new Set<string>();
        return (Array.isArray(items) ? items : []).filter((item) => {
          const key = this.normalizeKey(item?.key || '');
          if (!key || seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      };

      const modes = uniqueByKey(profile.modes);
      const engines = uniqueByKey(profile.engines);

      return {
        ...profile,
        id: this.readText(profile.id, fallbackProfile.id),
        label: this.readText(profile.label, fallbackProfile.label),
        aliases: Array.from(new Set((profile.aliases || []).filter(Boolean))),
        prefixes: Array.from(new Set((profile.prefixes || []).filter(Boolean))),
        modeTags: Array.from(new Set((profile.modeTags || fallbackProfile.modeTags || []).filter(Boolean))),
        modes: modes.length > 0 ? modes : fallbackProfile.modes,
        engines: engines.length > 0 ? engines : fallbackProfile.engines,
        sourceReport: this.readText(profile.sourceReport, ''),
      };
    };

    const defaultProfile = normalizeProfile(document.defaultProfile, fallback.defaultProfile);
    const seenProfiles = new Set<string>();
    const profiles = document.profiles
      .map((profile) => normalizeProfile(profile, defaultProfile))
      .filter((profile) => {
        const id = this.normalizeIdentity(profile.id);
        if (!id || seenProfiles.has(id)) {
          return false;
        }
        seenProfiles.add(id);
        return true;
      });

    return {
      version: Number.isFinite(document.version) ? document.version : fallback.version,
      defaultProfile,
      profiles,
    };
  }

  private getFallbackDocument(): LiveReportProfileDocument {
    const mainEngines: LiveReportEngineProfile[] = [
      this.engine('port-main', 'Port Main Engine', 'main', 'PME'),
      this.engine('center-main', 'Center Main Engine', 'main', 'CME'),
      this.engine('starboard-main', 'Starboard Main Engine', 'main', 'SME'),
      this.engine('port-aux', 'Port Auxiliary Engine', 'auxiliary', 'PAE'),
      this.engine('starboard-aux', 'Starboard Auxiliary Engine', 'auxiliary', 'SAE'),
    ];

    const defaultProfile: LiveReportVesselProfile = {
      id: 'generic-five-mode',
      label: 'Standard Vessel Profile',
      aliases: [],
      prefixes: [],
      modeTags: ['VES_OPERATION_MODE', 'VES_MODE', 'OPERATION_MODE'],
      modes: [
        { key: 'passage', label: 'Passage' },
        { key: 'sea-passage-economics', label: 'Sea Passage Economics' },
        { key: 'manoeuvring', label: 'Manoeuvring' },
        { key: 'cargo-operation', label: 'Cargo Operation' },
        { key: 'standby', label: 'Standby' },
      ],
      engines: mainEngines,
    };

    return { version: 1, defaultProfile, profiles: [] };
  }

  private engine(
    key: string,
    label: string,
    kind: LiveReportEngineProfile['kind'],
    prefix: string
  ): LiveReportEngineProfile {
    return {
      key,
      label,
      kind,
      fuelTodayTags: [`${prefix}_CONS_TODAY`],
      fuelRateTags: [`${prefix}_CONS_RATE`],
      flowSupplyTags: [`${prefix}_FIN_RATE`],
      flowReturnTags: [`${prefix}_FOUT_RATE`],
      speedTags: [`${prefix}_SPD_CALC`, `${prefix}_SPD`],
      loadTags: [`${prefix}_ENGINE_LOAD`, `${prefix}_GEN_LOAD`],
      powerTags: [`${prefix}_GEN_LOAD_KW`],
    };
  }

  private normalizeData(input: Record<string, any> | null | undefined): Record<string, any> {
    const result: Record<string, any> = {};

    if (!input || typeof input !== 'object') {
      return result;
    }

    Object.keys(input).forEach((key) => {
      const item = input[key];
      const aliases = [key, item?.name, item?.Name, item?.tagName, item?.TagName];

      aliases.forEach((alias) => {
        const normalized = this.normalizeKey(String(alias || ''));
        if (normalized) {
          result[normalized] = item;
        }
      });
    });

    return result;
  }

  private readNonNegativeNumber(data: Record<string, any>, candidates: string[]): number | null {
    return this.readBoundedNumber(data, candidates, 0, 10_000_000).value;
  }

  private readBoundedNumber(
    data: Record<string, any>,
    candidates: string[],
    minimum: number,
    maximum: number
  ): BoundedNumberResult {
    let hadInvalidValue = false;

    for (const candidate of candidates) {
      const raw = this.readRaw(data, [candidate]);
      const numberValue = this.parseNumber(raw);

      if (numberValue === null) {
        continue;
      }

      if (numberValue >= minimum && numberValue <= maximum) {
        return { value: numberValue, hadInvalidValue, sourceTag: candidate };
      }

      hadInvalidValue = true;
    }

    return { value: null, hadInvalidValue, sourceTag: null };
  }

  private parseNumber(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }

    const numberValue = Number(String(raw).replace(/,/g, '').trim());
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private readBoolean(data: Record<string, any>, candidates: string[]): boolean {
    const raw = this.readRaw(data, candidates);
    if (raw === null || raw === undefined || raw === '') {
      return false;
    }

    if (typeof raw === 'boolean') {
      return raw;
    }

    const normalized = String(raw).trim().toLowerCase();
    return ['1', 'true', 'yes', 'on', 'active', 'running'].includes(normalized);
  }

  private readRaw(data: Record<string, any>, candidates: string[]): any {
    for (const candidate of candidates) {
      const item = data[this.normalizeKey(candidate)];

      if (item === null || item === undefined || item?.hasValue === false) {
        continue;
      }

      const value =
        item?.value ??
        item?.Value ??
        item?.IValue ??
        item?.iValue ??
        item?.CurrentValue ??
        item?.currentValue ??
        item;

      if (value !== null && value !== undefined && value !== '') {
        return value;
      }
    }

    return null;
  }

  private sumAvailable(values: Array<number | null>): number | null {
    const available = values.filter(
      (value): value is number => value !== null && Number.isFinite(value)
    );
    return available.length > 0 ? available.reduce((sum, value) => sum + value, 0) : null;
  }

  private maxAvailable(values: Array<number | null>): number | null {
    const available = values.filter(
      (value): value is number => value !== null && Number.isFinite(value)
    );
    return available.length > 0 ? Math.max(...available) : null;
  }

  private getVesselInfo(vessel: any): any {
    return vessel?.fvInfo || vessel?.fv || vessel || {};
  }

  private readText(...values: unknown[]): string {
    for (const value of values) {
      const text = String(value ?? '').trim();
      if (text) {
        return text;
      }
    }
    return '';
  }

  private formatCompact(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
  }

  private normalizeKey(value: string): string {
    return String(value || '')
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }

  private normalizeIdentity(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }
}
