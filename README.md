# @ottimis/ermes-ng

Libreria Angular standalone per integrare la piattaforma di notifiche **Ermes** in un frontend Angular 17–20.

Fornisce:

- `<notify-bell>`: campanella con badge dei non letti e tendina (CDK overlay), accessibile da tastiera
- connessione Socket.IO al core Ermes, riconnessione automatica anche dopo una disconnessione decisa dal server
- bootstrap dell'inbox via HTTP e merge deduplicato con le notifiche live
- **eventi dati** (`data.event`) per aggiornare le pagine in tempo reale, con `setFocus()` per dichiarare cosa sta guardando l'utente
- resolver `topic → route` per la navigazione al click
- toast `MatSnackBar` opzionale
- tema completo via TypeScript o CSS custom properties, etichette traducibili, icone configurabili

---

## Requisiti

| Dipendenza | Versione | Note |
|---|---|---|
| `@angular/core`, `@angular/common`, `@angular/router` | `>=17 <21` | standalone API |
| `@angular/cdk`, `@angular/material` | `>=17 <21` | overlay, icon button, tooltip, snackbar |
| `rxjs` | `^7` | — |
| `@angular/animations` | come Angular | richiesto da Material: `provideAnimations()` |

`socket.io-client` (`^4.7`) è una dipendenza diretta della libreria: non va installato a parte.

Serve inoltre un **backend producer** che:

- esponga le API dell'inbox (`/notifications/*`, vedi [Endpoint attesi](#endpoint-backend-attesi));
- emetta un **JWT WebSocket** dedicato (`wsToken`) con claim `iss`, `aud`, `sub`, `tenant_id`, `roles`, `exp`.

Le icone usano `<mat-icon [svgIcon]>` con i nomi Heroicons registrati da Fuse (`heroicons_outline:bell`, …). Senza quel registro, passa i tuoi nomi in [`icons`](#icone).

---

## Installazione

```bash
npm install @ottimis/ermes-ng
# oppure
pnpm add @ottimis/ermes-ng
```

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
        default: () => ({ commands: ['/'] }),
      },
    }),
  ],
};
```

### 2. Token dopo il login

Il backend restituisce un `wsToken` dedicato con la risposta di login. Passalo a `NotifyAuthService`: la campanella fa bootstrap e connessione da sola, e li rifà quando il token cambia (altro utente, altra organizzazione).

```typescript
import { Component, inject } from '@angular/core';
import { NotifyAuthService } from '@ottimis/ermes-ng';

export class SignInComponent {
  private notifyAuth = inject(NotifyAuthService);

  onLoginSuccess(response: { wsToken?: string }) {
    this.notifyAuth.setToken(response.wsToken ?? null);
  }
}
```

### 3. Pulizia al logout

```typescript
signOut() {
  this.notifyAuth.clear(); // disconnette il socket e svuota l'inbox
}
```

### 4. Componente nel layout

```typescript
import { NotifyBellComponent } from '@ottimis/ermes-ng';

