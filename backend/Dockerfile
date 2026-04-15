# Use Node 22 as the base
FROM node:22-bullseye

# Install Python3, FFmpeg, and other tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install the latest yt-dlp directly via pip
RUN pip3 install --no-cache-dir -U yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install node dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV YTDLP_PATH=/usr/local/bin/yt-dlp

# Expose the API port
EXPOSE 10000

# Start the server
CMD ["node", "index.js"]
