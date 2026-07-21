# User Sessions backend integration

The Settings > Users page can display every signed-in account only when the server tracks sessions.
The browser cannot reliably discover users signed in from other computers by itself.

## Configure the endpoint

Edit `public/database-api.config.json`:

```json
{
  "enabled": true,
  "userSessions": {
    "enabled": true,
    "url": "{DATABASE_API_URL}/api/users/sessions",
    "method": "GET",
    "timeoutMs": 5000,
    "cacheSeconds": 10
  }
}
```

The API may return an array directly or under `data`, `result`, `users`, `sessions`, `items`, or `rows`.

## Recommended response

```json
{
  "sessions": [
    {
      "id": "session-001",
      "username": "sat",
      "displayName": "SAT Admin",
      "role": "Administrator",
      "status": "online",
      "loginAt": "2026-07-20T09:00:00+07:00",
      "lastActiveAt": "2026-07-20T11:58:20+07:00",
      "ipAddress": "192.168.1.20",
      "device": "Windows Desktop",
      "browser": "Chrome"
    }
  ]
}
```

## Presence rules

- Online: explicit `online` status, or activity within 5 minutes.
- Idle: activity older than 5 minutes but not more than 30 minutes.
- Offline: explicit `offline` status, logout, or activity older than 30 minutes.

For accurate results, update `lastActiveAt` with a server-side heartbeat and mark the session offline during logout or token expiry.
