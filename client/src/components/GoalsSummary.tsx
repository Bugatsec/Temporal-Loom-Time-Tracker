import { useEffect, useState } from "react";
import { formatTotal } from "../utils/format";
import { getGoalPeriodPrefs, onGoalPeriodPrefsChanged } from "../utils/goalPeriodPrefs";
import { ColorDot } from "./ColorDot";
import type {
  DailyCapStatus,
  FloorStatus,
  GoalPeriod,
  GoalStatusBundle,
  MonthlyStatus,
  Project,
} from "../api/types";

interface GoalsSummaryProps {
  status: GoalStatusBundle;
  projects: Project[];
  compact?: boolean;
}

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function ProgressBar({ fraction, color, compact, danger }: { fraction: number; color?: string; compact?: boolean; danger?: boolean }) {
  const pct = Math.min(100, Math.max(0, Math.round(fraction * 100)));
  return (
    <div style={{ flex: 1, background: "var(--border)", borderRadius: 3, height: compact ? 4 : 6, overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`,
          background: danger ? "var(--danger)" : fraction >= 1 ? "var(--teal)" : color ?? "var(--accent)",
          height: "100%",
        }}
      />
    </div>
  );
}

function FeasibilityBadge({ feasibility }: { feasibility: MonthlyStatus["feasibility"] }) {
  const map: Record<MonthlyStatus["feasibility"], { label: string; color: string }> = {
    comfortable: { label: "On track", color: "var(--teal)" },
    tight: { label: "Tight", color: "var(--accent)" },
    impossible: { label: "Not achievable as set", color: "var(--danger)" },
    no_cap: { label: "No daily cap set", color: "var(--ink-faint)" },
    no_goal: { label: "No goal set", color: "var(--ink-faint)" },
  };
  const { label, color } = map[feasibility];
  return (
    <span style={{ fontSize: 11, color, border: `1px solid ${color}`, borderRadius: 999, padding: "2px 8px" }}>
      {label}
    </span>
  );
}

function DailyPanel({ status, compact }: { status: DailyCapStatus; compact?: boolean }) {
  if (status.minimum_seconds == null && status.max_seconds == null) {
    return <div className="empty-state">No daily caps set. Set them in Settings.</div>;
  }
  const fraction = status.minimum_seconds ? status.logged_seconds / status.minimum_seconds : 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: compact ? 64 : 90, fontSize: compact ? 12 : 13 }}>Minimum</span>
        <ProgressBar fraction={fraction} compact={compact} />
        <span className="mono dim" style={{ fontSize: compact ? 11 : 12, minWidth: compact ? 44 : 130, textAlign: "right" }}>
          {compact
            ? `${Math.min(100, Math.round(fraction * 100))}%`
            : `${formatTotal(status.logged_seconds)} / ${status.minimum_seconds ? formatTotal(status.minimum_seconds) : "—"}`}
        </span>
      </div>
      {(status.max_seconds != null || status.extreme_seconds != null) && (
        <div className="dim" style={{ fontSize: 11, marginTop: 8 }}>
          {status.over_extreme
            ? "Over the extreme cap for today."
            : status.over_max
              ? "Over the normal cap for today (within extreme)."
              : status.max_seconds != null
                ? `Room today: up to ${formatTotal(status.max_seconds)}, extreme ${status.extreme_seconds ? formatTotal(status.extreme_seconds) : "—"}.`
                : null}
        </div>
      )}
    </div>
  );
}

function FloorPanel({ status, compact }: { status: FloorStatus; compact?: boolean }) {
  if (!status.has_goal && status.projects.length === 0) {
    return <div className="empty-state">No {status.period} goal set. Set one in Settings.</div>;
  }
  const fraction = status.target_seconds ? status.logged_seconds / status.target_seconds : 0;
  return (
    <div>
      {status.has_goal && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: status.projects.length ? 10 : 0 }}>
          <span style={{ width: compact ? 64 : 90, fontSize: compact ? 12 : 13 }}>Overall</span>
          <ProgressBar fraction={fraction} compact={compact} />
          <span className="mono dim" style={{ fontSize: compact ? 11 : 12, minWidth: compact ? 44 : 130, textAlign: "right" }}>
            {compact
              ? `${Math.min(100, Math.round(fraction * 100))}%`
              : `${formatTotal(status.logged_seconds)} / ${formatTotal(status.target_seconds!)}`}
          </span>
        </div>
      )}
      {status.projects.map((p) => {
        const f = p.target_seconds ? p.logged_seconds / p.target_seconds : 0;
        return (
          <div key={p.project_id} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <span style={{ width: compact ? 64 : 90, fontSize: compact ? 12 : 13 }}>{p.project_name}</span>
            <ProgressBar fraction={f} compact={compact} />
            <span className="mono dim" style={{ fontSize: compact ? 11 : 12, minWidth: compact ? 44 : 130, textAlign: "right" }}>
              {compact ? `${Math.min(100, Math.round(f * 100))}%` : `${formatTotal(p.logged_seconds)} / ${formatTotal(p.target_seconds)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyPanel({ status, projects, compact }: { status: MonthlyStatus; projects: Project[]; compact?: boolean }) {
  if (!status.has_goal) {
    return <div className="empty-state">No monthly goal set. Set one in Settings.</div>;
  }
  const fraction = status.target_seconds ? status.logged_seconds / status.target_seconds : 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <span style={{ width: compact ? 64 : 90, fontSize: compact ? 12 : 13 }}>Overall</span>
          <ProgressBar fraction={fraction} compact={compact} danger={status.feasibility === "impossible"} />
          <span className="mono dim" style={{ fontSize: compact ? 11 : 12, minWidth: compact ? 44 : 130, textAlign: "right" }}>
            {compact
              ? `${Math.min(100, Math.round(fraction * 100))}%`
              : `${formatTotal(status.logged_seconds)} / ${formatTotal(status.target_seconds!)}`}
          </span>
        </div>
        <span style={{ marginLeft: 10 }}>
          <FeasibilityBadge feasibility={status.feasibility} />
        </span>
      </div>

      {!compact && status.has_goal && (
        <div className="dim" style={{ fontSize: 11.5, marginBottom: 10, lineHeight: 1.6 }}>
          {status.remaining_seconds <= 0 ? (
            <>Goal already met for this month.</>
          ) : status.feasibility === "impossible" ? (
            <>
              Best achievable is {formatTotal(status.derived_daily_target_seconds)}/day for the {status.days_left} days
              left — that still falls short by {formatTotal(status.shortfall_seconds)}. Consider raising the daily cap or
              lowering the monthly target.
            </>
          ) : (
            <>
              Need {formatTotal(status.derived_daily_target_seconds)}/day for the {status.days_left} days left.
              {status.affordable_rest_days > 0 &&
                ` You can afford up to ${status.affordable_rest_days} rest day${status.affordable_rest_days > 1 ? "s" : ""} and still stay within the normal daily cap.`}
            </>
          )}
        </div>
      )}

      {status.projects.map((p) => {
        const f = p.target_seconds ? p.logged_seconds / p.target_seconds : 0;
        const proj = projects.find((pr) => pr.id === p.project_id);
        return (
          <div key={p.project_id} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <span style={{ width: compact ? 64 : 90, fontSize: compact ? 12 : 13, display: "flex", alignItems: "center", gap: 6 }}>
              <ColorDot color={proj?.color} />
              {p.project_name}
            </span>
            <ProgressBar fraction={f} color={proj?.color ?? undefined} compact={compact} />
            <span className="mono dim" style={{ fontSize: compact ? 11 : 12, minWidth: compact ? 44 : 130, textAlign: "right" }}>
              {compact ? `${Math.min(100, Math.round(f * 100))}%` : `${formatTotal(p.logged_seconds)} / ${formatTotal(p.target_seconds)}`}
              {p.satisfied ? " (done)" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function GoalsSummary({ status, projects, compact = false }: GoalsSummaryProps) {
  const [prefs, setPrefs] = useState(getGoalPeriodPrefs());
  const [activeTab, setActiveTab] = useState<GoalPeriod>("daily");

  useEffect(() => onGoalPeriodPrefsChanged(() => setPrefs(getGoalPeriodPrefs())), []);

  const tabs: GoalPeriod[] = [
    ...(prefs.showDaily ? (["daily"] as GoalPeriod[]) : []),
    ...(prefs.showWeekly ? (["weekly"] as GoalPeriod[]) : []),
    ...(prefs.showMonthly ? (["monthly"] as GoalPeriod[]) : []),
    ...(prefs.showYearly ? (["yearly"] as GoalPeriod[]) : []),
  ];

  useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(activeTab)) setActiveTab(tabs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs]);

  if (tabs.length === 0) return null;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {tabs.map((t) => (
          <button
            key={t}
            className={activeTab === t ? "primary" : ""}
            style={{ fontSize: 12, padding: "5px 12px" }}
            onClick={() => setActiveTab(t)}
          >
            {PERIOD_LABELS[t]}
          </button>
        ))}
      </div>

      {activeTab === "daily" && <DailyPanel status={status.daily} compact={compact} />}
      {activeTab === "weekly" && <FloorPanel status={status.weekly} compact={compact} />}
      {activeTab === "monthly" && <MonthlyPanel status={status.monthly} projects={projects} compact={compact} />}
      {activeTab === "yearly" && <FloorPanel status={status.yearly} compact={compact} />}
    </div>
  );
}
