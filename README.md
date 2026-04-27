# @ottimis/ermes-ng

Libreria Angular standalone per integrare la piattaforma di notifiche **Ermes** in qualsiasi frontend Angular 17+.

Fornisce:

- `<notify-bell>` componente standalone con badge unread + dropdown CDK overlay
- Connessione Socket.IO auto-riconnessa al servizio centrale notifiche
- Bootstrap inbox via HTTP + merge dedup con eventi live
- Resolver `topic → route` configurabile per la navigazione al click
- Toast `MatSnackBar` opzionale su notifiche live
- Gestione token WS separato dall'OAuth token via `NotifyAuthService`

---

## Requisiti

| Dipendenza | Versione | Note |
|---|---|---|
| `@angular/core` | `^17.0.0` | standalone API, `provideHttpClient`, `provideRouter` |
| `@angular/common` | `^17.0.0` | `HttpClient` |
| `@angular/cdk` | `^17.0.0` | overlay + portal per dropdown |
| `@angular/material` | `^17.0.0` | bell icon + snackbar |
| `@angular/router` | `^17.0.0` | navigazione su click notifica |
| `rxjs` | `^7.0.0` | — |
| `@angular/animations` | `^17.0.0` | richiesto da Material — `provideAnimations()` |

`socket.io-client` (`^4.7.0`) è incluso come dipendenza diretta della libreria — non serve installarlo separatamente.

Inoltre serve un **backend producer** che:

- esponga API proxy verso il core notifiche (`/notifications/*` — vedi sotto)
- emetta un **JWT WebSocket** dedicato (`wsToken`) con claim `iss`, `aud`, `sub`, `tenant_id`, `roles`, `exp`

---

## Installazione

```bash
npm install @ottimis/ermes-ng
```

Con yarn:
```bash
yarn add @ottimis/ermes-ng
```

Con pnpm:
```bash
pnpm add @ottimis/ermes-ng
```

Le peer dependencies Angular (`@angular/core`, `@angular/material`, `@angular/cdk`, `@angular/router`, `@angular/common`, `rxjs`) sono già nel tuo progetto Angular 17+. `socket.io-client` è incluso automaticamente.

---

## Setup base

### 1. Provider in `app.config.ts`

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNotifyUi } from '@ottimis/ermes-ng';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter([/* le tue rotte */]),
    provideAnimations(),
    provideNotifyUi({
      coreHttpUrl: 'https://your-backend.example',
      coreWsUrl:   'https://notify-ws.example',
      enableToast: true,
      resolvers: {
        'contract.termination.completed': (n) => ({
          commands: ['/contratto', n.entity_id],
          queryParams: { highlight: n.notification_uuid },
        }),
        'payment.received': (n) => ({
          commands: ['/pagamenti', n.entity_id],
        }),
        default: () => ({ commands: ['/'] }),
      },
    }),
  ],
};
```

### 2. Setto il token dopo il login

Il backend producer deve restituire un `wsToken` dedicato in risposta al login. Passalo a `NotifyAuthService`:

```typescript
import { Component, inject } from '@angular/core';
import { NotifyAuthService } from '@ottimis/ermes-ng';

export class SignInComponent {
  private notifyAuth = inject(NotifyAuthService);

  onLoginSuccess(response: any) {
    if (response.wsToken) {
      this.notifyAuth.setToken(response.wsToken);
    }
  }
}
```

### 3. Pulizia al logout

```typescript
import { NotifyAuthService } from '@ottimis/ermes-ng';

export class AuthService {
  private notifyAuth = inject(NotifyAuthService);

  signOut() {
    localStorage.removeItem('accessToken');
    this.notifyAuth.clear(); // rimuove notify_token
  }
}
```

### 4. Componente nel layout

```html
<!-- nel template del layout -->
<notify-bell></notify-bell>
```

Il componente è **standalone**: importalo direttamente nel componente che lo usa.

```typescript
import { NotifyBellComponent } from '@ottimis/ermes-ng';

