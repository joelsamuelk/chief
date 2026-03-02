"use client";

import { Card } from "@chief/ui/web";
import { useEffect, useMemo, useState } from "react";

type CheckinStatus = "on_track" | "at_risk" | "off_track";

interface InitiativeNode {
  id: string;
  title: string;
  description: string | null;
  status: "planned" | "active" | "completed" | "paused";
  total_tasks: number;
  completed_tasks: number;
}

interface KeyResultNode {
  id: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  status: CheckinStatus;
  initiatives: InitiativeNode[];
}

interface ObjectiveNode {
  id: string;
  title: string;
  description: string | null;
  key_results: KeyResultNode[];
}

interface OutcomeNode {
  id: string;
  title: string;
  description: string | null;
  quarter: string;
  owner_id: string;
  status: "active" | "completed" | "archived";
  objectives: ObjectiveNode[];
}

interface ExecutionPayload {
  quarter: string;
  quarter_options: string[];
  outcomes: OutcomeNode[];
  alignment?: {
    drift_detected?: boolean;
    unaligned_ratio?: number;
    unaligned_task_count?: number;
    active_task_count?: number;
  };
}

interface CheckinDraft {
  keyResultId: string;
  status: CheckinStatus;
  note: string;
}

const checkinStatuses: CheckinStatus[] = ["on_track", "at_risk", "off_track"];

