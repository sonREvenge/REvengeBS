# apk

Frida-gadget repack of BSD Brawl v67.264 for Android arm64.

## Files

- `index.js` — agent
- `build-arm64.bat` — repack
- `config.arm64.txt` — gadget config
- `package.json`

## Build

Requires Python 3.10+ and Java (JRE 8+).

```
pip install frida-gadget --upgrade
build-arm64.bat
```

Drop `bsd_brawl_v67.264.apk` in this folder first (not included).

## In-game UI

Button coords are in `createAllButtons()` inside `index.js`. Change the `(x, y)` passed to each `createButton(...)`.

Anything the game ships in `sc/ui.sc` is reachable from the agent: buttons, panels, popups, text fields, animations, icons, the whole UI. Open `sc-ui/ui.sc` in `sc-ui/sc-editor.jar` to browse it:

```
java -jar sc-ui/sc-editor.jar
```

File → Open → `sc-ui/ui.sc`. Pick any export name from the tree and call it from the agent with `StringTable_getMovieClip("sc/ui.sc", "<name>", true)`. The 3rd arg of `MovieClip_gotoAndStopFrameIndex` is the frame you want shown.

## Offsets

arm64, v67.264 only.
