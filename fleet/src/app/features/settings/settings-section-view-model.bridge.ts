import { SettingsComponent } from './settings.component';

type DynamicViewModel = Record<string, any>;

function collectHostKeys(instance: object): Set<string> {
  const keys = new Set<string>(Object.getOwnPropertyNames(instance));
  let proto = Object.getPrototypeOf(instance);

  while (proto && proto !== Object.prototype) {
    Object.getOwnPropertyNames(proto).forEach((key) => {
      if (key !== 'constructor') keys.add(key);
    });
    proto = Object.getPrototypeOf(proto);
  }

  return keys;
}

function findHostDescriptor(instance: object, key: string): PropertyDescriptor | undefined {
  let current: object | null = instance;

  while (current && current !== Object.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) return descriptor;
    current = Object.getPrototypeOf(current);
  }

  return undefined;
}

// Keep split Settings sections connected to the live SettingsComponent state.

export function bindSettingsSectionViewModel(
  target: DynamicViewModel,
  host: SettingsComponent,
): void {
  const hostView = host as DynamicViewModel;

  collectHostKeys(host).forEach((key) => {
    const targetDescriptor = Object.getOwnPropertyDescriptor(target, key);
    if (targetDescriptor && targetDescriptor.configurable === false) return;

    const hostDescriptor = findHostDescriptor(host, key);

    if (hostDescriptor && typeof hostDescriptor.value === 'function') {
      Object.defineProperty(target, key, {
        configurable: true,
        enumerable: false,
        writable: false,
        value: hostDescriptor.value.bind(host),
      });
      return;
    }

    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      get: () => Reflect.get(hostView, key, host),
      set: (value: unknown) => {
        Reflect.set(hostView, key, value, host);
      },
    });
  });
}
