import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { TimerProvider } from "./context/TimerContext";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Tags from "./pages/Tags";
import Team from "./pages/Team";
import TimeEntries from "./pages/TimeEntries";
import TimeTracker from "./pages/TimeTracker";

export default function App() {
  return (
    // Mounted above the router so the running timer (and the live
    // "34:22" document title) survives navigating between internal pages —
    // it only resets if the browser tab itself is closed.
    <TimerProvider>
      <div className="app-shell">
        <Sidebar />
        <Routes>
          <Route path="/" element={<TimeTracker />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/entries" element={<TimeEntries />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/team" element={<Team />} />
          <Route path="/clients" element={<Clients />} />
        </Routes>
      </div>
    </TimerProvider>
  );
}
