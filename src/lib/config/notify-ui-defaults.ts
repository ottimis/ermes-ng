import { NotifySeverity } from '../models/notification.model';
import {
  NotifyTheme,
  NotifyThemeBadge,
  NotifyThemeColors,
  NotifyThemeLayout,
  NotifyUiConfig,
  NotifyUiIcons,
  NotifyUiLabels,
} from './notify-ui-config';

export const NOTIFY_UI_DEFAULT_THEME = {
  colors: {
    primary:       '#1e40af',
    primaryFg:     '#ffffff',
    surface:       '#ffffff',
    surfaceFg:     '#0f172a',
    textSecondary: '#64748b',
    badgeBg:       '#0d9488',
    badgeFg:       '#eef2ff',
    emptyIconBg:   '#dbeafe',
    emptyIconFg:   '#1d4ed8',
    severity: {
      error:   '#ef4444',
      warning: '#f59e0b',
      success: '#22c55e',
      info:    '#3b82f6',
    },
  },
  radius:  { sm: '0.25rem', md: '1rem', full: '9999px' },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem' },
  typography: {
    fontFamily: 'inherit',
    fontSizeSm: '0.875rem',
    fontSizeMd: '1rem',
    fontWeightBold: '600',
  },
  darkMode: 'auto' as const,
};

export const NOTIFY_UI_DEFAULT_DARK: NotifyThemeColors = {
  surface: '#1e293b',
  surfaceFg: '#f1f5f9',
  textSecondary: '#94a3b8',
  emptyIconBg: '#1e3a8a',
  emptyIconFg: '#bfdbfe',
};

/** Italian defaults: the strings the library shipped hard-coded up to 0.2. */
export const NOTIFY_UI_DEFAULT_LABELS: NotifyUiLabels = {
  bellTooltip: 'Notifiche',
  bellAriaLabel: 'Notifiche, {count} non lette',
  panelTitle: 'Notifiche',
  markAllRead: 'Segna tutte come lette',
  close: 'Chiudi',
  unread: 'Non letta',
  emptyTitle: 'Nessuna notifica',
  emptyBody: 'Le notifiche che riceverai saranno visualizzate qui.',
  toastDismiss: 'Chiudi',
};

export const NOTIFY_UI_DEFAULT_LAYOUT: Required<Omit<NotifyThemeLayout, 'badge'>> & {
  badge: Required<NotifyThemeBadge>;
} = {
  header: 'filled',
  severityIcon: 'solid',
  badge: { shape: 'pill', placement: 'inline', size: '18px', offset: '-4px' },
};

/** Heroicons names as registered by Fuse: the icons the library used up to 0.2. */
export const NOTIFY_UI_DEFAULT_ICONS: Required<Omit<NotifyUiIcons, 'severity'>> & {
  severity: Record<NotifySeverity, string>;
} = {
  bell: 'heroicons_outline:bell',
  close: 'heroicons_solid:x-mark',
  markAllRead: 'heroicons_solid:envelope-open',
  empty: 'heroicons_outline:bell',
  severity: {
    error: 'heroicons_solid:exclamation-triangle',
    warning: 'heroicons_solid:exclamation-circle',
    success: 'heroicons_solid:check-circle',
    info: 'heroicons_solid:bell',
  },
};

export const NOTIFY_DEFAULT_DATA_EVENT_NAME = 'data.event';
export const NOTIFY_DEFAULT_DATE_FORMAT = 'dd MMM, HH:mm';

const BRIDGE_KEYS = ['primary', 'primaryFg', 'surface', 'textSecondary'] as const;

const FUSE_BRIDGE_COLORS: NotifyThemeColors = {
  primary: 'var(--fuse-primary)',
  primaryFg: 'var(--fuse-on-primary)',
  surface: 'var(--fuse-bg-card)',
  textSecondary: 'var(--fuse-text-secondary)',
};

/** `theme.colors` key → CSS custom property. Nested `severity.*` handled separately. */
const COLOR_VARS: Record<Exclude<keyof NotifyThemeColors, 'severity'>, string> = {
  primary:        '--ermes-color-primary',
  primaryFg:      '--ermes-color-primary-fg',
  surface:        '--ermes-color-surface',
  surfaceFg:      '--ermes-color-surface-fg',
  textSecondary:  '--ermes-color-text-secondary',
  badgeBg:        '--ermes-color-badge-bg',
  badgeFg:        '--ermes-color-badge-fg',
  emptyIconBg:    '--ermes-color-empty-icon-bg',
  emptyIconFg:    '--ermes-color-empty-icon-fg',
  panelBorder:    '--ermes-color-panel-border',
  headerBg:       '--ermes-color-header-bg',
  headerFg:       '--ermes-color-header-fg',
  headerBorder:   '--ermes-color-header-border',
  rowBg:          '--ermes-color-row-bg',
  rowBgHover:     '--ermes-color-row-bg-hover',
  rowDivider:     '--ermes-color-row-divider',
  severityIconFg: '--ermes-color-severity-icon-fg',
  scrollbarThumb: '--ermes-color-scrollbar-thumb',
  scrollbarTrack: '--ermes-color-scrollbar-track',
  badgeBorder:    '--ermes-color-badge-border',
};

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge<T>(...sources: Array<Partial<T> | undefined>): T {
  const out: Record<string, unknown> = {};
  for (const src of sources) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src)) {
      if (isObject(v) && isObject(out[k])) {
        out[k] = deepMerge(out[k] as Record<string, unknown>, v);
      } else if (v !== undefined) {
        out[k] = v;
      }
    }
  }
  return out as T;
}

