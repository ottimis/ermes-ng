import { NOTIFY_UI_DEFAULT_LAYOUT, NOTIFY_UI_DEFAULT_THEME } from './notify-ui-defaults';

/**
 * Internal CSS tokens shared by the components.
 *
 * Every `--ermes-*` variable the components read has a fallback equal to the default theme. In
 * 0.2 those fallbacks were hex literals repeated in every rule, in two components: a default
 * changed in `NOTIFY_UI_DEFAULT_THEME` had to be chased through the stylesheets. Here the
 * fallback is written **once per token**, from the same constant, as a private `--_ermes-*`
 * variable on the host; the rules only ever read the private variable.
 *
 * The private variables are set on `:host`, so a consumer override of `--ermes-*` anywhere up
 * the tree (root, body, a wrapper) still wins: the private one is derived from it.
 */
export function notifyHostTokensCss(): string {
  const c = NOTIFY_UI_DEFAULT_THEME.colors;
  const r = NOTIFY_UI_DEFAULT_THEME.radius;
  const t = NOTIFY_UI_DEFAULT_THEME.typography;
  const badge = NOTIFY_UI_DEFAULT_LAYOUT.badge;
  const tokens: Array<[string, string, string]> = [
    // [private name, public variable, default]
    ['primary', '--ermes-color-primary', c.primary],
    ['primary-fg', '--ermes-color-primary-fg', c.primaryFg],
    ['surface', '--ermes-color-surface', c.surface],
    ['surface-fg', '--ermes-color-surface-fg', c.surfaceFg],
    ['text-secondary', '--ermes-color-text-secondary', c.textSecondary],
    ['badge-bg', '--ermes-color-badge-bg', c.badgeBg],
    ['badge-fg', '--ermes-color-badge-fg', c.badgeFg],
    ['badge-border', '--ermes-color-badge-border', 'transparent'],
    ['empty-icon-bg', '--ermes-color-empty-icon-bg', c.emptyIconBg],
    ['empty-icon-fg', '--ermes-color-empty-icon-fg', c.emptyIconFg],
    ['severity-error', '--ermes-color-severity-error', c.severity.error],
    ['severity-warning', '--ermes-color-severity-warning', c.severity.warning],
    ['severity-success', '--ermes-color-severity-success', c.severity.success],
    ['severity-info', '--ermes-color-severity-info', c.severity.info],
    ['panel-border', '--ermes-color-panel-border', 'transparent'],
    ['row-bg', '--ermes-color-row-bg', 'transparent'],
    ['row-bg-hover', '--ermes-color-row-bg-hover', 'rgba(0, 0, 0, 0.03)'],
    ['row-divider', '--ermes-color-row-divider', '#e5e7eb'],
    ['scrollbar-thumb', '--ermes-color-scrollbar-thumb', 'rgba(0, 0, 0, 0.24)'],
    ['scrollbar-track', '--ermes-color-scrollbar-track', 'transparent'],
    ['radius-md', '--ermes-radius-md', r.md],
    ['radius-full', '--ermes-radius-full', r.full],
    ['font-family', '--ermes-font-family', t.fontFamily],
    ['font-size-sm', '--ermes-font-size-sm', t.fontSizeSm],
    ['font-size-md', '--ermes-font-size-md', t.fontSizeMd],
    ['font-weight-bold', '--ermes-font-weight-bold', t.fontWeightBold],
    ['badge-size', '--ermes-badge-size', badge.size],
    ['badge-offset', '--ermes-badge-offset', badge.offset],
  ];
  const lines = tokens.map(([name, pub, def]) => `  --_ermes-${name}: var(${pub}, ${def});`);
  return `:host {\n${lines.join('\n')}\n}`;
}

/**
 * The `:host { --_ermes-*: var(--ermes-*, default) }` block used by the components.
 *
 * It is a **literal**, not `notifyHostTokensCss()`: the Angular compiler must resolve component
 * `styles` statically and cannot evaluate a function. The literal is kept equal to the generated
 * value by a unit test (`notify-ui-defaults.spec.ts`): change a default in `NOTIFY_UI_DEFAULT_THEME`
 * and the test tells you to regenerate this block (run `notifyHostTokensCss()` and paste).
 */
export const NOTIFY_HOST_TOKENS_CSS = `:host {
  --_ermes-primary: var(--ermes-color-primary, #1e40af);
  --_ermes-primary-fg: var(--ermes-color-primary-fg, #ffffff);
  --_ermes-surface: var(--ermes-color-surface, #ffffff);
  --_ermes-surface-fg: var(--ermes-color-surface-fg, #0f172a);
  --_ermes-text-secondary: var(--ermes-color-text-secondary, #64748b);
  --_ermes-badge-bg: var(--ermes-color-badge-bg, #0d9488);
  --_ermes-badge-fg: var(--ermes-color-badge-fg, #eef2ff);
  --_ermes-badge-border: var(--ermes-color-badge-border, transparent);
  --_ermes-empty-icon-bg: var(--ermes-color-empty-icon-bg, #dbeafe);
  --_ermes-empty-icon-fg: var(--ermes-color-empty-icon-fg, #1d4ed8);
  --_ermes-severity-error: var(--ermes-color-severity-error, #ef4444);
  --_ermes-severity-warning: var(--ermes-color-severity-warning, #f59e0b);
  --_ermes-severity-success: var(--ermes-color-severity-success, #22c55e);
  --_ermes-severity-info: var(--ermes-color-severity-info, #3b82f6);
  --_ermes-panel-border: var(--ermes-color-panel-border, transparent);
  --_ermes-row-bg: var(--ermes-color-row-bg, transparent);
  --_ermes-row-bg-hover: var(--ermes-color-row-bg-hover, rgba(0, 0, 0, 0.03));
  --_ermes-row-divider: var(--ermes-color-row-divider, #e5e7eb);
  --_ermes-scrollbar-thumb: var(--ermes-color-scrollbar-thumb, rgba(0, 0, 0, 0.24));
  --_ermes-scrollbar-track: var(--ermes-color-scrollbar-track, transparent);
  --_ermes-radius-md: var(--ermes-radius-md, 1rem);
  --_ermes-radius-full: var(--ermes-radius-full, 9999px);
  --_ermes-font-family: var(--ermes-font-family, inherit);
  --_ermes-font-size-sm: var(--ermes-font-size-sm, 0.875rem);
  --_ermes-font-size-md: var(--ermes-font-size-md, 1rem);
  --_ermes-font-weight-bold: var(--ermes-font-weight-bold, 600);
  --_ermes-badge-size: var(--ermes-badge-size, 18px);
  --_ermes-badge-offset: var(--ermes-badge-offset, -4px);
}`;
