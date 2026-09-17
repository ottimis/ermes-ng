import { InjectionToken } from '@angular/core';
import { NotifyNotification, NotifySeverity } from '../models/notification.model';

export interface NotifyRouteAction {
  commands: unknown[];
  queryParams?: Record<string, string | number | boolean | null | undefined>;
  fragment?: string;
}

export type NotifyResolver = (notification: NotifyNotification) => NotifyRouteAction | null;

export interface NotifyThemeColors {
  primary?: string;
  primaryFg?: string;
  surface?: string;
  surfaceFg?: string;
  textSecondary?: string;
  badgeBg?: string;
  badgeFg?: string;
  emptyIconBg?: string;
  emptyIconFg?: string;
  severity?: {
    error?: string;
    warning?: string;
    success?: string;
    info?: string;
  };

  // --- added in 0.3.0, all optional; unset = the 0.2 look ---

  /** 1px ring around the dropdown panel. Default: none. */
  panelBorder?: string;
  /** Header background. Default: `primary` (filled header) or transparent (`layout.header: 'plain'`). */
  headerBg?: string;
  /** Header text and icon color. Default: `primaryFg`, or `textSecondary` for a plain header. */
  headerFg?: string;
  /** Header bottom border. Default: none (filled) or `rowDivider` (plain). */
  headerBorder?: string;
  /** Background of each notification row. Default: transparent (the panel surface shows through). */
  rowBg?: string;
  /** Row background under the pointer. Default: a 3% black tint. */
  rowBgHover?: string;
  /** Separator between rows. Default: `#e5e7eb`. */
  rowDivider?: string;
  /** Color of the severity icon glyph. Default: white (solid icons) or the severity color (tinted). */
  severityIconFg?: string;
  /** Scrollbar thumb of the notification list. Default: browser scrollbar. */
  scrollbarThumb?: string;
  /** Scrollbar track of the notification list. Default: transparent. */
  scrollbarTrack?: string;
  /** Border of the unread badge on the bell. Default: none. */
  badgeBorder?: string;
}

export interface NotifyThemeRadius {
  sm?: string;
  md?: string;
  full?: string;
}

export interface NotifyThemeSpacing {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
}

export interface NotifyThemeTypography {
  fontFamily?: string;
  fontSizeSm?: string;
  fontSizeMd?: string;
  fontWeightBold?: string;
}

/** Unread badge geometry (0.3.0). */
export interface NotifyThemeBadge {
  /**
   * `pill` (default, the 0.2 look): grows with the digits.
   * `circle`: fixed circle of `size`; the font shrinks with the digit count (1, 2 or "99+").
   */
  shape?: 'pill' | 'circle';
  /**
   * `inline` (default, the 0.2 look): centered above the icon.
   * `corner`: anchored to the top-right corner of the button, overlapping it by `offset`.
   */
  placement?: 'inline' | 'corner';
  /** Circle diameter when `shape: 'circle'`. Default `18px`. */
  size?: string;
  /** How far the badge overflows the button when `placement: 'corner'`. Default `-4px`. */
  offset?: string;
}

/** Structural variants of the dropdown (0.3.0). Every field defaults to the 0.2 look. */
export interface NotifyThemeLayout {
  /** `filled` (default): header on `primary`. `plain`: transparent header separated by a border. */
  header?: 'filled' | 'plain';
  /**
   * `solid` (default): severity icon on a filled circle with a white glyph.
   * `tinted`: translucent circle (40% of the severity color), 2px border at 50%, glyph in the
   * full severity color. Uses `color-mix()` (Chrome 111+, Safari 16.2+, Firefox 113+); older
   * browsers fall back to `solid`.
   */
  severityIcon?: 'solid' | 'tinted';
  badge?: NotifyThemeBadge;
}

export interface NotifyTheme {
  colors?: NotifyThemeColors;
  radius?: NotifyThemeRadius;
  spacing?: NotifyThemeSpacing;
  typography?: NotifyThemeTypography;
  /** Dark mode strategy. 'auto' follows prefers-color-scheme. Default: 'auto'. */
  darkMode?: 'auto' | 'always' | 'never';
  /** Optional explicit color overrides for dark mode. Falls back to built-in dark palette. */
  dark?: NotifyThemeColors;
  /**
   * Bridge to the consumer's Fuse theme.
   * - 'auto' (default): detects Fuse at runtime via --fuse-primary; if present, maps
   *   primary/primaryFg/surface/textSecondary to var(--fuse-*).
   * - 'fuse': forces the bridge even if Fuse is not detected (useful in tests/SSR).
   * - 'standalone': ignores Fuse and uses public defaults / theme TS / CSS vars only.
   * Explicit `theme.colors.*` always overrides bridge mappings.
   */
  themeBridge?: 'auto' | 'fuse' | 'standalone';
  /**
   * Element that receives the `--ermes-*` custom properties. Default `'root'` (`<html>`), as
   * in 0.2. A `var(--fuse-*)` written on `<html>` cannot resolve when Fuse declares its
   * variables on `<body>` (Fuse does): set `'body'` to make the bridge work on Fuse apps.
   * Consumer overrides in CSS must then target `body`, not `:root`.
   */
  cssVarsTarget?: 'root' | 'body';
  /** Structural variants (header, severity icons, badge). Default: the 0.2 look. */
  layout?: NotifyThemeLayout;
}

