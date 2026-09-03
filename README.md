# bettertyping API

Node.js/Express backend for [bettertyping.dev](https://bettertyping.dev), a typing speed test. It handles user accounts, stores completed tests, and serves the leaderboards.

## Stack

- **Runtime** — Node.js, Express 4
- **Database** — MongoDB via Mongoose 6
- **Auth** — JWT in an httpOnly cookie; passwords hashed with bcrypt
- **Hosting** — Railway

## Getting started

Requires Node.js 18 or newer and a MongoDB database (Atlas or local).

```bash
git clone https://github.com/alanreyes24/bettertypingAPI.git
cd bettertypingAPI
npm install
```

Create a `.env` file in the project root:

```
CONNECT_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>
TOKEN_SECRET=<a long random string>
```

Then start the server:

```bash
node app.js
# or, with auto-reload during development:
npx nodemon app.js
```

It listens on `PORT` if set, otherwise `3090`.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `CONNECT_URI` | yes | MongoDB connection string |
| `TOKEN_SECRET` | yes | Secret used to sign and verify auth tokens |
| `PORT` | no | Port to listen on. Defaults to `3090`; Railway sets this automatically |
| `NODE_ENV` | no | Set to `production` to mark the auth cookie `secure` |

## Authentication

`POST /auth/login` sets an `auth-token` cookie containing a JWT that expires after two hours. The cookie is `httpOnly` and `sameSite=None`, and is marked `secure` when `NODE_ENV=production`. Protected routes read the token from that cookie — there is no `Authorization` header path.

Because the cookie is cross-site, the frontend's origin has to appear in the CORS allowlist near the top of [app.js](app.js), which is served with `credentials: true`.

## API

### Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | — | Create an account. Body: `{ username, password }`. Passwords need 6+ characters; usernames are lowercased and must be unique. Returns `409` if the username is taken. |
| `POST` | `/auth/login` | — | Log in. Body: `{ username, password }`. Sets the `auth-token` cookie and returns `{ userID, username }`. |
| `POST` | `/auth/logout` | — | Clears the `auth-token` cookie. Returns `204`. |
| `GET` | `/auth/tokenCheck` | cookie | Validates the current cookie. Returns `{ _id, username }`. |
| `GET` | `/auth/profile` | cookie | Returns the signed-in user's record. |

### Tests

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/test` | — | Save a completed test to the `tests` collection. |
| `POST` | `/test/guest` | — | Save a test from a signed-out visitor to the `guesttests` collection. |
| `GET` | `/test/allByUser` | cookie | Every test belonging to the signed-in user. |
| `GET` | `/test/userMostRecentTest` | cookie | The signed-in user's most recent test. |
| `GET` | `/test/timeRankings` | — | Leaderboard for timed tests. Query: `duration`, `timeFrame`. |
| `GET` | `/test/wordRankings` | — | Leaderboard for word-count tests. Query: `count`, `timeFrame`. |

Both leaderboard routes take a `timeFrame` of `all-time` or `daily` (the daily window resets at UTC midnight), sort by `trueWPM` descending, and return `404` when nothing matches.

One quirk worth knowing: `/test/timeRankings` multiplies the `duration` query value by 10 before matching it against `settings.length`, so a 15-second leaderboard is requested as `duration=15` and matched against a stored length of `150`.

### Health

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/ping` | Returns `pong`. |
| `GET` | `/` | Returns `404 page not found`. |

## Data models

**User** — `username` (unique, lowercased) and `password`, hashed with bcrypt in a pre-save hook. Timestamped.

**Test** — one completed typing test: `userID`, `username`, and `timestamp`, plus three subdocuments and an event log.

- `words` — the word list, per-letter correct/incorrect maps, the true and raw WPM series, and chart data
- `settings` — `type` (`time` or `words`), `length`, `count`, `difficulty`
- `results` — `correctOnlyWPM`, `rawWPM`, `trueWPM`, `accuracy`

**GuestTest** — the same shape as `Test`, kept in its own collection for signed-out visitors.

## Project structure

```
app.js          Express setup, CORS allowlist, Mongo connection, route mounting
AppError.js     Error subclass that carries an HTTP status code
routes/         Route definitions
controllers/    Request handlers
models/         Mongoose schemas
```
