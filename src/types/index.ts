export type FuncMap = Record<string, (...args: any[]) => any>;

export type CallbackWithCleanup<T, K = undefined> = ((self: T, deps: K) => void | Promise<void>) | ((self: T, deps: K) => () => void);