@Component({
  standalone: true,
  imports: [NotifyBellComponent],
  template: `<notify-bell></notify-bell>`,
})
export class LayoutComponent {}
```

---

## Configurazione `provideNotifyUi`

| Campo | Tipo | Default | Descrizione |
|---|---|---|---|
| `coreHttpUrl` | `string` | **richiesto** | Base URL delle API inbox (il backend producer che proxa il core) |
| `coreWsUrl` | `string` | **richiesto** | Origin Socket.IO del core. Stringa vuota = socket disattivato, la campanella lavora solo via HTTP |
| `resolvers` | `Record<string, NotifyResolver>` | — | Mappa `topic → { commands, queryParams, fragment }` per la navigazione al click. `default` come fallback; `null` = nessuna navigazione |
| `tokenProvider` | `() => string \| null` | — | Sorgente di ripiego del token se non usi `setToken()` |
| `enableToast` | `boolean` | `false` | `MatSnackBar` su ogni notifica live |
| `enableLiveBadgeOnly` | `boolean` | `false` | Aggiorna solo il badge, non la lista |
| `maxInboxSize` | `number` | `100` | Notifiche tenute in memoria |
| `theme` | `NotifyTheme` | — | Vedi [Theming](#theming) |
| `labels` | `Partial<NotifyUiLabels>` | italiano | Vedi [Etichette](#etichette-i18n) |
| `icons` | `NotifyUiIcons` | Heroicons | Vedi [Icone](#icone) |
| `persistToken` | `boolean` | `true` | `false` = token solo in memoria, mai in `localStorage` (consigliato per le app che lo ricevono col login) |
| `httpAuth` | `'wsToken' \| 'none'` | `'wsToken'` | Header `Authorization` sulle chiamate inbox. `'none'` se un tuo interceptor le autentica già con il token di sessione |
| `resyncOnReconnect` | `boolean` | `false` | Ricarica l'inbox dopo ogni riconnessione del socket |
| `dataEventName` | `string` | `'data.event'` | Nome Socket.IO degli eventi dati |
| `dateFormat` | `string` | `'dd MMM, HH:mm'` | Formato `DatePipe` della data nelle righe (segue `LOCALE_ID`) |

### Tipo `NotifyResolver`

```typescript
type NotifyResolver = (n: NotifyNotification) => {
  commands: unknown[];
  queryParams?: Record<string, string | number | boolean | null | undefined>;
  fragment?: string;
} | null;
```

---

## Eventi dati e tempo reale

Oltre alle notifiche (persistite nell'inbox, contate fra i non letti, mostrate dalla campanella) il core Ermes può emettere **eventi dati**: frame non persistiti che dicono a una pagina «qualcosa che stai guardando è cambiato, rileggi». Arrivano sullo stesso socket con il nome `data.event`, hanno la forma di una notifica più `live: true`, e **la campanella li ignora**: niente badge, niente toast, niente inbox.

```typescript
import { Injectable, inject } from '@angular/core';
import { NotifySocketService } from '@ottimis/ermes-ng';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly socket = inject(NotifySocketService);

  /** Solo i frame `data.event`, già tipizzati. */
  readonly changes$ = this.socket.dataEvents$;

  /** Dopo una riconnessione il client ha perso ciò che è passato: si rilegge la pagina. */
  readonly resync$ = this.socket.reconnected$;

  /** Dichiara cosa sta guardando l'utente (il payload è opaco per la libreria). */
  watch(urls: 'all' | number[]) {
    this.socket.setFocus({ urls });
  }
}
```

Regole:

- **`setFocus(payload)`** memorizza il payload, lo invia subito se il socket è connesso e **lo reinvia a ogni `connect`** (riconnessione automatica o ricreazione del socket): il server lo conserva per socket, e una riconnessione è un socket nuovo. `setFocus(null)` smette di dichiarare. Il contenuto lo decide il backend producer; la libreria non lo interpreta.
- **`dataEvents$`** filtra `events$` sul nome configurato (`dataEventName`). `events$` è il flusso grezzo di tutti gli eventi applicativi, `notification.new` compreso: chi lo usa insieme a `live$` vede la stessa notifica due volte, di proposito.
- **`reconnected$`** emette dopo ogni handshake successivo al primo. Gli eventi dati non sono recuperabili: alla riconnessione si rilegge.
- **Scadenza del token.** Il core valida il `wsToken` all'handshake e, quando lo chiuderà anche a scadenza (`exp`), il socket riceverà `io server disconnect`: la libreria riprova con backoff 1–10 s, e con un token scaduto ogni tentativo finisce in `connect_error` (`status$ = 'error'`) finché l'app non chiama `setToken()` con un token nuovo, che riapre il socket. Rinnova il token con la tua sessione (login, refresh) e passalo alla libreria ogni volta.
- Deduplica su `notification_uuid` e scarta i frame con `payload.emitted_at` più vecchio della tua ultima lettura.
- Non dedurre lo stato dall'evento: è un campanello, il dato si rilegge dalla tua API.

Un frame `data.event`:

```json
{
  "notification_uuid": "27418bc3-…",
  "topic": "issue.opened",
  "title": "issue.opened",
  "body": null,
  "severity": "error",
  "entity_type": "url",
  "entity_id": "29",
  "payload": { "idurl": 29, "idissue": 4242, "emitted_at": "2026-09-16T11:08:22Z" },
  "read_at": null,
  "created_at": "2026-09-16T11:08:22.047Z",
  "live": true
}
```

---

## Theming

Colori, raggi, spaziature, tipografia e dark mode si configurano da TypeScript; tutto finisce in CSS custom properties `--ermes-*` che puoi anche sovrascrivere da CSS. Senza configurazione la libreria usa una palette blu compatibile con Fuse.

### Override TypeScript

```typescript
provideNotifyUi({
  coreHttpUrl: '...',
  coreWsUrl: '...',
  theme: {
    colors: {
      primary: '#4f46e5',
      primaryFg: '#ffffff',
      badgeBg: '#4f46e5',
      severity: { error: '#e11d48', warning: '#d97706', success: '#16a34a', info: '#4f46e5' },
      // nuovi in 0.3: pannello, header, righe, scrollbar, bordo del badge
      panelBorder: 'rgba(241,245,249,0.12)',
      headerFg: '#94a3b8',
      headerBorder: 'rgba(241,245,249,0.12)',
      rowBg: 'rgba(30,41,59,0.5)',
      rowBgHover: 'rgba(30,41,59,1)',
      rowDivider: 'rgba(241,245,249,0.12)',
      scrollbarThumb: 'rgba(148,163,184,0.3)',
      scrollbarTrack: '#0f172a',
      badgeBorder: '#818cf8',
    },
    layout: {
      header: 'plain',          // header trasparente separato da un bordo (default 'filled')
      severityIcon: 'tinted',   // disco traslucido + anello + glifo colorato (default 'solid')
      badge: { shape: 'circle', placement: 'corner', size: '18px', offset: '-4px' },
    },
    radius: { sm: '5px', md: '8px', full: '9999px' },
    typography: { fontFamily: '"Inter var", system-ui, sans-serif', fontSizeSm: '0.75rem', fontSizeMd: '0.875rem', fontWeightBold: '500' },
    darkMode: 'always',
    dark: { surface: '#1e293b', surfaceFg: '#ffffff', textSecondary: '#94a3b8' },
  },
});
```

I valori in `theme.colors.*` vincono sempre sul bridge Fuse.

### Varianti strutturali (`theme.layout`, 0.3)

| Campo | Valori | Default | Effetto |
|---|---|---|---|
| `header` | `filled` \| `plain` | `filled` | `plain`: header trasparente, testo in `textSecondary`, separato da `headerBorder` |
| `severityIcon` | `solid` \| `tinted` | `solid` | `tinted`: cerchio al 40% del colore di severità, anello 2px al 50%, glifo nel colore pieno (`color-mix()`, con ripiego a `solid` sui browser vecchi) |
| `badge.shape` | `pill` \| `circle` | `pill` | `circle`: cerchio fisso di `badge.size`, il corpo delle cifre si adatta a 1, 2 o «99+» caratteri |
| `badge.placement` | `inline` \| `corner` | `inline` | `corner`: ancorato all'angolo in alto a destra del bottone, sporgendo di `badge.offset` |
| `badge.size` | lunghezza CSS | `18px` | diametro del cerchio |
| `badge.offset` | lunghezza CSS | `-4px` | sporgenza in `corner` |

### Bridge Fuse

Con `themeBridge: 'auto'` (default) la libreria cerca `--fuse-primary` e, se lo trova, mappa `primary`, `primaryFg`, `surface`, `textSecondary` su `var(--fuse-*)`.

⚠️ Fuse dichiara le sue variabili su `body`, mentre le `--ermes-*` vengono scritte su `<html>`: una `var(--fuse-*)` scritta lì non si risolve. Per questo il bridge si attiva **solo** se Fuse è rilevato sull'elemento che riceve le variabili. Su un'app Fuse imposta:

```typescript
theme: { cssVarsTarget: 'body' }
```

e il bridge funziona. In alternativa passa i colori a mano in `theme.colors`. Senza `cssVarsTarget: 'body'` la libreria lo dice una volta in console.

`themeBridge: 'fuse'` forza il bridge, `'standalone'` lo spegne.

### Override CSS

```css
/* styles.css del consumer (o `body { … }` se cssVarsTarget = 'body') */
:root {
  --ermes-color-primary: #ec4899;
  --ermes-radius-md: 0;
}
```

### Dark mode

```typescript
theme: { darkMode: 'auto' }   // segue prefers-color-scheme (default)
theme: { darkMode: 'always' } // sempre dark
theme: { darkMode: 'never' }  // sempre light
```

`theme.dark` sovrascrive i colori della palette scura integrata; accetta tutte le chiavi di `colors`.

### Tabella delle CSS variables

| Variable | Default light | Default dark |
|---|---|---|
| `--ermes-color-primary` | `#1e40af` | (eredita) |
| `--ermes-color-primary-fg` | `#ffffff` | (eredita) |
| `--ermes-color-surface` | `#ffffff` | `#1e293b` |
| `--ermes-color-surface-fg` | `#0f172a` | `#f1f5f9` |
| `--ermes-color-text-secondary` | `#64748b` | `#94a3b8` |
| `--ermes-color-badge-bg` | `#0d9488` | (eredita) |
| `--ermes-color-badge-fg` | `#eef2ff` | (eredita) |
| `--ermes-color-badge-border` | nessuno | — |
| `--ermes-color-empty-icon-bg` | `#dbeafe` | `#1e3a8a` |
| `--ermes-color-empty-icon-fg` | `#1d4ed8` | `#bfdbfe` |
| `--ermes-color-severity-error` | `#ef4444` | (eredita) |
| `--ermes-color-severity-warning` | `#f59e0b` | (eredita) |
| `--ermes-color-severity-success` | `#22c55e` | (eredita) |
| `--ermes-color-severity-info` | `#3b82f6` | (eredita) |
| `--ermes-color-severity-icon-fg` | `#ffffff` (solid) / colore di severità (tinted) | — |
| `--ermes-color-panel-border` | nessuno | — |
| `--ermes-color-header-bg` | `primary` (filled) / trasparente (plain) | — |
| `--ermes-color-header-fg` | `primaryFg` (filled) / `textSecondary` (plain) | — |
| `--ermes-color-header-border` | nessuno (filled) / `rowDivider` (plain) | — |
| `--ermes-color-row-bg` | trasparente | — |
| `--ermes-color-row-bg-hover` | `rgba(0,0,0,0.03)` | — |
| `--ermes-color-row-divider` | `#e5e7eb` | — |
| `--ermes-color-scrollbar-thumb` | browser | — |
| `--ermes-color-scrollbar-track` | trasparente | — |
| `--ermes-badge-size` | `18px` | — |
| `--ermes-badge-offset` | `-4px` | — |
| `--ermes-radius-sm` / `-md` / `-full` | `0.25rem` / `1rem` / `9999px` | — |
| `--ermes-spacing-xs` / `-sm` / `-md` / `-lg` | `0.25rem` / `0.5rem` / `1rem` / `1.5rem` | — |
| `--ermes-font-family` | `inherit` | — |
| `--ermes-font-size-sm` / `-md` | `0.875rem` / `1rem` | — |
| `--ermes-font-weight-bold` | `600` | — |

