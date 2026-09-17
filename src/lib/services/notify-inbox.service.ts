import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest, map, tap } from 'rxjs';
import { NOTIFY_UI_CONFIG } from '../config/notify-ui-config';
import { NotifyAuthService } from './notify-auth.service';
import {
  NotifyInboxListResponse,
  NotifyNotification,
  NotifyUnreadCountResponse,
} from '../models/notification.model';

/** Where an inbox HTTP call failed; emitted on `NotifyInboxService.error$`. */
export interface NotifyInboxError {
  operation: 'bootstrap' | 'markRead' | 'markAllRead' | 'unreadCount';
  error: unknown;
}

@Injectable({ providedIn: 'root' })
export class NotifyInboxService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(NOTIFY_UI_CONFIG);
  private readonly notifyAuth = inject(NotifyAuthService);

  private readonly notifications$$ = new BehaviorSubject<NotifyNotification[]>([]);
  private readonly error$$ = new Subject<NotifyInboxError>();
  /**
   * Unread live notifications that were **not** merged into the list (`enableLiveBadgeOnly`).
   * Without it the badge, which is derived from the list, would never move in that mode.
   * Reset by `bootstrap()` (the server count takes over) and by `markAllRead()`.
   */
  private readonly liveUnread$$ = new BehaviorSubject<number>(0);

  readonly notifications$ = this.notifications$$.asObservable();
  readonly unreadCount$: Observable<number> = combineLatest([
    this.notifications$.pipe(map(list => list.filter(n => !n.read_at).length)),
    this.liveUnread$$,
  ]).pipe(map(([inList, live]) => inList + live));
  /**
   * HTTP failures of the inbox calls. The library swallows them for the UI (optimistic
   * updates are rolled back); subscribe here to log or show them.
   */
  readonly error$: Observable<NotifyInboxError> = this.error$$.asObservable();

  bootstrap(limit = 50): Observable<NotifyInboxListResponse> {
    return this.http
      .get<NotifyInboxListResponse>(this.url(`/notifications?status=all&limit=${limit}`), {
        headers: this.authHeaders(),
      })
      .pipe(
        tap({
          next: res => {
            this.liveUnread$$.next(0);
            this.notifications$$.next(this.trim(res.items ?? []));
          },
          error: error => this.error$$.next({ operation: 'bootstrap', error }),
        }),
      );
  }

  unreadCount(): Observable<number> {
    return this.http
      .get<NotifyUnreadCountResponse>(this.url('/notifications/unread-count'), {
        headers: this.authHeaders(),
      })
      .pipe(
        map(r => r.count),
        tap({ error: error => this.error$$.next({ operation: 'unreadCount', error }) }),
      );
  }

  /** Optimistic: the row turns read at once and is restored if the request fails. */
  markRead(uuid: string): Observable<void> {
    const before = this.notifications$$.value;
    this.applyReadLocal([uuid]);
    return this.http
      .post<void>(this.url(`/notifications/${uuid}/read`), null, { headers: this.authHeaders() })
      .pipe(
        tap({
          error: error => {
            this.rollback(before, [uuid]);
            this.error$$.next({ operation: 'markRead', error });
          },
        }),
      );
  }

  /** Optimistic: every row turns read at once and the list is restored if the request fails. */
  markAllRead(): Observable<void> {
    const before = this.notifications$$.value;
    const liveBefore = this.liveUnread$$.value;
    const now = new Date().toISOString();
    this.liveUnread$$.next(0);
    this.notifications$$.next(before.map(n => (n.read_at ? n : { ...n, read_at: now })));
    return this.http
      .post<void>(this.url('/notifications/read-all'), null, { headers: this.authHeaders() })
      .pipe(
        tap({
          error: error => {
            this.liveUnread$$.next(liveBefore);
            this.rollback(before, before.filter(n => !n.read_at).map(n => n.notification_uuid));
            this.error$$.next({ operation: 'markAllRead', error });
          },
        }),
      );
  }

  upsert(notification: NotifyNotification): void {
    const list = this.notifications$$.value;
    const idx = list.findIndex(n => n.notification_uuid === notification.notification_uuid);
    if (idx >= 0) {
      const copy = list.slice();
      copy[idx] = notification;
      this.notifications$$.next(copy);
      return;
    }
    this.notifications$$.next(this.trim([notification, ...list]));
  }

  /**
   * Counts a live notification that is not merged into the list (`enableLiveBadgeOnly`), so the
   * badge still reflects it. Read notifications and data events do not count.
   */
  noteLiveUnread(notification: NotifyNotification): void {
    if (notification.read_at || notification.live) return;
    this.liveUnread$$.next(this.liveUnread$$.value + 1);
  }

  clear(): void {
    this.liveUnread$$.next(0);
    this.notifications$$.next([]);
  }

  private applyReadLocal(uuids: string[]): void {
    const set = new Set(uuids);
    const now = new Date().toISOString();
    this.notifications$$.next(
      this.notifications$$.value.map(n =>
        set.has(n.notification_uuid) && !n.read_at ? { ...n, read_at: now } : n,
      ),
    );
  }

  /**
   * Restores `read_at` for the given rows from a snapshot. Rows added or updated by a live
   * event in the meantime are kept as they are.
   */
  private rollback(snapshot: NotifyNotification[], uuids: string[]): void {
    const wanted = new Set(uuids);
    const previous = new Map(snapshot.map(n => [n.notification_uuid, n.read_at] as const));
    this.notifications$$.next(
      this.notifications$$.value.map(n =>
        wanted.has(n.notification_uuid) && previous.has(n.notification_uuid)
          ? { ...n, read_at: previous.get(n.notification_uuid) ?? null }
          : n,
      ),
    );
  }

  private url(path: string): string {
    const base = this.config.coreHttpUrl.replace(/\/$/, '');
    return `${base}${path}`;
  }

  private authHeaders(): HttpHeaders {
    if (this.config.httpAuth === 'none') return new HttpHeaders();
    const token = this.notifyAuth.getToken() ?? this.config.tokenProvider?.() ?? null;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  private trim(items: NotifyNotification[]): NotifyNotification[] {
    const cap = this.config.maxInboxSize ?? 100;
    return items.length > cap ? items.slice(0, cap) : items;
  }
}
