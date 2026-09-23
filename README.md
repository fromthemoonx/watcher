# Watcher

**An open-source streaming platform with the goal of delivering media to the people.**

Watcher is a free streaming interface that aggregates movie and TV show metadata from [TMDB](https://www.themoviedb.org/) and provides access to content through third-party embed providers. No sign-up, no subscription — just press play.

## Features

- Browse trending, popular, and top-rated movies and TV shows
- Dedicated Anime section
- Genre, year, language, country, actor, and director filters
- Live search with 400ms debounce
- Full TV show support with season/episode navigation
- YouTube trailer embeds on detail pages
- Cast, crew, and production details with clickable profiles
- Watch progress tracking (local storage)
- 6-server video player with automatic fallback
- Responsive design for all screen sizes

## Tech Stack

- **Vite + React** — fast, modern SPA
- **TMDB API** — metadata, images, cast, crew, trailers
- **VidSrc + Viduki** — video player embeds with multi-server fallback
- **No backend** — fully client-side

## Getting Started

```bash
git clone https://github.com/fromthemoonx/watcher.git
cd watcher

# Set up your TMDB API key
cp .env.example .env
# Edit .env and add your key (free at https://www.themoviedb.org/settings/api)

npm install
npm run dev
```

## License

This project is open source and available under the [MIT License](LICENSE).
