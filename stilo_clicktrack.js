/**
 * STILO Click Tracking
 * Guarda el clickId en cookie (duración = cookie window).
 * Recomendado instalarlo vía GTM con <script defer src="..."></script>
 */
(function () {
  var CLICK_PARAM = 'clickId';       // nombre del query param en tus links
  var COOKIE_CLICK = 'stilo_click_id';
  var COOKIE_DAYS = 30;              // iguala tu "cookie window" (días)

  function getParam(name) {
    try { return new URLSearchParams(window.location.search).get(name); }
    catch (e) { return null; }
  }
  function setCookie(name, value, days) {
    var maxAge = days * 24 * 60 * 60;
    document.cookie = name + '=' + encodeURIComponent(value) +
      '; Max-Age=' + maxAge + '; Path=/; SameSite=Lax; Secure';
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-.$?*|{}()[\]\\/+^]/g,'\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  try {
    var cid = getParam(CLICK_PARAM);
    if (cid && cid.trim()) {
      setCookie(COOKIE_CLICK, cid.trim(), COOKIE_DAYS);
      // opcional: dataLayer para debug
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'stilo_click_saved', clickId: cid.trim() });
    } else {
      // renueva la cookie si ya existía (sliding window)
      var existing = getCookie(COOKIE_CLICK);
      if (existing) setCookie(COOKIE_CLICK, existing, COOKIE_DAYS);
    }
  } catch (_) { /* no rompe la página */ }
})();
