// Test stub for vite-plugin-pwa's virtual registration module.
type Setter = (value: boolean) => void;

export function useRegisterSW() {
  return {
    needRefresh: [false, (() => undefined) as Setter] as [boolean, Setter],
    offlineReady: [false, (() => undefined) as Setter] as [boolean, Setter],
    updateServiceWorker: async () => undefined,
  };
}
