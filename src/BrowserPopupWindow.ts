import Bowser from 'bowser';

const browser = Bowser.getParser(window.navigator.userAgent);

export function gerWindowBorder(): [number, number, number] {
  switch (browser.getOSName(true)) {
    case 'windows': {
      let result: [number, number, number];
      switch (browser.getBrowserName(true)) {
        case 'firefox':
          result = [68, 8, 8];
          break;
        case 'microsoft edge':
          result = [62, 8, 8];
          break;
        //case 'chrome':
        default:
          result = [60, 8, 8];
      }
      if (window.devicePixelRatio > 1) {
        result[0] -= 2;
        result[1] -= 1;
        result[2] -= 1;
      }
      return result;
    }
    case 'macos': {
      switch (browser.getBrowserName(true)) {
        case 'safari':
          return [22, 0, 0];
        case 'firefox':
          return [59, 0, 0];
        //case 'chrome':
        default:
          return [51, 0, 0];
      }
    }
  }
  return [60, 8, 8];
}

export const isSafari = browser.getBrowserName(true) === 'safari';
export const popupSupported = browser.getPlatformType() === 'desktop';
export const popupWindowBorder = gerWindowBorder();
