import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, filter } from 'rxjs';
import { io } from 'socket.io-client';
import { NOTIFY_UI_CONFIG } from '../config/notify-ui-config';
import { NOTIFY_DEFAULT_DATA_EVENT_NAME } from '../config/notify-ui-defaults';
import { NotifyDataEvent, NotifyNotification, NotifySocketEvent } from '../models/notification.model';
import { NotifyAuthService } from './notify-auth.service';
import { NotifySocketCore, NotifySocketLike, NotifySocketStatus } from './notify-socket-core';

export type { NotifySocketStatus } from './notify-socket-core';

/**
 * Socket.IO client towards the Ermes core.
 *
 * `live$` carries persisted notifications (`notification.new`) and feeds the bell.
 * `events$` carries **every** application event received on the socket, raw; `dataEvents$`
 * only the data events (`data.event`), which the bell never shows. `reconnected$` fires after
 * every handshake that follows a previous one: the moment to re-read what may have changed
 * while the socket was down.
 */
@Injectable({ providedIn: 'root' })
export class NotifySocketService implements OnDestroy {
  private readonly config = inject(NOTIFY_UI_CONFIG);
  private readonly notifyAuth = inject(NotifyAuthService);

  private readonly status$$ = new BehaviorSubject<NotifySocketStatus>('idle');
  private readonly live$$ = new Subject<NotifyNotification>();
  private readonly events$$ = new Subject<NotifySocketEvent>();
  private readonly reconnected$$ = new Subject<void>();

  /** Connection state: `idle | connecting | connected | disconnected | error`. */
  readonly status$: Observable<NotifySocketStatus> = this.status$$.asObservable();
  /** Persisted notifications as they arrive (`notification.new`). Unchanged since 0.2. */
  readonly live$: Observable<NotifyNotification> = this.live$$.asObservable();
  /** Every application event on the socket, `notification.new` included (raw stream). */
  readonly events$: Observable<NotifySocketEvent> = this.events$$.asObservable();
  /** Data events only (`NotifyUiConfig.dataEventName`, default `data.event`). */
  readonly dataEvents$: Observable<NotifySocketEvent<NotifyDataEvent>> = this.events$.pipe(
    filter((e): e is NotifySocketEvent<NotifyDataEvent> => this.core.isDataEvent(e)),
  );
  /** Emits after each handshake that follows a previous connection (reconnection). */
  readonly reconnected$: Observable<void> = this.reconnected$$.asObservable();

  private readonly core = new NotifySocketCore({
    createSocket: (url) => this.openSocket(url),
    getToken: () => this.notifyAuth.getToken(),
    wsUrl: this.config.coreWsUrl,
    dataEventName: this.config.dataEventName ?? NOTIFY_DEFAULT_DATA_EVENT_NAME,
    onStatus: (s) => this.status$$.next(s),
    onLive: (n) => this.live$$.next(n),
    onEvent: (e) => this.events$$.next(e),
    onReconnected: () => this.reconnected$$.next(),
    warn: (m) => console.warn(m),
  });

  /** Current status, synchronously. */
  get status(): NotifySocketStatus {
    return this.status$$.value;
  }

  /**
   * Opens the socket when a token is available. Idempotent for the same token; a different
   * token (user or organisation switch) re-opens the socket, so the user lands in the right room.
   */
  connect(): void {
    this.core.connect();
  }

  disconnect(): void {
    this.core.disconnect();
  }

  /** Closes and re-opens the socket with the current token. */
  reconnect(): void {
    this.core.reconnect();
  }

  /**
   * Declares what the user is looking at (opaque to the library, read by the producer backend
   * through the core's presence API). Sent now if connected and again after every reconnection.
   * Pass `null` to stop declaring anything.
   */
  setFocus(payload: unknown): void {
    this.core.setFocus(payload);
  }

  getFocus(): unknown {
    return this.core.getFocus();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private openSocket(url: string): NotifySocketLike {
    return io(url, {
      transports: ['websocket'],
      auth: (cb) => cb({ token: this.notifyAuth.getToken() ?? '' }),
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      timeout: 20_000,
    }) as unknown as NotifySocketLike;
  }
}
