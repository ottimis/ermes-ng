import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NOTIFY_UI_CONFIG } from '../config/notify-ui-config';
import { resolveLabels } from '../config/notify-ui-defaults';
import { NotifyNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotifyToastService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly config = inject(NOTIFY_UI_CONFIG);
  private readonly labels = resolveLabels(this.config);

  show(notification: NotifyNotification): void {
    if (!this.config.enableToast) return;
    if (notification.live) return; // data events are not for humans
    const duration = notification.severity === 'error' ? 8000 : 4000;
    this.snackBar.open(notification.title, this.labels.toastDismiss, {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      panelClass: [`notify-toast--${notification.severity}`],
    });
  }
}
