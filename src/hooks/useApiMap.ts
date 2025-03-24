import { useState, useMemo } from 'react';
import useLoading, { LoadingConfig } from './useLoading';

const initCountMap = <T extends Record<string, any>>(apiMap: T) => {
  const numberMap: Record<keyof T, number> = {} as any;
  Object.keys(apiMap).forEach((key: keyof T) => {
    numberMap[key] = 0;
  });
  return numberMap;
};

// 在将 countMap 暴露给外部前将 > 0 转换成 true
const countMapToBooleanMap = <T extends Record<string, number>>(numberMap: T) => {
  const booleanMap: Record<keyof T, boolean> = {} as any;
  Object.keys(numberMap).forEach((key: keyof T) => {
    booleanMap[key] = numberMap[key] > 0;
  });
  return booleanMap;
};

type ApiFunc = (...args: any[]) => Promise<any>;

type ApiMap = Record<string, ApiFunc>;

export interface ApiMapConfig extends LoadingConfig {
  /** 用于所有接口的公共逻辑 promise.then(onFulfilled, onRejected) */
  onFulfilled?: (response: any) => any;
  /** 用于所有接口的公共逻辑 promise.then(onFulfilled, onRejected) */
  onRejected?: (error: any) => Promise<never>;
}

/**
 * 基于 useLoading 二次封装，整合 接口请求 和 loading 管理这两个过程
 */
const useApiMap = <T extends ApiMap>(
  /** 全量的接口请求方法，要求所有请求方法都是返回 promise 实例 */
  apiMap: T,
  /** 不需要 loading 的接口白名单（静默请求接口列表） */
  silentApiList: ApiFunc[] = [],
  /** 配置项 */
  config?: ApiMapConfig
) => {
  const { storeForSync, noLoadingWhenSync, onFulfilled, onRejected } = config || {};

  // 所有 api 方法请求过程中默认都会自动修改 loading 计数器，除非某个 api 被列在 silentApiList 白名单中
  const { _count, manual, loading, loadingStore, blockIfLoading, asyncWithLoading } = useLoading({
    storeForSync,
    noLoadingWhenSync,
  });

  // 所有 api 方法的 count 表，即使接口在 silentApiList 白名单内也会统计
  const [countMap, setCountMap] = useState<Record<keyof T, number>>(initCountMap(apiMap));

  const api = useMemo(() => {
    const increaseByApi = (apiName: string) => {
      setCountMap((map) => {
        return {
          ...map,
          [apiName]: map[apiName] + 1,
        };
      });
    };
    const decreaseByApi = (apiName: string) => {
      setCountMap((map) => {
        return {
          ...map,
          [apiName]: map[apiName] > 0 ? map[apiName] - 1 : map[apiName],
        };
      });
    };

    const proxy: T = {} as any;
    // 遍历所有方法
    Object.keys(apiMap).forEach((name: keyof T) => {
      const apiFunc = apiMap[name];
      if (typeof apiFunc === 'function') {
        proxy[name] = ((...args: any[]) => {
          const isSilentApi = silentApiList?.indexOf?.(apiFunc) > -1;

          const increaseBeforeRequest = () => {
            increaseByApi(name as string);
            if (!isSilentApi) {
              loadingStore._increase();
            }
          };

          const decreaseAfterRequest = () => {
            decreaseByApi(name as string);
            if (!isSilentApi) {
              loadingStore._decrease();
            }
          };

          increaseBeforeRequest(); // loading 增减逻辑

          // 考虑到 apiFunc 方法中可能会用到 this 不能这样调用 apiFunc(...args)
          // 同时考虑到兼容性问题不用 Promise.prototype.finally 的执行 decreaseAfterRequest
          return apiMap[name](...args).then(
            (response: any) => {
              decreaseAfterRequest(); // loading 增减逻辑
              if (typeof onFulfilled === 'function') {
                return onFulfilled(response);
              } else {
                return response;
              }
            },
            (error: any) => {
              decreaseAfterRequest(); // loading 增减逻辑
              if (typeof onRejected === 'function') {
                return onRejected(error);
              } else {
                return Promise.reject(error);
              }
            }
          );
        }) as any;
      }
    });
    return proxy;
  }, [apiMap, silentApiList, loadingStore, onFulfilled, onRejected]);

  const loadingMap = useMemo(() => {
    return countMapToBooleanMap(countMap);
  }, [countMap]);

  return {
    _count,
    api,
    manual,
    loading,
    loadingMap,
    loadingStore,
    blockIfLoading,
    asyncWithLoading,
  };
};

export default useApiMap;