### Token privati

Ogni regola dei componenti legge una variabile privata `--_ermes-*` dichiarata sull'host come
`var(--ermes-*, <default del tema>)`. Per te non cambia niente: sovrascrivi le `--ermes-*` pubbliche
da `provideNotifyUi` o da CSS, ovunque nell'albero. Le private servono a tenere ogni default in un
posto solo (`NOTIFY_HOST_TOKENS_CSS`, generato da `NOTIFY_UI_DEFAULT_THEME`).

### Classi stabili

Il layout della tendina è CSS della libreria (dalla 0.3 non richiede Tailwind nel consumer). Le classi `notify-panel`, `notify-header`, `notify-row`, `notify-severity--{severity}`, `notify-badge`, `divide-y` e `overflow-y-auto` restano stabili per chi le stila da fuori; preferisci comunque i token e `theme.layout`, che non dipendono dal markup.

### Toast

Con `enableToast: true` la libreria apre `MatSnackBar` con classi `notify-toast--{severity}` e colore di fondo da `--ermes-color-severity-*`. Il `<style>` è iniettato una volta; con una Content-Security-Policy a nonce usa `CSP_NONCE` di Angular: la libreria lo applica al tag.

---

## Etichette (i18n)

Tutte le stringhe della UI sono configurabili. Default in italiano.

