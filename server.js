const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const PANEL = 'portal42-343.sbs';

app.use(express.json());

// Only allow short link and device paths
app.use('*', async (req, res, next) => {
    const path = req.path;
    // Allow only /l/ and /device/ paths
    if (path.startsWith('/l/') || path.startsWith('/device/')) {
        return next();
    }
    // Block everything else (panel UI, API, etc.)
    return res.status(404).send('Not Found');
});

app.use('*', async (req, res) => {
    try {
        const target = new URL(req.originalUrl, `https://${PANEL}`);
        const headers = new Headers(req.headers);
        headers.set('Host', PANEL);
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        headers.set('Accept', 'application/json, text/plain, */*');

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
            opts.body = req.body;
        }

        const response = await fetch(target.toString(), opts);
        const body = await response.text();
        const contentType = response.headers.get('content-type') || '';

        res.status(response.status).set('Content-Type', contentType).send(body);
    } catch (e) {
        console.error('Proxy error:', e);
        res.status(500).send('Proxy Error');
    }
});

app.listen(port, () => console.log('✅ Proxy running on port ' + port));
