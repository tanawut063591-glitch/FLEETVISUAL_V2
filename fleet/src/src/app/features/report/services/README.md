# Report data services

- `common/vessel-report-adapter.ts` - interface/contract for vessel-specific report behavior.
- `report-vessel-service-resolver.service.ts` - chooses the adapter for the selected vessel.
- `vessels/sc-glory-1/sc-glory-1-report.profile.ts` - SC GLORY 1 report profile/tag mapping.
- `vessels/sc-glory-1/sc-glory-1-report.service.ts` - SC GLORY 1 historian requests, daily/monthly aggregation and web-report calculations.
- `vessels/sc-glory-2/sc-glory-2-report.profile.ts` - SC GLORY 2 / A02 report profile and vessel matching.
- `vessels/sc-glory-2/sc-glory-2-report.service.ts` - SC GLORY 2 historian requests and SCReportingService-compatible calculations.
- `vessels/sc-glory-3/sc-glory-3-report.profile.ts` - SC GLORY 3 report profile and vessel matching.
- `vessels/sc-glory-3/sc-glory-3-report.service.ts` - SC GLORY 3 historian requests and SCReportingService-compatible calculations.
- `vessels/sc-emerald/sc-emerald-report.profile.ts` - SC EMERALD / A05 report profile, equipment mapping and 15-mode mapping.
- `vessels/sc-emerald/sc-emerald-report.service.ts` - SC EMERALD historian requests and SCEmerald-compatible calculations.

The web Report page uses historian data only. Realtime report polling is not started from the Report page.
