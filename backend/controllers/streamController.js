const { Readable } = require("stream");

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
    console.log(`[Stream] Proxying audio stream for ${videoId}...`);
    const yt = await getYT();

    // The download API provides an optimized WHATWG stream.
    // It automatically handles URL extraction, ciphers, and bot detection bypass.
    const webStream = await yt.download(videoId, {
      type: "audio",
      quality: "best",
      format: "mp4", // Requesting mp4 gives m4a (aac) which is broadly supported
    });

    if (!webStream) {
      throw new Error("Unable to obtain standard audio stream.");
    }

    const nodeStream = webStreamToNodeStream(webStream);

    res.writeHead(200, {
      "Content-Type": "audio/mp4",
      "Cache-Control": "no-cache",
      // Transfer-Encoding chunked is handled automatically by pipe()
    });

    nodeStream.pipe(res);

    req.on("close", () => {
      console.log(`[Stream] Client disconnected for ${videoId}`);
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
