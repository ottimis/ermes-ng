import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotifySocketCore, NotifySocketCoreDeps, NotifySocketLike, NotifySocketStatus } from '../notify-socket-core';

type Listener = (...args: unknown[]) => void;
const RESERVED = new Set(['connect', 'connect_error', 'disconnect', 'disconnecting', 'newListener', 'removeListener']);

class FakeSocket implements NotifySocketLike {
  connected = false;
  listeners = new Map<string, Listener[]>();
  anyListeners: Array<(event: string, ...args: unknown[]) => void> = [];
  emitted: Array<[string, unknown]> = [];
  disconnected = 0;

  on(event: string, listener: Listener): this {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }
  onAny(listener: (event: string, ...args: unknown[]) => void): this {
    this.anyListeners.push(listener);
    return this;
  }
  offAny(): this { this.anyListeners = []; return this; }
  removeAllListeners(): this { this.listeners.clear(); return this; }
  disconnect(): this { this.connected = false; this.disconnected++; return this; }
  emit(event: string, ...args: unknown[]): this { this.emitted.push([event, args[0]]); return this; }

  /** Server-side helper. Like socket.io-client, `onAny` never sees the reserved events. */
  fire(event: string, ...args: unknown[]): void {
    if (event === 'connect') this.connected = true;
    if (event === 'disconnect') this.connected = false;
    for (const l of this.listeners.get(event) ?? []) l(...args);
    if (!RESERVED.has(event)) for (const l of this.anyListeners) l(event, ...args);
  }
}

const notification = {
  notification_uuid: 'n1', topic: 'monitor.down', title: 't', body: null, severity: 'error',
  entity_type: null, entity_id: null, payload: null, read_at: null, created_at: '2026-09-16T10:00:00Z',
};

function setup(overrides: Partial<NotifySocketCoreDeps> = {}) {
  const sockets: FakeSocket[] = [];
  let token: string | null = 'tok-1';
  const statuses: NotifySocketStatus[] = [];
  const live: unknown[] = [];
  const events: unknown[] = [];
  const warnings: string[] = [];
  let reconnected = 0;
  const timers: Array<{ fn: () => void; ms: number }> = [];
  const deps: NotifySocketCoreDeps = {
    createSocket: () => { const s = new FakeSocket(); sockets.push(s); return s; },
    getToken: () => token,
    wsUrl: 'http://ermes.test',
    dataEventName: 'data.event',
    onStatus: (s) => statuses.push(s),
    onLive: (n) => live.push(n),
    onEvent: (e) => events.push(e),
    onReconnected: () => reconnected++,
    warn: (m) => warnings.push(m),
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => { timers.length = 0; },
    ...overrides,
  };
  const core = new NotifySocketCore(deps);
  return {
    core, sockets, statuses, live, events, warnings, timers,
    get reconnected() { return reconnected; },
    setToken(t: string | null) { token = t; },
    last: () => sockets[sockets.length - 1]!,
  };
}

describe('NotifySocketCore — connect', () => {
  it('does nothing without a token', () => {
    const t = setup({ getToken: () => null });
    t.core.connect();
    expect(t.sockets).toHaveLength(0);
    expect(t.statuses).toEqual([]);
  });

  it('stays idle and warns once when coreWsUrl is empty (no https:// loop)', () => {
    const t = setup({ wsUrl: '' });
    t.core.connect();
    t.core.connect();
    expect(t.sockets).toHaveLength(0);
    expect(t.statuses).toEqual(['idle', 'idle']);
    expect(t.warnings).toHaveLength(1);
  });

  it('is idempotent for the same token', () => {
    const t = setup();
    t.core.connect();
    t.core.connect();
    expect(t.sockets).toHaveLength(1);
  });

  it('re-opens the socket when the token changes', () => {
    const t = setup();
    t.core.connect();
    t.last().fire('connect');
    t.setToken('tok-2');
    t.core.connect();
    expect(t.sockets).toHaveLength(2);
    expect(t.sockets[0]!.disconnected).toBe(1);
    expect(t.sockets[0]!.anyListeners).toHaveLength(0);
  });
});

