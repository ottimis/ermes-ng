export type NotifySeverity = 'info' | 'warning' | 'error' | 'success';

export interface NotifyNotification {
  notification_uuid: string;
  topic: string;
  title: string;
  body: string | null;
  severity: NotifySeverity;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  /**
   * `true` only on **data events** (`POST /api/v1/events/live` on the Ermes core): frames that
   * share the inbox item shape but are never persisted, never counted as unread and never shown
   * by the bell. The library ignores them on `notification.new`; consume them via
   * `NotifySocketService.dataEvents$`.
   */
  live?: boolean;
}

/**
 * A data event as delivered on the socket (Socket.IO event name `data.event` by default, see
 * `NotifyUiConfig.dataEventName`). Same shape as a notification plus `live: true`; `payload`
 * carries the producer's domain data and `topic` its vocabulary.
 */
export interface NotifyDataEvent extends NotifyNotification {
  live: true;
}

/** Any application-level Socket.IO event received on the notification socket. */
export interface NotifySocketEvent<T = unknown> {
  /** Socket.IO event name (`notification.new`, `data.event`, ...). */
  event: string;
  /** First argument of the event, as sent by the server. */
  data: T;
}

export interface NotifyInboxListResponse {
  items: NotifyNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    nextCursor: string | null;
  };
}

export interface NotifyUnreadCountResponse {
  count: number;
}

const SEVERITIES: ReadonlySet<string> = new Set(['info', 'warning', 'error', 'success']);

/**
 * Structural guard for a notification received from the network. The socket payload is
 * trusted blindly otherwise: an item without `notification_uuid` cannot be deduplicated and
 * breaks `trackBy`. Strict on the two fields the library relies on, lenient on the rest.
 */
export function isNotifyNotification(value: unknown): value is NotifyNotification {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['notification_uuid'] === 'string' &&
    v['notification_uuid'].length > 0 &&
    typeof v['topic'] === 'string' &&
    typeof v['created_at'] === 'string' &&
    (v['severity'] === undefined || SEVERITIES.has(String(v['severity'])))
  );
}

/** `true` when the frame is a data event (see `NotifyNotification.live`). */
export function isNotifyDataEvent(value: unknown): value is NotifyDataEvent {
  return isNotifyNotification(value) && value.live === true;
}
