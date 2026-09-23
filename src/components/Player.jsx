import { useState, useEffect, useRef, useCallback } from "react";
import { saveProgress } from "../services/watchProgress";

/**
 * Player component — supports VidSrc, Viduki via iframe embed.
 *
 * Server index mapping:
 *   0 = VidSrc (vidsrc.sh)
 *   1 = Viduki API 2 (Multi Language)
 *   2 = Viduki API 1 (Multi Server) — DEFAULT
 *   3 = Viduki API 3 (Multi Embeds)
 *   4 = Viduki API 4 (Premium)
 *   5 = VidSrc Alt (vidsrc.sbs)
 *
 * Includes a custom fullscreen button as a workaround for Viduki's
 * broken cross-origin fullscreen. Calls requestFullscreen() on the
 * wrapper element from our side since we can't fix their player code.
 * PiP is NOT possible on iframes — requires a <video> element.
 *
 * Props:
 *   type, tmdbId, season, episode, apiTier
 */

const COLOR = "E50914";
/** Default server index — Viduki API 1 (Multi Server) */
const DEFAULT_SERVER = 2;

const SERVERS = [
  { provider: "vidsrc", domain: "vidsrc.sh" },
  { provider: "viduki", api: 2 },
  { provider: "viduki", api: 1 },
  { provider: "viduki", api: 3 },
  { provider: "viduki", api: 4 },
  { provider: "vidsrc", domain: "vidsrc.sbs" },
];

function buildUrl(serverIndex, type, tmdbId, season, episode) {
  const server = SERVERS[serverIndex] || SERVERS[DEFAULT_SERVER];

  if (server.provider === "vidsrc") {
    const base = `https://${server.domain}/embed`;
    const path = type === "tv"
      ? `${base}/tv/${tmdbId}/${season}/${episode}`
      : `${base}/movie/${tmdbId}`;
    const subParam = server.domain === "vidsrc.sh" ? "ds_lang" : "sub";
    return `${path}?color=${COLOR}&${subParam}=en`;
  }

  if (server.provider === "viduki") {
    const base = `https://viduki.net/${server.api}`;
    const path = type === "tv"
      ? `${base}/tv/${tmdbId}/${season}/${episode}`
      : `${base}/movie/${tmdbId}`;
    return `${path}?color=${COLOR}`;
  }

  return "";
}

/** Fullscreen expand icon (SVG) */
const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/** Fullscreen compress icon (SVG) */
const CompressIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

export default function Player({ type, tmdbId, season, episode, apiTier }) {
  /** Default to Server 3 (index 2) — Viduki Multi Server */
  const [autoTier, setAutoTier] = useState(DEFAULT_SERVER);
  const tierIndex = apiTier !== undefined ? apiTier : autoTier;

  const wrapperRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /** Toggle fullscreen on the wrapper — workaround for Viduki's broken button */
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      wrapperRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  /** Track fullscreen state so icon updates */
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const handleMessage = (event) => {
      const data = event.data;
      if (!data) return;

      /* Viduki auto-fallback — cycle to next server on failure */
      if (data.type === "viduki:all-servers-failed" && apiTier === undefined) {
        setAutoTier((prev) => (prev + 1 < SERVERS.length ? prev + 1 : prev));
      }

      /* Viduki watch progress */
      if (data.type === "MEDIA_DATA" && data.data) {
        saveProgress(data.data);
      }

      /* VidSrc watch progress */
      if (data.type === "PLAYER_EVENT" && data.data) {
        const { player_info, player_status, player_progress, player_duration } = data.data;
        if (player_status === "playing" && player_progress > 0) {
          saveProgress({
            id: String(player_info.tmdb || player_info.imdb || tmdbId),
            type: player_info.mediaType || type,
            title: "",
            progress: { watched: player_progress, duration: player_duration },
            last_updated: Date.now(),
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [apiTier, tmdbId, type]);

  /** Reset to default server on media change */
  useEffect(() => { setAutoTier(DEFAULT_SERVER); }, [tmdbId, season, episode]);

  return (
    <div className="player-wrapper" ref={wrapperRef}>
      <iframe
        src={buildUrl(tierIndex, type, tmdbId, season, episode)}
        className="player-iframe"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        referrerPolicy="origin"
        frameBorder="0"
      />
      {/* Custom fullscreen toggle — sits bottom-right over the iframe */}
      <button
        className="player-fs-btn"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
      </button>
    </div>
  );
}
