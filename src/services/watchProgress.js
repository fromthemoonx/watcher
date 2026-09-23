/**
 * Watch progress service
 * Tracks what the user has watched. Data comes from two sources:
 *   1. Player postMessage events (Viduki/VidSrc) — has progress timestamps
 *   2. Watch page saveWatchEntry() — has poster/title from TMDB details
 *
 * We merge both: the Watch page saves the metadata, player events update progress.
 */

const STORAGE_KEY = "watcher-progress";

/** Get all stored progress entries */
export function getAllProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Get progress for a specific TMDB ID */
export function getProgress(tmdbId) {
  const all = getAllProgress();
  return all[String(tmdbId)] || null;
}

/**
 * Save or merge progress data.
 * Merges with existing entry so metadata (title, poster) isn't lost
 * when a player event updates only the progress fields.
 */
export function saveProgress(mediaData) {
  try {
    const all = getAllProgress();
    const id = String(mediaData.id);
    const existing = all[id] || {};
    /* Merge: new data overwrites, but keep existing fields if new ones are empty */
    all[id] = {
      ...existing,
      ...mediaData,
      title: mediaData.title || existing.title || "",
      poster_path: mediaData.poster_path || existing.poster_path || "",
      backdrop_path: mediaData.backdrop_path || existing.backdrop_path || "",
      last_updated: mediaData.last_updated || Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* localStorage full or unavailable */
  }
}

/**
 * Save a watch entry from the Watch page (has full TMDB metadata).
 * Called when user starts watching, before any player events fire.
 */
export function saveWatchEntry({ id, type, title, poster_path, backdrop_path }) {
  try {
    const all = getAllProgress();
    const key = String(id);
    const existing = all[key] || {};
    all[key] = {
      ...existing,
      id: key,
      type,
      title,
      poster_path,
      backdrop_path,
      last_updated: Date.now(),
      /* Keep existing progress if we have it */
      progress: existing.progress || { watched: 0, duration: 0 },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* localStorage full or unavailable */
  }
}

/**
 * Get "continue watching" list, sorted by most recently watched.
 * Filters out items without enough data to render.
 */
export function getContinueWatching() {
  const all = getAllProgress();
  return Object.values(all)
    .filter((item) => {
      /* Must have at least a title or poster to render */
      if (!item.title && !item.poster_path) return false;
      /* Must have some progress */
      const { watched, duration } = item.progress || {};
      if (!watched || !duration) return false;
      /* At least 60s watched and less than 95% complete */
      return watched > 60 && watched / duration < 0.95;
    })
    .sort((a, b) => (b.last_updated || 0) - (a.last_updated || 0));
}

/** Clear all progress */
export function clearAllProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
