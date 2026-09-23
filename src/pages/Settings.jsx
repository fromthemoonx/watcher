import { useState, useEffect } from "react";
import { getRdKey, setRdKey, validateKey } from "../services/realdebrid";

/**
 * Settings page — configure Real-Debrid API key.
 * Key is stored in localStorage, never sent to our server.
 */

export default function Settings() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [validating, setValidating] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Settings - Watcher";
    const existing = getRdKey();
    if (existing) {
      setKey(existing);
      /* Validate existing key on load */
      validateKey()
        .then(setUser)
        .catch(() => setUser(null));
    }
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setValidating(true);

    setRdKey(key);

    try {
      const userData = await validateKey();
      setUser(userData);
      setSaved(true);
    } catch (err) {
      setError("Invalid API key. Check your key and try again.");
      setUser(null);
    } finally {
      setValidating(false);
    }
  };

  const handleClear = () => {
    setKey("");
    setRdKey("");
    setUser(null);
    setSaved(false);
    setError(null);
  };

  return (
    <div className="page settings-page">
      <h1 className="settings-heading">Settings</h1>

      <div className="settings-section">
        <h2 className="settings-section-title">Real-Debrid</h2>
        <p className="settings-desc">
          Watcher uses Real-Debrid to stream movies and TV shows in high quality.
          Get an API key from{" "}
          <a href="https://real-debrid.com/apitoken" target="_blank" rel="noopener noreferrer" className="settings-link">
            real-debrid.com/apitoken
          </a>
          {" "}(~$3/month). Your key stays in your browser — it's never sent to our servers.
        </p>

        <div className="settings-input-row">
          <input
            type="password"
            className="settings-input"
            placeholder="Paste your Real-Debrid API key"
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false); }}
          />
          <button className="settings-btn" onClick={handleSave} disabled={!key.trim() || validating}>
            {validating ? "Validating..." : "Save"}
          </button>
          {key && (
            <button className="settings-btn settings-btn-clear" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>

        {/* Status messages */}
        {error && <p className="settings-error">{error}</p>}
        {saved && user && (
          <div className="settings-success">
            ✓ Connected as <strong>{user.username}</strong> — {user.premium > 0 ? "Premium" : "Free"} account
            {user.expiration && <span> (expires {new Date(user.expiration).toLocaleDateString()})</span>}
          </div>
        )}
      </div>
    </div>
  );
}
