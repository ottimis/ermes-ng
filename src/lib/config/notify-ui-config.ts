import { InjectionToken } from '@angular/core';
import { NotifyNotification } from '../models/notification.model';

export interface NotifyRouteAction {
  commands: unknown[];
  queryParams?: Record<string, string | number | boolean | null | undefined>;
  fragment?: string;
}

export type NotifyResolver = (notification: NotifyNotification) => NotifyRouteAction | null;

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
}

export const NOTIFY_UI_CONFIG = new InjectionToken<NotifyUiConfig>('NOTIFY_UI_CONFIG');
