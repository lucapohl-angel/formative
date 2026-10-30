# Extending the catalog

Search first, compose second, adapt an existing specialist library third, and create a component only for a concrete gap. Do not install a large library merely to obtain a control already present. Optional packs should load only when used.

Project-local custom components consist of a TSX implementation and JSON manifest inside the user's project. The manifest declares name/version, property JSON schema, example values, slots, events, writable bindings, supported states, design roles, source, and license. Use the RatingInput example in `examples/workspace/custom/` as the smallest reference.

Import shared React, ActionButton, and useBoundProp from `@formative/runtime`. Use shared `f-` classes and semantic primitive variants. The custom build intentionally supports only that runtime import; a new vendor dependency requires a reviewed core adapter. Do not expose raw styling or executable strings through the manifest.

Register using:

```bash
node /path/to/formative/bin/formative.mjs register --project /path/to/project --file /path/to/project/custom/RatingInput.tsx --manifest /path/to/project/custom/rating.manifest.json
```

Registration checks the property schema, example, TypeScript, allowed imports, and design-source conventions, then stores a hashed browser bundle locally. This is trusted developer code, not an untrusted-code sandbox. Open its catalog specimen, test pointer/keyboard interaction and theme consistency, and add meaningful behavior tests before admitting it into an accepted prototype.

Reference a registered component through `customComponents: [{"name":"RatingInput","version":"1.0.0"}]`. Reuse the same component in a second screen or project to prove its contract is general enough before promoting it to the shared catalog. Core names cannot be shadowed.

Every component must remain legible with long content and narrow widths, preserve semantic labels/focus, and use shared design roles in all applicable states. OS-owned file dialogs cannot be themed; app-owned menus and calendars can and should be.
