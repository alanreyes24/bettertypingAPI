# bettertypingapi – the backend for bettertyping

the node.js api behind [bettertyping](https://bettertyping.dev), built by alan reyes and miles oncken. it handles accounts, stores every completed test, and serves the leaderboards.

## features
- account signup and login with cookie-based sessions
- test storage for both signed-in users and guests
- daily and all-time leaderboards for timed and word-count tests
- per-user test history and most recent test lookup
- password hashing and signed session tokens

## getting started

needs node 18+ and a mongodb database.

```bash
npm install
```

create a `.env` in the project root:

```
CONNECT_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>
TOKEN_SECRET=<a long random string>
```

then start it:

```bash
node app.js
```

runs on `PORT` if set, otherwise 3090.

## api

### auth
- `POST /auth/signup` – create an account
- `POST /auth/login` – log in, sets the auth-token cookie
- `POST /auth/logout` – clear the cookie
- `GET /auth/tokenCheck` – validate the current session
- `GET /auth/profile` – the signed-in user

### tests
- `POST /test` – save a test, requires the auth cookie
- `POST /test/guest` – save a test from a signed-out visitor
- `GET /test/allByUser` – every test for the signed-in user
- `GET /test/userMostRecentTest` – their latest test
- `GET /test/timeRankings` – leaderboard for timed tests
- `GET /test/wordRankings` – leaderboard for word count tests

leaderboards take `timeFrame=all-time` or `daily`, and sort by trueWPM.

## tech stack
- backend: node.js, express.js, mongodb
- auth: jwt in an httpOnly cookie, bcrypt for passwords
- deployment: railway

## license 📄
mit license. see the license file for details.
