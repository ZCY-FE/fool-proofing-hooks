/**
 * 高阶函数：复用了在执行 cleanup 回调函数时的通用校验逻辑
 */
const withCleanupValidation = (cleanupCallback: any, hookName: string): (() => void) => {
  return () => {
    if (typeof cleanupCallback === 'function') {
      cleanupCallback();
    } else if (cleanupCallback instanceof Promise || typeof cleanupCallback?.then === 'function') {
      /*
        在误写出这种代码的时候，给出报错提示

        useInit(async () => {
          // try to do sth when mount

          return () => {
            // try to do sth when unmount
          };
        });
      */
      cleanupCallback?.then?.((result: any) => {
        if (typeof result === 'function') {
          // 虽然理论上还是能异步执行清理函数，但是这样会导致清理函数无法在下一次新的副作用逻辑执行之前被调用，反而会引发其他难以定位的问题
          // result();

          // 所以异步抛一个异常，但是不影响后续代码执行
          setTimeout(() => {
            window?.console?.error?.(`「${hookName}」的回调中若要返回清理函数，则不能使用 async 语法。`);
            throw new Error(`If callback of 「${hookName}」 need return a cleanup callback, don't use async syntax.`);
          }, 0);
        }
      });
    } else {
      // do nothing
    }
  };
};

export default withCleanupValidation;
