const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const PANEL = 'portal42-343.sbs';

app.use(express.json());

// 1. Root returns OK (for UptimeRobot)
app.get('/', (req, res) => {
    res.send('OK');
});

// 2. Block all paths except /l/ and /device/
app.use((req, res, next) => {
    const path = req.path;
    if (path.startsWith('/l/') || path.startsWith('/device/')) {
        return next();
    }
    // Block everything else (panel UI, API, etc.)
    return res.status(404).send('Not Found');
});

// 3. Proxy allowed paths to the panel
app.all('*', async (req, res) => {
    try {
        const target = new URL(req.originalUrl, `https://${PANEL}`);
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
        const contentType = response.headers.get('content-type') || 'text/plain';

        res.status(response.status).set('Content-Type', contentType).send(body);
    } catch (e) {
        console.error('Proxy error:', e);
        res.status(500).send('Proxy Error');
    }
});

app.listen(port, () => console.log('✅ Proxy running on port ' + port));
