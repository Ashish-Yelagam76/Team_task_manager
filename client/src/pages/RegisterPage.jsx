import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const { user, register, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(name, email, password);
    } catch (err) {
      const msg =
        err.data?.errors?.[0]?.msg || err.data?.error || err.message || "Registration failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="auth-aside__inner">
          <p className="page-kicker" style={{ color: "#6ee7b7", marginBottom: "0.5rem" }}>
            Get started
          </p>
          <h2>Create your workspace in under a minute.</h2>
          <p>
            After signing up, create a project (you become Admin), invite teammates by email, and start tracking tasks with
            clear Admin vs Member permissions.
          </p>
        </div>
      </aside>
      <div className="auth-panel">
        <div className="auth-card">
          <header className="page-header" style={{ marginBottom: "1.25rem" }}>
            <h1 className="page-title">Create account</h1>
            <p className="page-desc">Use at least 8 characters for your password.</p>
          </header>
          {error ? (
            <div className="alert" role="alert">
              {error}
            </div>
          ) : null}
          <form className="card" onSubmit={onSubmit}>
            <h2 className="card-title" style={{ marginBottom: "1rem" }}>
              Your details
            </h2>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                autoComplete="name"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                placeholder="Minimum 8 characters"
                required
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-block" type="submit" disabled={busy}>
                {busy ? "Creating account…" : "Create account"}
              </button>
            </div>
          </form>
          <p className="auth-footer">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
