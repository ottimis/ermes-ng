import { NotifyTheme, NotifyThemeColors } from './notify-ui-config';

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

const FUSE_BRIDGE_COLORS: NotifyThemeColors = {
  primary: 'var(--fuse-primary)',
  primaryFg: 'var(--fuse-on-primary)',
  surface: 'var(--fuse-bg-card)',
  textSecondary: 'var(--fuse-text-secondary)',
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

export function detectFuse(doc: Document): boolean {
  const probe = getComputedStyle(doc.documentElement)
    .getPropertyValue('--fuse-primary')
    .trim();
  return probe.length > 0;
}

export function resolveBridgeColors(
  doc: Document,
  bridgeMode: NotifyTheme['themeBridge'] | undefined,
): NotifyThemeColors {
  if (bridgeMode === 'standalone') return {};
  if (bridgeMode === 'fuse') return FUSE_BRIDGE_COLORS;
  return detectFuse(doc) ? FUSE_BRIDGE_COLORS : {};
}

export function resolveEffectiveTheme(
  doc: Document,
  user: NotifyTheme | undefined,
): NotifyTheme {
  const bridge = resolveBridgeColors(doc, user?.themeBridge);
  return deepMerge<NotifyTheme>(
    NOTIFY_UI_DEFAULT_THEME as unknown as NotifyTheme,
    { colors: bridge },
    user,
  );
}

export function applyCssVars(doc: Document, theme: NotifyTheme): void {
  const root = doc.documentElement.style;
  const c = theme.colors ?? {};
  if (c.primary)        root.setProperty('--ermes-color-primary', c.primary);
  if (c.primaryFg)      root.setProperty('--ermes-color-primary-fg', c.primaryFg);
  if (c.surface)        root.setProperty('--ermes-color-surface', c.surface);
  if (c.surfaceFg)      root.setProperty('--ermes-color-surface-fg', c.surfaceFg);
  if (c.textSecondary)  root.setProperty('--ermes-color-text-secondary', c.textSecondary);
  if (c.badgeBg)        root.setProperty('--ermes-color-badge-bg', c.badgeBg);
  if (c.badgeFg)        root.setProperty('--ermes-color-badge-fg', c.badgeFg);
  if (c.emptyIconBg)    root.setProperty('--ermes-color-empty-icon-bg', c.emptyIconBg);
  if (c.emptyIconFg)    root.setProperty('--ermes-color-empty-icon-fg', c.emptyIconFg);
  const sev = c.severity ?? {};
  if (sev.error)   root.setProperty('--ermes-color-severity-error', sev.error);
  if (sev.warning) root.setProperty('--ermes-color-severity-warning', sev.warning);
  if (sev.success) root.setProperty('--ermes-color-severity-success', sev.success);
  if (sev.info)    root.setProperty('--ermes-color-severity-info', sev.info);

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
}

function applyDarkColors(doc: Document, dark: NotifyThemeColors): void {
  const root = doc.documentElement.style;
  if (dark.primary)       root.setProperty('--ermes-color-primary', dark.primary);
  if (dark.primaryFg)     root.setProperty('--ermes-color-primary-fg', dark.primaryFg);
  if (dark.surface)       root.setProperty('--ermes-color-surface', dark.surface);
  if (dark.surfaceFg)     root.setProperty('--ermes-color-surface-fg', dark.surfaceFg);
  if (dark.textSecondary) root.setProperty('--ermes-color-text-secondary', dark.textSecondary);
  if (dark.badgeBg)       root.setProperty('--ermes-color-badge-bg', dark.badgeBg);
  if (dark.badgeFg)       root.setProperty('--ermes-color-badge-fg', dark.badgeFg);
  if (dark.emptyIconBg)   root.setProperty('--ermes-color-empty-icon-bg', dark.emptyIconBg);
  if (dark.emptyIconFg)   root.setProperty('--ermes-color-empty-icon-fg', dark.emptyIconFg);
}

export function applyDarkMode(doc: Document, theme: NotifyTheme): void {
  const strategy = theme.darkMode ?? 'auto';
  if (strategy === 'never') return;
  const dark = deepMerge<NotifyThemeColors>(NOTIFY_UI_DEFAULT_DARK, theme.dark);
  if (strategy === 'always') {
    applyDarkColors(doc, dark);
    return;
  }
  if (typeof window === 'undefined' || !window.matchMedia) return;
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const refresh = (matches: boolean) => {
    if (matches) applyDarkColors(doc, dark);
    else applyCssVars(doc, theme);
  };
  refresh(mql.matches);
  mql.addEventListener('change', (e) => refresh(e.matches));
}

const TOAST_STYLE_ID = 'ermes-toast-styles';

export function injectToastStyles(doc: Document): void {
  if (doc.getElementById(TOAST_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = TOAST_STYLE_ID;
  style.textContent = `
.cdk-overlay-container .mat-mdc-snack-bar-container.notify-toast--error   { --mdc-snackbar-container-color: var(--ermes-color-severity-error,   #ef4444); }
.cdk-overlay-container .mat-mdc-snack-bar-container.notify-toast--warning { --mdc-snackbar-container-color: var(--ermes-color-severity-warning, #f59e0b); }
.cdk-overlay-container .mat-mdc-snack-bar-container.notify-toast--success { --mdc-snackbar-container-color: var(--ermes-color-severity-success, #22c55e); }
.cdk-overlay-container .mat-mdc-snack-bar-container.notify-toast--info    { --mdc-snackbar-container-color: var(--ermes-color-severity-info,    #3b82f6); }
  `.trim();
  doc.head.appendChild(style);
}
