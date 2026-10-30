import { z } from 'zod';
import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react/schema';

export const CATALOG_VERSION = '1.0.0';
const text = z.string();
const optionalText = text.optional();
const size = z.enum(['compact', 'standard', 'comfortable']).default('standard');
const variant = z.enum(['primary', 'secondary', 'quiet', 'danger']).default('secondary');
const gap = z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']).default('md');
const options = z.array(z.object({ label: text, value: text }).strict());
const item = z.object({ id: text, title: text, description: optionalText }).strict();
const field = { label: text, value: z.string().default(''), help: optionalText, placeholder: optionalText,
  required: z.boolean().default(false), disabled: z.boolean().default(false), readOnly: z.boolean().default(false), size };

export interface Manifest {
  props: z.ZodObject<any>; description: string; pack: string; slots: string[]; events: string[];
  bindings: string[]; example: Record<string, unknown>; states: string[]; version: string;
  source: string; license: string; implementation: string; designRoles: string[];
}
function component(pack: string, description: string, props: z.ZodRawShape, example: Record<string, unknown>,
  config: Partial<Manifest> = {}): Manifest {
  const states=[...new Set([...(config.states??['default','narrow','light','dark']),'long-content'])].filter(s=>(s!=='read-only'||'readOnly'in props)&&(s!=='invalid'||'required'in props)&&(s!=='disabled'||'disabled'in props));
  return { props: z.object(props).strict(), pack, description, example, slots: [], events: [], bindings: [],
    version: '1.0.0', source: 'Formative',
    license: 'MIT', implementation: 'src/catalog/components.tsx', designRoles: ['surface', 'text', 'border', 'focus'], ...config, states };
}
const container = { slots: ['default'] };
const inputConfig = { events: ['change'], bindings: ['value'], states: ['default', 'focus', 'disabled', 'read-only', 'invalid', 'light', 'dark', 'narrow'] };

