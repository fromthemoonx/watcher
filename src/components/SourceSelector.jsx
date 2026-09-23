/**
 * SourceSelector — displays Torrentio results as a selectable list.
 * Shows quality, size, seeders, source for each option.
 * Highlights cached (instant) streams if available.
 *
 * Props:
 *   streams     — array from Torrentio (parsed)
 *   onSelect    — callback when user picks a stream
 *   loading     — show loading state
 *   resolving   — show "connecting to Real-Debrid..." state
 */

export default function SourceSelector({ streams, onSelect, loading, resolving }) {
  if (loading) {
    return (
      <div className="ss-container">
        <p className="ss-status">Searching for sources...</p>
      </div>
    );
  }

  if (resolving) {
    return (
      <div className="ss-container">
        <p className="ss-status">Connecting to Real-Debrid...</p>
      </div>
    );
  }

  if (!streams.length) {
    return (
      <div className="ss-container">
        <p className="ss-status">No sources found for this title.</p>
      </div>
    );
  }

  return (
    <div className="ss-container">
      <h3 className="ss-title">Select a source</h3>
      <div className="ss-list">
        {streams.map((stream, i) => (
          <button
            key={stream.infoHash || i}
            className="ss-item"
            onClick={() => onSelect(stream)}
          >
            {/* Quality badge */}
            <span className={`ss-quality ss-q-${stream.quality?.toLowerCase()?.replace(/\s/g, "")}`}>
              {stream.quality}
            </span>

            {/* Title */}
            <span className="ss-name">{stream.displayTitle}</span>

            {/* Meta: size, seeders, source */}
            <span className="ss-meta">
              {stream.size && <span className="ss-size">{stream.size}</span>}
              {stream.seeders > 0 && <span className="ss-seeds">👤 {stream.seeders}</span>}
              {stream.source && <span className="ss-source">{stream.source}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
