import { useRef, useEffect } from 'react';
import withCleanupValidation from '../utils/withCleanupValidation';
import { FuncMap, CallbackWithCleanup } from '../types';
import useMemoizedFuncMap from './useMemoizedFuncMap';

/**
 * useWatch 对标 class 组件语法中的 componentDidUpdate
 */
const useWatch: {
  <D extends any[]>(deps: D, callback: CallbackWithCleanup<{}, D>): void;
  <D extends any[], FM extends FuncMap>(deps: D, callback: CallbackWithCleanup<FM, D>, funcMap: FM): void;
} = (deps: any[], callback: any, funcMap?: any): void => {
  const self = useMemoizedFuncMap(funcMap);

  // 记录着 prevDeps 的 ref
  const prevDepsRef = useRef<any>(deps?.map?.(() => undefined) || []);

  useEffect(() => {
    // 先执行业务回调，并把业务回调返回值暂存起来
    const cleanupCallback = callback(self, prevDepsRef.current);

    // 执行完业务回调后，就可以把触发本次 render 的 deps 视为 prevDeps
    prevDepsRef.current = [...deps];

    // 返回清理副作用的方法
    return withCleanupValidation(cleanupCallback, 'useWatch');
  }, [...deps]);
};

export default useWatch;
