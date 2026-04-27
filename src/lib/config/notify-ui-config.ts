import { InjectionToken } from '@angular/core';
import { NotifyNotification } from '../models/notification.model';

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
   */
  coreWsUrl: string;

  /**
   * Returns the upstream JWT (e.g. the OAuth token). Used as a fallback seed for
   * NotifyAuthService when no notify-specific token has been set via setToken().
   * Preferred flow: backend issues a dedicated notify token → call NotifyAuthService.setToken().
   * TODO: add notifyTokenUrl for automatic token exchange via backend endpoint.
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
}

export const NOTIFY_UI_CONFIG = new InjectionToken<NotifyUiConfig>('NOTIFY_UI_CONFIG');
