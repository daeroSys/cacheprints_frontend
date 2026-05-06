import http from 'http';

const data = JSON.stringify({
  username: 'admin',
  password: 'password123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Login Response:', body);
    const parsed = JSON.parse(body);
    if (parsed.token) {
      const matData = JSON.stringify({
        materialId: 'MAT-TEST',
        name: 'Test Mat',
        category: 'Test',
        unit: 'pcs',
        costPerUnit: 10,
        minQty: 5,
        maxQty: 100,
        leadTime: 5,
        reorderQuantity: 10
      });
      const req2 = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/materials',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': matData.length,
          'Authorization': `Bearer ${parsed.token}`
        }
      }, (res2) => {
        let b2 = '';
        res2.on('data', d => b2 += d);
        res2.on('end', () => console.log('POST /materials:', b2));
      });
      req2.write(matData);
      req2.end();
    }
  });
});

req.write(data);
req.end();
