import '@testing-library/jest-dom/vitest'

const nativeGetComputedStyle = window.getComputedStyle.bind(window)

export function motionAwareComputedStyle(el, pseudo, overrides = {}) {
  const style = nativeGetComputedStyle(el, pseudo)
  const classList = el.classList

  let animationName = overrides.animationName ?? style.animationName
  let display = overrides.display ?? style.display

  if (overrides.animationName == null) {
    if (classList.contains('card-slot--entering')) {
      animationName = 'card-enter'
    } else if (classList.contains('card-slot--growing')) {
      animationName = 'card-grow'
    } else if (classList.contains('card-ghost')) {
      animationName = 'ghost-collapse'
    }
  }

  if (overrides.ghostDisplay != null && classList.contains('card-ghost')) {
    display = overrides.ghostDisplay
  }

  if (animationName !== style.animationName) {
    Object.defineProperty(style, 'animationName', { value: animationName, configurable: true })
  }
  if (display !== style.display) {
    Object.defineProperty(style, 'display', { value: display, configurable: true })
  }

  return style
}

window.getComputedStyle = (el, pseudo) => motionAwareComputedStyle(el, pseudo)