export const manifests: Record<string, Manifest> = {
  Container: component('foundation', 'Responsive content region', { width: z.enum(['narrow', 'content', 'wide', 'full']).default('content'), padding: gap }, { width: 'content' }, container),
  Stack: component('foundation', 'Responsive vertical or horizontal layout', { direction: z.enum(['vertical', 'horizontal']).default('vertical'), gap, align: z.enum(['start', 'center', 'end', 'stretch']).default('stretch'), justify: z.enum(['start', 'between', 'center']).default('start'), wrap: z.boolean().default(true) }, { direction: 'vertical' }, container),
  Grid: component('foundation', 'Responsive grid that stacks on small screens', { columns: z.number().int().min(1).max(6).default(2), gap }, { columns: 2 }, container),
  Panel: component('foundation', 'Group related content', { title: optionalText, description: optionalText }, { title: 'Project details' }, container),
  Heading: component('foundation', 'Semantic heading', { text, level: z.enum(['h1', 'h2', 'h3', 'h4']).default('h2') }, { text: 'Your workspace' }),
  Text: component('foundation', 'Plain text; never HTML', { text, tone: z.enum(['normal', 'muted', 'danger']).default('normal') }, { text: 'Try the complete journey.' }),
  Link: component('foundation', 'Link to a screen or safe web address', { label: text, href: text }, { label: 'Learn more', href: 'https://example.com' }),
  Image: component('foundation', 'Image with descriptive alternative text', { src: text, alt: text, aspect: z.enum(['square', 'wide', 'natural']).default('wide') }, { src: '/sample-landscape.svg', alt: 'Illustrative garden layout' }),
  Icon: component('foundation', 'Icon from the shared Lucide set', { name: z.enum(['plus', 'search', 'check', 'arrow', 'settings', 'users', 'mail', 'folder']), label: optionalText }, { name: 'folder', label: 'Projects' }),
  Separator: component('foundation', 'Separate content groups', {}, {}),
  Button: component('controls', 'An action with a shared visual variant', { label: text, variant, size, disabled: z.boolean().default(false), loading: z.boolean().default(false) }, { label: 'Continue', variant: 'primary' }, { events: ['press'], states: ['default', 'focus', 'hover', 'disabled', 'loading', 'light', 'dark'] }),
  Input: component('controls', 'Labelled input with local validation', { ...field, type: z.enum(['text', 'email', 'password', 'number', 'url', 'search']).default('text'), minLength: z.number().int().min(0).optional() }, { label: 'Email', type: 'email', value: '' }, inputConfig),
  Textarea: component('controls', 'Autosizing multiline field', { ...field, rows: z.number().int().min(2).max(20).default(4) }, { label: 'Message', value: '' }, inputConfig),
  Select: component('controls', 'Themed selection menu with keyboard navigation', { ...field, options }, { label: 'Role', value: 'member', options: [{ label: 'Member', value: 'member' }, { label: 'Admin', value: 'admin' }] }, inputConfig),
  Combobox: component('controls', 'Searchable selection list', { ...field, options }, { label: 'Project', value: '', options: [{ label: 'Website', value: 'website' }, { label: 'App', value: 'app' }] }, inputConfig),
  Checkbox: component('controls', 'Boolean choice', { label: text, value: z.boolean().default(false), help: optionalText, disabled: z.boolean().default(false) }, { label: 'Send email updates', value: true }, inputConfig),
  Switch: component('controls', 'On or off setting', { label: text, value: z.boolean().default(false), help: optionalText, disabled: z.boolean().default(false) }, { label: 'Email notifications', value: true }, inputConfig),
  Radio: component('controls', 'Choose one option', { label: text, value: z.string().default(''), options, disabled: z.boolean().default(false) }, { label: 'Visibility', value: 'private', options: [{ label: 'Private', value: 'private' }, { label: 'Team', value: 'team' }] }, inputConfig),
  Slider: component('controls', 'Pointer and keyboard range control', { label: text, value: z.number().default(50), min: z.number().default(0), max: z.number().default(100), step: z.number().positive().default(1), disabled: z.boolean().default(false) }, { label: 'Preview size', value: 50 }, inputConfig),
  DatePicker: component('controls', 'Themed calendar selection; stores YYYY-MM-DD', { ...field }, { label: 'Due date', value: '2026-10-29' }, inputConfig),
  FilePicker: component('controls', 'Select local file names for a simulation; no upload', { label: text, value: z.array(text).default([]), accept: optionalText, multiple: z.boolean().default(false), disabled: z.boolean().default(false) }, { label: 'Attachments', value: [] }, inputConfig),
  Navigation: component('navigation', 'Screen navigation', { items: options, value: text.default(''), orientation: z.enum(['horizontal', 'vertical']).default('horizontal') }, { items: [{ label: 'Overview', value: 'overview' }, { label: 'Settings', value: 'settings' }], value: 'overview' }, inputConfig),
  Breadcrumbs: component('navigation', 'Path through screens', { items: options }, { items: [{ label: 'Home', value: 'home' }, { label: 'Members', value: 'members' }] }, { events: ['change'], bindings: ['value'] }),
  Tabs: component('navigation', 'Tab buttons with a bound active value; pair with visible child content', { label: text.default('Sections'), items: options, value: text.default('') }, { items: [{ label: 'General', value: 'general' }, { label: 'Activity', value: 'activity' }], value: 'general' }, { ...inputConfig, ...container }),
  Accordion: component('navigation', 'Expand related content without leaving the page', { title: text, open: z.boolean().default(false) }, { title: 'More details' }, { ...container, bindings: ['open'], events: ['change'] }),
  Dialog: component('navigation', 'Focus-managed modal dialog', { title: text, description: optionalText, open: z.boolean().default(false) }, { title: 'Invite a teammate', open: false }, { ...container, bindings: ['open'], events: ['close'], source: 'Radix UI + Formative', license: 'MIT' }),
  Drawer: component('navigation', 'Focus-managed side panel', { title: text, description: optionalText, open: z.boolean().default(false) }, { title: 'Details', open: false }, { ...container, bindings: ['open'], events: ['close'], source: 'Radix UI + Formative', license: 'MIT' }),
  Menu: component('navigation', 'Action menu; selected value is bound before change', { label: text, items: options, value: text.default('') }, { label: 'Actions', items: [{ label: 'Archive', value: 'archive' }] }, { ...inputConfig, source: 'Radix UI + Formative' }),
  Tooltip: component('navigation', 'Keyboard-accessible supplementary description', { label: text, text }, { label: 'Help', text: 'Only invited people can access this workspace.' }, { source: 'Radix UI + Formative' }),
  Popover: component('navigation', 'Anchored supplementary content', { label: text, title: optionalText }, { label: 'Details', title: 'About this setting' }, { ...container, source: 'Radix UI + Formative' }),
  Table: component('data', 'Searchable sortable paginated table; children are actions beside search; selection optional', { columns: z.array(z.object({ key: text, label: text }).strict()), rows: z.array(z.record(text, z.union([text, z.number(), z.boolean()]))), search: z.boolean().default(true), pageSize: z.number().int().min(1).max(100).default(5), label: text.default('Records'), value: text.default('') }, { label: 'Members', columns: [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }], rows: [{ id: 'a', name: 'Alex Rivera', role: 'Admin' }] }, { ...inputConfig, ...container }),
  List: component('data', 'List with optional selection', { items: z.array(item), value: text.default('') }, { items: [{ id: 'a', title: 'Project website', description: 'Ready to review' }] }, inputConfig),
  Avatar: component('data', 'Initials from a display name', { name: text }, { name: 'Alex Rivera' }),
  Badge: component('data', 'Compact status label', { text, tone: z.enum(['neutral', 'success', 'warning', 'danger']).default('neutral') }, { text: 'Pending', tone: 'warning' }),
  Alert: component('data', 'Actionable success, error, or information message', { title: text, message: optionalText, tone: z.enum(['info', 'success', 'warning', 'danger']).default('info') }, { title: 'Saved', message: 'Your changes are ready to review.', tone: 'success' }),
  Progress: component('data', 'Labelled operation progress', { label: text, value: z.number().min(0).max(100) }, { label: 'Preparing preview', value: 60 }),
  Empty: component('data', 'Empty state with a useful next action in children', { title: text, description: text }, { title: 'No members yet', description: 'Invite a teammate to start collaborating.' }, container),
  Skeleton: component('data', 'Loading placeholder for an expected content group', { label: text.default('Loading'), lines: z.number().int().min(1).max(8).default(3) }, {}),
  Form: component('patterns', 'Validated form with submit and reset; children are fields and actions', { label: text, submitLabel: text.default('Submit'), resetLabel: text.default('Reset') }, { label: 'Project details' }, { ...container, events: ['submit', 'reset'] }),
  SettingsSection: component('patterns', 'Consistent settings group with description and child controls', { title: text, description: optionalText }, { title: 'Notifications', description: 'Choose which updates you receive.' }, container),
  SplitView: component('patterns', 'List and detail columns; stacks on narrow screens', { ratio: z.enum(['balanced', 'detail']).default('detail') }, {}, container),
  SearchPanel: component('patterns', 'Search and filter controls in one shared action row', { label: text, value: text.default(''), placeholder: optionalText }, { label: 'Search projects', value: '' }, { ...inputConfig, ...container }),
  Stepper: component('patterns', 'Multi-step form with previous/next navigation and bound step', { steps: z.array(text).min(1), value: z.number().int().min(0).default(0) }, { steps: ['Details', 'Preferences', 'Review'], value: 0 }, { ...container, ...inputConfig }),
  Header: component('website', 'Website header with brand and child navigation', { title: text }, { title: 'Fieldwork Gardens' }, container),
  Hero: component('website', 'Website introduction with flexible child actions and content', { title: text, description: text, align: z.enum(['start', 'center']).default('start') }, { title: 'A garden that feels like yours.', description: 'Explore our services and tell us about your space.' }, container),
  FeatureSection: component('website', 'Editorial service or feature group', { title: text, description: optionalText }, { title: 'Care for every season' }, container),
  Footer: component('website', 'Website footer with child links', { text }, { text: 'Fieldwork Gardens · Illustrative prototype' }, container),
  SortableBoard: component('specialist', 'Reorder items using pointer or keyboard; mock data only', { label: text, items: z.array(item), disabled: z.boolean().default(false) }, { label: 'Project tasks', items: [{ id: 'a', title: 'Explore the idea' }, { id: 'b', title: 'Try the prototype' }, { id: 'c', title: 'Review the plan' }] }, { events: ['change'], bindings: ['items'], implementation: 'src/catalog/packs/sortable.tsx', source: 'dnd kit + Formative', license: 'MIT' }),
};

