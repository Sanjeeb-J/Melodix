const ytdl = require("@distube/ytdl-core");

async function test() {
  const videoId = "dQw4w9WgXcQ";
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  console.log("Testing ytdl-core for videoId:", videoId);
  
  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, {
      quality: "highestaudio",
      filter: "audioonly",
    });
    
    if (!format) {
      console.error("No audio format found!");
      return;
    }
    
    console.log("SUCCESS! Audio format found:");
    console.log("  mimeType:", format.mimeType);
    console.log("  bitrate:", format.audioBitrate, "kbps");
    console.log("  contentLength:", format.contentLength, "bytes");
    console.log("  url exists:", !!format.url);
    
  } catch (err) {
    console.error("FAILED:", err.message);
  }
}

test();
