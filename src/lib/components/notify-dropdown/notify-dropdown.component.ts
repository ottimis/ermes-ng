import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NOTIFY_UI_CONFIG } from '../../config/notify-ui-config';
import {
  NOTIFY_DEFAULT_DATE_FORMAT,
  resolveIcons,
  resolveLabels,
  resolveLayout,
} from '../../config/notify-ui-defaults';
import { NOTIFY_HOST_TOKENS_CSS } from '../../config/notify-ui-styles';
import { NotifyNotification } from '../../models/notification.model';
import { NotifyInboxService } from '../../services/notify-inbox.service';
import { NotifyRouterService } from '../../services/notify-router.service';

/**
 * The notification list. Layout is the library's own CSS (no Tailwind needed in the consumer).
 * Every colour and size is read from a private `--_ermes-*` token declared once on the host
 * (`NOTIFY_HOST_TOKENS_CSS`), so a default lives in one place only.
 *
 * The class names `notify-panel`, `notify-header`, `notify-row`, `notify-severity--*`, `divide-y`
 * and `overflow-y-auto` are kept stable because consumers style them from outside.
 */
@Component({
  selector: 'notify-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgFor, NgClass, DatePipe, MatButtonModule, MatIconModule, MatTooltipModule],
  styles: [
    NOTIFY_HOST_TOKENS_CSS,
    `
    :host {
      display: block;
      font-family: var(--_ermes-font-family);
    }

    .notify-panel {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background-color: var(--_ermes-surface);
      color: var(--_ermes-surface-fg);
      box-shadow:
        0 0 0 1px var(--_ermes-panel-border),
        0 10px 15px -3px rgba(0, 0, 0, 0.1),
        0 4px 6px -4px rgba(0, 0, 0, 0.1);
    }
    @media (min-width: 640px) {
      .notify-panel {
        position: static;
        inset: auto;
        width: 22.5rem;
        min-width: 22.5rem;
        border-radius: var(--_ermes-radius-md);
      }
      .notify-close { display: none; }
      .notify-list { max-height: 30rem; }
    }

    /* Header: filled on primary by default; \`plain\` is transparent and separated by a border. */
    .notify-header {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      padding: 1rem 1rem 1rem 1.5rem;
      background-color: var(--ermes-color-header-bg, var(--_ermes-primary));
      color: var(--ermes-color-header-fg, var(--_ermes-primary-fg));
      border-bottom: 1px solid var(--ermes-color-header-border, transparent);
    }
    :host(.notify-panel--header-plain) .notify-header {
      background-color: var(--ermes-color-header-bg, transparent);
      color: var(--ermes-color-header-fg, var(--_ermes-text-secondary));
      border-bottom-color: var(--ermes-color-header-border, var(--_ermes-row-divider));
    }
    .notify-close { margin: 0 0.75rem 0 -0.25rem; }
    .notify-header-title {
      font-size: 1.125rem;
      font-weight: 500;
      line-height: 2.5rem;
    }
    .notify-header-actions { margin-left: auto; }
    .notify-header .mat-icon { color: currentColor; }

    .notify-list {
      position: relative;
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--ermes-color-scrollbar-thumb, auto) var(--_ermes-scrollbar-track);
    }
    .notify-list::-webkit-scrollbar { width: 6px; height: 6px; }
    .notify-list::-webkit-scrollbar-thumb {
      background: var(--_ermes-scrollbar-thumb);
      border-radius: var(--_ermes-radius-full);
    }
    .notify-list::-webkit-scrollbar-track,
    .notify-list::-webkit-scrollbar-corner {
      background: var(--_ermes-scrollbar-track);
    }

    .notify-row {
      display: flex;
      cursor: pointer;
      background-color: var(--_ermes-row-bg);
      outline: none;
    }
    /* :where() keeps the specificity low on purpose: consumers that style the divider from
       outside (e.g. \`.cdk-overlay-pane notify-dropdown .divide-y > *\`) must keep winning. */
    :where(.notify-row + .notify-row) { border-top: 1px solid var(--_ermes-row-divider); }
    .notify-row:hover,
    .notify-row:focus-visible {
      background-color: var(--_ermes-row-bg-hover);
    }
    .notify-row:focus-visible { box-shadow: inset 0 0 0 2px var(--_ermes-primary); }
    .notify-row-inner {
      display: flex;
      flex: 1 1 auto;
      padding: 1.25rem 1rem 1.25rem 1.5rem;
      min-width: 0;
    }
    .notify-row-text {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      min-width: 0;
    }
    .notify-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
      line-height: 20px;
    }

    /* Severity disc. One rule; the per-severity class only sets the colour it works with. */
    .notify-severity--error   { --notify-sev: var(--_ermes-severity-error); }
    .notify-severity--warning { --notify-sev: var(--_ermes-severity-warning); }
    .notify-severity--success { --notify-sev: var(--_ermes-severity-success); }
    .notify-severity--info    { --notify-sev: var(--_ermes-severity-info); }
    .notify-severity {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      margin-right: 1rem;
      box-sizing: border-box;
      border-radius: var(--_ermes-radius-full);
      background-color: var(--notify-sev, var(--_ermes-severity-info));
      color: var(--ermes-color-severity-icon-fg, #ffffff);
    }
    .notify-severity .mat-icon { color: inherit; }

    /* Tinted variant: translucent disc, 2px ring, glyph in the severity colour. */
    @supports (background: color-mix(in srgb, red 40%, transparent)) {
      :host(.notify-panel--severity-tinted) .notify-severity {
        background-color: color-mix(in srgb, var(--notify-sev) 40%, transparent);
        border: 2px solid color-mix(in srgb, var(--notify-sev) 50%, transparent);
        color: var(--ermes-color-severity-icon-fg, var(--notify-sev));
      }
      :host(.notify-panel--severity-tinted) .notify-row:hover .notify-severity {
        background-color: color-mix(in srgb, var(--notify-sev) 50%, transparent);
      }
    }

    .notify-title {
      font-weight: var(--_ermes-font-weight-bold);
      font-size: var(--_ermes-font-size-md);
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
    }
    .notify-body {
      font-size: 0.875rem;
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
    .notify-text-secondary {
      color: var(--_ermes-text-secondary);
      font-size: var(--_ermes-font-size-sm);
    }
    .notify-date { margin-top: 0.5rem; line-height: 1; }
    .notify-unread-dot {
      width: 0.5rem;
      height: 0.5rem;
      flex-shrink: 0;
      align-self: flex-start;
      margin-top: 0.5rem;
      background-color: var(--_ermes-primary);
      border-radius: var(--_ermes-radius-full);
    }

    .notify-empty {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
      text-align: center;
    }
    @media (min-width: 640px) {
      .notify-empty { justify-content: flex-start; }
    }
    .notify-empty-icon-bg {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      background-color: var(--_ermes-empty-icon-bg);
      border-radius: var(--_ermes-radius-full);
    }
    .notify-empty-icon-fg { color: var(--_ermes-empty-icon-fg); }
    .notify-empty-title {
      margin-top: 1.25rem;
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.025em;
    }
    .notify-empty-body {
      width: 100%;
      max-width: 15rem;
      margin-top: 0.25rem;
    }
    `,
  ],
  template: `
    <div class="notify-panel" role="dialog" [attr.aria-label]="labels.panelTitle">
      <div class="notify-header">
        <div class="notify-close">
          <button mat-icon-button (click)="close.emit()" [attr.aria-label]="labels.close">
            <mat-icon class="notify-icon" [svgIcon]="icons.close"></mat-icon>
          </button>
        </div>
        <div class="notify-header-title">{{ labels.panelTitle }}</div>
        <div class="notify-header-actions">
          <button
            mat-icon-button
            [matTooltip]="labels.markAllRead"
            [attr.aria-label]="labels.markAllRead"
            [disabled]="unreadCount === 0"
            (click)="onMarkAllRead()"
          >
            <mat-icon class="notify-icon" [svgIcon]="icons.markAllRead"></mat-icon>
          </button>
        </div>
      </div>

      <div class="notify-list divide-y overflow-y-auto" role="list">
        <ng-container *ngFor="let n of notifications; trackBy: trackByFn">
          <div
            class="notify-row"
            role="listitem"
            tabindex="0"
            [ngClass]="{ 'unread': !n.read_at }"
            (click)="onClick(n)"
            (keydown.enter)="onClick(n)"
            (keydown.space)="onClick(n); $event.preventDefault()"
          >
            <div class="notify-row-inner">
              <div class="notify-severity" [ngClass]="severityClass(n.severity)" aria-hidden="true">
                <mat-icon class="notify-icon" [svgIcon]="iconFor(n)"></mat-icon>
              </div>
              <div class="notify-row-text">
                <div class="notify-title">{{ n.title }}</div>
                <div *ngIf="n.body" class="notify-body">{{ n.body }}</div>
                <div class="notify-text-secondary notify-date">
                  {{ n.created_at | date: dateFormat }}
                </div>
              </div>
              <div
                *ngIf="!n.read_at"
                class="notify-unread-dot"
                [matTooltip]="labels.unread"
                [attr.aria-label]="labels.unread"
                role="img"
              ></div>
            </div>
          </div>
        </ng-container>

        <ng-container *ngIf="!notifications || notifications.length === 0">
          <div class="notify-empty">
            <div class="notify-empty-icon-bg">
              <mat-icon class="notify-empty-icon-fg" [svgIcon]="icons.empty"></mat-icon>
            </div>
            <div class="notify-empty-title">{{ labels.emptyTitle }}</div>
            <div class="notify-text-secondary notify-empty-body">{{ labels.emptyBody }}</div>
          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class NotifyDropdownComponent {
  private readonly inbox = inject(NotifyInboxService);
  private readonly routerService = inject(NotifyRouterService);
  private readonly config = inject(NOTIFY_UI_CONFIG);
  private readonly layout = resolveLayout(this.config.theme);

  readonly labels = resolveLabels(this.config);
  readonly icons = resolveIcons(this.config);
  readonly dateFormat = this.config.dateFormat ?? NOTIFY_DEFAULT_DATE_FORMAT;

  @HostBinding('class.notify-panel--header-plain')
  readonly headerPlain = this.layout.header === 'plain';
  @HostBinding('class.notify-panel--severity-tinted')
  readonly severityTinted = this.layout.severityIcon === 'tinted';

  @Input() notifications: NotifyNotification[] = [];
  @Input() unreadCount = 0;
  @Output() close = new EventEmitter<void>();

  onClick(n: NotifyNotification): void {
    this.routerService.handleClick(n);
    this.close.emit();
  }

  onMarkAllRead(): void {
    this.inbox.markAllRead().subscribe({ error: () => {} });
  }

  trackByFn(_: number, item: NotifyNotification): string {
    return item.notification_uuid;
  }

  iconFor(n: NotifyNotification): string {
    return this.icons.severity[n.severity] ?? this.icons.severity.info;
  }

  /** `notify-severity--{severity}`; unknown values fall back to `info`. */
  severityClass(severity: NotifyNotification['severity']): string {
    const known: ReadonlyArray<NotifyNotification['severity']> = ['error', 'warning', 'success', 'info'];
    return `notify-severity--${known.includes(severity) ? severity : 'info'}`;
  }
}
