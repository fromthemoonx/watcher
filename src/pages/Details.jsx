import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getMovieDetails,
  getTvDetails,
  getSeasonDetails,
  img,
  backdropSrcSet,
} from "../services/tmdb";
import { SkeletonHero } from "../components/Skeleton";

/**
 * Details page — movie/TV info page.
 * Layout top to bottom: backdrop+info → episodes (TV) → trailer → cast/crew tabs
 * "Watch Now" navigates to dedicated /watch page.
 */
export default function Details() {
  const { type, id } = useParams();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // TV state
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);

  // Info tabs: cast, crew, details
  const [activeTab, setActiveTab] = useState("cast");

  useEffect(() => {
    setLoading(true);
    setActiveTab("cast");
    setSelectedSeason(1);

    const fetchDetails =
      type === "tv" ? getTvDetails(id) : getMovieDetails(id);

    fetchDetails
      .then((data) => {
        setDetails(data);
        document.title = `${data.title || data.name} - Watcher`;
        if (type === "tv" && data.seasons?.length) {
          const firstSeason =
            data.seasons.find((s) => s.season_number >= 1) || data.seasons[0];
          setSelectedSeason(firstSeason.season_number);
        }
      })
      .catch((err) => console.error("Failed to fetch details:", err))
      .finally(() => setLoading(false));
  }, [type, id]);

  useEffect(() => {
    if (type !== "tv" || !id) return;
    getSeasonDetails(id, selectedSeason)
      .then((data) => setEpisodes(data.episodes || []))
      .catch((err) => console.error("Failed to fetch season:", err));
  }, [type, id, selectedSeason]);

  if (loading) return <div className="page"><SkeletonHero /></div>;
  if (!details) return <div className="page"><p className="error-text">Could not load details.</p></div>;

  const title = details.title || details.name;
  const year = (details.release_date || details.first_air_date || "").slice(0, 4);
  const runtime = details.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
    : null;
  const rating = details.vote_average?.toFixed(1);
  const genres = details.genres?.map((g) => g.name).join(", ");

  // Cast and crew from credits
  const cast = details.credits?.cast || [];
  const crew = details.credits?.crew || [];
  // Key crew: director, writer, creator
  const directors = crew.filter((c) => c.job === "Director");
  const writers = crew.filter((c) => c.job === "Writer" || c.job === "Screenplay");
  const creators = details.created_by || [];

  // YouTube trailer
  const trailer = details.videos?.results?.find(
    (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
  );

  // Watch URL
  const watchUrl =
    type === "tv"
      ? `/watch/tv/${id}/${selectedSeason}/1`
      : `/watch/movie/${id}`;

  return (
    <div className="page">
      {/* ─── Backdrop ─── */}
      <div className="details-backdrop">
        {details.backdrop_path && (
          <img
            src={img(details.backdrop_path, "w1280")}
            srcSet={backdropSrcSet(details.backdrop_path)}
            sizes="100vw"
            alt=""
            aria-hidden="true"
          />
        )}
        <div className="hero-gradient" />
      </div>

      <div className="details-content">
        {/* ─── Top section: poster + info ─── */}
        <div className="details-header">
          {details.poster_path && (
            <img
              className="details-poster"
              src={img(details.poster_path, "w500")}
              alt={title}
            />
          )}
          <div className="details-info">
            <h1 className="details-title">{title}</h1>
            <div className="details-meta">
              {year && <span>{year}</span>}
              {runtime && <span>{runtime}</span>}
              {rating && <span>⭐ {rating}</span>}
              {type === "tv" && details.number_of_seasons && (
                <span>{details.number_of_seasons} Season{details.number_of_seasons > 1 ? "s" : ""}</span>
              )}
            </div>
            {genres && <p className="details-genres">{genres}</p>}
            {details.overview && <p className="details-overview">{details.overview}</p>}
            <div className="details-actions">
              <Link to={watchUrl} className="btn btn-primary">▶ Watch Now</Link>
            </div>
          </div>
        </div>

        {/* ─── Episodes (TV only) — shown first for easy navigation ─── */}
        {type === "tv" && details.seasons?.length > 0 && (
          <section className="details-section episodes-section">
            <div className="episodes-header">
              <h2 className="section-title">Episodes</h2>
              <select
                className="season-select"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
              >
                {details.seasons
                  .filter((s) => s.season_number >= 1)
                  .map((s) => (
                    <option key={s.id} value={s.season_number}>
                      Season {s.season_number}
                    </option>
                  ))}
              </select>
            </div>

            <div className="episodes-list">
              {episodes.map((ep) => (
                <Link
                  key={ep.id}
                  to={`/watch/tv/${id}/${selectedSeason}/${ep.episode_number}`}
                  className="episode-card"
                >
                  <span className="episode-number">{ep.episode_number}</span>
                  <div className="episode-thumb">
                    {ep.still_path ? (
                      <img src={img(ep.still_path, "w342")} alt={ep.name} loading="lazy" />
                    ) : (
                      <div className="episode-thumb-placeholder" />
                    )}
                  </div>
                  <div className="episode-info">
                    <h3 className="episode-title">{ep.name || `Episode ${ep.episode_number}`}</h3>
                    {ep.overview && <p className="episode-overview">{ep.overview}</p>}
                    {ep.runtime && <span className="episode-runtime">{ep.runtime}m</span>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Trailer section ─── */}
        {trailer && (
          <section className="details-section">
            <h2 className="section-title">Trailer</h2>
            <div className="trailer-container">
              <div className="trailer-wrapper">
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.key}?rel=0`}
                  title={`${title} - Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  frameBorder="0"
                />
              </div>
            </div>
          </section>
        )}

        {/* ─── Cast / Crew / Details tabs — Letterboxd style ─── */}
        <section className="details-section">
          <div className="info-tabs">
            <button
              className={`info-tab ${activeTab === "cast" ? "active" : ""}`}
              onClick={() => setActiveTab("cast")}
            >Cast</button>
            <button
              className={`info-tab ${activeTab === "crew" ? "active" : ""}`}
              onClick={() => setActiveTab("crew")}
            >Crew</button>
            <button
              className={`info-tab ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
            >Details</button>
          </div>

          {/* Cast tab */}
          {activeTab === "cast" && (
            <div className="cast-list">
              {cast.slice(0, 20).map((person) => (
                <Link key={person.credit_id || person.id} to={`/person/${person.id}`} className="cast-item">
                  <div className="cast-photo">
                    {person.profile_path ? (
                      <img src={img(person.profile_path, "w185")} alt={person.name} />
                    ) : (
                      <div className="cast-photo-placeholder">
                        {person.name?.[0] || "?"}
                      </div>
                    )}
                  </div>
                  <div className="cast-info">
                    <span className="cast-name">{person.name}</span>
                    <span className="cast-character">{person.character}</span>
                  </div>
                </Link>
              ))}
              {cast.length === 0 && <p className="tab-empty">No cast information available.</p>}
            </div>
          )}

          {/* Crew tab */}
          {activeTab === "crew" && (
            <div className="cast-list">
              {directors.length > 0 && directors.map((p) => (
                <Link key={p.credit_id || p.id} to={`/person/${p.id}`} className="cast-item">
                  <div className="cast-photo">
                    {p.profile_path ? (
                      <img src={img(p.profile_path, "w185")} alt={p.name} />
                    ) : (
                      <div className="cast-photo-placeholder">{p.name?.[0]}</div>
                    )}
                  </div>
                  <div className="cast-info">
                    <span className="cast-name">{p.name}</span>
                    <span className="cast-character">Director</span>
                  </div>
                </Link>
              ))}
              {creators.length > 0 && creators.map((p) => (
                <Link key={p.id} to={`/person/${p.id}`} className="cast-item">
                  <div className="cast-photo">
                    {p.profile_path ? (
                      <img src={img(p.profile_path, "w185")} alt={p.name} />
                    ) : (
                      <div className="cast-photo-placeholder">{p.name?.[0]}</div>
                    )}
                  </div>
                  <div className="cast-info">
                    <span className="cast-name">{p.name}</span>
                    <span className="cast-character">Creator</span>
                  </div>
                </Link>
              ))}
              {writers.slice(0, 5).map((p) => (
                <Link key={p.credit_id || p.id} to={`/person/${p.id}`} className="cast-item">
                  <div className="cast-photo">
                    {p.profile_path ? (
                      <img src={img(p.profile_path, "w185")} alt={p.name} />
                    ) : (
                      <div className="cast-photo-placeholder">{p.name?.[0]}</div>
                    )}
                  </div>
                  <div className="cast-info">
                    <span className="cast-name">{p.name}</span>
                    <span className="cast-character">{p.job}</span>
                  </div>
                </Link>
              ))}
              {directors.length === 0 && creators.length === 0 && writers.length === 0 && (
                <p className="tab-empty">No crew information available.</p>
              )}
            </div>
          )}

          {/* Details tab */}
          {activeTab === "details" && (
            <div className="details-tab-content">
              {details.status && (
                <div className="detail-row"><span className="detail-label">Status</span><span>{details.status}</span></div>
              )}
              {details.original_language && (
                <div className="detail-row"><span className="detail-label">Language</span><span>{details.original_language.toUpperCase()}</span></div>
              )}
              {details.budget > 0 && (
                <div className="detail-row"><span className="detail-label">Budget</span><span>${(details.budget / 1_000_000).toFixed(0)}M</span></div>
              )}
              {details.revenue > 0 && (
                <div className="detail-row"><span className="detail-label">Revenue</span><span>${(details.revenue / 1_000_000).toFixed(0)}M</span></div>
              )}
              {details.production_companies?.length > 0 && (
                <div className="detail-row"><span className="detail-label">Production</span><span>{details.production_companies.map((c) => c.name).join(", ")}</span></div>
              )}
              {genres && (
                <div className="detail-row"><span className="detail-label">Genres</span><span>{genres}</span></div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
