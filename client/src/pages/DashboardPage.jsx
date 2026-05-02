import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

function statusBadge(status) {
  if (status === "TODO") return "badge todo";
  if (status === "IN_PROGRESS") return "badge progress";
  return "badge done";
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/dashboard/summary")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="card">
        <div className="alert" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading-line" role="status">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div>
      <header className="page-header">
        <p className="page-kicker">Overview</p>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-desc">Track workload across projects, statuses, and overdue open tasks.</p>
      </header>

      <div className="grid cols-4 stat-grid">
        <div className="stat stat--total">
          <span className="stat__value">{data.totals.tasks}</span>
          <span className="stat__label">Total tasks</span>
        </div>
        <div className="stat stat--todo">
          <span className="stat__value">{data.totals.todo}</span>
          <span className="stat__label">To do</span>
        </div>
        <div className="stat stat--progress">
          <span className="stat__value">{data.totals.inProgress}</span>
          <span className="stat__label">In progress</span>
        </div>
        <div className="stat stat--overdue">
          <span className="stat__value">{data.totals.overdue}</span>
          <span className="stat__label">Overdue (open)</span>
        </div>
      </div>

      <section className="card" style={{ marginTop: "1.25rem" }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">By project</h2>
            <p className="card-sub">Task counts grouped by the projects you belong to.</p>
          </div>
        </div>
        {data.byProject.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon" aria-hidden>
              📁
            </div>
            <p>Join or create a project to see stats here.</p>
            <Link to="/projects">Go to Projects</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>To do</th>
                  <th>In progress</th>
                  <th>Done</th>
                </tr>
              </thead>
              <tbody>
                {data.byProject.map((p) => (
                  <tr key={p.projectId}>
                    <td>
                      <Link to={`/projects/${p.projectId}`}>{p.name}</Link>
                    </td>
                    <td>{p.todo}</td>
                    <td>{p.inProgress}</td>
                    <td>{p.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">My open tasks</h2>
            <p className="card-sub">Tasks you created or are assigned to, excluding completed.</p>
          </div>
        </div>
        {data.myTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon" aria-hidden>
              ✓
            </div>
            <p>No open tasks assigned to you right now.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {data.myTasks.map((t) => {
                  const due = t.dueDate ? new Date(t.dueDate) : null;
                  const startToday = new Date();
                  startToday.setHours(0, 0, 0, 0);
                  const isOverdue = Boolean(due && t.status !== "DONE" && due < startToday);
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link to={`/projects/${t.project.id}`}>{t.title}</Link>
                      </td>
                      <td>{t.project.name}</td>
                      <td>
                        <span className={statusBadge(t.status)}>{t.status.replace("_", " ").toLowerCase()}</span>
                      </td>
                      <td>
                        {isOverdue ? (
                          <span className="badge overdue">{formatDate(t.dueDate)}</span>
                        ) : (
                          formatDate(t.dueDate)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
