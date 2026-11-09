// The guide: what this page is for and how to use it (PLAN-017, D48). The words are static HTML in index.html (a <dialog>); this file only opens and
// closes it and remembers "Don't show again" in this browser. The stored value is the fixed text "1": it is compared, never shown.

/** True only when this browser holds the "hide" mark. Blocked, empty or damaged storage means: show the guide. */
export function guideHidden(storage, key) {
  try {
    return storage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/** Remembers "Don't show again". False when this browser does not let the page remember (the guide then shows again next time). */
export function hideGuide(storage, key) {
  try {
    storage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}

/** Wires the three buttons and opens the guide on a visit when it was not hidden. A browser without <dialog> keeps the page as it was. */
export function startGuide(doc, storage, key) {
  const dialog = doc.getElementById('guide');
  const opener = doc.getElementById('guide-open');
  if (!dialog || typeof dialog.showModal !== 'function') {
    if (opener) opener.hidden = true;
    return;
  }
  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    dialog.scrollTop = 0; // a small phone must start at the first line, not at the buttons
  };
  opener.addEventListener('click', open);
  dialog.addEventListener('click', (event) => { // a click on the dimmed page (the dialog's backdrop) closes it for this visit, so it never swallows a click meant for the map
    if (event.target !== dialog) return; // a button or text inside the guide: not an outside click (a key press on a button also reports the position 0,0)
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  doc.getElementById('guide-close').addEventListener('click', () => dialog.close());
  doc.getElementById('guide-hide').addEventListener('click', () => {
    hideGuide(storage, key);
    dialog.close();
  });
  if (!guideHidden(storage, key)) open();
}