export default function ExecutionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<ExecutionPayload | null>(null);
  const [quarter, setQuarter] = useState("");

  const [newOutcomeTitle, setNewOutcomeTitle] = useState("");
  const [newObjectiveByOutcome, setNewObjectiveByOutcome] = useState<Record<string, string>>({});
  const [newKrByObjective, setNewKrByObjective] = useState<Record<string, { metric: string; target: string }>>({});
  const [newInitiativeByKr, setNewInitiativeByKr] = useState<Record<string, string>>({});

  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinDrafts, setCheckinDrafts] = useState<Record<string, CheckinDraft>>({});
  const [busy, setBusy] = useState(false);

  async function load(quarterParam?: string) {
    const params = new URLSearchParams();
    if (quarterParam) params.set("quarter", quarterParam);
    const response = await fetch(`/api/execution?${params.toString()}`, { method: "GET", cache: "no-store" });
    const payload = (await response.json()) as ExecutionPayload | { error?: { message?: string } };

    if (!response.ok) {
      throw new Error((payload as { error?: { message?: string } }).error?.message ?? "Unable to load execution.");
    }

    const resolved = payload as ExecutionPayload;
    setData(resolved);
    setQuarter(resolved.quarter);
  }

  useEffect(() => {
    let active = true;

    async function start() {
      try {
        setError(null);
        await load();
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load execution.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void start();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const activeKrs = useMemo(() => {
    if (!data) return [] as KeyResultNode[];
    return data.outcomes
      .flatMap((outcome) => outcome.objectives)
      .flatMap((objective) => objective.key_results)
      .filter((kr) => kr.status !== "off_track" || kr.initiatives.length > 0);
  }, [data]);

  async function post(action: Record<string, unknown>) {
    const response = await fetch("/api/execution", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action)
    });

    const payload = (await response.json()) as { error?: { message?: string } };
    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Execution action failed.");
    }
  }

  async function runAndReload(action: Record<string, unknown>, successMessage: string, fallbackError: string) {
    setBusy(true);
    setError(null);
    try {
      await post(action);
      setMessage(successMessage);
      await load(quarter);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackError);
    } finally {
      setBusy(false);
    }
  }

  async function createOutcome() {
    if (!newOutcomeTitle.trim()) return;
    try {
      await post({ action: "create_outcome", title: newOutcomeTitle.trim(), quarter });
      setNewOutcomeTitle("");
      setMessage("Outcome created.");
      await load(quarter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create outcome.");
    }
  }

  async function editOutcome(outcome: OutcomeNode) {
    const title = window.prompt("Outcome title", outcome.title);
    if (title === null) return;
    const description = window.prompt("Outcome description", outcome.description ?? "");
    if (description === null) return;
    await runAndReload(
      { action: "update_outcome", id: outcome.id, title: title.trim(), description: description.trim() || null },
      "Outcome updated.",
      "Unable to update outcome."
    );
  }

  async function removeOutcome(outcome: OutcomeNode) {
    if (!window.confirm(`Delete outcome \"${outcome.title}\" and all nested items?`)) return;
    await runAndReload({ action: "delete_outcome", id: outcome.id }, "Outcome deleted.", "Unable to delete outcome.");
  }

  async function createObjective(outcomeId: string) {
    const title = (newObjectiveByOutcome[outcomeId] ?? "").trim();
    if (!title) return;

    try {
      await post({ action: "create_objective", outcome_id: outcomeId, title });
      setNewObjectiveByOutcome((prev) => ({ ...prev, [outcomeId]: "" }));
      setMessage("Objective created.");
      await load(quarter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create objective.");
    }
  }

  async function editObjective(objective: ObjectiveNode) {
    const title = window.prompt("Objective title", objective.title);
    if (title === null) return;
    const description = window.prompt("Objective description", objective.description ?? "");
    if (description === null) return;
    await runAndReload(
      { action: "update_objective", id: objective.id, title: title.trim(), description: description.trim() || null },
      "Objective updated.",
      "Unable to update objective."
    );
  }

  async function removeObjective(objective: ObjectiveNode) {
    if (!window.confirm(`Delete objective \"${objective.title}\" and all key results/initiatives?`)) return;
    await runAndReload(
      { action: "delete_objective", id: objective.id },
      "Objective deleted.",
      "Unable to delete objective."
    );
  }

  async function createKeyResult(objectiveId: string) {
    const draft = newKrByObjective[objectiveId] ?? { metric: "", target: "" };
    const metric = draft.metric.trim();
    const target = Number(draft.target);
    if (!metric || !Number.isFinite(target)) return;

    try {
      await post({
        action: "create_key_result",
        objective_id: objectiveId,
        metric_name: metric,
        target_value: target,
        current_value: 0
      });
      setNewKrByObjective((prev) => ({ ...prev, [objectiveId]: { metric: "", target: "" } }));
      setMessage("Key Result created.");
      await load(quarter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create key result.");
    }
  }

  async function editKeyResult(kr: KeyResultNode) {
    const metric = window.prompt("Key Result metric", kr.metric_name);
    if (metric === null) return;
    const targetRaw = window.prompt("Target value", String(kr.target_value));
    if (targetRaw === null) return;
    const currentRaw = window.prompt("Current value", String(kr.current_value));
    if (currentRaw === null) return;
    const targetValue = Number(targetRaw);
    const currentValue = Number(currentRaw);
    if (!Number.isFinite(targetValue) || !Number.isFinite(currentValue)) {
      setError("Target and current values must be numbers.");
      return;
    }

    await runAndReload(
      {
        action: "update_key_result",
        id: kr.id,
        metric_name: metric.trim(),
        target_value: targetValue,
        current_value: currentValue
      },
      "Key Result updated.",
      "Unable to update key result."
    );
  }

  async function removeKeyResult(kr: KeyResultNode) {
    if (!window.confirm(`Delete key result \"${kr.metric_name}\" and all initiatives?`)) return;
    await runAndReload(
      { action: "delete_key_result", id: kr.id },
      "Key Result deleted.",
      "Unable to delete key result."
    );
  }

  async function createInitiative(keyResultId: string) {
    const title = (newInitiativeByKr[keyResultId] ?? "").trim();
    if (!title) return;

    try {
      await post({ action: "create_initiative", key_result_id: keyResultId, title });
      setNewInitiativeByKr((prev) => ({ ...prev, [keyResultId]: "" }));
      setMessage("Initiative created.");
      await load(quarter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create initiative.");
    }
  }

  async function editInitiative(initiative: InitiativeNode) {
    const title = window.prompt("Initiative title", initiative.title);
    if (title === null) return;
    const description = window.prompt("Initiative description", initiative.description ?? "");
    if (description === null) return;
    await runAndReload(
      {
        action: "update_initiative",
        id: initiative.id,
        title: title.trim(),
        description: description.trim() || null
      },
      "Initiative updated.",
      "Unable to update initiative."
    );
  }

  async function removeInitiative(initiative: InitiativeNode) {
    if (!window.confirm(`Delete initiative \"${initiative.title}\"?`)) return;
    await runAndReload(
      { action: "delete_initiative", id: initiative.id },
      "Initiative deleted.",
      "Unable to delete initiative."
    );
  }

  async function submitWeeklyCheckin() {
    const entries = Object.values(checkinDrafts)
      .filter((item) => item.status)
      .map((item) => ({
        entity_type: "key_result" as const,
        entity_id: item.keyResultId,
        status: item.status,
        note: item.note
      }));

    if (entries.length === 0) {
      setMessage("No check-ins to submit.");
      return;
    }

    try {
      await post({ action: "weekly_checkin", checkins: entries });
      setShowCheckin(false);
      setCheckinDrafts({});
      setMessage(`Weekly check-in saved for ${entries.length} key result(s).`);
      await load(quarter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit weekly check-in.");
    }
  }

  if (loading) {
    return <div className="grid min-h-[40vh] place-items-center rounded-[20px] bg-white text-[14px] text-textSecondary">Loading execution...</div>;
  }

  if (error && !data) {
    return <div className="grid min-h-[40vh] place-items-center rounded-[20px] bg-white text-[14px] text-[#b42318]">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[30px] font-semibold">Execution</h1>
          <p className="text-[13px] text-textSecondary">Strategy quietly connected to work.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={quarter}
            onChange={(event) => {
              const nextQuarter = event.target.value;
              setQuarter(nextQuarter);
              void load(nextQuarter);
            }}
            className="h-9 rounded-[10px] border border-black/10 bg-white px-3 text-[12px]"
          >
            {(data?.quarter_options ?? []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowCheckin((value) => !value)}
            disabled={busy}
            className="h-9 rounded-pill border border-black/10 bg-white px-3 text-[12px] text-textSecondary"
          >
            Weekly check-in
          </button>
        </div>
      </div>

      {data?.alignment?.drift_detected ? (
        <Card className="border border-black/10 bg-[#FFF9F2] p-3 shadow-none">
          <p className="text-[13px] font-semibold text-textPrimary">Execution drift detected</p>
          <p className="text-[12px] text-textSecondary">
            {data.alignment.unaligned_task_count ?? 0} of {data.alignment.active_task_count ?? 0} active tasks are unaligned.
          </p>
        </Card>
      ) : null}

      {message ? <p className="text-[13px] font-medium text-[#106C2A]">{message}</p> : null}
      {error ? <p className="text-[13px] font-medium text-[#b42318]">{error}</p> : null}

      {showCheckin ? (
        <Card className="border border-black/10 p-4 shadow-none">
          <p className="mb-3 text-[16px] font-semibold">Weekly check-in</p>
          <div className="space-y-3">
            {activeKrs.map((kr) => {
              const draft = checkinDrafts[kr.id] ?? { keyResultId: kr.id, status: kr.status, note: "" };
              return (
                <div key={kr.id} className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3">
                  <p className="text-[13px] font-semibold text-textPrimary">{kr.metric_name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {checkinStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setCheckinDrafts((prev) => ({
                            ...prev,
                            [kr.id]: { ...draft, status }
                          }))
                        }
                        className={`h-7 rounded-pill border px-3 text-[11px] ${draft.status === status ? "bg-chipActiveBg text-chipActiveText border-chipActiveBg" : "bg-white text-textSecondary border-black/10"}`}
                      >
                        {status.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={draft.note}
                    onChange={(event) =>
                      setCheckinDrafts((prev) => ({
                        ...prev,
                        [kr.id]: { ...draft, note: event.target.value }
                      }))
                    }
                    placeholder="Short note"
                    className="mt-2 min-h-16 w-full rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[12px]"
                  />
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => void submitWeeklyCheckin()}
            className="mt-3 h-10 rounded-pill bg-chipActiveBg px-4 text-[12px] font-semibold text-chipActiveText"
          >
            Save weekly check-in
          </button>
        </Card>
      ) : null}

      <Card className="border border-black/10 p-4 shadow-none">
        <p className="mb-3 text-[16px] font-semibold">Outcomes</p>

        <div className="mb-4 flex gap-2">
          <input
            value={newOutcomeTitle}
            onChange={(event) => setNewOutcomeTitle(event.target.value)}
            placeholder="Create outcome"
            className="h-10 flex-1 rounded-[10px] border border-black/10 bg-white px-3 text-[12px]"
          />
          <button
            type="button"
            onClick={() => void createOutcome()}
            disabled={busy}
            className="h-10 rounded-pill bg-chipActiveBg px-4 text-[12px] font-semibold text-chipActiveText"
          >
            Add
          </button>
        </div>

        <div className="space-y-3">
          {data?.outcomes.map((outcome) => (
            <details key={outcome.id} className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3" open>
              <summary className="cursor-pointer text-[14px] font-semibold text-textPrimary">{outcome.title}</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void editOutcome(outcome)}
                  disabled={busy}
                  className="h-7 rounded-pill border border-black/10 bg-white px-3 text-[11px] text-textSecondary disabled:opacity-70"
                >
                  Edit Outcome
                </button>
                <button
                  type="button"
                  onClick={() => void removeOutcome(outcome)}
                  disabled={busy}
                  className="h-7 rounded-pill bg-[#FBE9EA] px-3 text-[11px] text-[#A12A32] disabled:opacity-70"
                >
                  Delete Outcome
                </button>
              </div>
              <p className="mt-1 text-[12px] text-textSecondary">{outcome.description ?? "No description"}</p>

              <div className="mt-3 flex gap-2">
                <input
                  value={newObjectiveByOutcome[outcome.id] ?? ""}
                  onChange={(event) =>
                    setNewObjectiveByOutcome((prev) => ({ ...prev, [outcome.id]: event.target.value }))
                  }
                  placeholder="Add objective"
                  className="h-9 flex-1 rounded-[10px] border border-black/10 bg-white px-3 text-[12px]"
                />
                <button
                  type="button"
                  onClick={() => void createObjective(outcome.id)}
                  disabled={busy}
                  className="h-9 rounded-pill border border-black/10 bg-white px-3 text-[12px] text-textSecondary"
                >
                  Add Objective
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {outcome.objectives.map((objective) => (
                  <details key={objective.id} className="rounded-[10px] border border-black/10 bg-white p-3" open>
                    <summary className="cursor-pointer text-[13px] font-semibold text-textPrimary">{objective.title}</summary>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void editObjective(objective)}
                        disabled={busy}
                        className="h-7 rounded-pill border border-black/10 bg-[#FAFAFB] px-3 text-[11px] text-textSecondary disabled:opacity-70"
                      >
                        Edit Objective
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeObjective(objective)}
                        disabled={busy}
                        className="h-7 rounded-pill bg-[#FBE9EA] px-3 text-[11px] text-[#A12A32] disabled:opacity-70"
                      >
                        Delete Objective
                      </button>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        value={newKrByObjective[objective.id]?.metric ?? ""}
                        onChange={(event) =>
                          setNewKrByObjective((prev) => ({
                            ...prev,
                            [objective.id]: { metric: event.target.value, target: prev[objective.id]?.target ?? "" }
                          }))
                        }
                        placeholder="Metric name"
                        className="h-9 flex-1 rounded-[10px] border border-black/10 bg-[#FAFAFB] px-3 text-[12px]"
                      />
                      <input
                        value={newKrByObjective[objective.id]?.target ?? ""}
                        onChange={(event) =>
                          setNewKrByObjective((prev) => ({
                            ...prev,
                            [objective.id]: { metric: prev[objective.id]?.metric ?? "", target: event.target.value }
                          }))
                        }
                        placeholder="Target"
                        className="h-9 w-28 rounded-[10px] border border-black/10 bg-[#FAFAFB] px-3 text-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => void createKeyResult(objective.id)}
                        disabled={busy}
                        className="h-9 rounded-pill border border-black/10 bg-white px-3 text-[12px] text-textSecondary"
                      >
                        Add KR
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {objective.key_results.map((kr) => (
                        <div key={kr.id} className="rounded-[10px] border border-black/10 bg-[#FAFAFB] p-3">
                          <p className="text-[12px] font-semibold text-textPrimary">
                            {kr.metric_name} ({kr.current_value}/{kr.target_value})
                          </p>
                          <p className="text-[11px] text-textSecondary">Status: {kr.status.replace("_", " ")}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void editKeyResult(kr)}
                              disabled={busy}
                              className="h-7 rounded-pill border border-black/10 bg-white px-3 text-[11px] text-textSecondary disabled:opacity-70"
                            >
                              Edit KR
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeKeyResult(kr)}
                              disabled={busy}
                              className="h-7 rounded-pill bg-[#FBE9EA] px-3 text-[11px] text-[#A12A32] disabled:opacity-70"
                            >
                              Delete KR
                            </button>
                          </div>

                          <div className="mt-2 flex gap-2">
                            <input
                              value={newInitiativeByKr[kr.id] ?? ""}
                              onChange={(event) =>
                                setNewInitiativeByKr((prev) => ({ ...prev, [kr.id]: event.target.value }))
                              }
                              placeholder="Add initiative"
                              className="h-8 flex-1 rounded-[10px] border border-black/10 bg-white px-3 text-[12px]"
                            />
                            <button
                              type="button"
                              onClick={() => void createInitiative(kr.id)}
                              disabled={busy}
                              className="h-8 rounded-pill border border-black/10 bg-white px-3 text-[11px] text-textSecondary"
                            >
                              Add Initiative
                            </button>
                          </div>

                          <div className="mt-2 space-y-1">
                            {kr.initiatives.map((initiative) => (
                              <div key={initiative.id} className="rounded-[8px] border border-black/10 bg-white px-2 py-1 text-[11px] text-textSecondary">
                                <div className="flex items-center justify-between gap-2">
                                  <span>
                                    {initiative.title} · {initiative.status} · Tasks {initiative.completed_tasks}/{initiative.total_tasks}
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void editInitiative(initiative)}
                                      disabled={busy}
                                      className="text-[10px] text-textSecondary underline disabled:opacity-70"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void removeInitiative(initiative)}
                                      disabled={busy}
                                      className="text-[10px] text-[#A12A32] underline disabled:opacity-70"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}

          {data?.outcomes.length === 0 ? (
            <div className="rounded-[12px] border border-black/10 bg-[#FAFAFB] p-3 text-[13px] text-textSecondary">
              No outcomes yet for this quarter.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
