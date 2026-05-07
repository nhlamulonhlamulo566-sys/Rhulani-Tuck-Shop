const http = require('http');

function makeRequest(method, path, body = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data ? (() => {
            try {
              return JSON.parse(data);
            } catch(e) {
              return null;
            }
          })() : null,
          raw: data
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testDatabaseConnectivity() {
  console.log('\n🧪 TESTING DATABASE CONNECTIVITY');
  console.log('=================================\n');

  try {
    // Test 1: Get sales (should return empty array if table exists)
    console.log('1️⃣  Testing GET /api/sales...');
    const salesRes = await makeRequest('GET', '/api/sales');
    console.log('   Status:', salesRes.status);

    if (salesRes.status === 200) {
      console.log('   ✅ Sales table exists and is accessible');
      console.log('   📊 Current sales count:', Array.isArray(salesRes.body) ? salesRes.body.length : 'unknown');
    } else {
      console.log('   ❌ Sales table issue');
      console.log('   Response:', salesRes.raw.substring(0, 200));
    }

    // Test 2: Try a simple sale creation with minimal data
    console.log('\n2️⃣  Testing minimal sale creation...');
    const minimalSale = {
      date: new Date().toISOString(),
      total: 10.00,
      customerName: 'Test Customer',
      userId: 'test-user-id',
      paymentMethod: 'Cash',
      salesperson: 'Test Salesperson',
      status: 'Completed'
    };

    const createRes = await makeRequest('POST', '/api/sales', minimalSale);
    console.log('   Status:', createRes.status);

    if (createRes.status === 201) {
      console.log('   ✅ Sale created successfully!');
      console.log('   📄 Sale ID:', createRes.body?.id);
    } else {
      console.log('   ❌ Failed to create sale');
      console.log('   Response:', createRes.raw.substring(0, 200));
    }

  } catch(err) {
    console.error('\n❌ ERROR:', err.message);
  }

  process.exit(0);
}

// Wait for server to be ready
setTimeout(testDatabaseConnectivity, 1000);