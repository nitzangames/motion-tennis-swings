# Motion Tennis — Swing Viewer

[Open the viewer](https://nitzangames.github.io/motion-tennis-swings/swings.html)

A browser animation workbench for the Motion Tennis procedural player rig. No installation, camera, or GitHub account needed. Requires WebGL and an internet connection; Three.js loads from jsDelivr.

- Inspect eleven swing combinations: forehand and backhand flat, topspin, slice, lob, and smash, plus serve.
- Switch between right and left hands, orbit the player, and show the skeleton or racket path.
- Play/pause, change playback speed, or step frame by frame. Space toggles playback; arrow keys step frames when a control is not focused.
- Playback includes anticipation, the forward stroke, follow-through, and recovery. Single serve view includes its toss preparation. Use Anticipation, Swing onset, Strike frame, and Finish to jump between phases. Enable Full timeline for the original untrimmed range.
- Pause on a frame and copy the address to share the same swing, hand, and frame. Export the frame as JSON with Save frame JSON.

Flat and topspin currently use the same arm path. This viewer uses the game's swing and arm code with fixed strike targets; it does not simulate ball contact, scoring, or an opponent.

GitHub Pages serves the main branch directly. To run locally, serve this directory with a static web server (for example, `python3 -m http.server 8000`) and open `http://localhost:8000/swings.html`.
