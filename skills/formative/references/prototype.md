# Prototype workflow

1. Name the open interview question this checkpoint will test and its provisional assumptions. Read current state or initialize from an authored project JSON file. Example fixtures are demonstrations, not substitutes for the user's idea.
2. Search the catalog by capability. If a domain term yields no results, try interaction terms such as form, list, date, or settings before deciding something is missing. Describe each selected component to obtain exact properties, slots, events, bindings, and examples.
3. Author screens and scenarios linked to features, with stable IDs, representative mock data, and complete simulated actions. Each scenario supplies complete initial state for all screens.
4. Validate the file. Repair reported problems without weakening the validator. Apply against the current revision.
5. Open the preview and follow [self-critique.md](self-critique.md) before presenting it as ready. Exercise relevant input, submit, navigation, selection, cancellation, reordering, and failure behavior.
6. Collect feedback with the selected element and revision. Select outlines the hovered component; clicking anchors the note without activating that control. Let the user explore and use **Send feedback** to request changes immediately. A dedicated prototype subagent applies each note while the preview remains open; the main chat stays available. **Finish prototype testing** stops the subagent and server, preserving unfinished notes for retry. Finish also saves a nonempty draft. Read the current project and update only the affected records. Apply with the resolved feedback IDs.
7. Read the saved requirements snapshot and handoff, reconcile discoveries, and resume the interview. Keep unresolved choices and simulated behavior explicit. Finish ends this checkpoint, not discovery; write the final plan only when the user requests it.

For Claude Code/Codex, prefer the MCP workflow in [harnesses.md](harnesses.md); it uses the host agent and needs no Pi installation. The following CLI fallback defaults to a Pi worker unless `--manual` is specified.

CLI examples, using the real installation path:

```bash
node /path/to/formative/bin/formative.mjs init --project /path/to/project --file /path/to/project/prototype.json
node /path/to/formative/bin/formative.mjs catalog --query settings
node /path/to/formative/bin/formative.mjs catalog --name Input
node /path/to/formative/bin/formative.mjs validate --project /path/to/project --file /path/to/project/prototype.json
node /path/to/formative/bin/formative.mjs preview --project /path/to/project
node /path/to/formative/bin/formative.mjs feedback --project /path/to/project
node /path/to/formative/bin/formative.mjs apply --project /path/to/project --file /path/to/project/prototype.json --expected 1 --feedback FEEDBACK_ID
node /path/to/formative/bin/formative.mjs export --project /path/to/project
```

Default previews start a dedicated Pi RPC subagent for feedback, both from the CLI and the Pi extension. It uses the existing Pi installation and configured model. Its only tool reads the saved prototype, describes catalog contracts, applies validated JSON Pointer edits, or marks the assigned note failed. It cannot run shell commands or access arbitrary files. Main chat continues independently; Pi receives a discovery continuation when Finish is clicked.

The worker processes notes one at a time and uses current revisions to preserve newer work. It marks a note applied only through a committed revision. The browser receives server events and refreshes validated state, retaining compatible mock input. These are complete validated edits, not token-by-token rendering of unfinished JSON. A note that cannot be completed receives a concrete retryable error. Feedback revisions follow the same minimum three self-critique passes, focused on the requested change and its consequences; they do not restart the interview. The restricted worker reviews intent, dependencies/failures, and contract consistency using its available tools. It cannot perform browser verification; the main agent verifies the rendered checkpoint before presenting it as ready.

The status indicator distinguishes starting, ready, working, offline, and stopped. Missing Pi or a model failure must be visible; never call an event-only CLI an attached agent. Retry starts a failed worker again. Finish stops active work promptly, preserving interrupted/queued notes as failed with a retry explanation. It saves an unfinished browser draft before stopping, but does not promise to process that draft after testing ends. Do not reopen the preview automatically.

For an explicit host-managed integration without Pi, use `preview --manual`. This mode labels itself manual and prints `prototype_feedback` events. A host must actively consume them, mark notes running, apply changes with feedback IDs, and keep waiting on that process. A detached manual CLI cannot wake an agent. Never leave it running and imply feedback is automatic. Finish prints `prototype_testing_finished` and exits; durable handoffs remain under `.formative/testing/`.

Default automatic previews can continue processing while the main coding agent ends its turn, as long as the preview command remains alive. Close the command/session to terminate its worker.

The browser attempts to close the prototype tab after successful handoff. If browser policy blocks that, it shows a completion screen that the user can close manually; the preview server still stops.

Keep brand choices coherent through one theme. Compose semantic controls; never inject style/className/HTML/script properties. The review shell contains inspection and simulation controls; the generated product contains only its own user flow.

Finish exports the design-independent requirements snapshot and discovery handoff described in [planning-handoff.md](planning-handoff.md). Prototype visuals and renderer code are not an implementation brief.
