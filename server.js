// Chhota demo API server (perf pipeline test karne ke liye)
const http = require('http');

const products = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Product ${i + 1}`, price: (i + 1) * 10 }));
const orders = [];

const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

http
  .createServer((req, res) => {
    if (req.method === 'GET' && req.url.split('?')[0] === '/api/products') return send(res, 200, products);
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
    if (req.method === 'POST' && req.url === '/api/orders') {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => {
        orders.push(data);
        if (orders.length > 1000) orders.shift();
        send(res, 201, { id: orders.length });
      });
      return;
    }
    send(res, 404, { error: 'not found' });
  })
  .listen(process.env.PORT || 3000, () => console.log('listening on', process.env.PORT || 3000));
// perf test
