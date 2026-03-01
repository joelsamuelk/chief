import { getDefaultContext, getRepos } from "../storage";
import type { CreateDecisionInput, DecisionStatus, UpdateDecisionInput } from "../storage";
import { acceptExtractedItem } from "./queue";

export function getDecisions() {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.decision.list(context);
}

export function createDecision(payload: CreateDecisionInput) {
  const repos = getRepos();
  const context = getDefaultContext();
  return repos.decision.create(context, {
    ...payload,
    status: payload.status ?? "proposed"
  });
}

export function updateDecision(decisionId: string, payload: UpdateDecisionInput) {
  const repos = getRepos();
  const context = getDefaultContext();
  const decision = repos.decision.update(context, decisionId, payload);
  if (!decision) throw new Error("Decision not found.");
  return decision;
}

export function updateDecisionStatus(decisionId: string, status: DecisionStatus) {
  return updateDecision(decisionId, { status });
}

export function acceptExtractedDecision(itemId: string) {
  const accepted = acceptExtractedItem(itemId);
  if (!accepted) throw new Error("Unable to accept extracted item.");
  return accepted;
}

export function getDecisionLedger() {
  const decisions = getDecisions();
  return {
    proposed: decisions.filter((decision) => decision.status === "proposed"),
    approved: decisions.filter((decision) => decision.status === "approved"),
    implemented: decisions.filter((decision) => decision.status === "implemented")
  };
}
