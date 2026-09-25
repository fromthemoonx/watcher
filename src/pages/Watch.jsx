import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getTvDetails, getSeasonDetails, getMovieDetails, getRecommendations, img } from "../services/tmdb";
import { saveWatchEntry } from "../services/watchProgress";
import Player from "../components/Player";
import MediaCard from "../components/MediaCard";

/**
 * Watch page — 100vh player with cursor-hide behavior.
 * Back button + title fade out after 3s of inactivity.
 * Scroll down for server selector, episodes (TV), recommendations.
 */

const SERVER_NAMES = [
  "Server 1",   /* VidSrc */
  "Server 2",   /* Viduki Multi Language */
  "Server 3",   /* Viduki Multi Server */
  "Server 4",   /* Viduki Multi Embeds */
  "Server 5",   /* Viduki Premium */
  "Server 6",   /* VidSrc Alt */
];

const IDLE_TIMEOUT = 3000;

export default function Watch() {
  const { type, id, season, episode } = useParams();
  const navigate = useNavigate();

  const seasonNum = Number(season) || 1;
  const episodeNum = Number(episode) || 1;

  const [details, setDetails] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(seasonNum);
  const [recommendations, setRecommendations] = useState([]);
  /** Default: Server 1 (Viduki Multi Server) */
  const [serverIndex, setServerIndex] = useState(0);

  /* Cursor idle detection */
  const [showControls, setShowControls] = useState(true);
  const idleTimer = useRef(null);
  const playerRef = useRef(null);

  const resetIdle = useCallback(() => {
    setShowControls(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setShowControls(false), IDLE_TIMEOUT);
  }, []);

  useEffect(() => {
    const playerEl = playerRef.current;
    if (!playerEl) return;

    playerEl.addEventListener("mousemove", resetIdle);
    playerEl.addEventListener("mouseenter", resetIdle);
    playerEl.addEventListener("mouseleave", () => setShowControls(false));

    idleTimer.current = setTimeout(() => setShowControls(false), IDLE_TIMEOUT);

    return () => {
      playerEl.removeEventListener("mousemove", resetIdle);
      playerEl.removeEventListener("mouseenter", resetIdle);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  /* Fetch details + recommendations */
  useEffect(() => {
    const fetchDetails = type === "tv" ? getTvDetails(id) : getMovieDetails(id);
    fetchDetails.then((data) => {
      setDetails(data);
      document.title = `${data.title || data.name} - Watcher`;
      saveWatchEntry({
        id, type,
        title: data.title || data.name,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
      });
    }).catch(console.error);

    getRecommendations(type, id)
      .then((data) => setRecommendations((data.results || []).slice(0, 12)))
      .catch(() => setRecommendations([]));
  }, [type, id]);

  /* Fetch episodes for TV */
  useEffect(() => {
    if (type !== "tv") return;
    getSeasonDetails(id, selectedSeason)
      .then((data) => setEpisodes(data.episodes || []))
      .catch(console.error);
  }, [type, id, selectedSeason]);

  useEffect(() => { setSelectedSeason(seasonNum); }, [seasonNum]);

  const title = details?.title || details?.name || "";
  const currentEp = episodes.find((e) => e.episode_number === episodeNum);
  const hasNext = episodeNum < episodes.length;
  const hasPrev = episodeNum > 1;

  const goToEpisode = (epNum) => navigate(`/watch/tv/${id}/${selectedSeason}/${epNum}`);
  const changeSeason = (s) => { setSelectedSeason(s); navigate(`/watch/tv/${id}/${s}/1`); };

  return (
    <div className="watch-page">
      {/* ─── Player area — 100vh, cursor-hide ─── */}
      <div className="watch-player" ref={playerRef}>
        <Player
          type={type}
          tmdbId={id}
          season={seasonNum}
          episode={episodeNum}
          apiTier={serverIndex}
        />
      </div>

      {/* ─── Below player — scroll down to see ─── */}
      <div className="watch-below">
        <Link to={`/${type}/${id}`} className="watch-back-btn">← Back to Details</Link>
        {type === "tv" && (
          <div className="watch-nav">
            <button className="watch-nav-btn" disabled={!hasPrev}
              onClick={() => goToEpisode(episodeNum - 1)}>
              ← Previous
            </button>
            <button className="watch-nav-btn" disabled={!hasNext}
              onClick={() => goToEpisode(episodeNum + 1)}>
              Next →
            </button>
          </div>
        )}

        {/* Server selector */}
        <div className="watch-section">
          <h3 className="watch-section-title">Server</h3>
          <select
            className="season-select"
            value={serverIndex}
            onChange={(e) => setServerIndex(Number(e.target.value))}
          >
            {SERVER_NAMES.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>
        </div>

        {/* Episode list for TV */}
        {type === "tv" && (
          <div className="watch-section">
            <div className="watch-episodes-header">
              <h3 className="watch-section-title">Episodes</h3>
              {details?.seasons && (
                <select className="season-select" value={selectedSeason}
                  onChange={(e) => changeSeason(Number(e.target.value))}>
                  {details.seasons.filter((s) => s.season_number >= 1).map((s) => (
                    <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="watch-episode-list">
              {episodes.map((ep) => (
                <button
                  key={ep.id}
                  className={`watch-episode-item ${ep.episode_number === episodeNum && selectedSeason === seasonNum ? "active" : ""}`}
                  onClick={() => goToEpisode(ep.episode_number)}
                >
                  <span className="episode-number">{ep.episode_number}</span>
                  <div className="watch-ep-thumb">
                    {ep.still_path ? (
                      <img src={img(ep.still_path, "w342")} alt={ep.name} loading="lazy" />
                    ) : (
                      <div className="watch-ep-thumb-ph" />
                    )}
                  </div>
                  <div className="watch-ep-info">
                    <span className="episode-title">{ep.name || `Episode ${ep.episode_number}`}</span>
                    {ep.runtime && <span className="episode-runtime">{ep.runtime}m</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="watch-section">
            <h3 className="watch-section-title">You might also like</h3>
            <div className="watch-recs-grid">
              {recommendations.map((item) => (
                <MediaCard key={item.id} item={item} type={type} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
