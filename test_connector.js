const { WebcastPushConnection } = require('tiktok-live-connector');
console.log('WebcastPushConnection in v1.1.8:', typeof WebcastPushConnection);
const conn = new WebcastPushConnection('testuser', {
  processInitialData: false
});
console.log('Instance created in v1.1.8! has connect method:', typeof conn.connect);
console.log('EulerStream present?:', typeof conn.eulerClient);
