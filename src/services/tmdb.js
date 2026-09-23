/**
 * TMDB API service
 * Centralizes all TMDB API calls. Uses the v3 REST API with an API key.
 * Docs: https://developer.themoviedb.org/reference/intro/getting-started
 */

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

/**
 * Image URL builder.
 * TMDB serves images at fixed widths: w92, w154, w185, w342, w500, w780, w1280, original.
 * We map these to responsive srcset breakpoints (pattern from PopcornMovies research).
 */
export const IMG_BASE = "https://image.tmdb.org/t/p/";
export const img = (path, size = "w500") =>
  path ? `${IMG_BASE}${size}${path}` : null;

/**
 * Responsive poster srcset for <img> tags.
 * Returns a srcset string mapping TMDB sizes to pixel widths.
 */
export const posterSrcSet = (path) => {
  if (!path) return "";
  return [
    `${IMG_BASE}w342${path} 342w`,
    `${IMG_BASE}w500${path} 500w`,
    `${IMG_BASE}w780${path} 780w`,
  ].join(", ");
};

/**
 * Responsive backdrop srcset for hero images.
 */
export const backdropSrcSet = (path) => {
  if (!path) return "";
  return [
    `${IMG_BASE}w780${path} 780w`,
    `${IMG_BASE}w1280${path} 1280w`,
    `${IMG_BASE}original${path} 1920w`,
  ].join(", ");
};

/* ─── Core fetch wrapper ─── */

async function get(endpoint, params = {}) {
  const url = new URL(`${BASE}${endpoint}`);
  url.searchParams.set("api_key", API_KEY);
  // Block adult content globally
  url.searchParams.set("include_adult", "false");
  // Attach any extra query params
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
}

/* ─── Movie endpoints ─── */

export const getTrending = (type = "all", window = "week") =>
  get(`/trending/${type}/${window}`);

export const getPopular = (type = "movie") =>
  get(`/${type}/popular`);

export const getTopRated = (type = "movie") =>
  get(`/${type}/top_rated`);

/** Full movie details including videos (trailers) and credits */
export const getMovieDetails = (id) =>
  get(`/movie/${id}`, { append_to_response: "videos,credits" });

/** Full TV show details including videos, credits, and external IDs (for IMDB) */
export const getTvDetails = (id) =>
  get(`/tv/${id}`, { append_to_response: "videos,credits,external_ids" });

/** Get similar/recommended titles */
export const getRecommendations = (type, id) =>
  get(`/${type}/${id}/recommendations`);

/** TV season details (episode list) */
export const getSeasonDetails = (tvId, seasonNum) =>
  get(`/tv/${tvId}/season/${seasonNum}`);

/** Multi-search across movies, TV, and people */
export const search = (query, page = 1) =>
  get("/search/multi", { query, page });

/** Search for people (actors, directors) by name */
export const searchPerson = (query) =>
  get("/search/person", { query });

/** Get a person's movie/TV credits */
export const getPersonCredits = (personId) =>
  get(`/person/${personId}/combined_credits`);

/** Get person details (bio, photo, etc.) */
export const getPersonDetails = (personId) =>
  get(`/person/${personId}`);

/* ─── Genre lists ─── */

export const getGenres = (type = "movie") =>
  get(`/genre/${type}/list`);

/**
 * Discover endpoint — filter by genre, region, sort order, etc.
 * Used by the browse pages for genre-filtered content.
 * type: "movie" or "tv"
 * params: { with_genres, sort_by, with_origin_country, page, ... }
 */
export const discover = (type = "movie", params = {}) =>
  get(`/discover/${type}`, params);

/**
 * Anime discovery — Animation genre (16) + Japanese origin.
 * TMDB doesn't have a dedicated anime category, so we fake it.
 */
export const getAnime = (page = 1) =>
  discover("tv", {
    with_genres: "16",
    with_origin_country: "JP",
    sort_by: "popularity.desc",
    page,
  });
