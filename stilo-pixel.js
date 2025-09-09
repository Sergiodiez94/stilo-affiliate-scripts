// stilo-pixel.mjs  (ESM) — lógica intacta, sin cambios de payload ni headers
;(function (w) {
  const NS = 'StiloPixel';
  if (w[NS]) return;

  const CONFIG = {
    endpoint: 'https://f1bfd8b783c9.ngrok-free.app/aff/order_confirmation',
    apiKey:   'stilo_3ehQfULb3a4ExsGpcn7O4nuZKIUGte5r',
    cookieName: 'stilo_click_id',
    debug: false
  };

  function init(opts) {
    if (opts && typeof opts === 'object') {
      if (opts.endpoint) CONFIG.endpoint = opts.endpoint;
      if (opts.apiKey)   CONFIG.apiKey   = opts.apiKey;
      if (typeof opts.debug === 'boolean') CONFIG.debug = opts.debug;
    }
  }
  function log(...a){ if (CONFIG.debug) console.debug('[Stilo]', ...a); }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-.$?*|{}()[\\]\\/+^]/g,'\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function subscribe() {
    if (typeof analytics === 'undefined' || !analytics.subscribe) { return; }
    analytics.subscribe('checkout_completed', event => {
      const checkout = event.data.checkout;
      const allDiscountCodes = checkout.discountApplications
        .map(discount => discount.type === 'DISCOUNT_CODE' ? discount.title : null)
        .filter(Boolean);
      const stilo_click_id = getCookie(CONFIG.cookieName);
      const products = checkout.lineItems?.map(item => ({
        productId: item.variant?.product?.id || item.id,
        variantId: item.variant?.id || item.id,
        title: item.variant?.product?.title || item.title,
        vendor: item.variant?.product?.vendor || 'Unknown',
        quantity: item.quantity || 1,
        unitPrice: parseFloat(item.variant?.price?.amount || 0),
        totalPrice: parseFloat(item.finalLinePrice?.amount || 0),
        sku: item.variant?.sku || null,
        url: item.variant?.product?.url || null,
        image: item.variant?.image?.src || null
      })) || [];

      const stilo_data = {
        shopDomain: window.location.hostname,
        orderId: checkout?.order?.id,
        orderAmount: parseFloat(checkout.subtotalPrice?.amount || checkout.totalPrice?.amount || 0),
        currency: checkout.currencyCode || 'USD',
        discountCodes: allDiscountCodes,
        clickId: stilo_click_id,
        products
      };

      if (!stilo_data.orderId || stilo_data.orderAmount < 0) return;

      fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-stilo-api-key': CONFIG.apiKey
        },
        body: JSON.stringify(stilo_data),
        keepalive: true
      }).catch(() => {});
    });
  }

  // Intentar suscribirse inmediatamente; si analytics tarda, reintentar un poco
  if (typeof analytics !== 'undefined' && analytics.subscribe) {
    subscribe();
  } else {
    const t = setInterval(() => {
      if (typeof analytics !== 'undefined' && analytics.subscribe) {
        clearInterval(t); subscribe();
      }
    }, 200);
    setTimeout(() => clearInterval(t), 10000);
  }

  w[NS] = { init };
})(window);

// Export opcional (por si quieres llamarlo desde el loader)
export function init(cfg){ if (window.StiloPixel) window.StiloPixel.init(cfg); }
