import { gerWindowBorder, popupWindowBorder } from './BrowserPopupWindow';

export function estimateBrowserZoom(_window: Window): number {
  // one of them might be off by a lot due to developer console or other browser plugin

  let [topBorder, sideBorder, bottomBorder] = gerWindowBorder();
  if (_window.outerWidth === _window.screen.availWidth) {
    sideBorder = 0;
    bottomBorder = 0;
  }
  let xRatio = (_window.outerWidth - sideBorder * 2) / _window.innerWidth;
  let yRatio = (_window.outerHeight - topBorder - bottomBorder) / _window.innerHeight;

  let zoomRatio = Math.min(yRatio, xRatio);
  if (zoomRatio > 1.8) {
    zoomRatio = Math.round(zoomRatio);
  } else if (zoomRatio > 0.73) {
    zoomRatio = Math.round(zoomRatio * 20) / 20;
  } else {
    zoomRatio = 2 / Math.round(2 / zoomRatio);
  }
  return zoomRatio;
}

export function estimateWindowBorder(
  _window: Window,
  addBorder: boolean = false,
): [number, number, number] {
  let zoom = _window ? estimateBrowserZoom(_window) : 1;
  let xBorder = (_window.outerWidth - _window.innerWidth * zoom) >> 1;
  let yBorder = Math.round(_window.outerHeight - _window.innerHeight * zoom);
  if (xBorder > 32) {
    // probably because of debugger console, assume it's in the right side
    xBorder = 8;
  } else {
    yBorder -= xBorder;
  }
  return [xBorder, yBorder, zoom];
}

interface Pt {
  x: number;
  y: number;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

class MapRect2D {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;

  init(
    x1: number,
    y1: number,
    w1: number,
    h1: number,
    x2: number,
    y2: number,
    w2: number,
    h2: number,
  ) {
    this.scaleX = w2 / w1;
    this.scaleY = h2 / h1;
    this.offsetX = x2 - x1 * this.scaleX;
    this.offsetY = y2 - y1 * this.scaleY;
  }

  map(pt: Pt): Pt {
    return { x: pt.x * this.scaleX + this.offsetX, y: pt.y * this.scaleY + this.offsetY };
  }

  revertMap(pt: Pt): Pt {
    return { x: (pt.x - this.offsetX) / this.scaleX, y: (pt.y - this.offsetY) / this.scaleY };
  }
}

export function mapElementToScreenRect(element: HTMLElement, rect?: Rect): Rect {
  if (!element) {
    return null;
  }
  let clientRect = element.getBoundingClientRect();
  let mapRect = new MapRect2D();
  mapRect.init(
    0,
    0,
    element.offsetWidth,
    element.offsetHeight,
    clientRect.x,
    clientRect.y,
    clientRect.width,
    clientRect.height,
  );
  let mappedRect: Rect;
  if (rect) {
    let { x, y } = mapRect.map({ x: rect.left, y: rect.top });
    let { x: x2, y: y2 } = mapRect.map({ x: rect.left + rect.width, y: rect.top + rect.height });
    mappedRect = { left: x, top: y, width: x2 - x, height: y2 - y };
  } else {
    mappedRect = {
      left: clientRect.left,
      top: clientRect.top,
      width: clientRect.width,
      height: clientRect.height,
    };
  }
  let _document = element.ownerDocument;
  let _window = _document.defaultView;
  if (!_window) {
    return clientRect;
  }
  // recursively get rect if it's an iframe
  if (_window.frameElement) {
    return mapElementToScreenRect(_window.frameElement as HTMLElement, mappedRect);
  }
  let [xBorder, yBorder, zoom] = estimateWindowBorder(_window);
  if (zoom !== 1) {
    mappedRect.left *= zoom;
    mappedRect.top *= zoom;
    mappedRect.width *= zoom;
    mappedRect.height *= zoom;
  }

  mappedRect.left += _window.screenX + xBorder;
  mappedRect.top += _window.screenY + yBorder;

  return mappedRect;
}

export function mapWindowToElement(
  targetElement: HTMLElement,
  fromWindow?: Window,
  fromRect?: Rect,
  removeBorder: boolean = true,
): Rect {
  if (!targetElement) {
    return null;
  }
  if (fromWindow) {
    fromRect = {
      left: fromWindow.screenX,
      top: fromWindow.screenY,
      width: fromWindow.outerWidth,
      height: fromWindow.outerHeight,
    };
    if (removeBorder) {
      const [topBorder, sideBorder, bottomBorder] = popupWindowBorder;
      fromRect.left += sideBorder;
      fromRect.top += topBorder;
      fromRect.width -= sideBorder * 2;
      fromRect.height -= topBorder + bottomBorder;
    }
  } else if (!fromRect) {
    return null;
  }
  let _document = targetElement.ownerDocument;
  let _window = _document.defaultView;
  if (!_window) {
    return fromRect;
  }
  // recursively get rect if it's an iframe
  if (_window.frameElement) {
    fromRect = mapWindowToElement(_window.frameElement as HTMLElement, null, fromRect);
  } else {
    let [xBorder, yBorder, zoom] = estimateWindowBorder(_window);
    fromRect.left -= _window.screenX + xBorder;
    fromRect.top -= _window.screenY + yBorder;

    if (zoom !== 1) {
      fromRect.left /= zoom;
      fromRect.top /= zoom;
      fromRect.width /= zoom;
      fromRect.height /= zoom;
    }
  }

  let clientRect = targetElement.getBoundingClientRect();
  let mapRect = new MapRect2D();
  mapRect.init(
    0,
    0,
    targetElement.offsetWidth,
    targetElement.offsetHeight,
    clientRect.x,
    clientRect.y,
    clientRect.width,
    clientRect.height,
  );
  let mappedRect: Rect;

  let { x, y } = mapRect.revertMap({ x: fromRect.left, y: fromRect.top });
  let { x: x2, y: y2 } = mapRect.revertMap({
    x: fromRect.left + fromRect.width,
    y: fromRect.top + fromRect.height,
  });
  mappedRect = { left: x, top: y, width: x2 - x, height: y2 - y };

  return mappedRect;
}
