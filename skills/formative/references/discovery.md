# Living requirements and shared language

Retain meaning across interview rounds, previews, and sessions. Documentation grows when there is something worth keeping; it is not a mandatory final-plan template.

## Keep the whole scope visible

During active discovery, maintain `.formative/discovery.md` or the project's existing equivalent. Keep goals/scope, branch prerequisites and status, decisions with reasons/evidence, definitions, open assumptions, and the next question or experiment. Include unprototyped areas and explicit deferrals. Update meaningful changes rather than transcribing the conversation. Proposal-only requests need no saved state.

Before a prototype exists, these notes can hold requirements directly. Once represented in the project store, link stable IDs instead of maintaining duplicate descriptions. Change stored records with validated `apply`, never by editing revision files. Unrepresented branches remain in the notes; the prototype map/export may cover only part of discovery.

On resume, reconcile notes, existing plans, current records, and new evidence. A newer snapshot does not override an earlier user decision. Establish which choice supersedes which and reconcile worker changes before writing shared records.

## Preserve meaning, provenance, and approval

Use concrete acceptance examples to make behavior testable. Record requested, inferred, or prototype-discovered origins with specific evidence. Separate requirement status (proposed/accepted/deferred/rejected) from implementation (unbuilt/prototyped/implemented). Structured decisions retain alternatives, choice or unresolved status, reason, affected IDs, and provenance.

Applied feedback is not approval. Keep inferred additions in proposed features or provisional decisions instead of appending them under an existing feature's accepted status. A clear requested behavior remains a requirement even when the catalog cannot demonstrate it: record it as unbuilt and retain the failed note. Ambiguous requests remain questions.

Behavioral feedback updates requirements and the preview. Visual experiments stay in screen specs; associated feature/decision records use `scope: "prototype-only"`. Omitted scope means product for compatibility. Do not infer required colors, fonts, spacing, exact layout, mock values, components, or stack from the preview. Preserve meaningful interaction constraints and explicit user design choices with their source. Inspect free text for accidental visual prescriptions; the exporter cannot infer intent.

## Sharpen language and record decisions

Adapted from the [upstream domain-modeling method](upstream.md). Challenge overloaded terms: does “account” mean a person, login identity, or paying organization? Test relationships with concrete edge cases. Compare the code and existing glossary with desired behavior; existing code is evidence, not a veto on product changes.

Capture agreed definitions as they emerge. Follow an existing glossary; a definitions section in discovery notes suffices for a small idea. Keep vocabulary separate from implementation details.

Record reasons and alternatives while fresh. Use the project's ADR convention when reversal is costly, the reasoning would surprise a future reader, and a meaningful tradeoff exists. Routine UI choices need no ADR. Link superseding decisions without erasing history; create separate documents only when useful.
