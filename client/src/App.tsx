import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import Activities from "./pages/Activities";
import Calendar from "./pages/Calendar";
import Dashboard from "./pages/Dashboard";
import ImportExport from "./pages/ImportExport";
import Projects from "./pages/Projects";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import TimeEntries from "./pages/TimeEntries";

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/entries" element={<TimeEntries />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/import-export" element={<ImportExport />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
}
