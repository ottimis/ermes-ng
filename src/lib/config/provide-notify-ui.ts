import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  APP_INITIALIZER,
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
        return () => {
          if (!isPlatformBrowser(platformId)) return;
          const theme = resolveEffectiveTheme(doc, config.theme);
          applyCssVars(doc, theme);
          applyDarkMode(doc, theme);
          injectToastStyles(doc);
        };
      },
    },
  ];
  return makeEnvironmentProviders(providers);
}