/** The element that receives the `--ermes-*` variables (see `NotifyTheme.cssVarsTarget`). */
export function cssVarsHost(doc: Document, theme: NotifyTheme | undefined): HTMLElement {
  return theme?.cssVarsTarget === 'body' && doc.body ? doc.body : doc.documentElement;
}

function hasFuseVars(el: Element): boolean {
  return getComputedStyle(el).getPropertyValue('--fuse-primary').trim().length > 0;
}

/**
 * Fuse detection **on the element that will host our variables**: a `var(--fuse-*)` written
 * where Fuse's variables do not exist resolves to nothing, so detecting Fuse elsewhere would
 * only produce an invalid palette. Fuse declares on `body`; with the default `cssVarsTarget`
 * (`root`) the bridge therefore stays off and a one-time warning explains how to turn it on.
 */
export function detectFuse(
  doc: Document,
  host: HTMLElement = doc.documentElement,
  explicit: NotifyThemeColors | undefined = undefined,
): boolean {
  if (hasFuseVars(host)) return true;
  // A consumer that already sets the colours the bridge would set does not need the bridge:
  // no warning for them.
  const coversBridge = !!explicit && BRIDGE_KEYS.every((k) => !!explicit[k]);
  if (!coversBridge && host === doc.documentElement && doc.body && hasFuseVars(doc.body)) {
    warnOnce(
      "[ermes-ng] Fuse theme detected on <body> but --ermes-* variables are written on <html>: " +
        "the Fuse bridge cannot resolve there. Set theme.cssVarsTarget = 'body' in provideNotifyUi().",
    );
  }
  return false;
}

const warned = new Set<string>();
function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  if (typeof console !== 'undefined') console.warn(message);
}

export function resolveBridgeColors(
  doc: Document,
  bridgeMode: NotifyTheme['themeBridge'] | undefined,
  host: HTMLElement = doc.documentElement,
  explicit: NotifyThemeColors | undefined = undefined,
): NotifyThemeColors {
  if (bridgeMode === 'standalone') return {};
  if (bridgeMode === 'fuse') return FUSE_BRIDGE_COLORS;
  return detectFuse(doc, host, explicit) ? FUSE_BRIDGE_COLORS : {};
}

export function resolveEffectiveTheme(
  doc: Document,
  user: NotifyTheme | undefined,
): NotifyTheme {
  const host = cssVarsHost(doc, user);
  const bridge = resolveBridgeColors(doc, user?.themeBridge, host, user?.colors);
  return deepMerge<NotifyTheme>(
    NOTIFY_UI_DEFAULT_THEME as unknown as NotifyTheme,
    { colors: bridge },
    user,
  );
}

/** Labels with the Italian defaults filled in for every key the consumer left out. */
export function resolveLabels(config: Pick<NotifyUiConfig, 'labels'> | null | undefined): NotifyUiLabels {
  return { ...NOTIFY_UI_DEFAULT_LABELS, ...(config?.labels ?? {}) };
}

/** Icon names with the Heroicons defaults filled in for every key the consumer left out. */
export function resolveIcons(config: Pick<NotifyUiConfig, 'icons'> | null | undefined): typeof NOTIFY_UI_DEFAULT_ICONS {
  const user = config?.icons ?? {};
  return {
    bell: user.bell ?? NOTIFY_UI_DEFAULT_ICONS.bell,
    close: user.close ?? NOTIFY_UI_DEFAULT_ICONS.close,
    markAllRead: user.markAllRead ?? NOTIFY_UI_DEFAULT_ICONS.markAllRead,
    empty: user.empty ?? NOTIFY_UI_DEFAULT_ICONS.empty,
    severity: { ...NOTIFY_UI_DEFAULT_ICONS.severity, ...(user.severity ?? {}) },
  };
}

/** Layout variants with defaults filled in. */
export function resolveLayout(theme: NotifyTheme | undefined): typeof NOTIFY_UI_DEFAULT_LAYOUT {
  return {
    header: theme?.layout?.header ?? NOTIFY_UI_DEFAULT_LAYOUT.header,
    severityIcon: theme?.layout?.severityIcon ?? NOTIFY_UI_DEFAULT_LAYOUT.severityIcon,
    badge: { ...NOTIFY_UI_DEFAULT_LAYOUT.badge, ...(theme?.layout?.badge ?? {}) },
  };
}