@Component({
  standalone: true,
  imports: [NotifyBellComponent /* ... */],
  template: `<notify-bell></notify-bell>`,
})
export class LayoutComponent {}
```

---

## Configurazione `provideNotifyUi`

| Campo | Tipo | Default | Descrizione |
|---|---|---|---|
| `coreHttpUrl` | `string` | **required** | Base URL delle API inbox (backend producer che proxa il core) |
| `coreWsUrl` | `string` | **required** | Origin del servizio Socket.IO centrale |
| `tokenProvider` | `() => string \| null` | — | Opzionale. Fallback JWT getter se non usi `NotifyAuthService.setToken()`. Usato come seed iniziale al primo bootstrap |
| `resolvers` | `Record<string, NotifyResolver>` | — | Mappa `topic → { commands, queryParams }` per navigazione al click. Chiave speciale `default` come fallback |
| `enableToast` | `boolean` | `false` | Se `true`, mostra `MatSnackBar` su ogni evento live |
| `enableLiveBadgeOnly` | `boolean` | `false` | Se `true`, aggiorna solo badge contatore, non la lista in dropdown |
| `maxInboxSize` | `number` | `100` | Numero massimo di notifiche in memoria nel client |

### Tipo `NotifyResolver`

```typescript
type NotifyResolver = (n: NotifyNotification) => {
  commands: any[];
  queryParams?: Record<string, any>;
};
```

---

## Theming

La libreria espone un'API di customizzazione completa per colori, raggi, spacing, tipografia e dark mode. Funziona out-of-the-box con default blu Fuse-like, e si adatta automaticamente al tema Fuse del consumer se rilevato.

### Default look

Senza alcuna configurazione, la libreria usa una palette blu (#1e40af primary, badge teal #0d9488, severity standard) compatibile a vista con Fuse.

### Auto-detect Fuse

Se il consumer usa il tema Fuse (espone `--fuse-primary` su `:root`), la lib rileva automaticamente e mappa:

| Token Ermes | Token Fuse |
|---|---|
| `--ermes-color-primary` | `var(--fuse-primary)` |
| `--ermes-color-primary-fg` | `var(--fuse-on-primary)` |
| `--ermes-color-surface` | `var(--fuse-bg-card)` |
| `--ermes-color-text-secondary` | `var(--fuse-text-secondary)` |

Severity, badge, radius, spacing e font restano sui default pubblici.

Per forzare comportamento esplicito:
```typescript
provideNotifyUi({
  ...,
  theme: { themeBridge: 'fuse' }       // forza bridge Fuse
});
provideNotifyUi({
  ...,
  theme: { themeBridge: 'standalone' } // ignora Fuse, usa solo defaults pubblici
});
```

### Override TypeScript

```typescript
provideNotifyUi({
  coreHttpUrl: '...',
  coreWsUrl: '...',
  theme: {
    colors: {
      primary: '#7c3aed',
      primaryFg: '#ffffff',
      badgeBg: '#f59e0b',
      severity: { error: '#dc2626' },
    },
    radius: { md: '4px', full: '9999px' },
    spacing: { md: '1.25rem' },
    typography: { fontFamily: 'Inter, sans-serif' },
    darkMode: 'auto',
  },
});
```

I valori specificati in `theme.colors.*` **vincono sempre** sul bridge Fuse — utile per override puntuali in un'app Fuse.

### Override CSS (escape hatch)

```css
/* styles.css del consumer */
:root {
  --ermes-color-primary: #ec4899;
  --ermes-radius-md: 0;
  --ermes-color-severity-error: #dc2626;
}
```

Vince sui CSS vars settati dalla libreria perché valutato dal browser dopo l'inline style attribute, se il foglio è caricato dopo il bootstrap Angular. Per forza override usa `!important`.

### Dark mode

```typescript
theme: { darkMode: 'auto' }   // segue prefers-color-scheme (default)
theme: { darkMode: 'always' } // sempre dark
theme: { darkMode: 'never' }  // sempre light
```

Override colori dark espliciti:
```typescript
theme: {
  darkMode: 'always',
  dark: {
    surface: '#000000',
    surfaceFg: '#ffffff',
    textSecondary: '#a3a3a3',
  },
}
```

### Tabella completa CSS variables

| Variable | Default light | Default dark |
|---|---|---|
| `--ermes-color-primary` | `#1e40af` | (eredita) |
| `--ermes-color-primary-fg` | `#ffffff` | (eredita) |
| `--ermes-color-surface` | `#ffffff` | `#1e293b` |
| `--ermes-color-surface-fg` | `#0f172a` | `#f1f5f9` |
| `--ermes-color-text-secondary` | `#64748b` | `#94a3b8` |
| `--ermes-color-badge-bg` | `#0d9488` | (eredita) |
| `--ermes-color-badge-fg` | `#eef2ff` | (eredita) |
| `--ermes-color-empty-icon-bg` | `#dbeafe` | `#1e3a8a` |
| `--ermes-color-empty-icon-fg` | `#1d4ed8` | `#bfdbfe` |
| `--ermes-color-severity-error` | `#ef4444` | (eredita) |
| `--ermes-color-severity-warning` | `#f59e0b` | (eredita) |
| `--ermes-color-severity-success` | `#22c55e` | (eredita) |
| `--ermes-color-severity-info` | `#3b82f6` | (eredita) |
| `--ermes-radius-sm` | `0.25rem` | — |
| `--ermes-radius-md` | `1rem` | — |
| `--ermes-radius-full` | `9999px` | — |
| `--ermes-spacing-xs` | `0.25rem` | — |
| `--ermes-spacing-sm` | `0.5rem` | — |
| `--ermes-spacing-md` | `1rem` | — |
| `--ermes-spacing-lg` | `1.5rem` | — |
| `--ermes-font-family` | `inherit` | — |
| `--ermes-font-size-sm` | `0.875rem` | — |
| `--ermes-font-size-md` | `1rem` | — |
| `--ermes-font-weight-bold` | `600` | — |

