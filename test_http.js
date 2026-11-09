const http = require('http');
const { spawn } = require('child_process');

async function testHttpEndpoints() {
  console.log('Testing HTTP Endpoints & Web Server...');

  // Start server process
  const serverProcess = spawn('node', ['server/index.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  // Wait 2 seconds for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  function checkUrl(urlPath) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:3000${urlPath}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`📡 GET ${urlPath} -> Status: ${res.statusCode} (length: ${data.length})`);
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            reject(new Error(`Failed with status ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  try {
    await checkUrl('/');
    await checkUrl('/overlay');
    await checkUrl('/admin');
    await checkUrl('/api/state');
    await checkUrl('/api/tikfinity/status');
    console.log('✅ ALL HTTP ENDPOINTS TESTED AND ACCESSIBLE (200 OK)!');
  } catch (err) {
    console.error('❌ Endpoint test failed:', err);
    process.exitCode = 1;
  } finally {
    serverProcess.kill('SIGTERM');
    setTimeout(() => process.exit(process.exitCode || 0), 500);
  }
}

testHttpEndpoints();
