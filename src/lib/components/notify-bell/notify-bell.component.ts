import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { NOTIFY_UI_CONFIG } from '../../config/notify-ui-config';
import { resolveIcons, resolveLabels, resolveLayout } from '../../config/notify-ui-defaults';
import { NOTIFY_HOST_TOKENS_CSS } from '../../config/notify-ui-styles';
import { NotifyNotification } from '../../models/notification.model';
import { NotifyAuthService } from '../../services/notify-auth.service';
import { NotifyInboxService } from '../../services/notify-inbox.service';
import { NotifySocketService } from '../../services/notify-socket.service';
import { NotifyToastService } from '../../services/notify-toast.service';
import { NotifyDropdownComponent } from '../notify-dropdown/notify-dropdown.component';

@Component({
  selector: 'notify-bell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, MatButtonModule, MatIconModule, MatTooltipModule, NotifyDropdownComponent],
  styles: [
    NOTIFY_HOST_TOKENS_CSS,
    `
    :host {
      display: inline-block;
      font-family: var(--_ermes-font-family);
    }
    .notify-bell-button { position: relative; }
    .notify-bell-icon {
      width: 24px;
      height: 24px;
      font-size: 24px;
      line-height: 24px;
    }

    /* Badge container: inline placement (0.2 look), centered above the icon. */
    .notify-badge-anchor {
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 0.75rem;
      pointer-events: none;
    }
    .notify-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      min-width: 1rem;
      height: 1rem;
      padding: 0 0.25rem;
      margin-left: 1rem;
      margin-top: 0.625rem;
      box-sizing: border-box;
      background-color: var(--_ermes-badge-bg);
      color: var(--_ermes-badge-fg);
      border-radius: var(--_ermes-radius-full);
      font-size: var(--_ermes-font-size-sm);
      font-weight: var(--_ermes-font-weight-bold);
      line-height: 1;
      box-shadow: 0 0 0 1px var(--_ermes-badge-border);
    }

    /* Corner placement: anchored to the top-right of the button, overflowing by the offset. */
    :host(.notify-bell--badge-corner) .notify-badge-anchor {
      top: var(--_ermes-badge-offset);
      right: var(--_ermes-badge-offset);
      left: auto;
      height: auto;
      justify-content: flex-end;
      z-index: 2;
    }
    :host(.notify-bell--badge-corner) .notify-badge {
      margin-left: 0;
      margin-top: 0;
    }

    /* Circle shape: fixed diameter, the digits adapt to 1, 2 or 3 characters. */
    :host(.notify-bell--badge-circle) .notify-badge {
      width: var(--_ermes-badge-size);
      min-width: var(--_ermes-badge-size);
      height: var(--_ermes-badge-size);
      padding: 0;
      border: 1px solid var(--_ermes-badge-border);
      box-shadow: none;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.01em;
      font-size: calc(var(--_ermes-badge-size) * 0.55);
    }
    :host(.notify-bell--badge-circle) .notify-badge[data-len="1"] {
      font-size: calc(var(--_ermes-badge-size) * 0.67);
    }
    :host(.notify-bell--badge-circle) .notify-badge[data-len="3"] {
      font-size: calc(var(--_ermes-badge-size) * 0.45);
      letter-spacing: -0.03em;
    }

    .notify-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    `,
  ],
  template: `
    <button
      mat-icon-button
      class="notify-bell-button"
      (click)="togglePanel()"
      #originButton
      [matTooltip]="labels.bellTooltip"
      [attr.aria-label]="ariaLabel"
      [attr.aria-haspopup]="'dialog'"
      [attr.aria-expanded]="isOpen"
    >
      <span *ngIf="unreadCount > 0" class="notify-badge-anchor" aria-hidden="true">
        <span class="notify-badge" [attr.data-len]="badgeText.length">{{ badgeText }}</span>
      </span>
      <mat-icon class="notify-bell-icon" [svgIcon]="bellIcon"></mat-icon>
    </button>
    <span class="notify-sr-only" aria-live="polite">{{ ariaLabel }}</span>

    <ng-template #panelTemplate>
      <notify-dropdown
        [notifications]="notifications"
        [unreadCount]="unreadCount"
        (close)="closePanel()"
      ></notify-dropdown>
    </ng-template>
  `,
})
export class NotifyBellComponent implements OnInit, OnDestroy {
  private readonly inbox = inject(NotifyInboxService);
  private readonly socket = inject(NotifySocketService);
  private readonly toast = inject(NotifyToastService);
  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly config = inject(NOTIFY_UI_CONFIG);
  private readonly notifyAuth = inject(NotifyAuthService);

