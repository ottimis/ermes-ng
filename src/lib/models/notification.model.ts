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
