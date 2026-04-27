import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotifyAuthService {
  // TODO: migrate to in-memory storage for XSS safety; re-exchange on connect if expired
  private readonly STORAGE_KEY = 'notify_token';

  setToken(token: string | null): void {
    if (token) localStorage.setItem(this.STORAGE_KEY, token);
    else localStorage.removeItem(this.STORAGE_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  clear(): void {
    this.setToken(null);
  }
}
