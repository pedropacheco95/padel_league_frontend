import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from './sanitizeHtml'

describe('sanitizeHtml', () => {
  it('keeps formatting', () => {
    expect(sanitizeHtml('<h1>T</h1><p class="highlight"><strong>x</strong></p>')).toBe('<h1>T</h1><p class="highlight"><strong>x</strong></p>')
  })
  it('drops scripts, iframes and event handlers', () => {
    const out = sanitizeHtml('<p onclick="x()">a</p><script>alert(1)</script><iframe src="https://e.x"></iframe><img src="a.png" onerror="x()">')
    expect(out).toBe('<p>a</p><img src="a.png">')
  })
  it('drops javascript: links and marks external links', () => {
    expect(sanitizeHtml('<a href=" javascript:alert(1)">x</a>')).toBe('<a rel="noopener noreferrer">x</a>')
    expect(sanitizeHtml('<a href="https://ppl.pt">x</a>')).toBe('<a href="https://ppl.pt" rel="noopener noreferrer" target="_blank">x</a>')
  })
})
