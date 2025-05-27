const axios = require('axios');

// List of ports to check
const ports = [3000, 5000, 8000, 8080, 4000, 4200, 9000];

// Check each port
async function checkPorts() {
  console.log('Checking server availability on different ports...');
  
  for (const port of ports) {
    try {
      console.log(`Checking port ${port}...`);
      const response = await axios.get(`http://localhost:${port}`, { timeout: 2000 });
      console.log(`✅ Server is running on port ${port}!`);
      console.log(`Response status: ${response.status}`);
      console.log(`Response data:`, response.data);
      return port; // Return the first working port
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ No server running on port ${port}`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`⚠️ Connection timed out on port ${port}`);
      } else {
        console.log(`⚠️ Error on port ${port}:`, error.message);
      }
    }
  }
  
  console.log('❌ Could not find a running server on any of the checked ports.');
  return null;
}

// Run the check
checkPorts().then(port => {
  if (port) {
    console.log(`\nServer found on port ${port}. Use this port in your test script.`);
  } else {
    console.log('\nNo server found. Make sure your server is running.');
  }
});
