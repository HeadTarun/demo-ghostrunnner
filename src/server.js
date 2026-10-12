/**
 * Acme Cloud Store — Demo Web Application Server
 * 
 * Used as the target application for GhostRunner self-healing E2E test runs.
 * Supports configurable states to demonstrate:
 *   - TC-1: Baseline Pass
 *   - TC-2: UI Locator Drift (button label / id change)
 *   - TC-3: Backend API 500 Failure
 *   - TC-4: Functional Feature Regression (broken confirmation message)
 *   - TC-5: Multi-Tenant RBAC Auth Protection
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3100;

function renderCartHtml(isDrift = false, isRegression = false) {
  const buttonLabel = isDrift ? 'Complete Order' : 'Checkout';
  const buttonId = isDrift ? 'complete-order-btn' : 'checkout-btn';
  const buttonTestId = isDrift ? 'complete-order-cta' : 'checkout-button';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Acme Cloud Store - Cart</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }
    .card { max-width: 500px; margin: 40px auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { font-size: 24px; margin-top: 0; color: #38bdf8; }
    .item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #334155; }
    .total { font-weight: bold; font-size: 18px; margin-top: 16px; display: flex; justify-content: space-between; }
    button { width: 100%; margin-top: 24px; padding: 14px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #1d4ed8; }
    #complete-order-btn { background: #059669; }
    #complete-order-btn:hover { background: #047857; }
    .order-success-banner { margin-top: 24px; padding: 16px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 8px; color: #34d399; font-weight: 500; display: none; }
    .error-banner { margin-top: 24px; padding: 16px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; border-radius: 8px; color: #f87171; font-weight: 500; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Acme Cloud Store</h1>
    <p style="color: #94a3b8; font-size: 14px;">Demo Target Application (Branch: main)</p>
    
    <div class="item">
      <span>Enterprise Cloud Subscription</span>
      <span>$249.99</span>
    </div>
    <div class="total">
      <span>Total:</span>
      <span>$249.99</span>
    </div>

    <button id="${buttonId}" data-testid="${buttonTestId}" onclick="submitCheckout()">${buttonLabel}</button>

    <div id="success-banner" class="order-success-banner">
      ${isRegression ? 'Warning: Processing delayed.' : 'Order confirmed! Your order #ORD-991 has been placed.'}
    </div>
    <div id="error-banner" class="error-banner"></div>
  </div>

  <script>
    async function submitCheckout() {
      const btn = document.getElementById('${buttonId}');
      btn.innerText = 'Processing...';
      btn.disabled = true;

      const params = new URLSearchParams(window.location.search);
      const apiMode = params.get('mode') || '';

      try {
        const res = await fetch('/api/checkout' + (apiMode ? '?mode=' + apiMode : ''), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': params.get('noauth') ? '' : 'Bearer demo-jwt-token-1406'
          },
          body: JSON.stringify({ amount: 249.99 })
        });

        const data = await res.json();
        if (res.ok) {
          document.getElementById('success-banner').style.display = 'block';
          btn.style.display = 'none';
        } else {
          const errDiv = document.getElementById('error-banner');
          errDiv.innerText = data.error || 'Checkout failed with status ' + res.status;
          errDiv.style.display = 'block';
          btn.innerText = '${buttonLabel}';
          btn.disabled = false;
        }
      } catch (err) {
        const errDiv = document.getElementById('error-banner');
        errDiv.innerText = 'Network error: ' + err.message;
        errDiv.style.display = 'block';
        btn.innerText = '${buttonLabel}';
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Routes
  if (pathname === '/' || pathname === '/cart' || pathname === '/checkout') {
    const isDrift = query.drift === '1' || process.env.DEMO_VERSION === 'v2';
    const isRegression = query.bug === 'regression';
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderCartHtml(isDrift, isRegression));
    return;
  }

  if (pathname === '/api/checkout' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const authHeader = req.headers['authorization'];
      
      // Case 5: Auth check
      if (query.mode === 'auth_denied' || query.noauth === '1' || !authHeader || authHeader.includes('invalid')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Missing or invalid authentication token' }));
        return;
      }

      // Case 3: Gateway 500 error
      if (query.mode === 'api_500' || query.mode === '500') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error: Payment gateway timeout (500)' }));
        return;
      }

      // Success (Case 1, 2, 4)
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        order_id: 'ORD-99182',
        status: 'PAID',
        amount: 249.99,
        timestamp: new Date().toISOString()
      }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Acme Cloud Store server running at http://127.0.0.1:${PORT}`);
  });
}

module.exports = { server, renderCartHtml };
