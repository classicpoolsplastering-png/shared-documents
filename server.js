const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const PANEL = 'portal42-343.sbs';

app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.path}`);
    next();
});

// Proxy all requests to the panel
app.all('*', async (req, res) => {
    try {
        const target = new URL(req.originalUrl, `https://${PANEL}`);
        console.log(`Proxying to: ${target.toString()}`);

        const headers = new Headers(req.headers);
        headers.set('Host', PANEL);
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        const opts = {
            method: req.method,
            headers: headers,
        };
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            opts.body = JSON.stringify(req.body);
        }

        const response = await fetch(target.toString(), opts);
        const body = await response.text();

        console.log(`Response status: ${response.status}`);
        res.status(response.status).set('Content-Type', response.headers.get('content-type') || 'text/plain').send(body);
    } catch (e) {
        console.error('Proxy error:', e);
        res.status(500).send('Proxy Error: ' + e.message);
    }
});

app.listen(port, () => console.log('✅ Proxy running on port ' + port));
