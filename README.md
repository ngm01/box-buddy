# box-buddy (box-buddy)

inventoru tracking app

## Install the dependencies
```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
quasar dev
```


### Lint the files
```bash
yarn lint
# or
npm run lint
```


### Format the files
```bash
yarn format
# or
npm run format
```


### Build the app for production
```bash
quasar build
```

## Environment configuration

`src/config/app.config.js` centralizes app URL configuration for links and QR code targets.

### Required variables

- `NODE_ENV`
  - `production`: the app always uses `https://boxbuddy.io` for web links, regardless of any overrides.
  - non-production: `WEB_BASE_URL` or `DOMAIN` must be set to create QR URLs.
- `WEB_BASE_URL` (recommended for non-production)
  - Full origin preferred (for example: `https://staging.boxbuddy.io`).
  - If protocol is omitted, `https://` is assumed.
- `DOMAIN` (legacy fallback for non-production)
  - Domain only (for example: `staging.boxbuddy.io`).

### Deployment expectations

- **Production**
  - Set `NODE_ENV=production`.
  - Expected public web URL is always `https://boxbuddy.io`.
  - If `WEB_BASE_URL`/`DOMAIN` are set to anything else, the app logs a structured warning and ignores the override.
- **Staging/Development**
  - Set either `WEB_BASE_URL` or `DOMAIN`.
  - Missing values trigger a structured error and QR creation fails fast with a user-visible message.
  - A safe fallback to `https://boxbuddy.io` is still available for non-QR link generation.

### Customize the configuration
See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
