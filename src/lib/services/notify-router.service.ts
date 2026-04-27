import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NOTIFY_UI_CONFIG, NotifyResolver, NotifyRouteAction } from '../config/notify-ui-config';
import { NotifyNotification } from '../models/notification.model';
import { NotifyInboxService } from './notify-inbox.service';

@Injectable({ providedIn: 'root' })
export class NotifyRouterService {
  private readonly router = inject(Router);
  private readonly config = inject(NOTIFY_UI_CONFIG);
  private readonly inbox = inject(NotifyInboxService);

  handleClick(notification: NotifyNotification): void {
    if (!notification.read_at) {
      this.inbox.markRead(notification.notification_uuid).subscribe({
        error: () => {
          // swallow: optimistic update already applied; server retry not needed for UX flow
        },
      });
    }

    const resolver = this.resolverFor(notification.topic);
    const action = resolver?.(notification) ?? this.payloadFallback(notification);
    if (!action) return;

    void this.router.navigate(action.commands as unknown[] as never[], {
      queryParams: action.queryParams,
      fragment: action.fragment,
    });
  }

  private resolverFor(topic: string): NotifyResolver | undefined {
    const explicit = this.config.resolvers[topic];
    if (explicit) return explicit;
    return this.config.resolvers.default;
  }

  private payloadFallback(n: NotifyNotification): NotifyRouteAction | null {
    const action = n.payload?.['action'] as
      | { route?: unknown[]; queryParams?: Record<string, string>; fragment?: string }
      | undefined;
    if (action && Array.isArray(action.route)) {
      return {
        commands: action.route,
        queryParams: action.queryParams,
        fragment: action.fragment,
      };
    }
    return null;
  }
}
