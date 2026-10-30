# Architecture decisions

## Product method

Use persistent, dependency-aware interviewing adapted from Matt Pocock's grilling and domain-modeling skills, bundled with attribution and license. Start with an overview, then explore every branch of the agreed scope in manageable rounds. Keep blocked and unprototyped areas in a discovery record. Prototype checkpoints answer experiential questions and return to the interview; finishing a preview is not completing discovery. More features are not automatically progress. Preserve user deferral/stop/delegation choices, provenance, and the separation between approval and implementation.

## One package, independent tools

One TypeScript package owns contracts, catalog, renderer, store, CLI, native Pi adapter, and stdio MCP adapter. No Planboard imports, shared state, or startup dependencies; no separately installed Grill Me skill is required. Generated requirements snapshots under `.formative/exports/` are evidence. The agent writes the final plan in the structure appropriate to the product, incorporating unprototyped discoveries; runtime exports never overwrite it. Revisit packaging only when distributing independent runtimes becomes useful.

## json-render behind a small adapter

Use upstream rendering, state stores, writable bindings, and action dispatch. Formative restricts the accepted expression/action surface and validates the whole project before committing. The adapter maintains stable component identities and live handler indirection because upstream ActionProvider captures initial handlers. Scenarios can therefore replace the simulation store without leaving actions attached to the previous store.

## Coherence through a closed catalog

React adapters use shared semantic CSS and Lucide icons. Radix supplies overlay and select behavior, not a vendor theme. JSON exposes variants and size roles, never raw styles. App and website patterns compose the same foundations. dnd kit is bundled into a lazy board chunk. Node/document editors are not installed or advertised. Project-local components are checked and explicitly registered; promotion to the shared catalog remains a deliberate development change.

## Atomic records and observable feedback

Validate before acquiring the write lock; compare expected revision under the lock. Write and fsync the snapshot, then atomically replace the current pointer. Readers ignore snapshots beyond that pointer. Restore validates the target and commits a new revision without requiring the broken current project to render. Feedback completion derives from the committed revision's feedback IDs, so a crash after commit does not falsely report failure.

Claude Code, Codex, and other MCP hosts use their own dedicated subagent: a cancellable `wait` claims a note, `read` supplies the latest revision, and `apply` commits with feedback IDs. The server starts no model subprocess. Finish wakes the waiter with a discovery handoff; disconnect stops the preview and preserves unfinished notes for retry. An active host wait loop is required; MCP does not promise to wake an idle host.

Default Pi and CLI previews send notes to a dedicated restricted Pi RPC worker. It processes notes serially while the main chat remains available. Abandoned running notes are recovered using the owning process identity. Finish stops worker/server and sends a discovery continuation to Pi or emits it to the waiting CLI host, with a durable `resume-discovery` handoff. Explicit manual mode needs an active host consumer. The server is loopback-only, checks host/origin and a session write token, and never passes provider credentials to the browser.

## Bounded simulation

Forms use native validation and registered actions. `submit` can append a mock record or copy draft data into a saved object; failure preserves both the input and previous saved value. Record identity is generated locally. Scenarios control repeatable outcomes and initial state. Lists, tables, and the board render repeated data; arbitrary native `repeat` expressions are not exposed in this release. Current bindings are `$state` and `$bindState`, plus validated visibility conditions.

## Extensibility boundary

Project-local TSX imports only the shared runtime. Arbitrary third-party imports or custom action runtimes require a reviewed core adapter. Manifest and source checks enforce conventions, but trusted custom code can still misbehave; it is not an untrusted execution sandbox. Registration is local and reuse is demonstrated with a rating control on two screens. First release updates whole validated snapshots; streaming patches and automatic migrations are deferred.
