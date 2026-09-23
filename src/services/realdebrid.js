/**
 * Real-Debrid service
 * Takes a torrent infoHash, sends it to RD, gets back a direct HTTPS stream URL.
 * User's API key is stored in localStorage.
 *
 * Flow:
 *   1. addMagnet() — submit the torrent to RD
 *   2. selectFiles() — pick the video file
 *   3. getTorrentInfo() — get the download link
 *   4. unrestrict() — convert to a direct streamable URL
 *
 * API docs: https://api.real-debrid.com/
 */

const RD_BASE = "https://api.real-debrid.com/rest/1.0";
const STORAGE_KEY = "watcher-rd-key";

/* ─── API key management ─── */

export function getRdKey() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function setRdKey(key) {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function hasRdKey() {
  return !!getRdKey();
}

/* ─── API helpers ─── */

async function rdFetch(endpoint, options = {}) {
  const key = getRdKey();
  if (!key) throw new Error("No Real-Debrid API key configured");

  const res = await fetch(`${RD_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`RD ${res.status}: ${err.error || "Request failed"}`);
  }

  return res.json();
}

/**
 * Check if the API key is valid by hitting the user endpoint.
 * Returns user info on success, throws on failure.
 */
export async function validateKey() {
  return rdFetch("/user");
}

/**
 * Check instant availability — returns which files are already cached on RD.
 * Cached torrents play instantly, uncached ones need time to download.
 * @param {string} hash — torrent infoHash
 */
export async function checkCache(hash) {
  try {
    const data = await rdFetch(`/torrents/instantAvailability/${hash}`);
    /* Response is keyed by hash, contains available cached files */
    const entry = data[hash.toLowerCase()] || data[hash];
    return !!entry && Object.keys(entry).length > 0;
  } catch {
    return false;
  }
}

/**
 * Full resolve flow: hash → direct playable URL.
 * @param {string} hash — torrent infoHash
 * @returns {string} — direct HTTPS URL to video file
 */
export async function resolveStream(hash) {
  /* Step 1: Add the magnet to RD */
  const magnet = `magnet:?xt=urn:btih:${hash}`;
  const addForm = new URLSearchParams({ magnet });
  const addResult = await rdFetch("/torrents/addMagnet", {
    method: "POST",
    body: addForm,
  });

  const torrentId = addResult.id;

  /* Step 2: Get torrent info to find available files */
  const info = await rdFetch(`/torrents/info/${torrentId}`);

  /* Find the largest video file (most likely the movie) */
  const videoExts = [".mp4", ".mkv", ".avi", ".mov", ".wmv"];
  const videoFiles = (info.files || []).filter(
    (f) => f.bytes > 0 && videoExts.some((ext) => f.path.toLowerCase().endsWith(ext))
  );

  if (!videoFiles.length) throw new Error("No video files found in torrent");

  /* Pick the largest video file */
  const largest = videoFiles.reduce((a, b) => (a.bytes > b.bytes ? a : b));

  /* Step 3: Select the video file */
  const selectForm = new URLSearchParams({ files: String(largest.id) });
  await rdFetch(`/torrents/selectFiles/${torrentId}`, {
    method: "POST",
    body: selectForm,
  });

  /* Step 4: Wait briefly and get updated info with download link */
  await new Promise((r) => setTimeout(r, 1000));
  const updatedInfo = await rdFetch(`/torrents/info/${torrentId}`);

  const downloadLink = updatedInfo.links?.[0];
  if (!downloadLink) throw new Error("No download link available — torrent may still be downloading");

  /* Step 5: Unrestrict the link to get the final direct URL */
  const unrestrictForm = new URLSearchParams({ link: downloadLink });
  const unrestricted = await rdFetch("/unrestrict/link", {
    method: "POST",
    body: unrestrictForm,
  });

  return unrestricted.download;
}