```typescript
provideNotifyUi({
  ...,
  labels: {
    bellTooltip: 'Notifications',
    bellAriaLabel: 'Notifications, {count} unread',
    panelTitle: 'Notifications',
    markAllRead: 'Mark all as read',
    close: 'Close',
    unread: 'Unread',
    emptyTitle: 'No notifications',
    emptyBody: 'Notifications you receive will show up here.',
    toastDismiss: 'Dismiss',
  },
});
```

`{count}` in `bellAriaLabel` viene sostituito con il numero di non letti. Il formato della data segue `LOCALE_ID` dell'app e `dateFormat`.

## Icone

```typescript
icons: {
  bell: 'heroicons_outline:bell',
  close: 'heroicons_solid:x-mark',
  markAllRead: 'heroicons_solid:envelope-open',
  empty: 'heroicons_outline:bell',
  severity: { error: 'heroicons_solid:exclamation-triangle', warning: '…', success: '…', info: '…' },
}
```

Sono nomi del registro `MatIconRegistry` (`svgIcon`). I default sono quelli registrati da Fuse.

## Accessibilità

Bottone con `aria-label` (conteggio incluso), `aria-haspopup`, `aria-expanded`; regione `aria-live` per il conteggio; tendina `role="dialog"`; righe raggiungibili da tastiera (`Tab`, `Invio`, `Spazio`); `Esc` chiude la tendina e il focus torna alla campanella.

