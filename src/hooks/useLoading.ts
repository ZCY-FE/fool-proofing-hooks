import { useState, useCallback, useMemo } from 'react';

export interface LoadingStore {
  _increase: () => void;
  _decrease: () => void;
}

export interface LoadingConfig {
  /**
   * storeForSync
   * 非必填，若有值则当前 hook 在维护自身 loading 状态的同时，也会实时将自身 loading 同步到外部的 store 中
   *
   * 适用场景：需要同步当前子组件 loading 状态到上层组件时使用，传入上层组件的 useLoading / useApiMap 返回的 loadingStore
   */
  storeForSync?: LoadingStore;
  /**
   * noLoadingWhenSync
   * 默认值: true
   * 若为 true：
   *      当传入 storeForSync 时，当前 hook 返回的 loading 变量固定为 false，防止页面上父子组件渲染两个 loading 遮罩
   * 若为 false：
   *      即使传入了 storeForSync，当前 hook 返回的 loading 变量依旧会表示自身组件真实的 loading 状态，适用于父子组件需要同时展示两个 loading 遮罩的场景
   *
   * 注意：该配置项只影响当前 hook 内最后导出 loading 变量时的逻辑 exportedLoading = noLoadingWhenSync && storeForSync ? false : loading
   *      hook 内部永远会记录自身的 loading 状态，blockIfLoading 等方法也不会受到这个配置项的影响
   */
  noLoadingWhenSync?: boolean;
}

/**
 * 基础的 loading 状态管理
 * 若页面不会直接调用接口，但是在间接调用一些 sdk 或 ref 方法的时候需要展示 loading，则适合使用 useLoading
 */
const useLoading = (config?: LoadingConfig) => {
  const { storeForSync, noLoadingWhenSync = true } = config || {};

  const [count, setCount] = useState(0);

  const loading = count > 0;

  const increase = useCallback(() => {
    setCount((c) => c + 1);
    storeForSync?._increase?.();
  }, [storeForSync]);

  const decrease = useCallback(() => {
    setCount((c) => (c > 0 ? c - 1 : c));
    storeForSync?._decrease?.();
  }, [storeForSync]);

  // 所有的 loading 计数器的增减操作都收口在 loadingStore 上
  const loadingStore: LoadingStore = useMemo(
    () => ({
      _increase: increase,
      _decrease: decrease,
    }),
    [increase, decrease]
  );

  // 暴露给业务进行手动开关 loading 的方法
  const manual = useMemo(
    () => ({
      turnOnLoading: loadingStore._increase,
      turnOffLoading: loadingStore._decrease,
    }),
    [loadingStore]
  );

  const blockIfLoading = useCallback(
    <T extends (...args: any[]) => any>(func: T): T => {
      const wrappedFunc = (...args: any[]) => {
        if (loading) {
          const msg = `function "${func?.name}" was blocked since 「loading」 is true.`;
          window?.console?.warn?.(msg);
          return Promise.reject(new Error(msg)) as any;
        }
        return func?.(...args);
      };
      return wrappedFunc as any;
    },
    [loading]
  );

  const asyncWithLoading = useCallback(
    <T extends (...args: any[]) => Promise<any>>(asyncFunc: T): T => {
      const increaseBeforePromise = () => {
        loadingStore._increase();
      };

      const decreaseAfterPromise = () => {
        loadingStore._decrease();
      };

      const wrappedAsyncFunc = (...args: any[]) => {
        increaseBeforePromise();
        return asyncFunc(...args).then(
          (res: any) => {
            decreaseAfterPromise();
            return res;
          },
          (err: any) => {
            decreaseAfterPromise();
            return Promise.reject(err);
          }
        );
      };
      return wrappedAsyncFunc as any;
    },
    [loadingStore]
  );

  return {
    _count: count,
    manual,
    loading: noLoadingWhenSync && storeForSync ? false : loading,
    loadingStore,
    blockIfLoading,
    asyncWithLoading,
  };
};

export default useLoading;
