# FBI Bot Frontend

A Vue 3 + Tailwind CSS frontend for viewing Discord analytics data from the FBI Bot API.

## Tech Stack

- **Vue 3** with **Vue Router**
- **Tailwind CSS**
- **Chart.js**
- **Vite**

## Development

```sh
npm install
npm run dev
```

The dev server proxies `/api` to the backend configured in `vite.config.js`.

## Deployment

The Docker image serves the build with nginx and proxies `/api/` to the backend.
Set `API_URL` to the backend's `host:port` (see `docker-compose.yml`).

## Security

- Login is a shared password checked by the backend, which returns a token
- The token is kept in `sessionStorage` and sent as a `Bearer` header
- nginx sets a strict Content-Security-Policy and other security headers
- Rate limiting of login attempts is up to the backend

## Pages

- **`/login`** - Password login
- **`/`** - Server statistics
- **`/users`** - User list with search
- **`/users/:userId`** - User details: overview, charts, and paged lists of messages, voice sessions, activities and presence
- **`/connections`** - Voice dating: who spends the most time together in voice
