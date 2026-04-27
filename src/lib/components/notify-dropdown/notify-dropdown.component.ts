import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotifyNotification } from '../../models/notification.model';
import { NotifyInboxService } from '../../services/notify-inbox.service';
import { NotifyRouterService } from '../../services/notify-router.service';

@Component({
  selector: 'notify-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgFor, NgClass, DatePipe, MatButtonModule, MatIconModule, MatTooltipModule],
  styles: [`
    :host { font-family: var(--ermes-font-family, inherit); }
    .notify-panel {
      background-color: var(--ermes-color-surface, #ffffff);
      color: var(--ermes-color-surface-fg, #0f172a);
    }
    @media (min-width: 640px) {
      .notify-panel { border-radius: var(--ermes-radius-md, 1rem); }
    }
    .notify-header {
      background-color: var(--ermes-color-primary, #1e40af);
      color: var(--ermes-color-primary-fg, #ffffff);
    }
    .notify-text-secondary {
      color: var(--ermes-color-text-secondary, #64748b);
      font-size: var(--ermes-font-size-sm, 0.875rem);
    }
    .notify-unread-dot {
      background-color: var(--ermes-color-primary, #1e40af);
      border-radius: var(--ermes-radius-full, 9999px);
    }
    .notify-severity {
      background-color: var(--ermes-color-severity-info, #3b82f6);
      border-radius: var(--ermes-radius-full, 9999px);
    }
    .notify-severity--error   { background-color: var(--ermes-color-severity-error,   #ef4444); border-radius: var(--ermes-radius-full, 9999px); }
    .notify-severity--warning { background-color: var(--ermes-color-severity-warning, #f59e0b); border-radius: var(--ermes-radius-full, 9999px); }
    .notify-severity--success { background-color: var(--ermes-color-severity-success, #22c55e); border-radius: var(--ermes-radius-full, 9999px); }
    .notify-empty-icon-bg {
      background-color: var(--ermes-color-empty-icon-bg, #dbeafe);
      border-radius: var(--ermes-radius-full, 9999px);
    }
    .notify-empty-icon-fg { color: var(--ermes-color-empty-icon-fg, #1d4ed8); }
    .notify-title {
      font-weight: var(--ermes-font-weight-bold, 600);
      font-size: var(--ermes-font-size-md, 1rem);
    }
  `],
  template: `
    <div
      class="notify-panel fixed inset-0 sm:static sm:inset-auto flex flex-col sm:min-w-90 sm:w-90 overflow-hidden shadow-lg"
    >
      <div class="notify-header flex shrink-0 items-center py-4 pr-4 pl-6">
        <div class="sm:hidden -ml-1 mr-3">
          <button mat-icon-button (click)="close.emit()">
            <mat-icon class="icon-size-5 text-current" svgIcon="heroicons_solid:x-mark"></mat-icon>
          </button>
        </div>
        <div class="text-lg font-medium leading-10">Notifiche</div>
        <div class="ml-auto">
          <button
            mat-icon-button
            matTooltip="Segna tutte come lette"
            [disabled]="unreadCount === 0"
            (click)="onMarkAllRead()"
          >
            <mat-icon class="icon-size-5 text-current" svgIcon="heroicons_solid:envelope-open"></mat-icon>
          </button>
        </div>
      </div>

      <div class="relative flex flex-col flex-auto sm:max-h-120 divide-y overflow-y-auto">
        <ng-container *ngFor="let n of notifications; trackBy: trackByFn">
          <div
            class="flex group hover:bg-gray-50 dark:hover:bg-black dark:hover:bg-opacity-5 cursor-pointer"
            [ngClass]="{ 'unread': !n.read_at }"
            (click)="onClick(n)"
          >
            <div class="flex flex-auto py-5 pl-6 pr-4">
              <div
                class="flex shrink-0 items-center justify-center w-8 h-8 mr-4"
                [ngClass]="severityBg(n.severity)"
              >
                <mat-icon class="icon-size-5 text-white" [svgIcon]="iconFor(n)"></mat-icon>
              </div>
              <div class="flex flex-col flex-auto">
                <div class="notify-title line-clamp-1">{{ n.title }}</div>
                <div *ngIf="n.body" class="line-clamp-2 text-sm">{{ n.body }}</div>
                <div class="notify-text-secondary mt-2 leading-none">
                  {{ n.created_at | date: 'dd MMM, HH:mm' }}
                </div>
              </div>
              <div
                *ngIf="!n.read_at"
                class="notify-unread-dot w-2 h-2 self-start mt-2 shrink-0"
                matTooltip="Non letta"
              ></div>
            </div>
          </div>
        </ng-container>

        <ng-container *ngIf="!notifications || notifications.length === 0">
          <div class="flex flex-col flex-auto items-center justify-center sm:justify-start py-12 px-8">
            <div class="notify-empty-icon-bg flex flex-0 items-center justify-center w-14 h-14">
              <mat-icon class="notify-empty-icon-fg" svgIcon="heroicons_outline:bell"></mat-icon>
            </div>
            <div class="mt-5 text-2xl font-semibold tracking-tight">Nessuna notifica</div>
            <div class="notify-text-secondary w-full max-w-60 mt-1 text-center">
              Le notifiche che riceverai saranno visualizzate qui.
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class NotifyDropdownComponent {
  private readonly inbox = inject(NotifyInboxService);
  private readonly routerService = inject(NotifyRouterService);

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
    switch (n.severity) {
      case 'error':
        return 'heroicons_solid:exclamation-triangle';
      case 'warning':
        return 'heroicons_solid:exclamation-circle';
      case 'success':
        return 'heroicons_solid:check-circle';
      default:
        return 'heroicons_solid:bell';
    }
  }

  severityBg(severity: NotifyNotification['severity']): string {
    switch (severity) {
      case 'error':
        return 'notify-severity--error';
      case 'warning':
        return 'notify-severity--warning';
      case 'success':
        return 'notify-severity--success';
      default:
        return 'notify-severity';
    }
  }
}
