/* assets/main.js */
(function(){
  // Basic shared script for multipage demo
  window.dataLayer = window.dataLayer || [];
  window.adobeDataLayer = window.adobeDataLayer || [];

  // Simple HTML-escape for safe insertion
  window.escapeHtml = function (str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});
  };

  async function loadSpec() {
    try {
      //var res = await fetch('datalayer_spec.json');
      //window.dlSpec = await res.json();
      window.dlSpec = {
  "Pageview(Global) ": { "rows": [] },
  "Form": { "rows": [] },
  " Login Success": { "rows": [] },
  "Newsletter": { "rows": [] },
  "Register": { "rows": [] },
  "Search": { "rows": [] },
  "Add to Cart": { "rows": [] },
  "Cart View": { "rows": [] },
  "Checkout": { "rows": [] },
  "Checkout Address": { "rows": [] },
  "E-commerce Error": { "rows": [] },
  "Product View": { "rows": [] },
  "Purchase": { "rows": [] },
  "Remove from Cart": { "rows": [] },
  "Device Registration": { "rows": [] },
  "Subscription Cancel": { "rows": [] },
  "Subscription Pause": { "rows": [] },
  "Subscription Re-order": { "rows": [] },
  "Subscription Resume": { "rows": [] }
};
    } catch (e) {
      window.dlSpec = null;
      console.warn('datalayer_spec.json not loaded', e);
    }
  }

  function pushEventInternal(name, payload) {
    var eventObj = Object.assign({ event: name }, payload || {});
    window.dataLayer.push(eventObj);
    window.adobeDataLayer.push(Object.assign({ eventInfo: { eventName: name } }, payload || {}));
    console.log('DL PUSH ->', name, eventObj);
  }

  window.pushEvent = function(name, payload) {
    pushEventInternal(name, payload);
  };

  window.getCart = function() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch(e) { return []; }
  };
  window.saveCart = function(cart) { localStorage.setItem('cart', JSON.stringify(cart)); updateCartCount(); };
  window.updateCartCount = function() {
    var el = document.getElementById('cart-count');
    if (!el) return;
    var c = getCart().reduce(function(s,i){ return s + (i.qty || 0); }, 0);
    el.textContent = 'Cart: ' + c + ' items';
  };

  window.enrichPayloadForEvent = function(eventName, basePayload) {
    if (!window.dlSpec) return basePayload;
    // try match by approximate name
    var matched = Object.keys(window.dlSpec).find(function(k){ return k.trim().toLowerCase().includes(eventName.toLowerCase()); });
    if (!matched) return basePayload;
    return Object.assign({ __spec_rows: window.dlSpec[matched].rows }, basePayload);
  };

  // Sample product list (replace with real data)
  window.PRODUCTS = [
    { id: 'p1', name: 'Classic Tee', price: 19.99, category: 'Apparel', sku: 'CT-001' },
    { id: 'p2', name: 'Runner Sneakers', price: 79.99, category: 'Footwear', sku: 'RS-002' },
    { id: 'p3', name: 'Water Bottle', price: 12.50, category: 'Accessories', sku: 'WB-003' },
    { id: 'p4', name: 'Leather Wallet', price: 29.99, category: 'Accessories', sku: 'LW-004' },
    { id: 'p5', name: 'Yoga Pants', price: 34.99, category: 'Apparel', sku: 'YP-005' },
    { id: 'p6', name: 'Sports Watch', price: 149.99, category: 'Accessories', sku: 'SW-006' },
    { id: 'p7', name: 'Denim Jacket', price: 59.99, category: 'Apparel', sku: 'DJ-007' },
    { id: 'p8', name: 'Flip Flops', price: 15.99, category: 'Footwear', sku: 'FF-008' },
    { id: 'p9', name: 'Baseball Cap', price: 18.00, category: 'Accessories', sku: 'BC-009' },
    { id: 'p10', name: 'Running Shorts', price: 22.50, category: 'Apparel', sku: 'RS-010' }
  ];

  window.findProduct = function(id) { return PRODUCTS.find(function(p){ return p.id === id; }); };

  window.initPage = async function(pageName) {
    await loadSpec();
    updateCartCount();
    // pageview push enriched with page name
    var payload = enrichPayloadForEvent('Pageview(Global)', { page: pageName });
    pushEventInternal('pageview', payload);
    return Promise.resolve();
  };

  window.addToCart = function(productId, qty) {
    var p = findProduct(productId);
    if (!p) return;
    var cart = getCart();
    var existing = cart.find(function(i){ return i.id === productId; });
    if (existing) existing.qty = (existing.qty || 0) + (qty || 1);
    else cart.push(Object.assign({}, p, { qty: qty || 1 }));
    saveCart(cart);
    var payload = enrichPayloadForEvent('Add to Cart', { product: p, qty: qty || 1, products: cart });
    pushEventInternal('addToCart', payload);
  };

  window.removeFromCart = function(productId) {
    var cart = getCart();
    var idx = cart.findIndex(function(i){ return i.id === productId; });
    if (idx > -1) {
      var removed = cart.splice(idx, 1)[0];
      saveCart(cart);
      var payload = enrichPayloadForEvent('Remove from Cart', { product: removed, products: cart });
      pushEventInternal('removeFromCart', payload);
    }
  };

  window.goToCheckout = function() {
    var cart = getCart();
    var payload = enrichPayloadForEvent('Checkout', { step: 1, products: cart });
    pushEventInternal('checkout', payload);
    window.location.href = 'checkout.html';
  };

  window.goToPayment = function() {
    var cart = getCart();
    var payload = enrichPayloadForEvent('Checkout', { step: 2, products: cart });
    pushEventInternal('payment', payload);
    window.location.href = 'payment.html';
  };

  window.placeOrder = function() {
    var cart = getCart();
    if (!cart || cart.length === 0) { alert('Cart is empty'); return; }
    var total = cart.reduce(function(s,i){ return s + (i.price * (i.qty || 0)); }, 0);
    var order = { id: 'ORD-' + Date.now(), items: cart, total: total };
    var payload = enrichPayloadForEvent('Purchase', { order: order });
    pushEventInternal('purchase', payload);
    // persist last order for confirmation page
    localStorage.setItem('lastOrder', JSON.stringify(order));
    localStorage.removeItem('cart');
    updateCartCount();
    window.location.href = 'confirmation.html';
  };

  window.loginUser = function(email) {
    var payload = enrichPayloadForEvent('Login', { email: email });
    pushEventInternal('login', payload);
  };

  window.registerUser = function(name, email) {
    var payload = enrichPayloadForEvent('Register', { name: name, email: email });
    pushEventInternal('register', payload);
  };

  window.search = function(query) {
    var payload = enrichPayloadForEvent('Search', { query: query });
    pushEventInternal('search', payload);
    // also do client-side filtering on index page if products container exists
    try {
      var productsDiv = document.getElementById('products');
      if (!productsDiv) return;
      productsDiv.innerHTML = '';
      PRODUCTS.filter(function(p){ return p.name.toLowerCase().indexOf(query.toLowerCase()) !== -1; }).forEach(function(p){
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<h3>' + escapeHtml(p.name) + '</h3>' +
                 '<p class="muted">' + escapeHtml(p.category) + '</p>' +
                 '<p class="price">$' + p.price.toFixed(2) + '</p>' +
                 '<div class="card-actions">' +
                   '<button onclick="addToCart(\'' + p.id + '\',1)">Add to Cart</button>' +
                   '<button onclick="productView(\'' + p.id + '\')">Quick View</button>' +
                   '<a class="link" href="product.html?id=' + p.id + '">Open Page</a>' +
                 '</div>';

        productsDiv.appendChild(card);
      });
    } catch(e){}
  };

  window.viewCategory = function(cat) {
    var payload = enrichPayloadForEvent('Category View', { category: cat });
    pushEventInternal('categoryView', payload);
    // client side filter
    try {
      var productsDiv = document.getElementById('products');
      if (!productsDiv) return;
      productsDiv.innerHTML = '';
      PRODUCTS.filter(function(p){ return p.category === cat; }).forEach(function(p){
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<h3>'+escapeHtml(p.name)+'</h3>'+
                 '<p class="muted">'+escapeHtml(p.category)+'</p>'+
                 '<p class="price">$'+p.price.toFixed(2)+'</p>'+
                 '<div class="card-actions">'+
                   '<button onclick="addToCart(\''+p.id+'\',1)">Add to Cart</button>'+
                   '<button onclick="productView(\''+p.id+'\')">Quick View</button>'+
                   '<a class="link" href="product.html?id='+p.id+'">Open Page</a>'+
                 '</div>';

        productsDiv.appendChild(card);
      });
    } catch(e){}
  };

  window.productView = function(productId) {
    var p = findProduct(productId);
    var payload = enrichPayloadForEvent('Product View', { product: p });
    pushEventInternal('productView', payload);
    // small visual quick view (alert) for demo
    try {
      alert('Viewing: ' + p.name + '\\nPrice: $' + p.price.toFixed(2));
    } catch(e){}
  };

  window.subscriptionAction = function(action) {
    var payload = enrichPayloadForEvent('Subscription ' + action, { action: action });
    pushEventInternal('subscription', payload);
  };

  window.newsletterSignup = function(email) {
    var payload = enrichPayloadForEvent('Newsletter', { email: email });
    pushEventInternal('newsletterSignup', payload);
  };

  // expose for pages (already attached to window via assignment)
  window.enrichPayloadForEvent = window.enrichPayloadForEvent;
  window.escapeHtml = window.escapeHtml;
})();
