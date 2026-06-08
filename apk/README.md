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

## Buttons

Coords are in `createAllButtons()` inside `index.js`. Change the `(x, y)` passed to each `createButton(...)`.

## Offsets

arm64, v67.264 only.
