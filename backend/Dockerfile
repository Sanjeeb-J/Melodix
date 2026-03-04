# Build stage
FROM node:20-slim AS builder

# Install Python (required by yt-dlp-exec install script)
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Final stage
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp manually for better stability
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app
COPY --from=builder /app ./

ENV PORT=8080
ENV NODE_ENV=production
ENV YTDLP_PATH=/usr/local/bin/yt-dlp

EXPOSE 8080

CMD ["node", "index.js"]
