import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { formatElapsed } from "../utils/format";
import type { TimeEntry } from "../api/types";

const APP_TITLE = "Bug Bounty / Life";

interface StartInput {
  project_id: string;
  activity_id: string;
  description?: string;
  tags?: string[];
}

interface TimerContextValue {
  running: TimeEntry | null;
  elapsedSeconds: number;
  /** Bumps on every start/stop so pages know to refetch their own entry lists. */
  version: number;
  error: string | null;
  start: (input: StartInput) => Promise<void>;
  stop: () => Promise<void>;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef<TimeEntry | null>(null);
  runningRef.current = running;

  // Initial load, plus a slow background resync (e.g. if the timer was
  // started from another tab/device — Stage 2+ concern, but cheap now).
  useEffect(() => {
    api.timeEntries.running().then(setRunning).catch(() => {});
    const poll = setInterval(() => {
      api.timeEntries.running().then(setRunning).catch(() => {});
    }, 30000);
    return () => clearInterval(poll);
  }, []);

  // The actual per-second tick, decoupled from the poll above so the
  // readout doesn't jump — always computed from start_at, not incremented.
  useEffect(() => {
    function tick() {
      const current = runningRef.current;
      if (!current) {
        setElapsedSeconds(0);
        if (document.title !== APP_TITLE) document.title = APP_TITLE;
        return;
      }
      const seconds = Math.floor((Date.now() - new Date(current.start_at).getTime()) / 1000);
      setElapsedSeconds(seconds);
      document.title = `${formatElapsed(seconds)} - ${APP_TITLE}`;
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Restore the default title if the tab is closed/navigated away from
  // within the app while a timer isn't running.
  useEffect(() => {
    return () => {
      document.title = APP_TITLE;
    };
  }, []);

  async function start(input: StartInput) {
    setError(null);
    try {
      const entry = await api.timeEntries.start(input);
      setRunning(entry);
      setVersion((v) => v + 1);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }

  async function stop() {
    if (!running) return;
    setError(null);
    try {
      await api.timeEntries.stop(running.id);
      setRunning(null);
      setVersion((v) => v + 1);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }

  return (
    <TimerContext.Provider value={{ running, elapsedSeconds, version, error, start, stop }}>
      {children}
    </TimerContext.Provider>
  );
}
