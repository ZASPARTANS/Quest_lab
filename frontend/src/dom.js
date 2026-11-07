// Tiny DOM helpers. Text is ALWAYS written with textContent (never innerHTML): forecast, place names and geocoder answers are untrusted.

/** el('p', { class: 'note', text: 'Hi', attrs: { role: 'status' } }, [child, child]) */
export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.class) node.className = options.class;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) node.setAttribute(name, String(value));
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

export function fill(node, children) {
  node.replaceChildren(...[].concat(children).filter(Boolean));
}

export function byId(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`page element #${id} is missing`);
  return node;
}
