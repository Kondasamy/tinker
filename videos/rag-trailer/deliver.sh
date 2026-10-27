#!/bin/sh
# Encodes the render (renders/rag-trailer.mp4) for the site: H.264 under ~6 MB, a sandbox frame as the poster, captions.
set -e
cd "$(dirname "$0")"
OUT=../../public/video
mkdir -p "$OUT"
ffmpeg -loglevel error -y -i renders/rag-trailer.mp4 -c:v libx264 -preset veryslow -tune animation -crf 25 \
  -pix_fmt yuv420p -profile:v high -c:a aac -b:a 96k -ac 2 -movflags +faststart "$OUT/rag-trailer.mp4"
ffmpeg -loglevel error -y -ss 38.6 -i "$OUT/rag-trailer.mp4" -frames:v 1 -vf scale=1280:720:flags=lanczos -q:v 4 "$OUT/rag-trailer.jpg"
node vtt.mjs
