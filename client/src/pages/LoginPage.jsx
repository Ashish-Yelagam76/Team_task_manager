import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
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
      await login(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="auth-aside__inner">
          <p className="page-kicker" style={{ color: "#6ee7b7", marginBottom: "0.5rem" }}>
            Team Task Manager
          </p>
          <h2>Ship work together, with clear roles and visibility.</h2>
          <p>
            Organize projects, assign tasks, track status, and spot overdue items before they slip — built for small teams
            and hiring assignments alike.
          </p>
        </div>
      </aside>
      <div className="auth-panel">
        <div className="auth-card">
          <header className="page-header" style={{ marginBottom: "1.25rem" }}>
            <h1 className="page-title">Welcome back</h1>
            <p className="page-desc">Sign in to continue to your dashboard and projects.</p>
          </header>
          {error ? (
            <div className="alert" role="alert">
              {error}
            </div>
          ) : null}
          <form className="card" onSubmit={onSubmit}>
            <h2 className="card-title" style={{ marginBottom: "1rem" }}>
              Sign in
            </h2>
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-block" type="submit" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </form>
          <p className="auth-footer">
            No account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
