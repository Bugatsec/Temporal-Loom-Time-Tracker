import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const PRIMARY = [{ to: "/", label: "Time Tracker", end: true }];

const ANALYZE_CHILDREN = [
  { to: "/calendar", label: "Calendar" },
  { to: "/reports", label: "Reports" },
];

const MANAGE = [
  { to: "/projects", label: "Projects" },
  { to: "/tags", label: "Tags" },
  { to: "/import-export", label: "Import / Export" },
  { to: "/settings", label: "Settings" },
];

function NavGroup({ items }: { items: { to: string; label: string; end?: boolean }[] }) {
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

export function Sidebar() {
  const location = useLocation();
  const analyzeRoutes = ["/dashboard", ...ANALYZE_CHILDREN.map((c) => c.to)];
  const [analyzeOpen, setAnalyzeOpen] = useState(analyzeRoutes.includes(location.pathname));

  // Auto-expand when navigating into Dashboard/Calendar/Reports from
  // elsewhere (e.g. a bookmark), without fighting a manual toggle.
  useEffect(() => {
    if (analyzeRoutes.includes(location.pathname)) setAnalyzeOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="life">Time Tracker</div>
        <div className="name">Temporal Loom</div>
      </div>
      <nav className="sidebar-nav">
        <NavGroup items={PRIMARY} />

        <div className="sidebar-parent">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          <button
            className="sidebar-expand"
            onClick={() => setAnalyzeOpen((o) => !o)}
            aria-label="Toggle Dashboard sub-pages"
          >
            <span className={"ptp-chevron" + (analyzeOpen ? " open" : "")}>&#9662;</span>
          </button>
        </div>
        {analyzeOpen && (
          <div className="sidebar-children">
            <NavGroup items={ANALYZE_CHILDREN} />
          </div>
        )}

        <div className="sidebar-section">Manage</div>
        <NavGroup items={MANAGE} />
      </nav>
    </aside>
  );
}
