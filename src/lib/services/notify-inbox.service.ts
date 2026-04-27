import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { NOTIFY_UI_CONFIG } from '../config/notify-ui-config';
import { NotifyAuthService } from './notify-auth.service';
import {
  NotifyInboxListResponse,
  NotifyNotification,
  NotifyUnreadCountResponse,
} from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotifyInboxService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(NOTIFY_UI_CONFIG);
  private readonly notifyAuth = inject(NotifyAuthService);

  private readonly notifications$$ = new BehaviorSubject<NotifyNotification[]>([]);
  readonly notifications$ = this.notifications$$.asObservable();
  readonly unreadCount$ = this.notifications$.pipe(
    map(list => list.filter(n => !n.read_at).length),
  );

  bootstrap(limit = 50): Observable<NotifyInboxListResponse> {
    return this.http
      .get<NotifyInboxListResponse>(this.url(`/notifications?status=all&limit=${limit}`), {
        headers: this.authHeaders(),
      })
      .pipe(
        tap(res => {
          this.notifications$$.next(this.trim(res.items));
        }),
      );
  }

  unreadCount(): Observable<number> {
    return this.http
      .get<NotifyUnreadCountResponse>(this.url('/notifications/unread-count'), {
        headers: this.authHeaders(),
      })
      .pipe(map(r => r.count));
  }

  markRead(uuid: string): Observable<void> {
    this.applyReadLocal([uuid]);
    return this.http.post<void>(this.url(`/notifications/${uuid}/read`), null, {
      headers: this.authHeaders(),
    });
  }

  markAllRead(): Observable<void> {
    const now = new Date().toISOString();
    this.notifications$$.next(
      this.notifications$$.value.map(n => (n.read_at ? n : { ...n, read_at: now })),
    );
    return this.http.post<void>(this.url('/notifications/read-all'), null, {
      headers: this.authHeaders(),
    });
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

  clear(): void {
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

  private url(path: string): string {
    const base = this.config.coreHttpUrl.replace(/\/$/, '');
    return `${base}${path}`;
  }

  private authHeaders(): HttpHeaders {
    const token = this.notifyAuth.getToken() ?? this.config.tokenProvider?.() ?? null;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  private trim(items: NotifyNotification[]): NotifyNotification[] {
    const cap = this.config.maxInboxSize ?? 100;
    return items.length > cap ? items.slice(0, cap) : items;
  }
}
