import type {TestingHandoff} from '../store/index.js';

/** Shared continuation for Pi and CLI hosts. Finish ends a checkpoint, not discovery. */
export function discoveryContinuation(handoff:TestingHandoff,skillPath:string):string {
  const snapshot=handoff.plan;
  return [
    'A Formative prototype checkpoint ended. The preview server and dedicated worker are stopping.',
    `Resume discovery using the Formative skill at ${skillPath}, including its interview and planning-handoff references.`,
    `Saved handoff: ${handoff.path}. Checkpoint revision: ${handoff.revision}. Full feedback evidence: ${handoff.feedbackLogPath??'see the project feedback inbox'}.`,
    snapshot?`Generated requirements snapshot: ${snapshot.path}. Structured requirements: ${snapshot.requirementsPath}. These are evidence, not an agent-authored final plan.`:'Read the current project requirements; this older handoff has no exported snapshot.',
    'Read the latest project records and .formative/discovery.md (or the established discovery document) if present. Include branches that were never prototyped.',
    'Briefly explain what was learned, reconcile feedback with existing decisions, and resume the next unresolved interview branch with a recommendation. Retain blocked branches and unresolved facts.',
    'Respect the user’s latest pause, stop, or finalize instruction instead of automatically asking more questions. If all in-scope branches are understood or explicitly deferred, confirm shared understanding unless already confirmed.',
    'Finishing this checkpoint is not product approval. Preserve proposed/accepted/deferred/rejected distinctions; applied feedback means only that the preview changed.',
    'Do not automatically retry unfinished notes or reopen the preview. Do not begin production implementation because testing ended.',
    'Prototype appearance, mock data, component trees, and renderer libraries do not prescribe final design. When the user requests the plan, synthesize it in an appropriate structure and preserve existing user edits; do not copy the snapshot as a mandatory template.',
  ].join('\n');
}
