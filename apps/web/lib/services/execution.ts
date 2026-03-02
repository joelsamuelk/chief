import { getDefaultContext, getRepos } from "../storage";
import type {
  Checkin,
  CheckinEntityType,
  CreateCheckinInput,
  Initiative,
  KeyResult,
  KeyResultStatus,
  Objective,
  Outcome,
  Task
} from "../storage";

export interface ExecutionTreeKeyResult extends KeyResult {
  initiatives: Array<Initiative & { related_tasks: Task[]; completed_tasks: number; total_tasks: number }>;
}

export interface ExecutionTreeObjective extends Objective {
  key_results: ExecutionTreeKeyResult[];
}

export interface ExecutionTreeOutcome extends Outcome {
  objectives: ExecutionTreeObjective[];
}

function currentQuarterLabel(input = new Date()) {
  const quarter = Math.floor(input.getMonth() / 3) + 1;
  return `Q${quarter} ${input.getFullYear()}`;
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

export function listExecutionTree(quarter?: string) {
  const repos = getRepos();
  const context = getDefaultContext();

  const outcomes = repos.outcome.list(context);
  const objectives = repos.objective.list(context);
  const keyResults = repos.keyResult.list(context);
  const initiatives = repos.initiative.list(context);
  const tasks = repos.task.list(context);

  const quarterValue = quarter ?? currentQuarterLabel();
  const filteredOutcomes = outcomes.filter((outcome) => outcome.quarter === quarterValue);

  const tree: ExecutionTreeOutcome[] = filteredOutcomes.map((outcome) => {
    const outcomeObjectives = objectives
      .filter((objective) => objective.outcome_id === outcome.id)
      .map((objective) => {
        const objectiveKrs: ExecutionTreeKeyResult[] = keyResults
          .filter((kr) => kr.objective_id === objective.id)
          .map((kr) => {
            const krInitiatives = initiatives
              .filter((initiative) => initiative.key_result_id === kr.id)
              .map((initiative) => {
                const relatedTasks = tasks.filter((task) => task.initiative_id === initiative.id);
                const completedTasks = relatedTasks.filter(
                  (task) => task.status === "completed" || task.status === "archived"
                ).length;

                return {
                  ...initiative,
                  related_tasks: relatedTasks,
                  completed_tasks: completedTasks,
                  total_tasks: relatedTasks.length
                };
              });

            return {
              ...kr,
              initiatives: krInitiatives
            };
          });

        return {
          ...objective,
          key_results: objectiveKrs
        };
      });

    return {
      ...outcome,
      objectives: outcomeObjectives
    };
  });

  const quarterOptions = Array.from(new Set(outcomes.map((outcome) => outcome.quarter))).sort().reverse();

  return {
    quarter: quarterValue,
    quarter_options: quarterOptions.length > 0 ? quarterOptions : [quarterValue],
    outcomes: tree
  };
}

export function createOutcome(payload: {
  title: string;
  description?: string | null;
  quarter: string;
  owner_id?: string;
}) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.outcome.create(context, {
    title: payload.title,
    description: payload.description ?? null,
    quarter: payload.quarter,
    owner_id: payload.owner_id ?? context.userId,
    status: "active"
  });
}

export function createObjective(payload: {
  outcome_id: string;
  title: string;
  description?: string | null;
  owner_id?: string;
}) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.objective.create(context, {
    outcome_id: payload.outcome_id,
    title: payload.title,
    description: payload.description ?? null,
    owner_id: payload.owner_id ?? context.userId
  });
}

export function createKeyResult(payload: {
  objective_id: string;
  metric_name: string;
  target_value: number;
  current_value?: number;
  status?: KeyResultStatus;
  owner_id?: string;
}) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.keyResult.create(context, {
    objective_id: payload.objective_id,
    metric_name: payload.metric_name,
    target_value: payload.target_value,
    current_value: payload.current_value ?? 0,
    status: payload.status,
    owner_id: payload.owner_id ?? context.userId
  });
}

export function createInitiative(payload: {
  key_result_id: string;
  title: string;
  description?: string | null;
  owner_id?: string;
}) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.initiative.create(context, {
    key_result_id: payload.key_result_id,
    title: payload.title,
    description: payload.description ?? null,
    owner_id: payload.owner_id ?? context.userId,
    status: "active"
  });
}

export function updateOutcome(payload: { id: string; title?: string; description?: string | null; status?: Outcome["status"] }) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.outcome.update(context, payload.id, {
    title: payload.title,
    description: payload.description,
    status: payload.status
  });
}

export function deleteOutcome(payload: { id: string }) {
  const repos = getRepos();
  const context = getDefaultContext();
  const objectives = repos.objective.listByOutcome(context, payload.id);
  for (const objective of objectives) {
    deleteObjective({ id: objective.id });
  }
  return repos.outcome.delete(context, payload.id);
}

export function updateObjective(payload: { id: string; title?: string; description?: string | null }) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.objective.update(context, payload.id, {
    title: payload.title,
    description: payload.description
  });
}

export function deleteObjective(payload: { id: string }) {
  const repos = getRepos();
  const context = getDefaultContext();
  const keyResults = repos.keyResult.listByObjective(context, payload.id);
  for (const keyResult of keyResults) {
    deleteKeyResult({ id: keyResult.id });
  }
  return repos.objective.delete(context, payload.id);
}

