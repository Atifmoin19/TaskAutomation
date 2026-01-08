import { MouseEvent, RefObject, useEffect } from 'react'

const useOnClickOutside = (
  ref: RefObject<HTMLElement>,
  handler: (event: MouseEvent<HTMLElement, MouseEvent> | TouchEvent) => void,
) => {
  useEffect(() => {
    const listener = (event: any) => {
      const element = event.target as Node
      if (!ref.current || ref.current.contains(element)) {
        return
      }
      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

export { useOnClickOutside }
