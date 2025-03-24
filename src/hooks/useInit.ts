import { useEffect } from 'react';
import withCleanupValidation from '../utils/withCleanupValidation';
import { FuncMap, CallbackWithCleanup } from '../types';
import useMemoizedFuncMap from './useMemoizedFuncMap';

/**
 * useInit 对标 class 组件语法中的 componentDidMount / componentWillUnmount
 */
const useInit: {
  (callback: CallbackWithCleanup<{}>): void;
  <FM extends FuncMap>(callback: CallbackWithCleanup<FM>, funcMap: FM): void;
} = (callback: any, funcMap?: any): void => {
  const self = useMemoizedFuncMap(funcMap);

  useEffect(() => {
    // 先执行业务回调，并把业务回调返回值暂存起来
    const cleanupCallback = callback(self);

    // 返回清理副作用的方法
    return withCleanupValidation(cleanupCallback, 'useInit');
  }, []);
};

export default useInit;
