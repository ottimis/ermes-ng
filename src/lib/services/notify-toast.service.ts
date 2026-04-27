import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NOTIFY_UI_CONFIG } from '../config/notify-ui-config';
import { NotifyNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotifyToastService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly config = inject(NOTIFY_UI_CONFIG);

  show(notification: NotifyNotification): void {
    if (!this.config.enableToast) return;
    const duration = notification.severity === 'error' ? 8000 : 4000;
    this.snackBar.open(notification.title, 'Chiudi', {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      panelClass: [`notify-toast--${notification.severity}`],
    });
  }
}
