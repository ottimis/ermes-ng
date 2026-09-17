import {
  NotifyNotification,
  NotifySocketEvent,
  isNotifyDataEvent,
  isNotifyNotification,
} from '../models/notification.model';

export type NotifySocketStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

/** The subset of a Socket.IO client socket the core relies on (kept small so tests can fake it). */
export interface NotifySocketLike {
  connected: boolean;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  onAny(listener: (event: string, ...args: unknown[]) => void): unknown;
  offAny(): unknown;
  removeAllListeners(): unknown;
  disconnect(): unknown;
  emit(event: string, ...args: unknown[]): unknown;
}

export interface NotifySocketCoreDeps {
  /** Opens a socket to `url`; the implementation passes the auth callback and transport options. */
  createSocket: (url: string) => NotifySocketLike;
  /** Current notification token, or `null` when the user is signed out. */
  getToken: () => string | null;
  /** Socket.IO origin; empty = socket disabled. */
  wsUrl: string;
  /** Event name of data events (`data.event`). */
  dataEventName: string;
  onStatus: (status: NotifySocketStatus) => void;
  onLive: (notification: NotifyNotification) => void;
  onEvent: (event: NotifySocketEvent) => void;
  onReconnected: () => void;
  warn: (message: string) => void;
  /** Injectable timers for tests. Default: the globals. */
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
}

/** Backoff for the reconnection the library drives itself (after `io server disconnect`). */
const RETRY_MIN_MS = 1_000;
const RETRY_MAX_MS = 10_000;

/**
 * Framework-free state machine behind `NotifySocketService`.
 *
 * Rules, all verified against socket.io-client 4.x behaviour:
 * - one socket per token: `connect()` with a different token tears the old socket down and
 *   opens a new one (0.2 kept the first socket and its room forever);
 * - after `io server disconnect` (revoked token, server restart) socket.io-client does **not**
 *   reconnect by itself: the core retries with a 1–10 s backoff as long as a token exists;
 * - the last `focus` is re-sent on every `connect`, because the server keeps it per socket and
 *   a reconnection is a new socket;
 * - `notification.new` feeds `onLive` only with a well-formed, non-live notification;
 *   everything the socket receives is also forwarded raw to `onEvent`.
 */
export class NotifySocketCore {
  private socket: NotifySocketLike | null = null;
  private connectedToken: string | null = null;
  private focus: unknown = null;
  private hadConnected = false;
  private retryHandle: unknown = null;
  private retryDelay = RETRY_MIN_MS;
  private warnedNoUrl = false;

  constructor(private readonly deps: NotifySocketCoreDeps) {}

  /** Opens the socket if a token exists; re-opens it if the token changed since the last connect. */
  connect(): void {
    const token = this.deps.getToken();
    if (!token) return;
    if (!this.deps.wsUrl) {
      if (!this.warnedNoUrl) {
        this.warnedNoUrl = true;
        this.deps.warn('[ermes-ng] coreWsUrl is empty: live notifications are disabled.');
      }
      this.deps.onStatus('idle');
      return;
    }
    if (this.socket && this.connectedToken === token) return;
    if (this.socket) this.teardown();

    this.cancelRetry();
    this.connectedToken = token;
    this.deps.onStatus('connecting');
    const socket = this.deps.createSocket(this.deps.wsUrl);
    this.socket = socket;

    socket.on('connect', () => {
      this.retryDelay = RETRY_MIN_MS;
      this.deps.onStatus('connected');
      if (this.focus !== null) socket.emit('focus', this.focus);
      if (this.hadConnected) this.deps.onReconnected();
      this.hadConnected = true;
    });
    socket.on('disconnect', (...args: unknown[]) => {
      this.deps.onStatus('disconnected');
      if (args[0] === 'io server disconnect') this.scheduleRetry();
    });
    socket.on('connect_error', () => this.deps.onStatus('error'));
    socket.on('notification.new', (...args: unknown[]) => {
      const payload = args[0];
      if (isNotifyDataEvent(payload)) return; // data events never reach the bell
      if (!isNotifyNotification(payload)) {
        this.deps.warn('[ermes-ng] dropped a malformed notification.new payload');
        return;
      }
      this.deps.onLive(payload);
    });
    socket.onAny((event: string, ...args: unknown[]) => {
      this.deps.onEvent({ event, data: args[0] });
    });
  }

  /** Closes the socket and forgets the connection state. Safe to call when not connected. */
  disconnect(): void {
    this.cancelRetry();
    this.teardown();
    this.hadConnected = false;
    this.deps.onStatus('idle');
  }

  /** Tears the socket down and opens a new one with the current token (no-op without a token). */
  reconnect(): void {
    this.cancelRetry();
    this.teardown();
    this.connect();
  }

  /**
   * Declares what the client is looking at. Sent right away when connected and re-sent on every
   * `connect`; `null` clears it (nothing is sent until the next non-null focus).
   */
  setFocus(payload: unknown): void {
    this.focus = payload ?? null;
    if (this.focus !== null && this.socket?.connected) {
      this.socket.emit('focus', this.focus);
    }
  }

  getFocus(): unknown {
    return this.focus;
  }

  isDataEvent(event: NotifySocketEvent): boolean {
    return event.event === this.deps.dataEventName;
  }

  private teardown(): void {
    const socket = this.socket;
    this.socket = null;
    this.connectedToken = null;
    if (!socket) return;
    socket.offAny();
    socket.removeAllListeners();
    socket.disconnect();
  }

  private scheduleRetry(): void {
    if (this.retryHandle !== null) return;
    const delay = this.retryDelay;
    this.retryDelay = Math.min(this.retryDelay * 2, RETRY_MAX_MS);
    const setT = this.deps.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
    this.retryHandle = setT(() => {
      this.retryHandle = null;
      if (!this.deps.getToken()) return;
      this.teardown();
      this.connect();
    }, delay);
  }

  private cancelRetry(): void {
    if (this.retryHandle === null) return;
    const clearT = this.deps.clearTimeout ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
    clearT(this.retryHandle);
    this.retryHandle = null;
    this.retryDelay = RETRY_MIN_MS;
  }
}
