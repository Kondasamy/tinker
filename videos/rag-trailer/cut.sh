#!/bin/sh
# Cuts the three raw takes (capture/, from record.mjs) into assets/footage.mp4 and levels the music bed.
# Source ranges are in assets/footage.json; each take starts 2.6 s / 0.4 s / 0.5 s before its first click.
set -e
cd "$(dirname "$0")"
ffmpeg -loglevel error -y \
  -ss 1.079 -t 17.6 -i capture/ch1.webm \
  -ss 3.095 -t 16.6 -i capture/ch3.webm \
  -ss 2.997 -t 6.8 -i capture/ch7.webm \
  -filter_complex "[0:v]fps=30,setpts=PTS-STARTPTS[a];[1:v]fps=30,setpts=PTS-STARTPTS[b];[2:v]fps=30,setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -c:v libx264 -crf 18 -preset slow -movflags +faststart assets/footage.mp4
# the bed: 47 s, quiet (-30 LUFS), faded in and out
ffmpeg -loglevel error -y -i assets/audio/bgm-raw.mp3 -t 47 \
  -af "loudnorm=I=-30:TP=-3:LRA=7,afade=t=in:d=0.8,afade=t=out:st=44.5:d=2.5" -ar 44100 assets/audio/bgm.mp3
