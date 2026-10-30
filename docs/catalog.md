# Component inventory

Generated from the installed manifests. Use `formative catalog --name NAME` for exact properties, events, bindings, and examples. The browser Components view renders each admitted entry with the same theme.

| Component | Pack | Implementation approach | Behavior |
|---|---|---|---|
| Container | foundation | Formative implementation with shared primitives | Responsive content region |
| Stack | foundation | Formative implementation with shared primitives | Responsive vertical or horizontal layout |
| Grid | foundation | Formative implementation with shared primitives | Responsive grid that stacks on small screens |
| Panel | foundation | Formative implementation with shared primitives | Group related content |
| Heading | foundation | Formative implementation with shared primitives | Semantic heading |
| Text | foundation | Formative implementation with shared primitives | Plain text; never HTML |
| Link | foundation | Formative implementation with shared primitives | Link to a screen or safe web address |
| Image | foundation | Formative implementation with shared primitives | Image with descriptive alternative text |
| Icon | foundation | Formative implementation with shared primitives | Icon from the shared Lucide set |
| Separator | foundation | Formative implementation with shared primitives | Separate content groups |
| Button | controls | Formative implementation with shared primitives | An action with a shared visual variant |
| Input | controls | Formative implementation with shared primitives | Labelled input with local validation |
| Textarea | controls | Formative implementation with shared primitives | Autosizing multiline field |
| Select | controls | Radix behavior with Formative styling | Themed selection menu with keyboard navigation |
| Combobox | controls | Radix behavior with Formative styling | Searchable selection list |
| Checkbox | controls | Formative implementation with shared primitives | Boolean choice |
| Switch | controls | Formative implementation with shared primitives | On or off setting |
| Radio | controls | Formative implementation with shared primitives | Choose one option |
| Slider | controls | Formative implementation with shared primitives | Pointer and keyboard range control |
| DatePicker | controls | Radix behavior with Formative styling | Themed calendar selection; stores YYYY-MM-DD |
| FilePicker | controls | Formative implementation with shared primitives | Select local file names for a simulation; no upload |
| Navigation | navigation | Formative implementation with shared primitives | Screen navigation |
| Breadcrumbs | navigation | Formative implementation with shared primitives | Path through screens |
| Tabs | navigation | Formative implementation with shared primitives | Tab buttons with a bound active value; pair with visible child content |
| Accordion | navigation | Formative implementation with shared primitives | Expand related content without leaving the page |
| Dialog | navigation | Radix behavior with Formative styling | Focus-managed modal dialog |
| Drawer | navigation | Radix behavior with Formative styling | Focus-managed side panel |
| Menu | navigation | Radix behavior with Formative styling | Action menu; selected value is bound before change |
| Tooltip | navigation | Radix behavior with Formative styling | Keyboard-accessible supplementary description |
| Popover | navigation | Radix behavior with Formative styling | Anchored supplementary content |
| Table | data | Formative implementation with shared primitives | Searchable sortable paginated table; selection optional, not a spreadsheet |
| List | data | Formative implementation with shared primitives | List with optional selection |
| Avatar | data | Formative implementation with shared primitives | Initials from a display name |
| Badge | data | Formative implementation with shared primitives | Compact status label |
| Alert | data | Formative implementation with shared primitives | Actionable success, error, or information message |
| Progress | data | Formative implementation with shared primitives | Labelled operation progress |
| Empty | data | Formative implementation with shared primitives | Empty state with a useful next action in children |
| Skeleton | data | Formative implementation with shared primitives | Loading placeholder for an expected content group |
| Form | patterns | Formative implementation with shared primitives | Validated form with submit and reset; children are fields and actions |
| SettingsSection | patterns | Formative implementation with shared primitives | Consistent settings group with description and child controls |
| SplitView | patterns | Formative implementation with shared primitives | List and detail columns; stacks on narrow screens |
| SearchPanel | patterns | Formative implementation with shared primitives | Search and filter controls in one shared action row |
| Stepper | patterns | Formative implementation with shared primitives | Multi-step form with previous/next navigation and bound step |
| Header | website | Formative implementation with shared primitives | Website header with brand and child navigation |
| Hero | website | Formative implementation with shared primitives | Website introduction with flexible child actions and content |
| FeatureSection | website | Formative implementation with shared primitives | Editorial service or feature group |
| Footer | website | Formative implementation with shared primitives | Website footer with child links |
| SortableBoard | specialist | dnd kit adapter, lazy loaded | Reorder items using pointer or keyboard; mock data only |

## Composition and extensions

Sidebar navigation uses Navigation with vertical orientation. Invitations use the workspace fixture’s Form/Dialog/Table composition. FAQ uses Accordion; inquiry uses Form and fields. SettingsSection and SplitView supply reusable layout patterns. Table supports local search, sort, pagination, and selection; it is not an editable spreadsheet. Files expose local filenames only.

Project-local RatingInput is an additional demonstrated component, not one of the 48 built-ins. Registration, browser interaction, and reuse across two screens are tested. Custom source imports the shared runtime only; richer vendor integrations need a reviewed core adapter. React Flow, Tiptap, native maps, and arbitrary 3D/canvas editors are deferred until a specific prototype requires them.

State metadata describes applicable behavior. Focus/invalid states can be exercised in the specimen; the state chooser offers long content and applicable disabled/read-only/loading variants. Toggle the shell theme and narrow the viewport to inspect consistency. Native file-picker windows are owned by the OS.
