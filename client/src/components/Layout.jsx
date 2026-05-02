import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function navClass({ isActive }) {
  return isActive ? "nav-pill nav-pill--active" : "nav-pill";
}

export default function Layout() {
  const { user, logout } = useAuth();
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="app-shell">
      <header className="top-nav">
        <NavLink to="/" className="brand">
          <span className="brand-mark" aria-hidden>
            T
          </span>
          <span>Team Tasks</span>
        </NavLink>
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" className={navClass}>
            Projects
          </NavLink>
          <span className="user-chip">
            <span className="user-chip__avatar" aria-hidden>
              {initial}
            </span>
            <span>{user?.name}</span>
          </span>
          <button type="button" className="btn secondary sm" onClick={logout}>
            Log out
          </button>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
