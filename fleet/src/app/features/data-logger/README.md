# Data Logger integration

This feature was integrated into `FLEETVISUAL_V2-main` from the supplied Data Logger Pro project.

- Route: `#/main/data-logger`
- Sensor list: `NewHttpClientService.getPoints(prefix)`
- Historical data: `NewHttpClientService.getChartRawData(start, end, tags)`
- CSV export: `xlsx`
- Threshold fallback rules: `data-logger-threshold.config.ts`
