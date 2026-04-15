const { Innertube } = require('youtubei.js');

async function testClient(name) {
  console.log(`--- Testing Client: ${name} ---`);
  try {
    const yt = await Innertube.create({ 
      location: 'IN',
      device_category: name 
    });
    
    const videoId = 'GurljGjfrVs';
    const info = await yt.getInfo(videoId);
    console.log("Success! Title:", info.basic_info.title);
    
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    if (format) {
      console.log("Format found:", format.mime_type);
    } else {
      console.log("Format NOT found.");
    }
  } catch (err) {
    console.error(`Failed ${name}:`, err.message);
  }
}

async function run() {
  await testClient('YTMUSIC');
  await testClient('ANDROID');
  await testClient('WEB');
}

run();
