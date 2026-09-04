import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getSidebarPrefs, onSidebarPrefsChanged } from "../utils/sidebarPrefs";

const TOP = [
  { to: "/", label: "Time Tracker", end: true },
  { to: "/dashboard", label: "Dashboard" },
];

const ANALYZE = [
  { to: "/calendar", label: "Calendar" },
  { to: "/reports", label: "Reports" },
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
  const [prefs, setPrefs] = useState(getSidebarPrefs());

  useEffect(() => onSidebarPrefsChanged(() => setPrefs(getSidebarPrefs())), []);

  const manage = [
    { to: "/projects", label: "Projects" },
    ...(prefs.showTeam ? [{ to: "/team", label: "Team" }] : []),
    ...(prefs.showClients ? [{ to: "/clients", label: "Clients" }] : []),
    { to: "/tags", label: "Tags" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="life">Time Tracker</div>
        <div className="name">Temporal Loom</div>
      </div>
      <nav className="sidebar-nav">
        <NavGroup items={TOP} />

        <div className="sidebar-section">Analyze</div>
        <NavGroup items={ANALYZE} />

        <div className="sidebar-section">Manage</div>
        <NavGroup items={manage} />
      </nav>
    </aside>
  );
}
