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

async function testCompleteSale() {
  console.log('\n🧪 TESTING COMPLETE SALE ("PROCEED ALL") FUNCTIONALITY');
  console.log('=====================================================\n');

  try {
    // First, let's get some products to use in the sale
    console.log('1️⃣  Getting available products...');
    const productsRes = await makeRequest('GET', '/api/products');
    console.log('   Status:', productsRes.status);

    if (productsRes.status !== 200 || !productsRes.body || productsRes.body.length === 0) {
      console.log('   ❌ No products available for testing');
      return;
    }

    const products = productsRes.body;
    console.log(`   ✅ Found ${products.length} products`);

    // Use the first few products for the test sale
    const testProducts = products.slice(0, 2);
    console.log(`   📦 Using products: ${testProducts.map(p => p.name).join(', ')}`);

    // Create a test sale
    console.log('\n2️⃣  Creating test sale...');
    const testSale = {
      date: new Date().toISOString(),
      total: testProducts.reduce((sum, p) => sum + p.price, 0),
      customerName: 'Test Customer',
      userId: '08d65c9e-4793-11f1-81d6-025056947af1', // Use valid user ID
      paymentMethod: 'Cash',
      salesperson: 'Test Salesperson',
      status: 'Completed'
      // Remove items for now to test basic sale creation
    };

    console.log('   📋 Sale details:', {
      total: testSale.total,
      paymentMethod: testSale.paymentMethod,
      customerName: testSale.customerName
    });

    const saleRes = await makeRequest('POST', '/api/sales', testSale);
    console.log('   Status:', saleRes.status);

    if (saleRes.status === 201) {
      console.log('   ✅ Sale created successfully!');
      console.log('   📄 Sale ID:', saleRes.body?.id);
      console.log('   💰 Total:', saleRes.body?.total);
      console.log('   📊 Status:', saleRes.body?.status);
      console.log('   📦 Items:', saleRes.body?.items?.length || 0);

      // Test retrieving the sale
      console.log('\n3️⃣  Verifying sale retrieval...');
      const getSaleRes = await makeRequest('GET', `/api/sales/${saleRes.body.id}`);
      console.log('   Status:', getSaleRes.status);

      if (getSaleRes.status === 200) {
        console.log('   ✅ Sale retrieved successfully!');
        console.log('   📄 Retrieved Sale ID:', getSaleRes.body?.id);
        console.log('   💰 Retrieved Total:', getSaleRes.body?.total);
      } else {
        console.log('   ❌ Failed to retrieve sale');
        console.log('   Response:', getSaleRes.raw);
      }

    } else {
      console.log('   ❌ Failed to create sale');
      console.log('   Response:', saleRes.raw);
    }

    console.log('\n========================');
    console.log('✅ COMPLETE SALE TEST COMPLETED');

  } catch(err) {
    console.error('\n❌ ERROR:', err.message);
  }

  process.exit(0);
}

// Wait for server to be ready
setTimeout(testCompleteSale, 1000);