# REvenge

Frida agent for BSD Brawl v67.264.

<p align="center">
  <a href="https://discord.gg/ZksZaUeDbW"><img src="https://img.shields.io/badge/Discord-join-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" /></a>
</p>
## Download

Setup + APK on Discord: **https://discord.gg/ZksZaUeDbW**

## Setup

1. Uninstall BlueStacks if you already have it.
2. Run `REvenge_Setup.exe`. And install the BlueStacks build that works with the mod.
3. Open REvenge, go to Settings, enable Root and ADB.
4. In BlueStacks install the BSD APK (not the official Brawl Stars one).
5. Open BSD inside BlueStacks.

## Repo

```
agent/   ES-module agent sources
apk/     Single-file Frida-gadget repack for Android arm64
```

## Features

- Aimbot
- Autododge
- Killaura
- ESP
- In-game button UI in the APK build

## Build the APK

```
pip install frida-gadget --upgrade
cd apk
build-arm64.bat
```

## Build the agent bundle

```
cd agent
npx frida-compile index.js -o dist/agent.js -B iife
```

## Offsets

`agent/core/offsets.js` is keyed to BSD Brawl v67.264 arm64. Other versions won't work.

## License

See `LICENSE`. No resell, no rehost, no commercial use.
