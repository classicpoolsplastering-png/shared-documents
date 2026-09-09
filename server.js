const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const PANEL = 'portal42-343.sbs';

app.use(express.json());

app.use('*', async (req, res) => {
    try {
        const target = new URL(req.originalUrl, `https://${PANEL}`);
        const headers = new Headers(req.headers);

        // Set a realistic User-Agent
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        headers.set('Accept', 'application/json, text/plain, */*');
        headers.set('Host', PANEL);

        // Forward real client IP (if available)
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

        // Log the response status and first 100 chars for debugging
        console.log(`Proxy: ${req.originalUrl} → ${target.toString()} - Status: ${response.status}`);
        console.log('Response preview:', body.substring(0, 200));

        // If the response is HTML (likely a Cloudflare challenge), return a JSON error
        if (contentType.includes('text/html') && response.status === 403) {
            return res.status(403).json({ error: 'Cloudflare challenge – IP not allowed' });
        }

        res.status(response.status).set('Content-Type', contentType).send(body);
    } catch (e) {
        console.error('Proxy error:', e);
        res.status(500).send('Proxy Error');
    }
});

app.listen(port, () => console.log('✅ Proxy running on port ' + port));