  @ViewChild('originButton') private originButton!: MatButton;
  @ViewChild('panelTemplate') private panelTemplate!: TemplateRef<unknown>;

  readonly labels = resolveLabels(this.config);
  readonly bellIcon = resolveIcons(this.config).bell;
  private readonly layout = resolveLayout(this.config.theme);

  @HostBinding('class.notify-bell--badge-circle')
  readonly badgeCircle = this.layout.badge.shape === 'circle';
  @HostBinding('class.notify-bell--badge-corner')
  readonly badgeCorner = this.layout.badge.placement === 'corner';

  notifications: NotifyNotification[] = [];
  unreadCount = 0;
  isOpen = false;

  private overlayRef: OverlayRef | null = null;
  private readonly destroy$ = new Subject<void>();

  get badgeText(): string {
    return this.unreadCount > 99 ? '99+' : String(this.unreadCount);
  }

  get ariaLabel(): string {
    return this.labels.bellAriaLabel.replace('{count}', String(this.unreadCount));
  }

  ngOnInit(): void {
    this.inbox.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.notifications = list;
        this.cdr.markForCheck();
      });

    this.inbox.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
        this.cdr.markForCheck();
      });

    // live$ carries persisted notifications only: data events never get here.
    this.socket.live$
      .pipe(takeUntil(this.destroy$))
      .subscribe(n => {
        if (this.config.enableLiveBadgeOnly) {
          this.inbox.noteLiveUnread(n); // the badge is derived from the list: count it apart
        } else {
          this.inbox.upsert(n);
        }
        this.toast.show(n);
      });

    if (this.config.resyncOnReconnect) {
      this.socket.reconnected$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.inbox.bootstrap().subscribe({ error: () => {} }));
    }

    if (!this.notifyAuth.getToken() && this.config.tokenProvider) {
      this.notifyAuth.setToken(this.config.tokenProvider());
    }

    // Reactive: bootstrap/connect when the token becomes available, disconnect/clear when it
    // is removed. connect() re-opens the socket by itself when the token changes.
    this.notifyAuth.token$
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(token => {
        if (token) {
          this.inbox.bootstrap().subscribe({ error: () => {} });
          this.socket.connect();
        } else {
          this.socket.disconnect();
          this.inbox.clear();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  togglePanel(): void {
    if (this.overlayRef?.hasAttached()) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  openPanel(): void {
    if (!this.panelTemplate || !this.originButton) return;
    if (!this.overlayRef) this.overlayRef = this.createOverlay();
    this.overlayRef.attach(new TemplatePortal(this.panelTemplate, this.vcr));
    this.isOpen = true;
    this.cdr.markForCheck();
  }

  closePanel(): void {
    if (!this.overlayRef?.hasAttached()) return;
    this.overlayRef.detach();
    this.isOpen = false;
    this.cdr.markForCheck();
    // Return the focus where it came from, for keyboard users.
    this.originButton?.focus();
  }

  private createOverlay(): OverlayRef {
    const ref = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.originButton._elementRef.nativeElement)
        .withLockedPosition(true)
        .withPush(true)
        .withPositions([
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
          { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
          { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
        ]),
    });
    ref.backdropClick().subscribe(() => this.closePanel());
    ref
      .keydownEvents()
      .pipe(filter(e => e.key === 'Escape'))
      .subscribe(() => this.closePanel());
    return ref;
  }
}
