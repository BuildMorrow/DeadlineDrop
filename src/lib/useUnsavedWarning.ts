import { useEffect } from 'react'

// Browsers decide whether to show their own message; this does not persist data.
export function useUnsavedWarning(hasWork: boolean) {
  useEffect(() => {
    if (!hasWork) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasWork])
}
