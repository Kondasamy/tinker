#!/bin/sh
# Encodes the render (renders/<folder>.mp4) for the site as public/video/<folder>.{mp4,jpg,vtt}: H.264 under ~6 MB,
# a frame at POSTER seconds as the poster (a sandbox shot here), captions.
set -e
cd "$(dirname "$0")"
NAME=$(basename "$PWD")
POSTER=38.6
OUT=../../public/video
mkdir -p "$OUT"
ffmpeg -loglevel error -y -i "renders/$NAME.mp4" -c:v libx264 -preset veryslow -tune animation -crf 25 \
  -pix_fmt yuv420p -profile:v high -c:a aac -b:a 96k -ac 2 -movflags +faststart "$OUT/$NAME.mp4"
ffmpeg -loglevel error -y -ss "$POSTER" -i "$OUT/$NAME.mp4" -frames:v 1 -vf scale=1280:720:flags=lanczos -q:v 4 "$OUT/$NAME.jpg"
node vtt.mjs
