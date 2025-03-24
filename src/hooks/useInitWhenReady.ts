import { useEffect, useRef } from 'react';
import withCleanupValidation from '../utils/withCleanupValidation';
import { FuncMap, CallbackWithCleanup } from '../types';
import useMemoizedFuncMap from './useMemoizedFuncMap';

// 本方法不符合编码范式最终讨论得出的结论，暂不对外透出，不开这个口子
// 本方法不符合编码范式最终讨论得出的结论，暂不对外透出，不开这个口子
// 本方法不符合编码范式最终讨论得出的结论，暂不对外透出，不开这个口子

/**
 *
 * useInitWhenReady 用于需要等待一段时间才进行初始化逻辑时使用
 *
 * 比如一个函数组件内，先调用 const { projectInfo } = useProjectInfo(); 异步获取项目信息，然后等待 projectInfo 非空时再执行初始化逻辑时（因为初始化逻辑依赖 projectInfo 变量）。
 *
 */
const useInitWhenReady: {
  (isReady: boolean | (() => boolean), callback: CallbackWithCleanup<{}>): void;
  <FM extends FuncMap>(isReady: boolean | (() => boolean), callback: CallbackWithCleanup<FM>, funcMap: FM): void;
} = (isReady: boolean | (() => boolean), callback: any, funcMap?: any): void => {
  const self = useMemoizedFuncMap(funcMap);

  // 是否执行过初始化逻辑的 ref 标志位，保证初始化的业务逻辑仅执行一次
  const isInitedRef = useRef<boolean>(false);

  const cleanupFuncRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (isInitedRef.current) {
      // 若已经执行过初始化逻辑，则不再二次执行
      return;
    }

    const readyFlag = typeof isReady === 'function' ? isReady() : Boolean(isReady);
    if (readyFlag) {
      isInitedRef.current = true;
    } else {
      return;
    }

    // 先执行业务回调，并把业务回调返回值暂存起来
    const cleanupCallback = callback(self);

    // 把 cleanup 函数存到 ref 中
    cleanupFuncRef.current = withCleanupValidation(cleanupCallback, 'useInitWhenReady');
  });

  // cleanup 函数的执行还是要在 unmount 中执行
  useEffect(() => {
    // 返回清理副作用的方法
    return cleanupFuncRef.current;
  }, []);
};

export default useInitWhenReady;