describe('NotifySocketCore — events', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => { t = setup(); t.core.connect(); t.last().fire('connect'); });

  it('forwards notification.new to live and to the raw stream', () => {
    t.last().fire('notification.new', notification);
    expect(t.live).toEqual([notification]);
    expect(t.events).toEqual([{ event: 'notification.new', data: notification }]);
  });

  it('never feeds a data event to live, even on notification.new', () => {
    t.last().fire('notification.new', { ...notification, live: true });
    t.last().fire('data.event', { ...notification, live: true, topic: 'issue.opened' });
    expect(t.live).toEqual([]);
    expect(t.events).toHaveLength(2);
    expect(t.core.isDataEvent({ event: 'data.event', data: null })).toBe(true);
    expect(t.core.isDataEvent({ event: 'notification.new', data: null })).toBe(false);
  });

  it('drops malformed notifications with a warning', () => {
    t.last().fire('notification.new', { title: 'no uuid' });
    expect(t.live).toEqual([]);
    expect(t.warnings).toHaveLength(1);
  });
});

describe('NotifySocketCore — focus', () => {
  it('is sent now when connected and again on every connect', () => {
    const t = setup();
    t.core.setFocus({ urls: 'all' });          // before any socket: stored only
    t.core.connect();
    expect(t.last().emitted).toEqual([]);      // not connected yet
    t.last().fire('connect');
    expect(t.last().emitted).toEqual([['focus', { urls: 'all' }]]);
    t.core.setFocus({ urls: [29] });
    expect(t.last().emitted).toHaveLength(2);
    t.last().fire('disconnect', 'transport close');
    t.last().fire('connect');                  // socket.io auto-reconnection: same socket
    expect(t.last().emitted[2]).toEqual(['focus', { urls: [29] }]);
  });

  it('null clears the focus and sends nothing', () => {
    const t = setup();
    t.core.connect();
    t.last().fire('connect');
    t.core.setFocus(null);
    expect(t.last().emitted).toEqual([]);
    expect(t.core.getFocus()).toBeNull();
  });
});

describe('NotifySocketCore — reconnection', () => {
  it('reports reconnected$ only after a previous connection', () => {
    const t = setup();
    t.core.connect();
    t.last().fire('connect');
    expect(t.reconnected).toBe(0);
    t.last().fire('disconnect', 'transport close');
    t.last().fire('connect');
    expect(t.reconnected).toBe(1);
  });

  it('retries by itself after "io server disconnect", which socket.io never retries', () => {
    const t = setup();
    t.core.connect();
    t.last().fire('connect');
    t.last().fire('disconnect', 'io server disconnect');
    expect(t.timers).toHaveLength(1);
    expect(t.timers[0]!.ms).toBe(1000);
    t.timers[0]!.fn();
    expect(t.sockets).toHaveLength(2);
    t.last().fire('connect');
    expect(t.reconnected).toBe(1);
  });

  it('does not retry when the token is gone in the meantime', () => {
    const t = setup();
    t.core.connect();
    t.last().fire('connect');
    t.last().fire('disconnect', 'io server disconnect');
    t.setToken(null);
    t.timers[0]!.fn();
    expect(t.sockets).toHaveLength(1);
  });

  it('disconnect() tears everything down and forgets the history', () => {
    const t = setup();
    t.core.connect();
    t.last().fire('connect');
    t.core.disconnect();
    expect(t.last().disconnected).toBe(1);
    expect(t.statuses.at(-1)).toBe('idle');
    t.core.connect();
    t.last().fire('connect');
    expect(t.reconnected).toBe(0);
  });

  it('reconnect() replaces the socket with the current token', () => {
    const t = setup();
    t.core.connect();
    t.last().fire('connect');
    t.core.reconnect();
    expect(t.sockets).toHaveLength(2);
    t.last().fire('connect');
    expect(t.reconnected).toBe(1);
  });
});
