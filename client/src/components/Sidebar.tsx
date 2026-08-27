import { NavLink } from "react-router-dom";

const PRIMARY = [{ to: "/", label: "Time Tracker", end: true }];

const ANALYZE = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/calendar", label: "Calendar" },
  { to: "/reports", label: "Reports" },
];

const MANAGE = [
  { to: "/projects", label: "Projects" },
  { to: "/activities", label: "Activities" },
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
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="life">Time Tracker</div>
        <div className="name">Temporal Loom</div>
      </div>
      <nav className="sidebar-nav">
        <NavGroup items={PRIMARY} />
        <div className="sidebar-section">Analyze</div>
        <NavGroup items={ANALYZE} />
        <div className="sidebar-section">Manage</div>
        <NavGroup items={MANAGE} />
      </nav>
    </aside>
  );
}