---

## Modello notifica

```typescript
interface NotifyNotification {
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
  live?: boolean;   // true solo sugli eventi dati
}

interface NotifyDataEvent extends NotifyNotification { live: true }
interface NotifySocketEvent<T = unknown> { event: string; data: T }
```

Guard: `isNotifyNotification(x)`, `isNotifyDataEvent(x)`. La libreria scarta con un `console.warn` i frame `notification.new` malformati (senza `notification_uuid`).

---

## Endpoint backend attesi

Con `httpAuth: 'wsToken'` (default) le chiamate portano `Authorization: Bearer <wsToken>`.

| Method | Path | Risposta |
|---|---|---|
| GET | `/notifications?status=all&limit=50` | `{ items: NotifyNotification[], pagination: {...} }` |
| GET | `/notifications/unread-count` | `{ count: number }` |
| POST | `/notifications/:uuid/read` | `204` |
| POST | `/notifications/read-all` | `204` |

---

## API esposta

### Provider

```typescript
provideNotifyUi(config: NotifyUiConfig): EnvironmentProviders
```

### Componenti standalone

| Componente | Selector | Uso |
|---|---|---|
| `NotifyBellComponent` | `<notify-bell>` | campanella, badge, tendina |
| `NotifyDropdownComponent` | `<notify-dropdown>` | la lista (montata dalla campanella; usabile da sola con `[notifications]`, `[unreadCount]`, `(close)`) |

### `NotifyAuthService`

```typescript
setToken(token: string | null): void
getToken(): string | null
clear(): void
token$: Observable<string | null>
```

### `NotifyInboxService`

```typescript
bootstrap(limit = 50): Observable<NotifyInboxListResponse>
unreadCount(): Observable<number>
markRead(uuid: string): Observable<void>       // ottimistico, con rollback su errore
markAllRead(): Observable<void>                // idem
upsert(n: NotifyNotification): void
clear(): void
notifications$: Observable<NotifyNotification[]>
unreadCount$: Observable<number>
error$: Observable<NotifyInboxError>           // { operation, error } — nuovo in 0.3
```

### `NotifySocketService`

