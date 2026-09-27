import { useSyncExternalStore } from 'react'

export function useMedia(consulta: string): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = matchMedia(consulta)
      mq.addEventListener('change', avisar)
      return () => mq.removeEventListener('change', avisar)
    },
    () => matchMedia(consulta).matches,
  )
}

export const useDesktop = () => useMedia('(min-width: 768px)')
