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
  template: `
    <div
      class="fixed inset-0 sm:static sm:inset-auto flex flex-col sm:min-w-90 sm:w-90 sm:rounded-2xl overflow-hidden shadow-lg"
    >
      <div class="flex shrink-0 items-center py-4 pr-4 pl-6 bg-primary text-on-primary">
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

      <div class="relative flex flex-col flex-auto sm:max-h-120 divide-y overflow-y-auto bg-card">
        <ng-container *ngFor="let n of notifications; trackBy: trackByFn">
          <div
            class="flex group hover:bg-gray-50 dark:hover:bg-black dark:hover:bg-opacity-5 cursor-pointer"
            [ngClass]="{ 'unread': !n.read_at }"
            (click)="onClick(n)"
          >
            <div class="flex flex-auto py-5 pl-6 pr-4">
              <div
                class="flex shrink-0 items-center justify-center w-8 h-8 mr-4 rounded-full"
                [ngClass]="severityBg(n.severity)"
              >
                <mat-icon class="icon-size-5 text-white" [svgIcon]="iconFor(n)"></mat-icon>
              </div>
              <div class="flex flex-col flex-auto">
                <div class="font-semibold line-clamp-1">{{ n.title }}</div>
                <div *ngIf="n.body" class="line-clamp-2 text-sm">{{ n.body }}</div>
                <div class="mt-2 text-sm leading-none text-secondary">
                  {{ n.created_at | date: 'dd MMM, HH:mm' }}
                </div>
              </div>
              <div
                *ngIf="!n.read_at"
                class="w-2 h-2 self-start mt-2 rounded-full bg-primary shrink-0"
                matTooltip="Non letta"
              ></div>
            </div>
          </div>
        </ng-container>

        <ng-container *ngIf="!notifications || notifications.length === 0">
          <div class="flex flex-col flex-auto items-center justify-center sm:justify-start py-12 px-8">
            <div
              class="flex flex-0 items-center justify-center w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-600"
            >
              <mat-icon class="text-primary-700 dark:text-primary-50" svgIcon="heroicons_outline:bell"></mat-icon>
            </div>
            <div class="mt-5 text-2xl font-semibold tracking-tight">Nessuna notifica</div>
            <div class="w-full max-w-60 mt-1 text-md text-center text-secondary">
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
        return 'bg-red-500';
      case 'warning':
        return 'bg-amber-500';
      case 'success':
        return 'bg-green-500';
      default:
        return 'bg-blue-500';
    }
  }
}