### Note Tailwind

I template della libreria usano ancora alcune utility class Tailwind di layout (`flex`, `items-center`, `py-4` ecc.). Su consumer senza Tailwind, layout potrebbe risultare meno preciso ma colori e severity rimangono corretti grazie alle CSS vars. Rimozione completa Tailwind layout pianificata in v0.3.0.

### Toast (MatSnackBar)

Quando `enableToast: true`, la lib emette pannelli `MatSnackBar` con classi `notify-toast--{severity}`. Gli stili default (`background-color` collegata a `--ermes-color-severity-*`) vengono iniettati automaticamente dal provider — nessuna config consumer richiesta.

---

## Modello notifica

```typescript
export interface NotifyNotification {
  notification_uuid: string;
  topic: string;
  title: string;
  body: string | null;
  severity: 'info' | 'warning' | 'error' | 'success';
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}
```

Il client deduplica via `notification_uuid`.

---

## Endpoint backend attesi

La libreria chiama `coreHttpUrl` con header `Authorization: Bearer <wsToken>`.

| Method | Path | Risposta |
|---|---|---|
| GET | `/notifications?status=all&limit=50` | `{ items: NotifyNotification[], pagination: {...} }` |
| GET | `/notifications/unread-count` | `{ count: number }` |
| POST | `/notifications/:uuid/read` | `204` |
| POST | `/notifications/read-all` | `204` |

Il backend producer deve fare proxy di queste rotte verso il core notifiche, validando il `wsToken` e iniettando il tenant context server-side.

---

## Flow di autenticazione

```
┌───────────┐  1. login OAuth        ┌───────────┐
│ Frontend  │ ────────────────────▶  │ Backend   │
│ Angular   │                        │ Producer  │
│           │  2. risposta:          │           │
│           │     accessToken +      │           │
│           │     wsToken (rimappato)│           │
│           │ ◀────────────────────  │           │
│           │                        │           │
│           │  3. setToken(wsToken)  │           │
│  Notify   │  in localStorage       │           │
│  Auth     │                        │           │
│  Service  │                        │           │
└───────────┘                        └───────────┘
      │
      │ 4. <notify-bell> ngOnInit
      ▼
┌─────────────────────┐         ┌──────────────┐
│ NotifyInboxService  │───HTTP──│ Backend      │
│ bootstrap()         │  proxy  │ Producer     │
└─────────────────────┘         └──────┬───────┘
                                       │ proxy
                                       ▼
                                ┌──────────────┐
                                │ Core         │
                                │ Notifiche    │
                                └──────────────┘
┌─────────────────────┐
│ NotifySocketService │───WS────────────▶  Core Socket.IO
│ connect()           │  auth: { token }
└─────────────────────┘
```

Il `wsToken` è **separato** dall'OAuth `accessToken` perché il core notifiche richiede claim specifici (`tenant_id`, `iss`, `aud`) che il token OAuth potrebbe non avere. Il backend producer fa il rimapping.

