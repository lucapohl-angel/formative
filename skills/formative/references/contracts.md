# Project records

The authoritative schema is `src/contracts/project.ts` in the Formative installation. Read a focused portion or a small fixture when needed. Use `read` to obtain the current project and revision. `apply --file` expects the project object, not the enclosing snapshot.

Project fields: `schemaVersion: 1`, `catalogVersion: "1.0.0"`, stable `id`, `title`, `summary`, `goals`, `journeys`, `features`, `decisions`, `screens`, `scenarios`, `theme`, and `customComponents`. IDs begin with a letter and contain letters, numbers, hyphens, or underscores.

A screen contains `id`, `title`, `featureIds`, `links` mapping element IDs to feature IDs, and `spec: {root, elements}`. Each element contains `type`, `props`, optional `children`, optional `visible`, and optional `on`. It must be reachable exactly once from the root. Component type and properties must match the catalog.

Use json-render bindings: `{"$state":"/members"}` reads a value, and `{"$bindState":"/invite/email"}` binds a writable property. Paths must exist in every scenario. Only catalog-declared writable properties accept a write binding. Values remain inside the simulation store, separate from product decisions.

An event uses `{"action":"set","params":{"path":"/inviteOpen","value":true}}`. Available actions are set, navigate, reset, notify, record, and submit. Query `src/catalog/definitions.ts` for exact action schemas. `submit` copies a form object to an optional list `target` or a separate saved object at `save`; the scenario controls success/failure. Failure is repeatable within that scenario; switching scenarios intentionally resets input. Do not promise a successful retry within a fixed failure scenario. Use explicit mock-state actions when the prototype question requires a recoverable outcome. Form supports `submitLabel` and `resetLabel`. Form components perform browser validation before emitting submit. `record` supports add/update/remove. `reset` resets the scenario, not the saved project.

Each scenario has `id`, `title`, `description`, starting `screen`, `outcome` success/failure, and complete `state`. Optional `controls` are shell-only simulation actions: `{id,label,screen?,binding:{action,params}}`. Use these for simulating another actor or an external event, keeping testing controls outside the product UI. Avoid real credentials and personal data in fixtures.

Revision snapshots are immutable after commit. Restoration creates a new revision. Generated `.formative/exports/requirements.md` and `requirements.json` are snapshots; editing them does not update project state. The agent writes `plan.md` separately using the project records and unprototyped discoveries. Discovery notes can exist before a renderer project does.

Feature and decision records may carry `scope: "product" | "prototype-only"` (omitted means product). Keep visual experiments out of product records. Export omits prototype-only records and the full screen/scenario/theme/component specification.
