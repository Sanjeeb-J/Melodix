const { Readable } = require("stream");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// ─── Innertube singleton per container ──────────────────────────────────────
let ytInstance = null;

async function getYT() {
  if (!ytInstance) {
    const { Innertube } = await import("youtubei.js");
    ytInstance = await Innertube.create({ retrieve_player: true });
    console.log("[Stream] Innertube initialized");
  }
  return ytInstance;
}

// ─── Convert WHATWG ReadableStream → Node.js Readable Stream ─────────────────
function webStreamToNodeStream(webStream) {
  const reader = webStream.getReader();
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      } catch (err) {
        this.destroy(err);
      }
    },
    destroy(err, callback) {
      reader.cancel();
      callback(err);
    },
  });
}

// ─── Controller ─────────────────────────────────────────────────────────────
const streamAudio = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return res.status(400).json({ message: "videoId is required" });

  try {
    console.log(`[Stream] Proxying and transcoding audio for ${videoId}...`);
    const yt = await getYT();

    // The download API provides an optimized WHATWG stream.
    const webStream = await yt.download(videoId, {
      type: "audio",
      quality: "best",
      format: "mp4", // Requesting mp4 gives m4a (aac) from YouTube
    });

    if (!webStream) {
      throw new Error("Unable to obtain standard audio stream.");
    }

    const nodeStream = webStreamToNodeStream(webStream);

    res.writeHead(200, {
      "Content-Type": "audio/mpeg", // Send actual MP3 header
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked", // Required for continuous streaming
    });

    // We transcode to MP3 on the fly so the browser <audio> tag never throws a format error
    const command = ffmpeg(nodeStream)
      .format("mp3")
      .audioCodec("libmp3lame")
      // .audioBitrate(128)
      .on("error", (err) => {
        // Suppress "Output stream closed" errors on client disconnect
        if (!err.message.includes("Output stream closed")) {
          console.error(`[FFmpeg] Error transcoding ${videoId}:`, err.message);
        }
      })
      .on("end", () => {
        console.log(`[Stream] Finished streaming ${videoId}`);
      });

    // Pipe the transcoded MP3 stream directly to the response
    command.pipe(res, { end: true });

    req.on("close", () => {
      console.log(`[Stream] Client disconnected for ${videoId}`);
      try {
        command.kill("SIGKILL"); // Kill FFmpeg process if client disconnects early
      } catch (e) {}
      nodeStream.destroy();
    });

  } catch (err) {
    console.error(`[Stream] Error for ${videoId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to stream audio", error: err.message });
    }
  }
};

module.exports = { streamAudio };
