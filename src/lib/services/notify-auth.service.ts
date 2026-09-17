import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged } from 'rxjs';
import { NOTIFY_UI_CONFIG } from '../config/notify-ui-config';

/**
 * Holds the notification token (the `wsToken` issued by the producer backend).
 *
 * Storage: `localStorage['notify_token']` by default, as in 0.2, so a reload keeps the bell
 * alive without the consumer doing anything. `persistToken: false` in `provideNotifyUi()`
 * keeps it in memory only (safer against XSS; the consumer calls `setToken()` after each
 * login/refresh, which apps receiving the token with their login response already do).
 */
@Injectable({ providedIn: 'root' })
export class NotifyAuthService {
  private readonly STORAGE_KEY = 'notify_token';
  private readonly config = inject(NOTIFY_UI_CONFIG, { optional: true });
  private readonly persist = this.config?.persistToken ?? true;

  private readonly token$$ = new BehaviorSubject<string | null>(this.readFromStorage());
  readonly token$: Observable<string | null> = this.token$$.pipe(distinctUntilChanged());

  setToken(token: string | null): void {
    if (this.persist) {
      try {
        if (token) localStorage.setItem(this.STORAGE_KEY, token);
        else localStorage.removeItem(this.STORAGE_KEY);
      } catch {
        // storage unavailable (private mode, blocked): the in-memory value still works
      }
    }
    this.token$$.next(token ?? null);
  }

  getToken(): string | null {
    return this.token$$.value;
  }

  clear(): void {
    this.setToken(null);
    if (!this.persist) {
      // A token persisted by a previous version must not outlive the switch to in-memory.
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }

  private readFromStorage(): string | null {
    if (!this.persist) return null;
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
