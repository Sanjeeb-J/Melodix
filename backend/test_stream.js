const { exec } = require('yt-dlp-exec');
const subprocess = exec('https://www.youtube.com/watch?v=34Na4j8AVgA', {
  o: '-',
  q: '',
  f: 'bestaudio',
});
let len = 0;
subprocess.stdout.on('data', chunk => {
  len += chunk.length;
  console.log(`Received ${len} bytes`);
  if (len > 100000) {
    console.log('Stream works!');
    subprocess.kill();
    process.exit(0);
  }
});
subprocess.on('error', err => console.error('yt-dlp error:', err));
