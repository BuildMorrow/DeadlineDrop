import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../src/app/App'
describe('application shell', () => { it('communicates its development status', () => { const html = renderToStaticMarkup(<App />); expect(html).toContain('DeadlineDrop'); expect(html).toContain('Under development') }) })
