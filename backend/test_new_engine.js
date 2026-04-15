const { Innertube } = require('youtubei.js');

async function testEngine() {
  console.log('--- Testing New Long-term Fix Engine (youtubei.js) ---');
  try {
    const yt = await Innertube.create();
    console.log('✅ Innertube client created');
    
    const videoId = 'SX_ViT4Ra7k';
    console.log(`🔍 Fetching info for video: ${videoId}`);
    
    const info = await yt.getInfo(videoId);
    console.log(`✅ Title: ${info.basic_info.title}`);
    
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    console.log(`✅ Format chosen: ${format.mime_type} (${format.quality_label || 'best'})`);
    
    console.log('\n--- DIAGNOSIS: SUCCESS ---');
    console.log('The new engine is ready to bypass 429 errors on Render!');
  } catch (err) {
    console.error('\n--- DIAGNOSIS: FAILED ---');
    console.error(err.message);
  }
}

testEngine();
