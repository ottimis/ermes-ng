# Changelog

Tutte le modifiche rilevanti, per versione. Il progetto segue il semver: fino alla 1.0 le minor
possono aggiungere, mai togliere né cambiare firme esistenti.

## 0.3.0 — 2026-09-16

Additiva: nessuna firma o comportamento della 0.2 cambia. Le novità si attivano per configurazione.

### Eventi dati e tempo reale
- `NotifySocketService.events$` (tutti gli eventi applicativi del socket, grezzi) e
  `dataEvents$` (solo `data.event`, tipizzato `NotifyDataEvent`). La campanella li ignora.
- `setFocus(payload)` / `getFocus()`: dichiara cosa guarda l'utente; inviato subito se connesso e
  **reinviato a ogni `connect`**. `null` smette di dichiarare.
- `reconnected$`: emette dopo ogni handshake successivo al primo.
- `reconnect()` e la proprietà sincrona `status`.
- Config `dataEventName` (default `'data.event'`).

### Socket
- `connect()` riapre il socket quando il token è cambiato (prima teneva il primo socket e la sua room).
- Riconnessione con backoff 1–10 s dopo `io server disconnect`, che socket.io-client non ritenta.
- Con `coreWsUrl` vuoto il servizio resta `idle` e avvisa una volta (prima: tentativi verso `https://` in loop).
- I frame `notification.new` malformati (senza `notification_uuid`) o con `live: true` non entrano
  nell'inbox.
- `disconnect()` toglie anche i listener `onAny`.
- La logica vive in `NotifySocketCore`, senza Angular, esportato e coperto da test.

### Configurazione
- `labels` (tutte le stringhe UI, default italiano), `icons` (nomi `svgIcon`), `dateFormat`.
- `persistToken` (default `true` = `localStorage` come in 0.2; `false` = solo memoria).
- `httpAuth: 'wsToken' | 'none'`.
- `resyncOnReconnect`: `bootstrap()` dell'inbox a ogni riconnessione.
- `theme.cssVarsTarget: 'root' | 'body'`: dove scrivere le `--ermes-*`; con `'body'` il bridge Fuse
  funziona. Il bridge si attiva solo se Fuse è rilevato sull'elemento di destinazione; se Fuse è su
  `body` e la destinazione è `<html>`, un avviso una volta in console.
- `theme.layout`: `header` (`filled | plain`), `severityIcon` (`solid | tinted`), `badge`
  (`shape`, `placement`, `size`, `offset`).
- Nuovi token colore: `panelBorder`, `headerBg`, `headerFg`, `headerBorder`, `rowBg`, `rowBgHover`,
  `rowDivider`, `severityIconFg`, `scrollbarThumb`, `scrollbarTrack`, `badgeBorder`; `theme.dark` li
  accetta tutti.

### Componenti
- Layout della tendina e del badge in CSS della libreria: non serve più Tailwind nel consumer. Le
  classi `notify-panel`, `notify-header`, `notify-severity--*`, `notify-badge`, `divide-y`,
  `overflow-y-auto` restano per compatibilità con gli override esistenti.
- Il badge porta `data-len` (1, 2, 3) per adattare il corpo delle cifre.
- Accessibilità: `aria-label` con conteggio, `aria-haspopup`/`aria-expanded`, regione `aria-live`,
  `role="dialog"`, righe da tastiera (`Tab`, `Invio`, `Spazio`), `Esc` chiude e il focus torna al bottone.
- Il toast ignora gli eventi dati.

### Inbox
- `error$` con `{ operation, error }`; `markRead`/`markAllRead` fanno rollback dell'aggiornamento
  ottimistico se la richiesta fallisce.
- Con `enableLiveBadgeOnly: true` il badge ora **si aggiorna**: in 0.2 il conteggio derivava dalla
  lista, che in quella modalita' non viene toccata, quindi non saliva mai. Le live non lette si
  contano a parte (`noteLiveUnread`), azzerate da `bootstrap()` e `markAllRead()`.

### Interni
- I fallback dei token CSS sono dichiarati **una volta** sull'host di ogni componente
  (`NOTIFY_HOST_TOKENS_CSS`, variabili private `--_ermes-*` derivate dalle `--ermes-*` pubbliche
  con il default del tema); le regole leggono solo le private. Un test tiene il blocco uguale al
  generatore `notifyHostTokensCss()`, che parte da `NOTIFY_UI_DEFAULT_THEME`.
- Icone di severita' in **una** regola CSS (colore per classe via `--notify-sev`), anche nella
  variante `tinted`. Icone di default in `NOTIFY_UI_DEFAULT_ICONS` + `resolveIcons()`.
- Il listener `prefers-color-scheme` viene rimosso alla distruzione dell'injector (`DestroyRef`).

### Progetto
- Test con vitest (`pnpm test`), workflow CI su push e pull request (typecheck, test, build).
- Peer dependencies `>=17.0.0 <21.0.0`.
- `applyDarkMode` restituisce la funzione di teardown del listener; `injectToastStyles` accetta il
  nonce CSP (`CSP_NONCE`).
- README riscritto e allineato al codice (in 0.2 documentava `events$`, `state$` e firme inesistenti).

## 0.2.1 — 2026-05-19
- La campanella reagisce a `NotifyAuthService.token$`: bootstrap e connect quando il token arriva,
  disconnect e clear quando viene rimosso.

## 0.2.0
- Tema via `provideNotifyUi({ theme })` e CSS custom properties `--ermes-*`, dark mode, bridge Fuse.

## 0.1.x
- Prima versione: campanella, inbox HTTP, socket `notification.new`, resolver, toast.