export const actionSchemas = {
  set: z.object({ path: text, value: z.unknown() }).strict(),
  navigate: z.object({ screen: text }).strict(),
  reset: z.object({}).strict(),
  notify: z.object({ message: text, tone: z.enum(['info', 'success', 'danger']).default('info') }).strict(),
  record: z.object({ path: text, operation: z.enum(['add', 'update', 'remove']), value: z.record(text, z.unknown()).optional(), id: optionalText }).strict(),
  submit: z.object({ form: text, target: optionalText, save: optionalText, close: optionalText, message: text, failure: text.default('This simulated operation failed. Your input is preserved. Try again.') }).strict(),
};
export const catalog = defineCatalog(schema, {
  components: Object.fromEntries(Object.entries(manifests).map(([name, m]) => [name, { props: m.props, description: m.description, slots: m.slots, example: m.example }])),
  actions: Object.fromEntries(Object.entries(actionSchemas).map(([name, params]) => [name, { params, description: `Local ${name} simulation action` }])),
});
export function catalogIndex(query = '') {
  return Object.entries(manifests).filter(([name, m]) => `${name} ${m.pack} ${m.description}`.toLowerCase().includes(query.toLowerCase()))
    .map(([name, m]) => ({ name, pack: m.pack, description: m.description, version: m.version, available: true }));
}
export function describeComponent(name: string) {
  const m = manifests[name]; if (!m) throw new Error(`Unknown component ${name}. Search the catalog first.`);
  return { name, ...m, props: z.toJSONSchema(m.props) };
}
