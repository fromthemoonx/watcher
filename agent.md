# Agent Guide

A technical overview for anyone forking, contributing to, or extending Watcher.

## Architecture

Watcher is a **Vite + React SPA** with zero backend. Everything runs client-side.

```
src/
  components/     # Reusable UI components
    Footer.jsx        # Legal disclaimer footer
    Hero.jsx          # Home page hero carousel
    MediaCard.jsx     # Poster card (used in rows, grids, search results)
    MediaRow.jsx      # Horizontal scrollable row of MediaCards
    Navbar.jsx        # Sidebar navigation (currently unused, kept for reference)
    PersonSearch.jsx  # Autocomplete search for actors/directors with multi-select
    Player.jsx        # Iframe embed player — 6 servers (VidSrc ×2, Viduki ×4), fullscreen overlay
    Skeleton.jsx      # Shimmer loading placeholders
    TopBar.jsx        # Top navigation bar with logo and links
    FilterPanel.jsx   # Reusable filter panel component

  pages/
    Home.jsx          # Landing page: hero carousel + content rows
    Details.jsx       # Movie/TV info: poster, trailer, cast tabs, episodes
    Watch.jsx         # Dedicated player page with server selector + recommendations
    Search.jsx        # Live search with actor/director/year/language/country filters
    Browse.jsx        # Category grid (Movies, Shows, Anime, New & Popular) with filters
    Person.jsx        # Actor/director profile with filmography

  services/
    tmdb.js           # All TMDB API calls, image URL builders
    watchProgress.js   # localStorage wrapper for VidSrc/Viduki watch progress events
    constants.js       # Hardcoded language and country lists for filters

  App.jsx             # Router setup
  main.jsx            # React entry point
  index.css           # All styles in one file
```

## Data Flow

### Content metadata
All movie/TV data comes from **TMDB API v3**. The API key is stored in `.env` as `VITE_TMDB_API_KEY` and accessed via `import.meta.env`. Every API call goes through the `get()` wrapper in `tmdb.js` which appends the key and blocks adult content.

Key endpoints used:
- `/trending/{type}/{window}` — home page carousel and rows
- `/movie/{id}` and `/tv/{id}` — detail pages (with `append_to_response` for credits, videos)
- `/search/multi` — text search
- `/search/person` — actor/director autocomplete
- `/discover/movie` and `/discover/tv` — filtered browsing (genre, year, language, country, cast, crew)
- `/person/{id}` and `/person/{id}/combined_credits` — person profiles
- `/tv/{id}/season/{n}` — episode lists
- `/{type}/{id}/recommendations` — similar content on watch page

### Video playback
Streams come from **VidSrc** and **Viduki**, embedded as iframes. No stream URLs touch our code — the providers handle resolution, server selection, and DRM internally.

The Player component (`Player.jsx`) supports 6 servers across two providers:

| Index | Provider | Details |
|-------|----------|---------|
| 0 | VidSrc | vidsrc.sh — params: `?ds_lang=en`, `?color=` |
| 1 | Viduki | API 2 (Multi Language) — params: `?color=` |
| 2 | Viduki | API 1 (Multi Server) — **default** |
| 3 | Viduki | API 3 (Multi Embeds) |
| 4 | Viduki | API 4 (Premium) |
| 5 | VidSrc | vidsrc.sbs — alt mirror, params: `?sub=en`, `?color=` |

URL patterns:
```
VidSrc:  https://{domain}/embed/{type}/{tmdb_id}/{season}/{episode}?color=E50914&ds_lang=en
Viduki:  https://viduki.net/{api}/{type}/{tmdb_id}/{season}/{episode}?color=E50914
```

The `color` parameter themes the player UI (we use `E50914`, red).

**Fullscreen workaround:** Viduki's native fullscreen button is broken in cross-origin iframes. Player.jsx includes an invisible 70×100px clickable overlay anchored to the bottom-right corner that calls `requestFullscreen()` on the wrapper element from our side. PiP is not possible on iframes — requires a `<video>` element.

### Watch progress
Both providers post progress events via `postMessage`. Viduki sends `MEDIA_DATA`, VidSrc sends `PLAYER_EVENT` with `player_progress`/`player_duration`/`player_status`. We listen for both in `Player.jsx` and store progress in `localStorage` under the key `watcher-progress`. The `watchProgress.js` service reads this for the "Continue Watching" row on the home page.

### Server fallback
Viduki posts `viduki:all-servers-failed` when a tier has no working server. If the parent isn't controlling the tier (no `apiTier` prop), the Player auto-advances to the next server index. On the Watch page, the user controls the server via a dropdown, so auto-fallback is disabled.

## Routing