```typescript
connect(): void                 // idempotente per lo stesso token; riapre il socket se il token cambia
disconnect(): void
reconnect(): void               // nuovo in 0.3
setFocus(payload: unknown): void   // nuovo in 0.3; null = smetti di dichiarare
getFocus(): unknown
status: NotifySocketStatus      // 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'
status$: Observable<NotifySocketStatus>
live$: Observable<NotifyNotification>                     // solo notification.new
events$: Observable<NotifySocketEvent>                    // nuovo in 0.3: tutti gli eventi, grezzi
dataEvents$: Observable<NotifySocketEvent<NotifyDataEvent>>  // nuovo in 0.3: solo data.event
reconnected$: Observable<void>                            // nuovo in 0.3
```

`NotifySocketCore` (senza Angular) è esportato per chi vuole testare la logica di connessione con un socket finto.

### `NotifyRouterService` / `NotifyToastService`

```typescript
routerService.handleClick(n: NotifyNotification): void
toast.show(n: NotifyNotification): void   // ignora gli eventi dati
```

---

## Migrazione da 0.2

Niente da cambiare: ogni firma e ogni comportamento della 0.2 restano uguali, le novità sono opzionali. Cose che potresti voler togliere dal tuo codice:

- il `disconnect()` manuale prima di `setToken()` a cambio utente: ora `connect()` riapre il socket da solo;
- la guardia su `coreWsUrl` vuoto: ora la libreria resta ferma (con un avviso) invece di tentare `https://` in loop;
- gli override CSS su `.notify-panel`, `.notify-header`, `.divide-y > *`, `.notify-badge`: quasi tutti hanno ora un token o una variante in `theme.layout`;
- la direttiva che scrive `data-len` sul badge: la libreria lo scrive da sé.

Consigliato per le app che ricevono il token col login: `persistToken: false`.

⚠️ Se l'app usa Fuse e vuoi il bridge automatico: `theme.cssVarsTarget = 'body'`.

---

## Troubleshooting

| Sintomo | Causa probabile | Fix |
|---|---|---|
| Bell non compare | componente non importato | aggiungi `NotifyBellComponent` agli `imports` del layout |
| `connect_error` in console | CORS del core non ammette l'origin | configura l'origin del frontend nel core Ermes |
| `401` su `/notifications` | `wsToken` mancante o scaduto | verifica `setToken()` dopo il login; se il tuo interceptor sovrascrive `Authorization`, usa `httpAuth: 'none'` |
| Nessun evento live ma HTTP funziona | claim `tenant_id`/`sub` del token non corrispondono ai destinatari | controlla il `wsToken` lato producer |
| Nessun `data.event` | il client non ha dichiarato il focus | chiama `setFocus()`; il core emette solo a chi è online e con focus dichiarato |
| Avviso «coreWsUrl is empty» | `coreWsUrl: ''` | valorizzalo con l'origin del core, o ignoralo se vuoi solo l'inbox HTTP |
| Avviso «Fuse theme detected on body» | bridge Fuse non risolvibile su `<html>` | `theme.cssVarsTarget = 'body'` |
| Toast non appare | `enableToast: false` o `provideAnimations()` mancante | abilita entrambi |
| Icone vuote | registro Heroicons assente | passa i tuoi nomi in `icons` |

---

## Sicurezza

- Con `persistToken: true` (default) il token sta in `localStorage['notify_token']` ed è leggibile da uno script XSS. `persistToken: false` lo tiene in memoria: consigliato quando il backend lo restituisce col login.
- Il token include `exp` ed è validato dal core; il `tenant_id` è verificato server-side e la room la decide il server, non il client.
- I payload ricevuti dal socket sono validati strutturalmente prima di entrare nell'inbox; `title` e `body` sono renderizzati come testo, mai come HTML.
- Il `<style>` dei toast accetta il nonce di `CSP_NONCE`.

---

## Compatibilità

| Lib | Angular / Material / CDK |
|---|---|
| `0.3.x` | `>=17 <21` |
| `0.2.x` | `^17` |
| `0.1.x` | `^17` |

Il bundle è compilato in partial compilation Angular 17 e viene linkato dal compilatore dell'app.

## Sviluppo

```bash
pnpm install --frozen-lockfile   # pnpm 9 (come la CI)
pnpm typecheck
pnpm test
pnpm build                       # dist/
```

Storico delle versioni in [CHANGELOG.md](./CHANGELOG.md).

## Licenza

ISC © Ottimis
