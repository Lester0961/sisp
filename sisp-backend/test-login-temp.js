async function testLogin() {
  try {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sysadmin@rmc.edu.ph',
        password: 'password123'
      })
    });
    
    console.log('Status Code:', res.status);
    const body = await res.json();
    console.log('Response Body:', JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testLogin();
