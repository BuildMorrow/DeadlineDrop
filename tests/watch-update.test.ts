import { describe, expect, it, vi } from 'vitest'
import { watchUpdate } from '../src/lib/watchUpdate'

class MockWorker extends EventTarget { state: ServiceWorkerState = 'installing' }
class MockRegistration extends EventTarget { waiting: MockWorker | null = null; installing: MockWorker | null = null }

describe('service worker update notification', () => {
  it('notifies about an already waiting update only for an existing controlled page', () => {
    const registration = new MockRegistration()
    registration.waiting = new MockWorker()
    const notify = vi.fn()
    const stop = watchUpdate(registration as unknown as ServiceWorkerRegistration, () => true, notify)
    expect(notify).toHaveBeenCalledOnce()
    stop()
    const fresh = vi.fn()
    watchUpdate(registration as unknown as ServiceWorkerRegistration, () => false, fresh)()
    expect(fresh).not.toHaveBeenCalled()
  })
  it('reports an installed update without forcing reload, and cleans up listeners', () => {
    const registration = new MockRegistration()
    const notify = vi.fn()
    const stop = watchUpdate(registration as unknown as ServiceWorkerRegistration, () => true, notify)
    const worker = new MockWorker()
    registration.installing = worker
    registration.dispatchEvent(new Event('updatefound'))
    expect(notify).not.toHaveBeenCalled()
    worker.state = 'installed'
    worker.dispatchEvent(new Event('statechange'))
    expect(notify).toHaveBeenCalledOnce()
    stop()
    worker.dispatchEvent(new Event('statechange'))
    registration.dispatchEvent(new Event('updatefound'))
    expect(notify).toHaveBeenCalledOnce()
  })
  it('does not report a failed or first installation as an update', () => {
    const registration = new MockRegistration()
    const worker = new MockWorker()
    registration.installing = worker
    const notify = vi.fn()
    const stop = watchUpdate(registration as unknown as ServiceWorkerRegistration, () => false, notify)
    worker.state = 'installed'
    worker.dispatchEvent(new Event('statechange'))
    worker.state = 'redundant'
    worker.dispatchEvent(new Event('statechange'))
    expect(notify).not.toHaveBeenCalled()
    stop()
  })
})
