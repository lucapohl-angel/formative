---
name: formative
description: Relentlessly interview the user to uncover and stress-test app or website requirements, using interactive prototypes as discovery checkpoints. Use for product discovery, feature planning, or a Grill Me style session with visual exploration; not routine fixes.
---

# Formative

Turn an incomplete idea into a shared, actionable product plan. Interview relentlessly: challenge vague answers, follow decisions into their consequences, and surface overlooked needs throughout the agreed scope. A working preview does not mean discovery is complete.

This standalone skill adapts Matt Pocock's grilling and domain-modeling methods ([attribution](references/upstream.md)). Neither Grill Me nor Planboard is required. For inspection or proposal-only requests, answer without creating project state or previews.

## Interview and retain understanding

Read [interview.md](references/interview.md) before discovery and [discovery.md](references/discovery.md) when mapping or recording requirements. Inspect relevant repository behavior, supplied context, existing plans, and discovery notes. If `.formative/current.json` exists, read current records through the tool/CLI; never reinitialize them. Interviewing needs no renderer or placeholder screens.

Establish the user, outcome, and scope; propose a map of major journeys and gaps. Follow each in-scope branch with recommendations and dependency-aware questions, waiting for answers. Research facts yourself. Preserve unprototyped and blocked areas, accepted choices, and explicit deferrals. Respect delegation, pause, and stop requests.

## Prototype to answer a question

Name the uncertainty and provisional assumptions. Reversible frontend experiments are permitted during discovery; production implementation and real services require separate authorization.

Read [prototype.md](references/prototype.md) for checkpoints, [contracts.md](references/contracts.md) when authoring data, and [components.md](references/components.md) for catalog gaps. Describe catalog components before using them. A renderer limitation must not erase a product requirement.

**Send feedback** uses a dedicated prototype subagent, leaving the main chat available. Avoid concurrent edits to its active records. Validate changes against current revisions; resolve feedback only through committed edits. Preserve failed/interrupted notes for retry. Behavioral changes update linked requirements as well as the preview; preview edits never imply blanket approval.

**Finish prototype testing ends only the checkpoint.** Read [planning-handoff.md](references/planning-handoff.md), reconcile findings, and resume unresolved interview branches, respecting later pause/stop/finalize instructions. Do not automatically reopen the preview or retry unfinished notes.

## Review and deliver

Before presenting a deliverable—requirements map, prototype, plan, or revision—**automatically review it at least three times with honest self-critique. Keep revising and reviewing until you can deliver something you are truly proud of in the context of the task.** Read [self-critique.md](references/self-critique.md) for evidence, task-specific checks, and completion criteria. Three passes are the minimum, not the stopping rule.

When the user requests a plan, follow [planning-handoff.md](references/planning-handoff.md). The agent chooses its structure and incorporates unprototyped discoveries. Runtime snapshots are evidence and never overwrite `plan.md`. Keep illustrative styling, mock data, and renderer choices out of product requirements; preserve explicit user design decisions separately. Confirm shared understanding before calling discovery complete; an early requested draft retains open issues. Finalizing a plan does not authorize implementation.

## Tools

Use `formative_project` through MCP in Claude Code/Codex or natively in Pi; `/formative` starts/resumes discovery and `/formative open` reopens a saved preview. Otherwise use `node <formative-install>/bin/formative.mjs`; resolve this skill's symlink and go up two directories to find the installation. Run `help` for commands. Read [harnesses.md](references/harnesses.md) before starting live feedback. MCP uses a dedicated host subagent; default CLI previews use Pi. `preview --manual` requires an active host consumer. The interview and written plan require neither process.
