const axios = require('axios');

async function diagnose() {
  const videoId = 'SX_ViT4Ra7k'; // Use the failing video from logs
  const renderUrl = `https://melodix-backend.onrender.com/api/stream/debug/${videoId}`;
  
  console.log('--- Melodix Streaming Diagnosis ---');
  console.log(`Checking Render Backend: ${renderUrl}`);
  
  try {
    const start = Date.now();
    const response = await axios.get(renderUrl);
    const duration = Date.now() - start;
    
    console.log(`\nResponse received in ${duration}ms:`);
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.error && response.data.error.includes('429')) {
      console.log('\n❌ RESULT: 429 BLOCKED');
      console.log('YouTube is blocking Render\'s IP.');
      console.log('SOLUTION: Export your YouTube cookies and set the YOUTUBE_COOKIE environment variable on Render.');
    } else if (response.data.title) {
      console.log('\n✅ RESULT: SUCCESS!');
      console.log(`Video title found: ${response.data.title}`);
      console.log('Streaming should be working now.');
    }
  } catch (err) {
    if (err.response) {
      console.log('\n❌ RESULT: BACKEND ERROR');
      console.log(`Status: ${err.response.status}`);
      console.log(JSON.stringify(err.response.data, null, 2));
    } else {
      console.log('\n❌ RESULT: CONNECTION FAILED');
      console.log(err.message);
    }
  }
}

diagnose();
