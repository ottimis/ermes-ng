import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
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
import { Subject, distinctUntilChanged, takeUntil } from 'rxjs';
import { NOTIFY_UI_CONFIG } from '../../config/notify-ui-config';
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
  styles: [`
    :host { font-family: var(--ermes-font-family, inherit); }
    .notify-badge {
      background-color: var(--ermes-color-badge-bg, #0d9488);
      color: var(--ermes-color-badge-fg, #eef2ff);
      border-radius: var(--ermes-radius-full, 9999px);
      font-size: var(--ermes-font-size-sm, 0.875rem);
      font-weight: var(--ermes-font-weight-bold, 600);
    }
  `],
  template: `
    <button
      mat-icon-button
      (click)="togglePanel()"
      #originButton
      matTooltip="Notifiche"
    >
      <span *ngIf="unreadCount > 0" class="absolute top-0 right-0 left-0 flex items-center justify-center h-3">
        <span class="notify-badge flex items-center justify-center shrink-0 min-w-4 h-4 px-1 ml-4 mt-2.5">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </span>
      <mat-icon svgIcon="heroicons_outline:bell"></mat-icon>
    </button>

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

  notifications: NotifyNotification[] = [];
  unreadCount = 0;

  private overlayRef: OverlayRef | null = null;
  private readonly destroy$ = new Subject<void>();

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

    this.socket.live$
      .pipe(takeUntil(this.destroy$))
      .subscribe(n => {
        if (!this.config.enableLiveBadgeOnly) {
          this.inbox.upsert(n);
        }
        this.toast.show(n);
      });

    if (!this.notifyAuth.getToken() && this.config.tokenProvider) {
      this.notifyAuth.setToken(this.config.tokenProvider());
    }

    // Reactive: bootstrap/connect quando il token diventa disponibile,
    // disconnect/clear quando viene rimosso. distinctUntilChanged evita
    // doppi bootstrap su emissioni duplicate.
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
  }

  closePanel(): void {
    this.overlayRef?.detach();
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
    ref.backdropClick().subscribe(() => ref.detach());
    return ref;
  }
}
