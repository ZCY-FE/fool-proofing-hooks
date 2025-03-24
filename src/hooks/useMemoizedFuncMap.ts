import { useRef, useMemo } from 'react';
import { FuncMap } from '../types';

/**
 * 将 funcMap 实时映射在 ref 中，并通过一个固定的引用类型导出，绕过闭包问题
 */
const useMemoizedFuncMap = <T extends FuncMap>(funcMap?: T): T => {
  const fMap: any = funcMap || {};

  // 每次组件 render 时，都实时将最新的 funcMap 方法更新到 funcMapRef 上
  // 即每次通过在 funcMapRef 对象上实时取方法，来绕过函数组件的闭包问题
  const funcMapRef = useRef<any>({});
  Object.keys(fMap).forEach((key) => {
    funcMapRef.current[key] = fMap[key];
  });

  // 若直接将 funcMapRef.current 作为 callback 的第一个参数 self 会有如下问题
  //   1、因为 funcMapRef.current 中的方法是会在组件每次 render 时更新的，更新频次会大于 useEffect 回调执行频次
  //     若使用 self 的业务代码中出现 const { handleXxx } = self; 等赋值语法，依旧会出现闭包问题
  //   2、很多事件监听场景中，也很自然的会把 self 类比成类组件的 this 从而写出如下的代码
  //     addEventListener('event', self.handleXxx);
  //     return () => {
  //       removeEventListener('event', self.handleXxx);
  //     }
  //     同样因为 funcMapRef.current 更新频次会大于当前 useEffect 回调执行频次，在事件绑定时出现了闭包问题
  //     而且会因为解绑时传入的回调和绑定时的回调引用地址不一致，导致监听器无法清除
  //
  // 为了支持以上的场景，需要对 funcMapRef.current 上方法的调用进行额外封装，解决闭包问题，并让函数的引用地址固化
  const self = useMemo(() => {
    const ins: any = {};
    Object.keys(fMap).forEach((key) => {
      ins[key] = (...args: any[]) => {
        return funcMapRef.current[key](...args);
      };
    });
    return ins;
  }, []);

  return self;
};

export default useMemoizedFuncMap;
