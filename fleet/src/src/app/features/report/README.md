# Fleet Visual Report feature

This folder is the single place to maintain the Report page.

## Active user flow

1. **Web Report (default)** - completed historian data only.
   - `Daily Report`: defaults to yesterday, 00:00-23:59.
   - `Monthly Report`: defaults to the previous fully completed month.
   - Changing report type/date/month does not query the historian automatically; press `Load report` to retrieve the selected completed period.
2. **Original PDF** - opens the official completed PDF workspace while keeping the same Daily/Monthly period selected in Web Report.
3. **Download PDF** - downloads the official PDF for the selected Web Report period directly, without first rendering it in the PDF viewer.
4. **Realtime report UI is disabled** - the Report page does not start realtime report rendering for the historical report workflow.

## Data-consistency rules

- Today is blocked in Daily Web Report.
- The current month is blocked in Monthly Web Report because it is not a fully completed report period.
- When report type/date/month changes, the previous report data is cleared so the screen can never show old data under a new period label.
- Historian requests are user-triggered (`Load report`, `Yesterday`, `Previous month`) to reduce unnecessary server load.

## Folder structure

- `report.component.html` - main Report page layout and web-report tables/cards.
- `report.component.css` - Report page styles. Search for `REPORT PRO V22` for the Daily/Monthly + Download additions.
- `report.component.ts` - page state, historian loading, direct PDF download, PDF viewer loading and report calculations.
- `report.module.ts` - Report feature declarations/routes.
- `components/` - UI pieces used only by Report (date picker, PDF viewer, alerts, charts).
- `models/` - Report-specific TypeScript models.
- `services/common/` - shared vessel report adapter contract.
- `services/vessels/sc-glory-1/` - SC GLORY 1 historian/report rules and calculations.
- `services/vessels/sc-glory-2/` - SC GLORY 2 (A02) historian/report rules and calculations using the same premium Report UI.
- `services/vessels/sc-glory-3/` - SC GLORY 3 historian/report rules and calculations using the same premium Report UI.
- `services/report-vessel-service-resolver.service.ts` - selects the correct vessel-specific report service.

## Editing guide

- To change Daily/Monthly controls or top PDF actions: edit `report.component.html` and the CSS section `REPORT PRO V22`.
- To change SC GLORY 1 calculations/tags: edit `services/vessels/sc-glory-1/`.
- To change SC GLORY 2 calculations/tags: edit `services/vessels/sc-glory-2/`.
- To change SC GLORY 3 calculations/tags: edit `services/vessels/sc-glory-3/`.
- To change how the original PDF is loaded/displayed: edit `components/report-pdf-viewer/` plus the official PDF methods in `report.component.ts`.

Keep report-only components here rather than under `shared/` so future maintenance is easier.

## Interactive chart hover (V23)

- Report HTML/SVG charts use one shared floating tooltip controlled by `report.component.ts` + `REPORT PRO V23` styles in `report.component.css`.
- Speed and route SVGs render invisible/hoverable point targets so users can inspect the exact historian timestamp/value without adding a heavy chart library to every report section.
- Premium pie charts continue to use native Highcharts tooltips.
