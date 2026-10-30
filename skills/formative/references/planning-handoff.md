# Return to discovery; synthesize the plan

## Read the checkpoint evidence

Finish stops the preview/worker and saves a handoff. Pi sends a discovery continuation; CLI emits `prototype_testing_finished`. A CLI host must consume that event or read the saved handoff; a detached CLI cannot wake the main agent.

Read current records, discovery notes, the handoff, and relevant feedback. Explain what was learned, distinguish preview changes from agreed requirements, reconcile contradictions, and resume the next unresolved branch through [interview.md](interview.md). Respect later pause/stop/finalize instructions. Do not automatically reopen the preview or reprocess unfinished notes.

Runtime artifacts:

- `.formative/exports/requirements.md`: readable snapshot of prototype-backed product records and their recorded status/provenance.
- `.formative/exports/requirements.json`: structured projection excluding theme, element trees, mock state, custom components, and renderer configuration.
- `.formative/testing/<id>.json`: checkpoint revision, unfinished feedback/evidence, snapshot references, and `resume-discovery` next action. Older handoffs may lack that field; Finish still means a checkpoint.

The legacy API field `plan` refers to the snapshot, not the final written plan. Export never writes `plan.md`. Use the paths/revision in the current handoff; older root exports may remain. Snapshots can omit unprototyped scope, which stays in the discovery record. Conversation-only discovery needs no renderer initialization or export.

## Write for this product

When requested, synthesize the plan from the agreed conversation, discovery notes, repository evidence, and current requirements/feedback. Use `plan.md` or the user's/project's destination. Inspect existing content, preserve relevant user edits, and resolve conflicts instead of replacing it with generated sections.

Choose the structure, depth, and diagrams that explain the product. A small feature may need a short behavior spec; a larger app may benefit from journeys, capabilities, rules, data/access, dependencies, acceptance examples, and unresolved decisions. These are considerations, not required headings. Link glossary/decision records rather than duplicating them.

Apply the approval, provenance, and design boundaries in [discovery.md](discovery.md). Raw feedback is evidence to interpret, not blanket approval. Include unprototyped requirements and renderer limitations; never let catalog coverage dictate product scope.

Distinguish agreed scope, proposals, deferred/rejected ideas, and assumptions. An early draft retains open issues; a closed preview does not finalize discovery. Follow the interview's shared-understanding rule and [self-critique](self-critique.md) before presenting the result. Finalization alone does not authorize production implementation.
