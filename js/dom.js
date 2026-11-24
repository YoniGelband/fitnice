// A small helper for building page elements from JavaScript.

// el('button', { class: 'big', text: 'Walking', onclick: fn }, [child, ...])
// Text is always set with textContent, so a name the user typed is shown
// as plain text and can never be run as HTML or script.
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }

  node.append(...children);
  return node;
}
