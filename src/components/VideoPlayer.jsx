import { useState, useEffect, useRef, useCallback } from "react";

/**
 * VideoPlayer — custom HTML5 video player.
 * No iframe, no third-party code. Plays direct URLs from Real-Debrid.
 *
 * Controls: play/pause, seek, volume, fullscreen, time display.
 * Cursor-hide: controls fade after 3s of inactivity.
 *
 * Props:
 *   src       — direct video URL (MP4/MKV from RD)
 *   title     — shown in top overlay
 *   onBack    — callback when back button is clicked
 *   subtitleUrl — optional .vtt/.srt subtitle track URL
 *   subtitleOffset — seconds to shift subtitles (±)
 */

const IDLE_TIMEOUT = 3000;

export default function VideoPlayer({ src, title, onBack, subtitleUrl, subtitleOffset = 0 }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const idleTimer = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* ─── Cursor-hide logic ─── */
  const resetIdle = useCallback(() => {
    setShowControls(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, IDLE_TIMEOUT);
  }, [playing]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", resetIdle);
    el.addEventListener("mouseenter", resetIdle);
    el.addEventListener("mouseleave", () => playing && setShowControls(false));
    return () => {
      el.removeEventListener("mousemove", resetIdle);
      el.removeEventListener("mouseenter", resetIdle);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle, playing]);

  /* ─── Video event handlers ─── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => { setPlaying(false); setShowControls(true); };
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => setDuration(v.duration);
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onDur);
    v.addEventListener("progress", onProgress);

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onDur);
      v.removeEventListener("progress", onProgress);
    };
  }, [src]);

  /* ─── Fullscreen change listener ─── */
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* ─── Controls ─── */
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const seek = (e) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * duration;
  };

  const changeVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setMuted(val === 0);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  /* Skip forward/back 10s */
  const skip = (seconds) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(duration, v.currentTime + seconds));
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e) => {
      switch (e.key) {
        case " ": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": skip(-10); break;
        case "ArrowRight": skip(10); break;
        case "f": toggleFullscreen(); break;
        case "m": toggleMute(); break;
        default: break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration]);

  /* Format time as MM:SS or H:MM:SS */
  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      className={`vp-container ${showControls ? "" : "vp-hide-cursor"}`}
      ref={containerRef}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="vp-video"
        autoPlay
        playsInline
      >
        {/* Subtitle track if provided */}
        {subtitleUrl && (
          <track kind="subtitles" src={subtitleUrl} srcLang="en" default />
        )}
      </video>

      {/* ─── Top overlay: back + title ─── */}
      <div className={`vp-top ${showControls ? "visible" : ""}`} onClick={(e) => e.stopPropagation()}>
        {onBack && (
          <button className="vp-back" onClick={onBack}>← Back</button>
        )}
        {title && <span className="vp-title">{title}</span>}
      </div>

      {/* ─── Bottom controls ─── */}
      <div className={`vp-controls ${showControls ? "visible" : ""}`} onClick={(e) => e.stopPropagation()}>
        {/* Seek bar */}
        <div className="vp-seek" onClick={seek}>
          <div className="vp-seek-buffered" style={{ width: `${bufferPct}%` }} />
          <div className="vp-seek-progress" style={{ width: `${progress}%` }} />
          <div className="vp-seek-thumb" style={{ left: `${progress}%` }} />
        </div>

        <div className="vp-controls-row">
          {/* Play/Pause */}
          <button className="vp-btn" onClick={togglePlay}>
            {playing ? "⏸" : "▶"}
          </button>

          {/* Skip back/forward */}
          <button className="vp-btn vp-btn-sm" onClick={() => skip(-10)}>-10s</button>
          <button className="vp-btn vp-btn-sm" onClick={() => skip(10)}>+10s</button>

          {/* Time display */}
          <span className="vp-time">{fmt(currentTime)} / {fmt(duration)}</span>

          {/* Spacer */}
          <div className="vp-spacer" />

          {/* Volume */}
          <button className="vp-btn" onClick={toggleMute}>
            {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
          </button>
          <input
            type="range"
            className="vp-volume"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={changeVolume}
          />

          {/* Fullscreen */}
          <button className="vp-btn" onClick={toggleFullscreen}>
            {isFullscreen ? "⊡" : "⛶"}
          </button>
        </div>
      </div>
    </div>
  );
}
