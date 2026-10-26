// Which shell are we running in?
export const isElectron = typeof window !== 'undefined' && !!window.nplNative;
export const isCapacitor = typeof window !== 'undefined' && !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
export const isNativeApp = isElectron || isCapacitor;
