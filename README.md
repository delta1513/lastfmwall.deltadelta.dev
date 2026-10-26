# Last.fm Animated Track Wall

An animated, vertically scrolling wall of your top Last.fm album art. Add your username to the URL:

```
https://<your-site>/?username=your_username
```

⚠️ This app is vibe-coded ⚠️

This is a static Next.js site (`output: "export"`) served by a Cloudflare Worker. It calls the Last.fm [`user.getTopAlbums`](https://www.last.fm/api/show/user.getTopAlbums) API straight from the browser (top 100 albums over the last 12 months).

## API key

There is no server, so the Last.fm API key is inlined into the JavaScript bundle at **build time** from `NEXT_PUBLIC_LASTFM_API_KEY`. Last.fm keys are read-only, but anyone can see the key in the page source.

- Cloudflare: set `NEXT_PUBLIC_LASTFM_API_KEY` as a build variable (Worker > Settings > Build > Variables and secrets), then redeploy.
- Locally: create `.env.local` containing `NEXT_PUBLIC_LASTFM_API_KEY=your_key_here`.

Get a key at https://www.last.fm/api/account/create.

## Run locally

1. `npm install`
2. Create `.env.local` as above.
3. `npm run dev`, then open `http://localhost:3000/?username=your_username`

## Other commands

- `npm run build` builds the static site to `out/`.
- `npm run preview` builds, then serves `out/` with `wrangler dev`.
- `npm run deploy` deploys by hand with `wrangler deploy`.

## Layout

- `app/page.tsx` and `components/WallPage.tsx`: main page (intro screen or track wall, chosen by `?username=`).
- `components/TrackWallClient.tsx`: fetches albums, shuffles them and splits them into columns.
- `components/AlbumArtColumn.tsx`: one scrolling column.
- `services/lastfmService.ts`: Last.fm API call.
