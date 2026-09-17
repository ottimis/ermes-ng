import { describe, expect, it } from 'vitest';
import { afterEach, vi } from 'vitest';
import {
  NOTIFY_UI_DEFAULT_LABELS,
  applyCssVars,
  cssVarsHost,
  detectFuse,
  resolveIcons,
  NOTIFY_UI_DEFAULT_THEME,
  resolveEffectiveTheme,
  resolveLabels,
  resolveLayout,
} from '../notify-ui-defaults';
import { NOTIFY_HOST_TOKENS_CSS, notifyHostTokensCss } from '../notify-ui-styles';

describe('resolveLabels', () => {
  it('fills every missing key with the Italian default', () => {
    const labels = resolveLabels({ labels: { panelTitle: 'Notifications' } });
    expect(labels.panelTitle).toBe('Notifications');
    expect(labels.markAllRead).toBe(NOTIFY_UI_DEFAULT_LABELS.markAllRead);
  });
  it('tolerates a missing config', () => {
    expect(resolveLabels(null)).toEqual(NOTIFY_UI_DEFAULT_LABELS);
  });
});

describe('resolveLayout', () => {
  it('defaults to the 0.2 look', () => {
    const layout = resolveLayout(undefined);
    expect(layout).toEqual({
      header: 'filled',
      severityIcon: 'solid',
      badge: { shape: 'pill', placement: 'inline', size: '18px', offset: '-4px' },
    });
  });
  it('merges partial badge options', () => {
    const layout = resolveLayout({ layout: { badge: { shape: 'circle' } } });
    expect(layout.badge).toEqual({ shape: 'circle', placement: 'inline', size: '18px', offset: '-4px' });
  });
});

describe('theme variables', () => {
  it('writes on <html> by default and on <body> when asked', () => {
    expect(cssVarsHost(document, undefined)).toBe(document.documentElement);
    expect(cssVarsHost(document, { cssVarsTarget: 'body' })).toBe(document.body);
  });

  it('applies the new 0.3 colour tokens and the badge geometry', () => {
    const theme = resolveEffectiveTheme(document, {
      themeBridge: 'standalone',
      colors: { rowDivider: '#123456', panelBorder: 'red' },
      layout: { badge: { size: '20px' } },
    });
    applyCssVars(document, theme);
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--ermes-color-row-divider')).toBe('#123456');
    expect(style.getPropertyValue('--ermes-color-panel-border')).toBe('red');
    expect(style.getPropertyValue('--ermes-badge-size')).toBe('20px');
    expect(style.getPropertyValue('--ermes-color-primary')).toBe('#1e40af');
  });

  it('keeps explicit colours over the Fuse bridge', () => {
    const theme = resolveEffectiveTheme(document, {
      themeBridge: 'fuse',
      colors: { primary: '#4f46e5' },
    });
    expect(theme.colors?.primary).toBe('#4f46e5');
    expect(theme.colors?.surface).toBe('var(--fuse-bg-card)');
  });
});

describe('Fuse detection', () => {
  afterEach(() => {
    document.body.style.removeProperty('--fuse-primary');
    vi.restoreAllMocks();
  });

  it('does not activate the bridge when Fuse is on <body> and vars go to <html>, and warns', () => {
    document.body.style.setProperty('--fuse-primary', '#4f46e5');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(detectFuse(document, document.documentElement)).toBe(false);
    expect(detectFuse(document, document.body)).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it('stays silent when the consumer already sets the bridged colours', () => {
    document.body.style.setProperty('--fuse-primary', '#4f46e5');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    detectFuse(document, document.documentElement, {
      primary: '#000', primaryFg: '#fff', surface: '#111', textSecondary: '#222',
    });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('resolveIcons', () => {
  it('fills missing keys, severity included, with the Heroicons defaults', () => {
    const icons = resolveIcons({ icons: { bell: 'my:bell', severity: { error: 'my:error' } } });
    expect(icons.bell).toBe('my:bell');
    expect(icons.close).toBe('heroicons_solid:x-mark');
    expect(icons.severity.error).toBe('my:error');
    expect(icons.severity.info).toBe('heroicons_solid:bell');
  });
});

describe('host tokens css', () => {
  it('declares every default of the theme exactly once, as a fallback of the public variable', () => {
    const c = NOTIFY_UI_DEFAULT_THEME.colors;
    expect(NOTIFY_HOST_TOKENS_CSS).toContain(`--_ermes-primary: var(--ermes-color-primary, ${c.primary});`);
    expect(NOTIFY_HOST_TOKENS_CSS).toContain(`--_ermes-severity-error: var(--ermes-color-severity-error, ${c.severity.error});`);
    expect(NOTIFY_HOST_TOKENS_CSS).toContain(`--_ermes-badge-size: var(--ermes-badge-size, 18px);`);
    expect(NOTIFY_HOST_TOKENS_CSS.match(/--_ermes-primary:/g)).toHaveLength(1);
    expect(NOTIFY_HOST_TOKENS_CSS.startsWith(':host {')).toBe(true);
  });

  it('the literal used by the components equals the generated block (single source of truth)', () => {
    expect(NOTIFY_HOST_TOKENS_CSS).toBe(notifyHostTokensCss());
  });
});
