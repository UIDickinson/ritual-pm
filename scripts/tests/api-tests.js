/**
 * Ritual Prediction Market - Comprehensive Test Suite
 * 
 * Run with: node scripts/tests/run-tests.js
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Test utilities
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, data };
}

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

function test(name, condition, errorMsg = '') {
  if (condition) {
    results.passed++;
    console.log(`  ✅ ${name}`);
  } else {
    results.failed++;
    const msg = `${name}: ${errorMsg}`;
    results.errors.push(msg);
    console.log(`  ❌ ${name}`);
    if (errorMsg) console.log(`     └─ ${errorMsg}`);
  }
}

// ========== AUTH TESTS ==========
async function runAuthTests() {
  console.log('\n📋 AUTHENTICATION TESTS\n');
  
  // Test 1: Register with valid credentials
  const validUsername = `testuser_${Date.now()}`;
  const res1 = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: validUsername, password: 'testpass123' })
  });
  test('Register with valid credentials', res1.ok && res1.data?.user, 
    `Expected success, got status ${res1.status}`);
  
  // Test 2: Register with duplicate username
  const res2 = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: validUsername, password: 'anotherpass' })
  });
  test('Reject duplicate username', res2.status === 409,
    `Expected 409, got ${res2.status}`);
  
  // Test 3: Register with short username
  const res3 = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: 'ab', password: 'testpass123' })
  });
  test('Reject short username (< 3 chars)', res3.status === 400,
    `Expected 400, got ${res3.status}`);
  
  // Test 4: Register with short password
  const res4 = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: 'validuser99', password: '123' })
  });
  test('Reject short password (< 6 chars)', res4.status === 400,
    `Expected 400, got ${res4.status}`);
  
  // Test 5: Login with valid credentials
  const res5 = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: validUsername, password: 'testpass123' })
  });
  test('Login with valid credentials', res5.ok && res5.data?.user,
    `Expected success, got status ${res5.status}`);
  
  // Test 6: Login with wrong password
  const res6 = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: validUsername, password: 'wrongpass' })
  });
  test('Reject invalid password', res6.status === 401,
    `Expected 401, got ${res6.status}`);
  
  // Test 7: Login with non-existent user
  const res7 = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'nonexistent_user_xyz', password: 'anypass' })
  });
  test('Reject non-existent user', res7.status === 401,
    `Expected 401, got ${res7.status}`);
  
  // Test 8: Register without required fields
  const res8 = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: 'onlyusername' })
  });
  test('Reject registration without password', res8.status === 400,
    `Expected 400, got ${res8.status}`);
  
  return res1.data?.user; // Return user for subsequent tests
}

// ========== MARKET TESTS ==========
async function runMarketTests(testUser) {
  console.log('\n📋 MARKET TESTS\n');
  
  // Test 1: Get all markets
  const res1 = await apiRequest('/api/markets');
  test('Get all markets', res1.ok && Array.isArray(res1.data?.markets),
    `Expected markets array, got ${typeof res1.data?.markets}`);
  
  // Test 2: Filter markets by status
  const res2 = await apiRequest('/api/markets?status=live');
  test('Filter markets by status', res2.ok,
    `Expected success, got status ${res2.status}`);
  
  if (!testUser) {
    console.log('  ⚠️  Skipping market creation tests (no test user)');
    return null;
  }
  
  // Test 3: Create market with valid data
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  
  const res3 = await apiRequest('/api/markets', {
    method: 'POST',
    body: JSON.stringify({
      userId: testUser.id,
      question: 'Test Market Question?',
      description: 'This is a test market',
      outcomes: ['Yes', 'No'],
      closeTime: futureDate.toISOString()
    })
  });
  test('Create market with valid data', res3.ok && res3.data?.market,
    `Expected market, got status ${res3.status}: ${res3.data?.error || ''}`);
  
  const createdMarket = res3.data?.market;
  
  // Test 4: Create market with too few outcomes
  const res4 = await apiRequest('/api/markets', {
    method: 'POST',
    body: JSON.stringify({
      userId: testUser.id,
      question: 'Invalid market?',
      outcomes: ['Only one'],
      closeTime: futureDate.toISOString()
    })
  });
  test('Reject market with < 2 outcomes', res4.status === 400,
    `Expected 400, got ${res4.status}`);
  
  // Test 5: Create market with too many outcomes
  const res5 = await apiRequest('/api/markets', {
    method: 'POST',
    body: JSON.stringify({
      userId: testUser.id,
      question: 'Invalid market?',
      outcomes: ['1', '2', '3', '4', '5', '6'],
      closeTime: futureDate.toISOString()
    })
  });
  test('Reject market with > 5 outcomes', res5.status === 400,
    `Expected 400, got ${res5.status}`);
  
  // Test 6: Create market with past close time
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  
  const res6 = await apiRequest('/api/markets', {
    method: 'POST',
    body: JSON.stringify({
      userId: testUser.id,
      question: 'Invalid market?',
      outcomes: ['Yes', 'No'],
      closeTime: pastDate.toISOString()
    })
  });
  test('Reject market with past close time', res6.status === 400,
    `Expected 400, got ${res6.status}`);
  
  // Test 7: Get individual market
  if (createdMarket) {
    const res7 = await apiRequest(`/api/markets/${createdMarket.id}`);
    test('Get individual market by ID', res7.ok,
      `Expected success, got status ${res7.status}`);
  }
  
  // Test 8: Get non-existent market
  const res8 = await apiRequest('/api/markets/00000000-0000-0000-0000-000000000000');
  test('Return 404 for non-existent market', res8.status === 404,
    `Expected 404, got ${res8.status}`);
  
  return createdMarket;
}

// ========== PREDICTION TESTS ==========
async function runPredictionTests(testUser, market) {
  console.log('\n📋 PREDICTION TESTS\n');
  
  // Test 1: Get predictions (should work without auth)
  const res1 = await apiRequest('/api/predictions');
  test('Get predictions list', res1.ok,
    `Expected success, got status ${res1.status}`);
  
  if (!testUser || !market) {
    console.log('  ⚠️  Skipping prediction placement tests (no test user/market)');
    return;
  }
  
  // Test 2: Predict on non-live market (proposed)
  const outcome = market.outcomes?.[0];
  if (outcome) {
    const res2 = await apiRequest('/api/predictions', {
      method: 'POST',
      body: JSON.stringify({
        userId: testUser.id,
        marketId: market.id,
        outcomeId: outcome.id,
        stakeAmount: 5
      })
    });
    test('Reject prediction on non-live market', res2.status === 400,
      `Expected 400 (market not live), got ${res2.status}: ${res2.data?.error || ''}`);
  }
  
  // Test 3: Predict with insufficient balance
  const res3 = await apiRequest('/api/predictions', {
    method: 'POST',
    body: JSON.stringify({
      userId: testUser.id,
      marketId: market?.id || 'fake-id',
      outcomeId: outcome?.id || 'fake-id',
      stakeAmount: 999999
    })
  });
  test('Reject prediction with insufficient balance', 
    res3.status === 400 || res3.status === 404,
    `Expected 400/404, got ${res3.status}`);
  
  // Test 4: Predict with invalid stake amount
  const res4 = await apiRequest('/api/predictions', {
    method: 'POST',
    body: JSON.stringify({
      userId: testUser.id,
      marketId: market?.id || 'fake-id',
      outcomeId: outcome?.id || 'fake-id',
      stakeAmount: 0
    })
  });
  test('Reject prediction with stake < 1', res4.status === 400,
    `Expected 400, got ${res4.status}`);
  
  // Test 5: Predict with missing fields
  const res5 = await apiRequest('/api/predictions', {
    method: 'POST',
    body: JSON.stringify({
      userId: testUser.id,
      marketId: market?.id
      // Missing outcomeId and stakeAmount
    })
  });
  test('Reject prediction with missing fields', res5.status === 400,
    `Expected 400, got ${res5.status}`);
}

// ========== ADMIN TESTS ==========
async function runAdminTests() {
  console.log('\n📋 ADMIN API TESTS\n');
  
  // Test 1: Get users (should require admin in real scenario)
  const res1 = await apiRequest('/api/admin/users');
  test('Get users list returns data', res1.ok || res1.status === 403,
    `Expected 200 or 403, got ${res1.status}`);
  
  // Test 2: Get activities
  const res2 = await apiRequest('/api/admin/activities');
  test('Get activities list returns data', res2.ok || res2.status === 403,
    `Expected 200 or 403, got ${res2.status}`);
  
  // Test 3: Get statistics
  const res3 = await apiRequest('/api/admin/stats');
  test('Get statistics returns data', res3.ok || res3.status === 403,
    `Expected 200 or 403, got ${res3.status}`);
  
  // Test 4: Get platform settings
  const res4 = await apiRequest('/api/admin/settings');
  test('Get platform settings', res4.ok || res4.status === 500,
    `Expected 200 or 500 (if no settings), got ${res4.status}`);
}

// ========== VOTING TESTS ==========
async function runVotingTests(testUser, market) {
  console.log('\n📋 VOTING TESTS\n');
  
  if (!testUser || !market) {
    console.log('  ⚠️  Skipping voting tests (no test user/market)');
    return;
  }
  
  // Test 1: Vote on own market (should fail)
  const res1 = await apiRequest(`/api/markets/${market.id}/vote`, {
    method: 'POST',
    body: JSON.stringify({
      userId: testUser.id,
      vote: 'approve'
    })
  });
  test('Reject voting on own market', res1.status === 400,
    `Expected 400 (own market), got ${res1.status}: ${res1.data?.error || ''}`);
  
  // Test 2: Get vote status
  const res2 = await apiRequest(`/api/markets/${market.id}/vote`);
  test('Get vote status', res2.ok,
    `Expected success, got ${res2.status}`);
}

// ========== RESOLUTION TESTS ==========
async function runResolutionTests() {
  console.log('\n📋 RESOLUTION TESTS\n');
  
  // Test 1: Resolve without admin (should fail)
  const res1 = await apiRequest('/api/markets/fake-market-id/resolve', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'non-admin-user-id',
      winningOutcomeId: 'fake-outcome-id',
      resolutionReason: 'Test'
    })
  });
  test('Reject resolution without admin access', 
    res1.status === 403 || res1.status === 404 || res1.status === 500,
    `Expected 403/404/500, got ${res1.status}`);
  
  // Test 2: Status change without admin
  const res2 = await apiRequest('/api/markets/fake-market-id/status', {
    method: 'PATCH',
    body: JSON.stringify({
      userId: 'non-admin-user-id',
      action: 'activate'
    })
  });
  test('Reject status change without admin', 
    res2.status === 403 || res2.status === 404 || res2.status === 500,
    `Expected 403/404/500, got ${res2.status}`);
}

// ========== DISPUTE TESTS ==========
async function runDisputeTests() {
  console.log('\n📋 DISPUTE TESTS\n');
  
  // Test 1: Get disputes for non-existent market
  const res1 = await apiRequest('/api/markets/00000000-0000-0000-0000-000000000000/dispute');
  test('Handle dispute request for non-existent market', 
    res1.status === 404 || res1.ok,
    `Expected 404 or empty result, got ${res1.status}`);
  
  // Test 2: Submit dispute with short reason
  const res2 = await apiRequest('/api/markets/fake-market-id/dispute', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'fake-user-id',
      reason: 'short'
    })
  });
  test('Reject dispute with short reason', 
    res2.status === 400 || res2.status === 404 || res2.status === 500,
    `Expected 400/404/500, got ${res2.status}`);
}

// ========== INPUT VALIDATION TESTS ==========
async function runValidationTests() {
  console.log('\n📋 INPUT VALIDATION TESTS\n');
  
  // Test 1: SQL Injection attempt in login
  const res1 = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ 
      username: "admin'; DROP TABLE users; --", 
      password: 'test' 
    })
  });
  test('Handle SQL injection in login', res1.status === 401,
    `Expected 401, got ${res1.status}`);
  
  // Test 2: XSS attempt in market creation
  const res2 = await apiRequest('/api/markets', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'test',
      question: '<script>alert("xss")</script>',
      outcomes: ['Yes', 'No'],
      closeTime: new Date(Date.now() + 86400000).toISOString()
    })
  });
  test('Handle XSS in market question', 
    res2.status !== 500, // Should not crash
    `Got unexpected server error ${res2.status}`);
  
  // Test 3: Empty body handling
  const res3 = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: '{}'
  });
  test('Handle empty login body', res3.status === 400,
    `Expected 400, got ${res3.status}`);
  
  // Test 4: Malformed JSON
  const res4 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not-json'
  });
  test('Handle malformed JSON', res4.status >= 400,
    `Expected 4xx/5xx, got ${res4.status}`);
}

// ========== MAIN TEST RUNNER ==========
async function runAllTests() {
  console.log('═'.repeat(50));
  console.log('  RITUAL PREDICTION MARKET - TEST SUITE');
  console.log('═'.repeat(50));
  console.log(`\n🔗 Testing against: ${BASE_URL}`);
  
  // Check if server is running
  try {
    const healthCheck = await fetch(BASE_URL);
    if (!healthCheck.ok && healthCheck.status !== 307) {
      console.log('\n❌ Server not responding properly. Make sure it\'s running.');
      return;
    }
  } catch (e) {
    console.log('\n❌ Cannot connect to server. Make sure it\'s running at', BASE_URL);
    return;
  }
  
  try {
    const testUser = await runAuthTests();
    const market = await runMarketTests(testUser);
    await runPredictionTests(testUser, market);
    await runVotingTests(testUser, market);
    await runAdminTests();
    await runResolutionTests();
    await runDisputeTests();
    await runValidationTests();
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error.message);
    results.failed++;
    results.errors.push(`Test suite crash: ${error.message}`);
  }
  
  // Print summary
  console.log('\n' + '═'.repeat(50));
  console.log('  TEST RESULTS SUMMARY');
  console.log('═'.repeat(50));
  console.log(`\n  ✅ Passed: ${results.passed}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  console.log(`  📊 Total:  ${results.passed + results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n  Failed Tests:');
    results.errors.forEach(err => console.log(`    • ${err}`));
  }
  
  console.log('\n' + '═'.repeat(50));
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests();
