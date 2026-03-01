import { getDefaultContext, getRepos } from "../storage";
import type { ExtractedItem } from "../storage";

function groupBySource(items: ExtractedItem[]) {
  const grouped = new Map<string, ExtractedItem[]>();
  items.forEach((item) => {
    const existing = grouped.get(item.source_id) ?? [];
    existing.push(item);
    grouped.set(item.source_id, existing);
  });
  return Array.from(grouped.entries()).map(([source_id, extracted_items]) => ({
    source_id,
    extracted_items
  }));
}

export function listQueue() {
  const repos = getRepos();
  const context = getDefaultContext();
  const items = repos.extractedItem.listQueue(context, new Date().toISOString());
  return {
    items,
    grouped: groupBySource(items)
  };
}

export function acceptExtractedItem(id: string) {
  const repos = getRepos();
  const context = getDefaultContext();
  const item = repos.extractedItem.getById(context, id);
  if (!item) throw new Error("Queue item not found.");

  if (item.status === "accepted") return item;
  if (item.status === "dismissed") return item;

  let acceptedEntityType: ExtractedItem["accepted_entity_type"] = item.accepted_entity_type;
  let acceptedEntityId = item.accepted_entity_id;

  if (!acceptedEntityId) {
    if (item.kind === "task" || item.kind === "follow_up") {
      const task = repos.task.create(context, {
        org_id: item.org_id,
        title: item.title,
        description: item.body,
        due_at: item.due_at,
        priority: item.priority,
        status: "open",
        source_id: item.source_id
      });
      acceptedEntityType = "task";
      acceptedEntityId = task.id;
    } else if (item.kind === "decision") {
      const linkedMeeting = repos
        .meeting
        .list(context)
        .find((meeting) => meeting.source_id === item.source_id);
      const decision = repos.decision.create(context, {
        org_id: item.org_id,
        title: item.title,
        context: item.body,
        status: "proposed",
        source_id: item.source_id,
        related_meeting_id: linkedMeeting?.id ?? null
      });
      acceptedEntityType = "decision";
      acceptedEntityId = decision.id;
    } else {
      acceptedEntityType = null;
      acceptedEntityId = null;
    }
  }

  return repos.extractedItem.update(context, id, {
    status: "accepted",
    accepted_entity_type: acceptedEntityType,
    accepted_entity_id: acceptedEntityId,
    snoozed_until: null
  });
}

export function dismissExtractedItem(id: string) {
  const repos = getRepos();
  const context = getDefaultContext();
  const item = repos.extractedItem.getById(context, id);
  if (!item) throw new Error("Queue item not found.");
  if (item.status === "dismissed") return item;
  return repos.extractedItem.update(context, id, {
    status: "dismissed",
    snoozed_until: null
  });
}

export function snoozeExtractedItem(id: string, untilIso: string) {
  const repos = getRepos();
  const context = getDefaultContext();
  const item = repos.extractedItem.getById(context, id);
  if (!item) throw new Error("Queue item not found.");

  const nextSnoozeCount = item.snooze_count + 1;
  return repos.extractedItem.update(context, id, {
    status: "snoozed",
    snoozed_until: untilIso,
    snooze_count: nextSnoozeCount
  });
}
