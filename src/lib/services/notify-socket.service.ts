import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { NOTIFY_UI_CONFIG } from '../config/notify-ui-config';
import { NotifyNotification } from '../models/notification.model';
import { NotifyAuthService } from './notify-auth.service';

export type NotifySocketStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

@Injectable({ providedIn: 'root' })
export class NotifySocketService implements OnDestroy {
  private readonly config = inject(NOTIFY_UI_CONFIG);
  private readonly notifyAuth = inject(NotifyAuthService);

  private socket: Socket | null = null;
  private readonly status$$ = new BehaviorSubject<NotifySocketStatus>('idle');
  private readonly live$$ = new Subject<NotifyNotification>();

  readonly status$ = this.status$$.asObservable();
  readonly live$ = this.live$$.asObservable();

  connect(): void {
    if (this.socket) return;
    const token = this.notifyAuth.getToken();
    if (!token) return;

    this.status$$.next('connecting');
    this.socket = io(this.config.coreWsUrl, {
      transports: ['websocket'],
      auth: cb => cb({ token: this.notifyAuth.getToken() ?? '' }),
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      timeout: 20_000,
    });

    this.socket.on('connect', () => this.status$$.next('connected'));
    this.socket.on('disconnect', () => this.status$$.next('disconnected'));
    this.socket.on('connect_error', () => this.status$$.next('error'));
    this.socket.on('notification.new', (payload: NotifyNotification) => {
      this.live$$.next(payload);
    });
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.status$$.next('idle');
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
