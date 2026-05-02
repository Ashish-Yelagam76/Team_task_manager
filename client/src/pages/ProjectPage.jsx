import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

const STATUSES = ["TODO", "IN_PROGRESS", "DONE"];

function statusSelectClass(s) {
  if (s === "TODO") return "select-inline select-status select-status--todo";
  if (s === "IN_PROGRESS") return "select-inline select-status select-status--progress";
  return "select-inline select-status select-status--done";
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  async function refresh() {
    const [p, t] = await Promise.all([
      api(`/api/projects/${projectId}`),
      api(`/api/projects/${projectId}/tasks`),
    ]);
    setProject(p.project);
    setTasks(t.tasks);
  }

  useEffect(() => {
    setError("");
    refresh().catch((e) => setError(e.message));
  }, [projectId]);

  const isAdmin = project?.role === "ADMIN";

  async function invite(e) {
    e.preventDefault();
    setError("");
    try {
      await api(`/api/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInviteEmail("");
      await refresh();
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  async function addTask(e) {
    e.preventDefault();
    setError("");
    try {
      await api(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc || undefined,
          dueDate: taskDue || undefined,
          assigneeId: assigneeId || undefined,
        }),
      });
      setTaskTitle("");
      setTaskDesc("");
      setTaskDue("");
      setAssigneeId("");
      await refresh();
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  async function updateTask(task, patch) {
    setError("");
    try {
      await api(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await refresh();
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  async function removeMember(uid) {
    if (!window.confirm("Remove this member?")) return;
    setError("");
    try {
      await api(`/api/projects/${projectId}/members/${uid}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  async function changeRole(uid, role) {
    setError("");
    try {
      await api(`/api/projects/${projectId}/members/${uid}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await refresh();
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  if (error && !project) {
    return (
      <div className="card">
        <div className="alert" role="alert">
          {error}
        </div>
        <p className="muted" style={{ marginTop: "1rem" }}>
          <Link to="/projects">← Back to projects</Link>
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="loading-line" role="status">
        Loading project…
      </div>
    );
  }

  const members = project.members || [];

  return (
    <div>
      <nav className="breadcrumb">
        <Link to="/projects">← All projects</Link>
      </nav>

      <header className="page-header">
        <p className="page-kicker">Project</p>
        <h1 className="page-title">{project.name}</h1>
        <p className="page-desc" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>Your role:</span>
          <span className={`badge ${isAdmin ? "admin" : ""}`}>{project.role.toLowerCase()}</span>
        </p>
        {project.description ? (
          <p className="muted" style={{ margin: "0.75rem 0 0", maxWidth: "60ch" }}>
            {project.description}
          </p>
        ) : null}
      </header>

      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Team</h2>
            <p className="card-sub">
              {isAdmin
                ? "Invite people who already have an account. They must sign up before you add them by email."
                : "Members in this project. Only admins can invite or change roles."}
            </p>
          </div>
        </div>
        {isAdmin ? (
          <form className="invite-row" onSubmit={invite}>
            <input
              className="input-inline"
              type="email"
              placeholder="colleague@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              aria-label="Member email"
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} aria-label="Role for new member">
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button className="btn" type="submit">
              Add member
            </button>
          </form>
        ) : null}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.user.name}</strong>
                  </td>
                  <td className="muted" style={{ fontSize: "0.85rem" }}>
                    {m.user.email}
                  </td>
                  <td>
                    {isAdmin && m.userId !== user?.id ? (
                      <select
                        className="select-inline"
                        value={m.role}
                        onChange={(e) => changeRole(m.userId, e.target.value)}
                        aria-label={`Role for ${m.user.name}`}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    ) : (
                      <span className={m.role === "ADMIN" ? "badge admin" : "badge"}>{m.role.toLowerCase()}</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {isAdmin && m.userId !== user?.id ? (
                      <button type="button" className="btn danger sm" onClick={() => removeMember(m.userId)}>
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Tasks</h2>
            <p className="card-sub">Create work items, set due dates, assign owners, and update status as work moves.</p>
          </div>
        </div>

        <form onSubmit={addTask} className="grid cols-2" style={{ marginBottom: "1.25rem" }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="task-title">Title</label>
            <input
              id="task-title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              rows={2}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Optional context, links, or acceptance criteria"
            />
          </div>
          <div className="field">
            <label htmlFor="task-due">Due date</label>
            <input id="task-due" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="task-assignee">Assignee</label>
            <select id="task-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <button className="btn" type="submit">
              Add task
            </button>
          </div>
        </form>

        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon" aria-hidden>
              📋
            </div>
            <p>No tasks yet. Add the first one using the form above.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const due = t.dueDate ? new Date(t.dueDate) : null;
                  const startToday = new Date();
                  startToday.setHours(0, 0, 0, 0);
                  const overdue = Boolean(due && t.status !== "DONE" && due < startToday);
                  return (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.title}</strong>
                        {t.description ? (
                          <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem", maxWidth: "42ch" }}>
                            {t.description}
                          </div>
                        ) : null}
                      </td>
                      <td>{t.assignee?.name || "—"}</td>
                      <td>
                        <select
                          className={statusSelectClass(t.status)}
                          value={t.status}
                          onChange={(e) => updateTask(t, { status: e.target.value })}
                          aria-label={`Status for ${t.title}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {overdue ? (
                          <span className="badge overdue">{t.dueDate?.slice(0, 10)}</span>
                        ) : (
                          <span className="muted">{t.dueDate?.slice(0, 10) || "—"}</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button type="button" className="btn secondary sm" onClick={() => updateTask(t, { status: "DONE" })}>
                          Done
                        </button>
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
