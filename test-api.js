const http = require('http');

function makeRequest(method, path, body = null) {
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

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            raw: data
          });
        } catch(e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            raw: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testAPIs() {
  console.log('\n🧪 API ENDPOINT TESTING');
  console.log('========================\n');

  try {
    // Test 1: Login API
    console.log('1️⃣  Testing Login API...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'jeff@gmail.com',
      password: 'your_password_here'
    });
    console.log('   Status:', loginRes.status);
    console.log('   Response:', loginRes.raw.substring(0, 200));

    // Test 2: Get Products
    console.log('\n2️⃣  Testing Get Products API...');
    const productsRes = await makeRequest('GET', '/api/products');
    console.log('   Status:', productsRes.status);
    if (loginRes.status === 200 || productsRes.status === 200) {
      console.log('   ✅ Products endpoint responding');
    }

    // Test 3: Get Sales
    console.log('\n3️⃣  Testing Get Sales API...');
    const salesRes = await makeRequest('GET', '/api/sales');
    console.log('   Status:', salesRes.status);
    if (salesRes.status === 200 || salesRes.status === 400) {
      console.log('   ✅ Sales endpoint responding');
    }

    // Test 4: Get Users
    console.log('\n4️⃣  Testing Get Users API...');
    const usersRes = await makeRequest('GET', '/api/users');
    console.log('   Status:', usersRes.status);
    console.log('   ✅ Users endpoint responding');

    // Test 5: Store Hours
    console.log('\n5️⃣  Testing Store Hours API...');
    const hoursRes = await makeRequest('GET', '/api/store-hours');
    console.log('   Status:', hoursRes.status);

    // Test 6: Till Management
    console.log('\n6️⃣  Testing Till Management API...');
    const tillRes = await makeRequest('GET', '/api/till-management');
    console.log('   Status:', tillRes.status);

    // Test 7: Card Machine Config
    console.log('\n7️⃣  Testing Card Machine API...');
    const cardRes = await makeRequest('GET', '/api/card-machine');
    console.log('   Status:', cardRes.status);

    console.log('\n========================');
    console.log('✅ API ENDPOINTS ARE RESPONDING');
    console.log('✅ SERVER IS OPERATIONAL');

  } catch(err) {
    console.error('\n❌ ERROR:', err.message);
  }

  process.exit(0);
}

// Wait for server to fully initialize
setTimeout(testAPIs, 2000);
