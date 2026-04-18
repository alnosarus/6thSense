# Scroll video source

Drop the source MP4 here. Preferred filename: `source.mp4`.

This directory is for **unprocessed source material only**. It is gitignored — the raw MP4 will never be committed. Frames sliced from this video will be written to a served location (TBD in the design) and that is what ships to users.

After the file is here, Claude will run `ffprobe` to confirm duration, resolution, and framerate before finalizing the frame-extraction plan.
