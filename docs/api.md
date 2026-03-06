# GameSide API Reference

Base URL: `http://localhost:3000`

---

## Authentication

### GET /auth/google

Start Google OAuth 2.0 login flow. Redirects to Google sign-in page.

**Access:** Public

**Response:** 302 redirect to Google OAuth consent screen.

---

### GET /auth/google/callback

OAuth callback. Google redirects here after user consents.

**Access:** Public (called by Google)

**Success:** Redirects to `/?login=success` and sets an `httpOnly` cookie named `token` (JWT, HS256, 24h expiry) plus a CSRF cookie used by the frontend for unsafe requests.

**Failure:** Redirects to `/?login=failed` if email is not in the allowed list, or `/?login=csrf_error` if state mismatch.

**Security:** Uses `state` parameter for CSRF protection.

---

### GET /auth/me

Returns the currently authenticated user's info.

**Access:** Requires authentication (JWT)

**Headers:**
```
Cookie: token=<jwt>
```
or
```
Authorization: Bearer <jwt>
```

**Success Response (200):**
```json
{
  "user": {
    "email": "user@gmail.com",
    "name": "User Name",
    "picture": "https://...",
    "iat": 1741139200,
    "exp": 1741225600
  },
  "csrfToken": "random-csrf-token"
}
```

**Error Response (401):**
```json
{ "error": "Authentication required" }
```

---

### POST /auth/logout

Clears the authentication cookie.

**Access:** Public

**Cookie-authenticated requests:** send `X-CSRF-Token` matching the `csrf_token` cookie.

**Response (200):**
```json
{ "message": "Logged out" }
```

---

## Games

### GET /api/games

Returns the list of all games.

**Access:** Public

**Response (200):**
```json
[
  {
    "id": "sample-game",
    "title": "Sample Platformer",
    "folder": "sample-game",
    "thumbnail": "games/sample-game/thumbnail.svg",
    "thumbnailUrl": "http://127.0.0.1:3001/games/sample-game/thumbnail.svg",
    "playUrl": "http://127.0.0.1:3001/games/sample-game/index.html",
    "description": "A simple HTML5 canvas platformer game.",
    "author": "Team",
    "tags": ["platformer", "action"],
    "date": "2026-03-05",
    "plays": 0,
    "featured": true
  }
]
```

**Error Response (500):**
```json
{ "error": "Failed to load games list" }
```

---

### POST /api/games

Upload a new game.

**Access:** Requires authentication (JWT)

**Content-Type:** `multipart/form-data`

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gameFile` | File | Yes | Game file (.zip or .html, max 50MB) |
| `thumbnail` | File | Yes | Thumbnail image (.png, .jpg) |
| `title` | String | Yes | Game title (used to generate slug ID) |
| `description` | String | No | Game description |
| `author` | String | No | Author name (default: "Anonymous") |
| `tags` | String | No | Comma-separated tags (e.g., "action,arcade") |

**Allowed file types (validated by magic bytes, not MIME header):**
- Game file: `.zip` (PK header), `.html` (DOCTYPE/html tag)
- Thumbnail: `.png` (PNG header), `.jpg`/`.jpeg` (JPEG header)
- Note: SVG uploads are blocked to prevent XSS
- Cookie-authenticated uploads must send `X-CSRF-Token` matching the `csrf_token` cookie

**Success Response (201):**
```json
{
  "message": "Game uploaded successfully.",
  "game": {
    "id": "my-cool-game",
    "title": "My Cool Game",
    "folder": "my-cool-game",
    "thumbnail": "games/my-cool-game/thumbnail.png",
    "description": "An awesome game",
    "author": "Team",
    "tags": ["action", "arcade"],
    "date": "2026-03-05T12:00:00.000Z",
    "plays": 0,
    "featured": false
  }
}
```

**Error Responses:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `"Title is required."` | Missing title field |
| 400 | `"Game file is required."` | Missing gameFile |
| 400 | `"Thumbnail is required."` | Missing thumbnail |
| 400 | `"Game file must be .zip or .html"` | Invalid game file type |
| 400 | `"Thumbnail must be .png, .jpg, or .svg"` | Invalid thumbnail type |
| 401 | `"Authentication required"` | No JWT token provided |
| 401 | `"Invalid or expired token"` | Bad or expired JWT |
| 409 | `"A game with ID \"...\" already exists."` | Duplicate game slug |
| 413 | `"File too large. Maximum size is 50MB."` | File exceeds size limit |
| 400 | `"ZIP must contain an index.html file..."` | ZIP missing a playable entry point |
| 403 | `"Invalid CSRF token"` | Missing or invalid CSRF token for cookie auth |
| 500 | `"Failed to process upload."` | Server-side processing error |

**Upload behavior:**
- `.zip` files are extracted into `games/{id}/`
- `.html` files are saved as `games/{id}/index.html`
- Thumbnails are saved as `games/{id}/thumbnail.{ext}`
- `games/index.json` is automatically updated

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com
JWT_SECRET=a-long-random-secret-string
PORT=3000
GAMES_PORT=3001
GAMES_PUBLIC_ORIGIN=http://127.0.0.1:3001
```

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `ALLOWED_EMAILS` | Comma-separated list of allowed team member emails |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `PORT` | Server port (default: 3000) |
| `GAMES_PORT` | Port used by the isolated static server for uploaded games |
| `GAMES_PUBLIC_ORIGIN` | Public origin used for thumbnails and playable game URLs |

---

## Running the Server

```bash
npm install
npm start        # Production
npm run dev      # Development (auto-restart on changes)
```

The main server serves the API and static frontend files from `public/`. Uploaded games are served from a separate origin so they do not share credentials with the app.

## Project Structure

```
gameside/
├── server.js              # Express server (NOT publicly accessible)
├── routes/
│   ├── upload.js          # Upload API
│   └── auth.js            # Auth routes
├── middleware/
│   └── auth.js            # JWT middleware
├── public/                # Static frontend (served at /)
│   ├── index.html
│   ├── game.html
│   ├── style.css
│   ├── app.js
│   └── features/
├── games/                 # Game data (served at /games/)
│   └── index.json
├── .env                   # Secrets (never committed or served)
└── .env.example           # Template
```
