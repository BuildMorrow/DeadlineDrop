// Updates wait until old clients close; never reload a page holding a draft.
export function watchUpdate(registration: ServiceWorkerRegistration, hasController: () => boolean, notify: () => void): () => void {
  let worker: ServiceWorker | null = null
  const check = () => { if (registration.waiting && hasController()) notify() }
  const stateChanged = () => {
    if (worker?.state === 'installed' && hasController()) notify()
  }
  const watchInstalling = () => {
    worker?.removeEventListener('statechange', stateChanged)
    worker = registration.installing
    worker?.addEventListener('statechange', stateChanged)
    stateChanged()
    check()
  }
  registration.addEventListener('updatefound', watchInstalling)
  watchInstalling()
  return () => {
    registration.removeEventListener('updatefound', watchInstalling)
    worker?.removeEventListener('statechange', stateChanged)
  }
}
