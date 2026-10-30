# Agent connections

Use the native `formative_project` tool in Pi and the MCP tool of the same name in Claude Code, Codex, or another compatible host. Installation is in [the repository guide](../../../docs/installation.md). In Codex invoke `$formative`; Claude Code and Pi expose `/formative`. Pi alone also provides `/formative open`.

## Host-managed MCP feedback

Pass the project's absolute `cwd` on every project action. Use `catalog` to search/describe components. Author a project JSON file inside that project, then `init` once or `apply` with its current `expectedRevision`. `read`, `history`, `restore`, and `export` use the same saved records. MCP never starts Pi or another model CLI.

Before opening a checkpoint, arrange one dedicated host subagent with access to `formative_project` and the project files. Give it the specific checkpoint goal and the following loop; the main chat stays available and avoids concurrent prototype edits:

1. `preview` returns the local URL (`openBrowser` is optional). Call `wait` with the same `cwd`, normally for 45 seconds (maximum 50).
2. On `feedback`, the server has claimed that note. Read the latest project. Interpret the requested outcome, update linked requirements when behavior changes, and perform the required self-critique. Write the revised JSON inside the project, then `apply` with `expectedRevision` and `feedbackIds: [note.id]`. A commit, not a separate status update, resolves it.
3. On ambiguity or failure, use `failFeedback` with `feedbackId` and a concrete `reason`. Preserve the requested requirement and ask for missing information through the main agent. Do not spin or silently discard the note. Continue waiting for other feedback.
4. On `idle`, wait again while the checkpoint is active. On `finished`, return the handoff to the main agent for discovery continuation. On `stopped` or user stop, exit. Do not reopen or retry unfinished notes automatically.

Only one consumer should wait per project. A stale revision requires reading and reconciling the latest state. `stop` ends a preview without claiming the checkpoint completed. Finish and MCP disconnect stop the server and leave interrupted notes retryable; the user can explicitly reopen later.

MCP does not universally wake idle hosts. Verify the delegated agent can use the tools and keep running in the background; a child agent does not necessarily inherit MCP access. If the host cannot support this, explain the limitation and use an explicitly foreground review loop or manual CLI integration. Never claim automatic background processing when no consumer is active.

## Native Pi and CLI

Pi preview actions create their own dedicated restricted Pi RPC worker, so do not add a second host consumer. The default CLI `preview` does the same and needs an installed, authenticated Pi on PATH. `FORMATIVE_PI_COMMAND` can select an alternate executable. See [prototype.md](prototype.md) for manual CLI events and worker behavior.

The interview and written plan need no server. Preserve discovery notes, the source plan, explicit user choices, and the distinction between finishing a prototype checkpoint and approving product scope.
