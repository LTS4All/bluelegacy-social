# BlueLegacy GitHub Pages deployment

The Pages-ready source is in [LTS4All/bluelegacy-social](https://github.com/LTS4All/bluelegacy-social).

The account UI is a static React build and can be published to GitHub Pages while the BlueLegacy API remains hosted by the project server. The API exposes the following legacy-friendly routes under `/api/bluelegacy`:

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/register` | Accepts `{ username, password, age }`; returns a session token and `completed: true`. |
| `POST` | `/login` | Accepts `{ username, password }`; returns a session token. |
| `GET` | `/me` | Reads the `X-BlueLegacy-Token` header and returns the signed-in account. |
| `GET` | `/feed` | Returns the newest shared posts. |
| `POST` | `/posts` | Reads `X-BlueLegacy-Token` and accepts `{ body }` up to 500 characters. |
| `POST` | `/logout` | Revokes the token represented by `X-BlueLegacy-Token`. |

The hosted server sends CORS headers for these routes. Set `BLUELEGACY_WEB_ORIGIN` to the exact GitHub Pages origin before publishing if the deployment should be restricted to one site; leaving it unset permits a public static frontend to call the API.

For a GitHub Pages build, configure the frontend API origin as the public HTTPS origin of the deployed BlueLegacy backend, build the client with the normal production command, and publish the generated static output using the repository’s Pages workflow. GitHub Pages is static and cannot host the database/API itself; do not use the temporary preview URL for the final iOS 9 build. The account website is intentionally usable from the managed hosted URL first, which is the canonical place to verify registration and the **Completed** confirmation before copying the static build to Pages.

The iOS 9 client uses the same routes with `X-BlueLegacy-Token`, so the web and armv7 app share the same account and feed data. Passwords are never sent back after login, and the database stores only scrypt password encodings and SHA-256 token hashes.
