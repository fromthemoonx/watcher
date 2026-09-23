/**
 * Torrentio service
 * Fetches available torrent streams for a movie/TV episode via IMDB ID.
 * Uses Torrentio's public Stremio addon API — no key needed.
 *
 * Movies:  /stream/movie/{imdb_id}.json
 * TV:      /stream/series/{imdb_id}:{season}:{episode}.json
 *
 * Returns array of stream objects with name, title, infoHash, fileIdx, etc.
 */

const TORRENTIO_BASE = "https://torrentio.strem.fun";

/**
 * Parse Torrentio stream title into structured data.
 * Title format: "Name.2024.2160p.WEB-DL\n💾 8.5 GB ⚙️ YTS 👤 1204"
 */
function parseStream(stream) {
  const title = stream.title || "";
  const name = stream.name || "";
  const lines = title.split("\n");

  /* Extract quality from name (e.g. "Torrentio\n4K" or "Torrentio\n1080p") */
  const qualityMatch = name.match(/(\d{3,4}p|4K|2160p|HDR)/i);
  const quality = qualityMatch ? qualityMatch[1].toUpperCase() : "Unknown";

  /* Extract size (e.g. "💾 8.5 GB") */
  const sizeMatch = title.match(/💾\s*([\d.]+\s*[GMKT]B)/i);
  const size = sizeMatch ? sizeMatch[1] : "";

  /* Extract seeders (e.g. "👤 1204") */
  const seedMatch = title.match(/👤\s*(\d+)/);
  const seeders = seedMatch ? parseInt(seedMatch[1]) : 0;

  /* Extract source/tracker (e.g. "⚙️ YTS") */
  const sourceMatch = title.match(/⚙️\s*(\S+)/);
  const source = sourceMatch ? sourceMatch[1] : "";

  return {
    ...stream,
    quality,
    size,
    seeders,
    source,
    displayTitle: lines[0] || title,
  };
}

/**
 * Fetch available streams for a movie.
 * @param {string} imdbId — IMDB ID (e.g. "tt0137523")
 */
export async function getMovieStreams(imdbId) {
  try {
    const res = await fetch(`${TORRENTIO_BASE}/stream/movie/${imdbId}.json`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.streams || []).map(parseStream);
  } catch (err) {
    console.error("Torrentio fetch failed:", err);
    return [];
  }
}

/**
 * Fetch available streams for a TV episode.
 * @param {string} imdbId — show IMDB ID
 * @param {number} season
 * @param {number} episode
 */
export async function getTvStreams(imdbId, season, episode) {
  try {
    const res = await fetch(
      `${TORRENTIO_BASE}/stream/series/${imdbId}:${season}:${episode}.json`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.streams || []).map(parseStream);
  } catch (err) {
    console.error("Torrentio fetch failed:", err);
    return [];
  }
}
