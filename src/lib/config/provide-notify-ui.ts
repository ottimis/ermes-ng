import { EnvironmentProviders, Provider, makeEnvironmentProviders } from '@angular/core';
import { NOTIFY_UI_CONFIG, NotifyUiConfig } from './notify-ui-config';

export function provideNotifyUi(config: NotifyUiConfig): EnvironmentProviders {
  const providers: Provider[] = [
    { provide: NOTIFY_UI_CONFIG, useValue: config },
  ];
  return makeEnvironmentProviders(providers);
}
