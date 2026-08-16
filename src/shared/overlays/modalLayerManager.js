const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const layers = [];
const backgroundSnapshots = new Map();

let bodyOverflow = null;
let bodyObserver = null;

function focusWithoutScrolling(element) {
  if (!element?.focus) return;

  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

function getTopLayer() {
  return layers.at(-1) ?? null;
}

function isElementTabbable(element) {
  return (
    element.tabIndex >= 0
    && !element.hidden
    && !element.closest('[hidden], [aria-hidden="true"], [inert]')
  );
}

function getTabbableElements(layerElement) {
  return [...layerElement.querySelectorAll(FOCUSABLE_SELECTOR)].filter(isElementTabbable);
}

function getFallbackFocusTarget(layerElement) {
  return layerElement.querySelector('[role="dialog"], [role="alertdialog"], [role="status"]')
    ?? layerElement;
}

function focusLayer(layerElement) {
  const initialFocusTarget = layerElement.querySelector("[data-modal-initial-focus]");
  const firstTabbable = getTabbableElements(layerElement)[0];
  focusWithoutScrolling(initialFocusTarget ?? firstTabbable ?? getFallbackFocusTarget(layerElement));
}

function saveBackgroundState(element) {
  if (backgroundSnapshots.has(element)) return;

  backgroundSnapshots.set(element, {
    hadInertAttribute: element.hasAttribute("inert"),
    inert: Boolean(element.inert),
  });
}

function setElementInert(element, inert) {
  saveBackgroundState(element);
  element.inert = inert;

  if (inert) {
    element.setAttribute("inert", "");
    return;
  }

  const snapshot = backgroundSnapshots.get(element);
  if (snapshot?.hadInertAttribute) element.setAttribute("inert", "");
  else element.removeAttribute("inert");
}

function restoreBackgroundState(element, snapshot) {
  element.inert = snapshot.inert;
  if (snapshot.hadInertAttribute) element.setAttribute("inert", "");
  else element.removeAttribute("inert");
}

function syncBackgroundState() {
  const topElement = getTopLayer()?.element ?? null;

  for (const element of document.body.children) {
    if (!(element instanceof HTMLElement)) continue;
    setElementInert(element, element !== topElement);
  }
}

function lockDocument() {
  bodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  bodyObserver = new MutationObserver(syncBackgroundState);
  bodyObserver.observe(document.body, { childList: true });
  document.addEventListener("focusin", handleDocumentFocusIn, true);
  document.addEventListener("keydown", handleDocumentKeyDown, true);
}

function unlockDocument() {
  bodyObserver?.disconnect();
  bodyObserver = null;
  document.removeEventListener("focusin", handleDocumentFocusIn, true);
  document.removeEventListener("keydown", handleDocumentKeyDown, true);

  for (const [element, snapshot] of backgroundSnapshots) {
    restoreBackgroundState(element, snapshot);
  }
  backgroundSnapshots.clear();

  document.body.style.overflow = bodyOverflow ?? "";
  bodyOverflow = null;
}

function trapFocus(event, layerElement) {
  const tabbableElements = getTabbableElements(layerElement);

  if (!tabbableElements.length) {
    event.preventDefault();
    focusWithoutScrolling(getFallbackFocusTarget(layerElement));
    return;
  }

  const firstElement = tabbableElements[0];
  const lastElement = tabbableElements.at(-1);
  const activeElement = document.activeElement;
  const focusIsInside = layerElement.contains(activeElement);

  if (!focusIsInside) {
    event.preventDefault();
    focusWithoutScrolling(event.shiftKey ? lastElement : firstElement);
    return;
  }

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    focusWithoutScrolling(lastElement);
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    focusWithoutScrolling(firstElement);
  }
}

function handleDocumentKeyDown(event) {
  const topLayer = getTopLayer();
  if (!topLayer) return;

  if (event.key === "Tab") {
    trapFocus(event, topLayer.element);
    return;
  }

  if (event.key !== "Escape") return;

  event.preventDefault();
  event.stopPropagation();
  const options = topLayer.getOptions();
  if (options.closeOnEscape) options.onClose?.();
}

function handleDocumentFocusIn(event) {
  const topLayer = getTopLayer();
  if (!topLayer || topLayer.element.contains(event.target)) return;
  focusLayer(topLayer.element);
}

export function isTopModalLayer(element) {
  return getTopLayer()?.element === element;
}

export function focusModalLayer(element) {
  if (isTopModalLayer(element)) focusLayer(element);
}

export function registerModalLayer(element, getOptions, returnFocus) {
  const layer = {
    element,
    getOptions,
    returnFocus,
  };

  const isFirstLayer = layers.length === 0;
  layers.push(layer);
  if (isFirstLayer) lockDocument();
  syncBackgroundState();

  return () => {
    const layerIndex = layers.indexOf(layer);
    if (layerIndex < 0) return;

    const wasTopLayer = layerIndex === layers.length - 1;
    layers.splice(layerIndex, 1);

    if (layers.length) syncBackgroundState();
    else unlockDocument();

    if (!wasTopLayer) return;
    if (layer.returnFocus?.isConnected && !layer.returnFocus.closest?.("[inert]")) {
      focusWithoutScrolling(layer.returnFocus);
      return;
    }

    const nextTopLayer = getTopLayer();
    if (nextTopLayer) focusLayer(nextTopLayer.element);
  };
}
