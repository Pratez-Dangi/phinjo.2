OVERWORLD TO END — PIXEL MUSIC BAR UPDATE

FILES
- index.html       Home page
- overworld.html   Overworld survival and mining guide
- nether.html      Nether portal and fortress guide
- end.html         Stronghold and Ender Dragon guide
- numbers.html     Coordinates and 39-item checklist
- styles.css       Shared pixelated design + music bar
- script.js        Site interactions, music player and seamless page navigation
- music-placeholder.txt  Instructions for adding your own audio file

ADD YOUR MUSIC
1. Put an audio file in this same folder and name it music.mp3.
2. The bar is already connected to music.mp3. You do not need to edit HTML.
3. Open the website, click the green Play button once, and set the volume.
4. Browsers usually require a user click before audio can start. This is normal.

HOW PLAYBACK CONTINUES BETWEEN PAGES
On a hosted HTTP/HTTPS website, clicking the five internal page links swaps only the main page content. The music player and audio element stay alive, so playback does not restart on each internal page change. The page title, current navigation link, checklists, reveal effects and anchors are refreshed too. Browser back/forward navigation is supported.

If you open pages using file:// (double-click an HTML file), the browser blocks fetch-based seamless navigation. Links still work normally, and the player saves its time/volume for restoration, but audio may pause briefly during a full page load. Use GitHub Pages or a local server such as VS Code Live Server for seamless switching.

NOTES
- No music track was included; music.mp3 is a placeholder path. Add your own permitted audio file.
- Some browsers may block automatic resume after a full browser reload until you click Play again. In-site link navigation will keep the same audio element playing.
- Keep all five HTML files, styles.css, script.js, and music.mp3 in the same folder.