> **TODO**: la versione attuale salva `notify_token` in `localStorage`. Future release useranno storage in-memory + re-exchange automatico per ridurre superficie XSS.

---

## API esposta

### Provider

```typescript
provideNotifyUi(config: NotifyUiConfig): EnvironmentProviders
```

### Componenti standalone

| Componente | Selector | Uso |
|---|---|---|
| `NotifyBellComponent` | `<notify-bell>` | Bell icon + badge + trigger dropdown |
| `NotifyDropdownComponent` | `<notify-dropdown>` | Pannello lista notifiche (renderizzato dal bell, raramente usato standalone) |

### Servizi (iniettabili)

```typescript
import {
  NotifyAuthService,    // setToken / getToken / clear
  NotifyInboxService,   // bootstrap / markRead / markAllRead / state$
  NotifySocketService,  // connect / disconnect / events$
  NotifyRouterService,  // handleClick(notification)
  NotifyToastService,   // show(notification)
} from '@ottimis/ermes-ng';
```

#### `NotifyAuthService`

```typescript
notifyAuth.setToken(token: string | null): void
notifyAuth.getToken(): string | null
notifyAuth.clear(): void
```

#### `NotifyInboxService`

```typescript
inbox.bootstrap(): Observable<NotifyNotification[]>
inbox.markRead(uuid: string): Observable<void>
inbox.markAllRead(): Observable<void>
inbox.notifications$: Observable<NotifyNotification[]>
inbox.unreadCount$: Observable<number>
```

#### `NotifySocketService`

```typescript
socket.connect(): void
socket.disconnect(): void
socket.events$: Observable<NotifyNotification>
```

---

## Esempio completo

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNotifyUi } from '@ottimis/ermes-ng';
import { environment } from './environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter(routes),
    provideAnimations(),
    provideNotifyUi({
      coreHttpUrl: environment.notifyHttp,
      coreWsUrl:   environment.notifyWs,
      enableToast: true,
      resolvers: {
        'contract.termination.completed': (n) => ({
          commands: ['/contratto', n.entity_id],
          queryParams: { highlight: n.notification_uuid },
        }),
        default: (n) => ({ commands: ['/notifications', n.notification_uuid] }),
      },
    }),
  ],
};
```

```typescript
// sign-in.component.ts (estratto)
import { Component, inject } from '@angular/core';
import { NotifyAuthService } from '@ottimis/ermes-ng';

export class SignInComponent {
  private notifyAuth = inject(NotifyAuthService);

  onUserInfoLoaded(userInfo: any) {
    if (userInfo.wsToken) {
      this.notifyAuth.setToken(userInfo.wsToken);
    }
  }
}
```

```html
<!-- layout.component.html -->
<header>
  <notify-bell></notify-bell>
</header>
```

---

## Troubleshooting

| Sintomo | Causa probabile | Fix |
|---|---|---|
| Bell non compare | Componente non importato in `imports: []` | Aggiungi `NotifyBellComponent` agli `imports` del componente layout |
| `WS connect_error` in console | CORS gateway non whitelista origin | Configura origin frontend nel CORS lato gateway |
| `401` su `/notifications` | `wsToken` mancante o scaduto | Verifica che `NotifyAuthService.setToken()` sia chiamato post-login |
| Nessun evento live ma HTTP funziona | User non in user-room | Controlla claim `tenant_id` + `sub` nel `wsToken` lato gateway |
| Badge non si aggiorna live | Click handler non chiama `markRead` | Usa `<notify-bell>` invece di gestire dropdown manualmente |
| Toast non appare | `enableToast: false` o `provideAnimations()` mancante | Setta `enableToast: true` + aggiungi `provideAnimations()` |

---

## Sicurezza

- Il `notify_token` è salvato in `localStorage` — **vulnerabile a XSS**. Tratta il backend producer e tutti gli script caricati come trusted.
- Il token JWT include `exp` e viene validato dal gateway. Token scaduti restituiscono `401`.
- Il `tenant_id` nel token è verificato server-side contro la config tenant — il client **non sceglie** la propria room.

---

## Compatibilità

| Lib | Angular | Material | CDK |
|---|---|---|---|
| `0.1.x` | `^17.0.0` | `^17.0.0` | `^17.0.0` |

---

## Licenza

ISC © Ottimis