export function updateKeyResult(payload: {
  id: string;
  metric_name?: string;
  target_value?: number;
  current_value?: number;
  status?: KeyResultStatus;
}) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.keyResult.update(context, payload.id, {
    metric_name: payload.metric_name,
    target_value: payload.target_value,
    current_value: payload.current_value,
    status: payload.status
  });
}

export function deleteKeyResult(payload: { id: string }) {
  const repos = getRepos();
  const context = getDefaultContext();
  const initiatives = repos.initiative.listByKeyResult(context, payload.id);
  for (const initiative of initiatives) {
    deleteInitiative({ id: initiative.id });
  }
  return repos.keyResult.delete(context, payload.id);
}

export function updateInitiative(payload: {
  id: string;
  title?: string;
  description?: string | null;
  status?: Initiative["status"];
}) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.initiative.update(context, payload.id, {
    title: payload.title,
    description: payload.description,
    status: payload.status
  });
}

export function deleteInitiative(payload: { id: string }) {
  const repos = getRepos();
  const context = getDefaultContext();
  const tasks = repos.task.list(context).filter((task) => task.initiative_id === payload.id);
  for (const task of tasks) {
    repos.task.update(context, task.id, { initiative_id: null });
  }
  return repos.initiative.delete(context, payload.id);
}

export function listInitiatives() {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.initiative.list(context);
}

export function createCheckins(payload: { checkins: CreateCheckinInput[] }) {
  const repos = getRepos();
  const context = getDefaultContext();
  return payload.checkins.map((checkin) => repos.checkin.create(context, checkin));
}

export function computeExecutionAlignment() {
  const repos = getRepos();
  const context = getDefaultContext();

  const tasks = repos.task.list(context).filter((task) => task.status !== "completed" && task.status !== "archived");
  const keyResults = repos.keyResult.list(context);
  const initiatives = repos.initiative.list(context);

  const unalignedCount = tasks.filter((task) => !task.initiative_id).length;
  const unalignedRatio = ratio(unalignedCount, tasks.length);

  const atRiskKrWithoutActiveInitiative = keyResults.filter((kr) => {
    if (kr.status !== "at_risk") return false;
    const hasActive = initiatives.some(
      (initiative) => initiative.key_result_id === kr.id && (initiative.status === "active" || initiative.status === "planned")
    );
    return !hasActive;
  });

  const driftDetected = unalignedRatio > 0.6 || atRiskKrWithoutActiveInitiative.length > 0;

  return {
    active_task_count: tasks.length,
    unaligned_task_count: unalignedCount,
    unaligned_ratio: unalignedRatio,
    at_risk_key_results_without_active_initiatives: atRiskKrWithoutActiveInitiative,
    drift_detected: driftDetected
  };
}

export function generateWeeklyExecutionBrief() {
  const repos = getRepos();
  const context = getDefaultContext();

  const outcomes = repos.outcome.list(context).filter((outcome) => outcome.status === "active");
  const objectives = repos.objective.list(context);
  const keyResults = repos.keyResult.list(context);
  const initiatives = repos.initiative.list(context);
  const checkins = repos.checkin.list(context);

  const atRiskKrs = keyResults.filter((kr) => kr.status === "at_risk" || kr.status === "off_track");
  const completedInitiatives = initiatives.filter((initiative) => initiative.status === "completed");

  const blockers = atRiskKrs
    .map((kr) => {
      const latest = checkins.find(
        (checkin) => checkin.entity_type === "key_result" && checkin.entity_id === kr.id
      );
      return latest?.note ? `${kr.metric_name}: ${latest.note}` : `${kr.metric_name}: needs intervention`;
    })
    .slice(0, 8);

  const outcomesSummary = outcomes.map((outcome) => {
    const outcomeObjectives = objectives.filter((objective) => objective.outcome_id === outcome.id);
    const outcomeKrIds = keyResults
      .filter((kr) => outcomeObjectives.some((objective) => objective.id === kr.objective_id))
      .map((kr) => kr.id);
    const outcomeInitiatives = initiatives.filter((initiative) => outcomeKrIds.includes(initiative.key_result_id));

    return {
      outcome_id: outcome.id,
      title: outcome.title,
      quarter: outcome.quarter,
      objective_count: outcomeObjectives.length,
      key_result_count: outcomeKrIds.length,
      initiative_count: outcomeInitiatives.length,
      completed_initiatives: outcomeInitiatives.filter((initiative) => initiative.status === "completed").length
    };
  });

  return {
    generated_at: new Date().toISOString(),
    outcomes_summary: outcomesSummary,
    krs_at_risk: atRiskKrs.map((kr) => ({ id: kr.id, metric_name: kr.metric_name, status: kr.status })),
    completed_initiatives: completedInitiatives.map((initiative) => ({ id: initiative.id, title: initiative.title })),
    major_blockers: blockers
  };
}

export function executionAssistSummary() {
  const tree = listExecutionTree();
  const alignment = computeExecutionAlignment();
  const allKrs = tree.outcomes.flatMap((outcome) =>
    outcome.objectives.flatMap((objective) => objective.key_results)
  );
  const atRisk = allKrs.filter((kr) => kr.status === "at_risk" || kr.status === "off_track");

  return {
    quarter: tree.quarter,
    outcome_count: tree.outcomes.length,
    key_result_count: allKrs.length,
    at_risk: atRisk,
    alignment
  };
}
