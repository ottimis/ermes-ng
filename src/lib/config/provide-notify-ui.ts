import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  APP_INITIALIZER,
  CSP_NONCE,
  DestroyRef,
  EnvironmentProviders,
  PLATFORM_ID,
  Provider,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import {
  applyCssVars,
  applyDarkMode,
  injectToastStyles,
  resolveEffectiveTheme,
} from './notify-ui-defaults';
import { NOTIFY_UI_CONFIG, NotifyUiConfig } from './notify-ui-config';

export function provideNotifyUi(config: NotifyUiConfig): EnvironmentProviders {
  const providers: Provider[] = [
    { provide: NOTIFY_UI_CONFIG, useValue: config },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const platformId = inject(PLATFORM_ID);
        const doc = inject(DOCUMENT);
        const nonce = inject(CSP_NONCE, { optional: true });
        const destroyRef = inject(DestroyRef);
        return () => {
          if (!isPlatformBrowser(platformId)) return;
          const theme = resolveEffectiveTheme(doc, config.theme);
          applyCssVars(doc, theme);
          // The prefers-color-scheme listener lives as long as the application injector.
          const teardown = applyDarkMode(doc, theme);
          if (teardown) destroyRef.onDestroy(teardown);
          injectToastStyles(doc, nonce);
        };
      },
    },
  ];
  return makeEnvironmentProviders(providers);
}
