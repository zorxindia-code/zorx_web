/**
 * Which transparent-video encoding to load. Safari / any iOS browser can't play
 * VP9 alpha but plays HEVC alpha; Chrome, Edge and Firefox play VP9 alpha (and
 * Chrome on macOS may *report* HEVC support it can't play with alpha, so this
 * goes by browser, not canPlayType).
 */
export function prefersHevcAlpha() {
  const ua = navigator.userAgent;
  const ios = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Android|Firefox|FxiOS/.test(ua);
  return ios || safari;
}
