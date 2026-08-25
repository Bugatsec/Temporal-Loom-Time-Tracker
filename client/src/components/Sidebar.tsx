import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/entries", label: "Time Entries" },
  { to: "/projects", label: "Projects" },
  { to: "/activities", label: "Activities" },
  { to: "/calendar", label: "Calendar" },
  { to: "/reports", label: "Reports" },
  { to: "/import-export", label: "Import / Export" },
  { to: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="life">Life</div>
        <div className="name">Bug Bounty</div>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
