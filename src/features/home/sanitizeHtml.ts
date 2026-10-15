// Admin-authored news HTML (the Jinja page rendered it with |safe). Keep formatting, drop anything executable.
const DROP_TAGS = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'base', 'style']

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll(DROP_TAGS.join(',')).forEach((el) => el.remove())
  doc.body.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on') || name === 'srcdoc') el.removeAttribute(attr.name)
      else if ((name === 'href' || name === 'src' || name === 'xlink:href' || name === 'action') && /^(javascript|vbscript|data:text\/html)/.test(value.replace(/\s/g, ''))) {
        el.removeAttribute(attr.name)
      }
    }
    if (el.tagName === 'A') {
      el.setAttribute('rel', 'noopener noreferrer')
      if ((el.getAttribute('href') ?? '').startsWith('http')) el.setAttribute('target', '_blank')
    }
  })
  return doc.body.innerHTML
}
