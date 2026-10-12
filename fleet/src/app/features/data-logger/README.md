# Data Logger integration

- Route: `#/main/data-logger`
- Sensor list: `NewHttpClientService.getPoints(prefix)`
- Historical data: `NewHttpClientService.getHistorianValues(start, end, tags)`
- Table interval options: 1 minute, 5 minutes, 10 minutes
- Tag selection: managed from the Data Logger parameter selector (`Manage Tags`)
- CSV export: native Blob with spreadsheet formula escaping (no `xlsx` runtime dependency)
- Threshold fallback rules: `data-logger-threshold.config.ts`
