import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotifyAuthService {
  // TODO: migrate to in-memory storage for XSS safety; re-exchange on connect if expired
  private readonly STORAGE_KEY = 'notify_token';

  private readonly token$$ = new BehaviorSubject<string | null>(this.readFromStorage());
  readonly token$: Observable<string | null> = this.token$$.pipe(distinctUntilChanged());

  setToken(token: string | null): void {
    if (token) localStorage.setItem(this.STORAGE_KEY, token);
    else localStorage.removeItem(this.STORAGE_KEY);
    this.token$$.next(token ?? null);
  }

  getToken(): string | null {
    return this.token$$.value;
  }

  clear(): void {
    this.setToken(null);
  }

  private readFromStorage(): string | null {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
