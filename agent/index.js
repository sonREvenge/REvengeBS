import { Controller } from './runtime/controller.js';
import { createLogger } from './runtime/log.js';
import { createApi } from './runtime/api.js';
import { openSession } from './runtime/session.js';
import { aimbot, holdshoot, killaura } from './features/combat.js';
import { autododge } from './features/autododge.js';
import { spinner } from './features/spinner.js';
import { speedhack } from './features/speedhack.js';
import { camera } from './features/camera.js';
import { pin, spray, chatspam } from './features/messages.js';
import { fpsunlock } from './features/framerate.js';
import { esp } from './features/overlay.js';
import { fps } from './features/fps.js';
import { gradient } from './features/gradient.js';
import { spec, brawltv } from './features/spectator.js';
import { ipgrabber } from './features/ipgrabber.js';

export const features = {
  aimbot,
  autododge,
  esp,
  spinner,
  killaura,
  camera,
  spray,
  pin,
  brawltv,
  spec,
  chatspam,
  fps,
  fpsunlock,
  gradient,
  holdshoot,
  speedhack,
  ipgrabber,
};
const log = createLogger();
const controller = new Controller(features, (resources) => openSession(resources, log));
rpc.exports = createApi(controller, features, log);
