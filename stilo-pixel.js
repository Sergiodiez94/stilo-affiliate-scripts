// stilo-pixel.js  — Stilo Pixel para Shopify (script plano, no módulo)
// - Escucha checkout_completed
// - Lee la cookie stilo_click_id (versión sin RegExp)
// - Envía payload a tu API con x-stilo-api-key
// - Compatible con loader que inyecta <script src="...">

;(function (w) {
  const NS = 'StiloPixel';
  if (w[NS]) return; // evitar doble carga

  // === Configuración (usa tus valores actuales) ===
  const CONFIG = {
    endpoint: 'https://f1bfd8b783c9.ngrok-free.app/aff/order_confirmation', // <-- tu endpoint actual
    apiKey:   'stilo_3ehQfULb3a4ExsGpcn7O4nuZKIUGte5r',                      // <-- tu API key actual
    cookieName: 'stilo_click_id',
    debug: false
  };

  function log(...a) { if (CONFIG.debug) console.debug('[Stilo]', ...a); }

  // === getCookie sin RegExp (evita 'Unexpected token ^' en algunos entornos) ===
  function getCookie(name) {
    try {
      if (!document.cookie) return null;
      const parts = document.cookie.split('; ');
      for (const part of parts) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        const k = part.slice(0, eq);
        if (k === name) return decodeURIComponent(part.slice(eq + 1));
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  function subscribeShopifyPixel() {
    if (typeof analytics === 'undefined' || !analytics.subscribe) {
      log('Shopify analytics no disponible aún');
      return;
    }

    analytics.subscribe('checkout_completed', event => {
      const checkout = event?.data?.checkout;
      if (!checkout) { log('Evento inválido'); return; }

      // Descuentos (solo códigos de tipo DISCOUNT_CODE)
      const allDiscountCodes = (checkout.discountApplications || [])
        .map(d => (d && d.type === 'DISCOUNT_CODE') ? d.title : null)
        .filter(Boolean);

      // Obtener clickId de la cookie establecida por el script de tracking
      const stilo_click_id = getCookie(CONFIG.cookieName);

      // Procesar productos de la orden (información completa)
      const products = (checkout.lineItems || []).map(item => ({
        productId: item?.variant?.product?.id || item?.id || null,
        variantId: item?.variant?.id || item?.id || null,
        title:     item?.variant?.product?.title || item?.title || null,
        vendor:    item?.variant?.product?.vendor || 'Unknown',
        quantity:  item?.quantity || 1,
        unitPrice: parseFloat(item?.variant?.price?.amount ?? 0),
        totalPrice: parseFloat(item?.finalLinePrice?.amount ?? 0),
        sku:       item?.variant?.sku || null,
        url:       item?.variant?.product?.url || null,
        image:     item?.variant?.image?.src || null
      }));

      // Crear payload para Stilo API (compatible con tu estructura)
      const stilo_data = {
        shopDomain: w.location.hostname,
        orderId: checkout?.order?.id,
        orderAmount: parseFloat(checkout?.subtotalPrice?.amount || checkout?.totalPrice?.amount || 0),
        currency: checkout?.currencyCode || 'USD',
        discountCodes: allDiscountCodes,
        clickId: stilo_click_id,
        products
      };

      // Validaciones mínimas
      if (!stilo_data.orderId || stilo_data.orderAmount < 0) {
        log('❌ Stilo: Invalid order data, skipping'); 
        return;
      }

      log('📦 Stilo: Sending order data:', stilo_data);

      // Enviar a Stilo API (igual que tu versión; keepalive para page unload)
      fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-stilo-api-key': CONFIG.apiKey
        },
        body: JSON.stringify(stilo_data),
        keepalive: true
      })
        .then(r => {
          if (!r.ok) throw new Error('Invalid order request sent');
          return r.json().catch(() => ({}));
        })
        .then(response => {
          log('✅ Stilo: Order sent successfully:', response);
          // Nota: no limpiar la cookie; la duración la maneja el script de tracking.
        })
        .catch(error => {
          console.error('❌ Stilo: Error sending order:', error);
        });
    });

    log('🎯 Stilo Pixel loaded - Ready to track orders with clickId from cookies');
  }

  // Suscribir inmediatamente si analytics ya está; sino, reintentar por un rato
  if (typeof analytics !== 'undefined' && analytics.subscribe) {
    subscribeShopifyPixel();
  } else {
    const i = setInterval(() => {
      if (typeof analytics !== 'undefined' && analytics.subscribe) {
        clearInterval(i);
        subscribeShopifyPixel();
      }
    }, 200);
    setTimeout(() => clearInterval(i), 10000);
  }

  // Exponer un init por si algún día quieres activar debug o cambiar endpoint desde el loader
  w[NS] = {
    init(opts) {
      if (!opts || typeof opts !== 'object') return;
      if (typeof opts.debug === 'boolean') CONFIG.debug = opts.debug;
      if (typeof opts.endpoint === 'string') CONFIG.endpoint = opts.endpoint;
      if (typeof opts.apiKey === 'string') CONFIG.apiKey = opts.apiKey;
    }
  };
})(window);
