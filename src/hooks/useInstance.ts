import { useRef } from 'react';

const useInstance = <T extends {}>(defaultParams: T) => {
  const ref = useRef(defaultParams);
  return ref.current;
};

export default useInstance;