/**
 * Icon names passed to `<mat-icon [svgIcon]>`. Defaults are the Heroicons names registered by
 * Fuse (`heroicons_outline:bell`, ...). Consumers without that registry pass their own.
 */
export interface NotifyUiIcons {
  bell?: string;
  close?: string;
  markAllRead?: string;
  empty?: string;
  severity?: Partial<Record<NotifySeverity, string>>;
}

/** Every UI string of the library. Defaults are Italian, as in 0.2. */
export interface NotifyUiLabels {
  /** Tooltip of the bell button. */
  bellTooltip: string;
  /** `aria-label` of the bell button; `{count}` is replaced with the unread count. */
  bellAriaLabel: string;
  /** Dropdown title. */
  panelTitle: string;
  /** Tooltip and `aria-label` of the "mark all read" button. */
  markAllRead: string;
  /** `aria-label` of the close button (mobile). */
  close: string;
  /** Tooltip of the unread dot on a row. */
  unread: string;
  /** Empty state title. */
  emptyTitle: string;
  /** Empty state description. */
  emptyBody: string;
  /** Action label of the toast. */
  toastDismiss: string;
}

export interface NotifyUiConfig {
  /**
   * Base URL of the inbox HTTP API (typically the producer backend that proxies the core).
   * Endpoints expected:
   *   GET  {coreHttpUrl}/notifications?status=&page=&limit=
   *   GET  {coreHttpUrl}/notifications/unread-count
   *   POST {coreHttpUrl}/notifications/:uuid/read
   *   POST {coreHttpUrl}/notifications/read-all
   */
  coreHttpUrl: string;

  /**
   * Socket.IO origin of the notification service.
   * The library appends the default namespace and passes the JWT via auth.
   * An empty string disables the socket (the bell still works from the HTTP inbox).
   */
  coreWsUrl: string;

  /**
   * Returns the upstream JWT (e.g. the OAuth token). Used as a fallback seed for
   * NotifyAuthService when no notify-specific token has been set via setToken().
   * Preferred flow: backend issues a dedicated notify token → call NotifyAuthService.setToken().
   */
  tokenProvider?: () => string | null;

  /**
   * Per-topic route resolvers. Keys match the `topic` field of the notification.
   * Use `default` as a fallback for unmapped topics. Return `null` to skip navigation.
   */
  resolvers: {
    default?: NotifyResolver;
  } & Record<string, NotifyResolver>;

  /**
   * When true, a MatSnackBar is shown on every live notification.
   * Defaults to false.
   */
  enableToast?: boolean;

  /**
   * When true, the bell badge updates but no entries are auto-merged into the dropdown.
   * Used for cases where the consumer drives the list from its own store.
   * Defaults to false.
   */
  enableLiveBadgeOnly?: boolean;

  /**
   * Max number of notifications kept in memory. Oldest are dropped when exceeded.
   * Defaults to 100.
   */
  maxInboxSize?: number;

  /**
   * Optional theme overrides. All fields are optional; defaults match a Fuse-like blue palette.
   * Auto-detects the consumer's Fuse theme by default — see NotifyTheme.themeBridge.
   */
  theme?: NotifyTheme;

  // --- added in 0.3.0 ---

  /** UI strings. Missing keys keep the Italian defaults. */
  labels?: Partial<NotifyUiLabels>;

  /**
   * Whether `NotifyAuthService` keeps the token in `localStorage` (`notify_token`).
   * Default `true` (0.2 behaviour). Set `false` to keep it in memory only: the consumer must
   * then call `setToken()` again after every reload, which is what an app that receives the
   * token with its login response already does. In-memory is the safer default for new apps.
   */
  persistToken?: boolean;

  /**
   * Authorization header sent by `NotifyInboxService` on the HTTP inbox calls.
   * `'wsToken'` (default): `Bearer <wsToken>`. `'none'`: no header — for apps whose own HTTP
   * interceptor already authenticates those calls with the session token.
   */
  httpAuth?: 'wsToken' | 'none';

  /**
   * When `true`, the bell reloads the inbox after every socket reconnection, so notifications
   * delivered while the socket was down show up without a page reload. Default `false`.
   */
  resyncOnReconnect?: boolean;

  /**
   * Socket.IO event name of data events (see `NotifySocketService.dataEvents$`).
   * Default `'data.event'`, the name used by the Ermes core for `POST /api/v1/events/live`.
   */
  dataEventName?: string;

  /** Angular `DatePipe` format of the row timestamp. Default `'dd MMM, HH:mm'`. */
  dateFormat?: string;

  /** Icon registry names. Missing keys keep the Heroicons defaults. */
  icons?: NotifyUiIcons;
}

export const NOTIFY_UI_CONFIG = new InjectionToken<NotifyUiConfig>('NOTIFY_UI_CONFIG');