```
/                       → Home (hero + content rows)
/movie/{id}             → Movie details
/tv/{id}                → TV show details
/person/{id}            → Actor/director profile
/search                 → Search (supports ?q= param)
/browse/movies          → Movies grid with filters
/browse/tv              → TV shows grid with filters
/browse/anime           → Anime grid (Animation genre + Japan origin)
/browse/new             → Trending this week
/watch/movie/{id}       → Movie player
/watch/tv/{id}/{s}/{e}  → TV player (season/episode)
```

**Route order matters.** `/person/:id` is defined before `/:type/:id` in App.jsx so it doesn't get caught by the wildcard.

## Styling

All CSS is in a single `index.css` file. No CSS framework, no preprocessor.

Key design tokens in `:root`:
- `--bg`: `#0a0a0f` — page background
- `--accent`: `#e50914` — red accent (buttons, active states)
- `--surface`: `#181a22` — card/input backgrounds
- `--text`: `#e6e6e6` — primary text
- `--text-muted`: `#8d8d9b` — secondary text

The top bar is transparent with a gradient overlay, not a solid background. It blends with whatever content is behind it.

Media rows use `padding-left` on the parent `.media-row` and `padding-right` on the `.media-row-track` so titles and cards align to the same left edge.

## Filters

Browse and Search pages share the same filter types but manage state independently:

- **Genre** — dropdown, fetched from TMDB per category
- **Year range** — two dropdowns (From/To), 1950 to current year
- **Language** — hardcoded list of 30 languages (ISO 639-1)
- **Country** — hardcoded list of 30 countries (ISO 3166-1), hidden on Anime (always Japan)
- **Actor** — multi-select autocomplete, searches TMDB `/search/person` across 3 pages
- **Director** — single-select autocomplete, same search mechanism

When any filter is active, the page switches from its default endpoint (popular + top rated) to TMDB's `/discover` endpoint. The `with_cast` and `with_crew` discover params only accept person IDs, which is why we search for people first and store their IDs.

**Known limitation:** `with_crew` only works for movies on TMDB. Director filtering on TV shows returns empty results.

## Anime Category

TMDB has no dedicated anime category. We fake it:
```
/discover/tv?with_genres=16&with_origin_country=JP&sort_by=popularity.desc
```
Genre 16 = Animation, origin country JP = Japan. This catches most anime but may include some non-anime Japanese animation.

## Adding a New Embed Provider

To add an alternative to VidSrc/Viduki:

1. In `Player.jsx`, add the provider to the `SERVERS` array with its URL builder logic in `buildUrl()`
2. On the Watch page, the server dropdown auto-populates from the server count
3. Match the iframe `allow` permissions — at minimum: `autoplay; fullscreen; picture-in-picture`
4. If the provider sends `postMessage` events, add handlers in the `useEffect`

The key requirement: the provider must accept a TMDB ID (or IMDB ID) and return a working player via iframe.

## Infinite Scroll

Browse pages load 20 results initially, then fetch more as the user scrolls. Max 5 pages (100 titles). The scroll listener triggers at 600px from the bottom. Results are deduplicated by ID.

Trending and default (popular + top rated) views switch to the discover endpoint for pagination since their native endpoints don't paginate cleanly across merged lists.

## Environment Variables

```
VITE_TMDB_API_KEY=     # Required. TMDB API v3 key.
```

That's the only env var. Get a free key at https://www.themoviedb.org/settings/api.

## Building and Deploying

```bash
npm run build          # Outputs to dist/
npm run preview        # Preview the production build locally
```

Deploy `dist/` to any static hosting: Vercel, Cloudflare Pages, Netlify. Set the build command to `npm run build` and the output directory to `dist`. Add `VITE_TMDB_API_KEY` as an environment variable in the hosting dashboard.

SPA routing requires a redirect rule: all paths should serve `index.html`. Vercel handles this automatically. For Cloudflare Pages and Netlify, add a `_redirects` file in `public/`:
```
/*    /index.html   200
```

## Common Issues

**Player not loading:** VidSrc or Viduki may be down. Try a different server from the dropdown. VidSrc is not behind Cloudflare; Viduki is.

**TMDB 401 errors:** API key is missing or wrong. Check `.env` exists, has no quotes around the key, and you restarted `npm run dev` after editing it.

**Anime routing to wrong page:** Items from TMDB's discover endpoint don't have `media_type` set. The Browse page must pass `type="tv"` explicitly for anime items.

**Filters not clearing on category switch:** The `filterKey` state in Browse.jsx increments on category change, which remounts PersonSearch components and clears their internal state.

**Director filter returning empty on TV:** TMDB limitation. `with_crew` only works for movies on the discover endpoint.
