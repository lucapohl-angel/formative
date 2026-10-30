# Discover, try, revise

Start in the project you want to explore. Invoke `$formative` in Codex or `/formative` in Claude Code/Pi, then describe the idea in your own words. An incomplete idea is enough. The agent inspects relevant existing work, maps the journeys and unanswered questions, and follows each agreed branch with recommendations.

The interview remains useful without a prototype. Use a checkpoint when trying an interaction will clarify a decision: an invitation flow, a settings screen, an onboarding step, or a failure state. Prototypes use mock data and simulated behavior; they do not implement authentication, payments, or a backend.

## In the preview

The charcoal review toolbar belongs to Formative. The large canvas beneath it is the prototype. Use **Select** to highlight a component on hover and attach feedback to it. Write a note and use **Send feedback** to request a revision while testing continues. The selection mode remains visibly active while writing. Simulation controls explore scenarios without adding those controls to your product.

With an active agent, the note moves from queued to running and then to an applied revision, or to a retryable failure with an explanation. The preview receives validated complete revisions over a local event stream. It does not render partially generated JSON token by token. Failed notes remain saved; a successful network request alone does not mean a model completed the change.

**Finish prototype testing** saves any unfinished draft, interrupts active work, exports requirements evidence, and closes the preview server. Unfinished notes remain retryable. The browser attempts to close the tab; when browser policy prevents that, a completion screen remains. The main agent reconciles the findings and resumes unresolved interview branches. Finish does not end discovery or authorize implementation.

## Who handles feedback?

| Connection | Feedback consumer | Needs Pi? |
| --- | --- | --- |
| Claude Code / Codex MCP | One dedicated host subagent calls `wait`, reads current state, and commits revisions | No |
| Native Pi | A restricted Pi RPC worker started by the extension | Yes |
| Default CLI preview | The same dedicated Pi worker | Yes |
| CLI `preview --manual` | An integration actively consumes emitted events and writes revisions | No |

Background agents must actually have access to the MCP tools. If your host does not support that, use an explicit foreground review loop. An idle/disconnected host cannot be assumed to wake automatically. Only one feedback consumer should own a project. Detailed tool instructions are in [harnesses.md](../skills/formative/references/harnesses.md).

## What gets saved?

`.formative/` contains revisioned prototype state, discovery records, feedback, testing handoffs, and exported requirements evidence. `.formative/exports/requirements.md` and `.json` describe product requirements rather than prototype styling. Keep this directory out of public Git history when it contains private product information.

The agent writes the final plan when requested, using a structure appropriate to your project and including discoveries that were never prototyped. Exports never overwrite an authored `plan.md`. Mock data, renderer technology, and illustrative styling do not become product requirements; explicit user design decisions remain separate. You can then review that plan with Planboard, but neither project requires the other.

## CLI fallback

Run `node /path/to/formative/bin/formative.mjs help` for commands. Supply `--project /absolute/project` consistently. `read`, `feedback`, `history`, and `export` inspect saved work; `apply --file prototype.json --expected N --feedback NOTE_ID` commits a validated revision. `restore --revision N --expected CURRENT` creates a new revision from a previous snapshot.

Use `preview --manual` only with an active event consumer or for an explicitly offline demo. Default `preview` uses Pi. Stop a CLI preview with Ctrl+C. Restarting a preview does not automatically retry failed notes.
