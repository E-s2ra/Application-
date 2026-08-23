const http = require('http');

const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 54324;
const PROXY_PORT = 54325;

const server = http.createServer((req, res) => {
  // Always set full permissive CORS headers for local web dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rewrite /rest/v1 prefix if present
  let targetPath = req.url;
  if (targetPath.startsWith('/rest/v1/')) {
    targetPath = targetPath.replace('/rest/v1/', '/');
  } else if (targetPath === '/rest/v1') {
    targetPath = '/';
  }

  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `${TARGET_HOST}:${TARGET_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // Copy headers from target and ensure CORS header
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      res.setHeader(key, value);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(proxyRes.statusCode);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy gateway error', message: err.message }));
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[CORS Proxy] Active on http://127.0.0.1:${PROXY_PORT} -> forwarding to PostgREST ${TARGET_PORT}`);
});
