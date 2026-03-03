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

### Customize the configuration
See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

## QR deep-link auth behavior

When opening `/boxes/:display_name/:box_name` from a QR code:

- **Web entry (browser):** if the user is not authenticated, the router redirects to `/login`. After sign-in, the app should re-open the link route.
- **App entry (Capacitor deep-link):** if unauthenticated, route to login first; after login, navigate to the original box deep link.
- For authenticated users, `BoxDetailPage` resolves access through `get_box_access_status` and renders:
  - `200` -> box contents.
  - `403` -> explicit "valid QR but no access" message.
  - `404` -> explicit not-found message.

This behavior ensures users can distinguish "missing box" vs "existing box without permission".
