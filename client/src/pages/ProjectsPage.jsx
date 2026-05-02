import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api("/api/projects");
    setProjects(r.projects);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function createProject(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined }),
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      const msg = err.data?.errors?.[0]?.msg || err.message;
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="page-header">
        <p className="page-kicker">Workspace</p>
        <h1 className="page-title">Projects</h1>
        <p className="page-desc">Create a hub for your team. You become Admin and can invite members by email.</p>
      </header>

      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <form className="card card--sticky" onSubmit={createProject}>
          <div className="card-header" style={{ marginBottom: "0.5rem" }}>
            <div>
              <h2 className="card-title">New project</h2>
              <p className="card-sub">Give it a name and an optional description.</p>
            </div>
          </div>
          <div className="field">
            <label htmlFor="pname">Name</label>
            <input
              id="pname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product launch Q2"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pdesc">Description (optional)</label>
            <textarea
              id="pdesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
            />
          </div>
          <div className="form-actions">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Your projects</h2>
              <p className="card-sub">
                {projects.length} project{projects.length === 1 ? "" : "s"} you have access to.
              </p>
            </div>
          </div>
          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon" aria-hidden>
                🚀
              </div>
              <p>No projects yet. Use the form to create your first one.</p>
            </div>
          ) : (
            <div className="stack">
              {projects.map((p) => (
                <Link key={p.id} className="project-link" to={`/projects/${p.id}`}>
                  <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
                    <strong style={{ fontSize: "1.05rem" }}>{p.name}</strong>
                    <span className={`badge ${p.role === "ADMIN" ? "admin" : ""}`}>{p.role.toLowerCase()}</span>
                  </div>
                  {p.description ? (
                    <p className="muted" style={{ margin: "0.5rem 0 0", lineHeight: 1.5 }}>
                      {p.description}
                    </p>
                  ) : null}
                  <div className="project-link__meta">
                    <span>{p.memberCount} members</span>
                    <span className="dot" aria-hidden>
                      ·
                    </span>
                    <span>{p.taskCount} tasks</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
