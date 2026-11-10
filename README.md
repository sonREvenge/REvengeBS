# REvengeBS

Frida agent for Brawl Stars 68.250 on Android arm64

## Build

Requires Node.js 22 or later

```sh
npm ci
npm run build
```

Load `dist/agent.js` with your Frida host

## Usage

```python
agent = script.exports_sync
agent.start()
agent.setautododgeopts({'reactionSpeed': 70, 'directionPrecision': 64})
agent.togglefeature('autododge', True)
agent.prepareUnload()  # wait for this before calling script.unload()
```

Features: aimbot, autododge, ESP, spinner, killaura, camera, pins, sprays,
spec, BrawlTV, chatspam, FPS, FPS unlock, gradients, holdshoot,
speedhack and endpoint detection

Use `set<feature>opts(options)` or `configure(name, options)` to change settings
`status()` returns the agent state and `stop()` shuts it down
`listgradients()` lists available gradients and `setdebug(True)` enables logging

[Discord](https://discord.gg/ZksZaUeDbW) · [License](LICENSE)
