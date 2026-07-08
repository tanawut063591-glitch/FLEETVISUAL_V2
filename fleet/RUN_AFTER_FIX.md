# Fleet Visual Angular 20 Fix

## What was fixed

- Login success now redirects to `/#/main/overview`.
- `/main` now uses `MainComponent` as a shell with child route `overview`.
- Added Angular 20 Overview page and Google Map component.
- Sidebar now receives vessel data and can open the map popup by clicking a vessel.
- Header menu paths are real Angular routes.
- Token interceptor now skips `/authen` and sends the raw API2 token like the Angular 5 project.
- Error interceptor no longer clears login state for failed `/authen` requests.

## Run

```bash
npm install
npm start
```

Then open:

```txt
http://localhost:4200/#/login
```

After login succeeds, it should go to:

```txt
http://localhost:4200/#/main/overview
```

## Important

If you still get `401 Unauthorized`, check these first:

1. `src/environments/environment.ts`
2. `API2_URL`
3. The username/password sent to `/authen`
4. Whether the API expects raw token or Bearer token for other endpoints