function applyColors(style: CSSStyleDeclaration, c: NotifyThemeColors): void {
  for (const key of Object.keys(COLOR_VARS) as Array<keyof typeof COLOR_VARS>) {
    const value = c[key];
    if (value) style.setProperty(COLOR_VARS[key], value);
  }
  const sev = c.severity ?? {};
  if (sev.error)   style.setProperty('--ermes-color-severity-error', sev.error);
  if (sev.warning) style.setProperty('--ermes-color-severity-warning', sev.warning);
  if (sev.success) style.setProperty('--ermes-color-severity-success', sev.success);
  if (sev.info)    style.setProperty('--ermes-color-severity-info', sev.info);
}

export function applyCssVars(doc: Document, theme: NotifyTheme): void {
  const root = cssVarsHost(doc, theme).style;
  applyColors(root, theme.colors ?? {});

  const r = theme.radius ?? {};
  if (r.sm)   root.setProperty('--ermes-radius-sm', r.sm);
  if (r.md)   root.setProperty('--ermes-radius-md', r.md);
  if (r.full) root.setProperty('--ermes-radius-full', r.full);

  const s = theme.spacing ?? {};
  if (s.xs) root.setProperty('--ermes-spacing-xs', s.xs);
  if (s.sm) root.setProperty('--ermes-spacing-sm', s.sm);
  if (s.md) root.setProperty('--ermes-spacing-md', s.md);
  if (s.lg) root.setProperty('--ermes-spacing-lg', s.lg);

  const t = theme.typography ?? {};
  if (t.fontFamily)     root.setProperty('--ermes-font-family', t.fontFamily);
  if (t.fontSizeSm)     root.setProperty('--ermes-font-size-sm', t.fontSizeSm);
  if (t.fontSizeMd)     root.setProperty('--ermes-font-size-md', t.fontSizeMd);
  if (t.fontWeightBold) root.setProperty('--ermes-font-weight-bold', t.fontWeightBold);

  const badge = resolveLayout(theme).badge;
  root.setProperty('--ermes-badge-size', badge.size);
  root.setProperty('--ermes-badge-offset', badge.offset);
}

function applyDarkColors(doc: Document, theme: NotifyTheme, dark: NotifyThemeColors): void {
  applyColors(cssVarsHost(doc, theme).style, dark);
}

/** Removes the listener registered by `applyDarkMode`; `null` when none was registered. */
export type NotifyDarkModeTeardown = (() => void) | null;

export function applyDarkMode(doc: Document, theme: NotifyTheme): NotifyDarkModeTeardown {
  const strategy = theme.darkMode ?? 'auto';
  if (strategy === 'never') return null;
  const dark = deepMerge<NotifyThemeColors>(NOTIFY_UI_DEFAULT_DARK, theme.dark);
  if (strategy === 'always') {
    applyDarkColors(doc, theme, dark);
    return null;
  }
  if (typeof window === 'undefined' || !window.matchMedia) return null;
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const refresh = (matches: boolean) => {
    if (matches) applyDarkColors(doc, theme, dark);
    else applyCssVars(doc, theme);
  };
  refresh(mql.matches);
  const listener = (e: MediaQueryListEvent) => refresh(e.matches);
  mql.addEventListener('change', listener);
  return () => mql.removeEventListener('change', listener);
}

const TOAST_STYLE_ID = 'ermes-toast-styles';

/**
 * Toast colors, injected once as a `<style>`. `nonce` is forwarded to the element for
 * consumers with a Content-Security-Policy that forbids inline styles without a nonce
 * (Angular's `CSP_NONCE`).
 */
export function injectToastStyles(doc: Document, nonce?: string | null): void {
  if (doc.getElementById(TOAST_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = TOAST_STYLE_ID;
  if (nonce) style.setAttribute('nonce', nonce);
  style.textContent = `
.cdk-overlay-container .mat-mdc-snack-bar-container.notify-toast--error   { --mdc-snackbar-container-color: var(--ermes-color-severity-error,   #ef4444); }
.cdk-overlay-container .mat-mdc-snack-bar-container.notify-toast--warning { --mdc-snackbar-container-color: var(--ermes-color-severity-warning, #f59e0b); }
.cdk-overlay-container .mat-mdc-snack-bar-container.notify-toast--success { --mdc-snackbar-container-color: var(--ermes-color-severity-success, #22c55e); }
.cdk-overlay-container .mat-mdc-snack-bar-container.notify-toast--info    { --mdc-snackbar-container-color: var(--ermes-color-severity-info,    #3b82f6); }
  `.trim();
  doc.head.appendChild(style);
}
