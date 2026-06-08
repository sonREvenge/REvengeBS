import { scanData } from '../core/scanner.js';
import { losCheck } from '../utils/wallCache.js';
import { offsets } from '../core/offsets.js';
import { state } from '../utils/flags.js';
import { resolveBrawlerRange } from '../core/brawler_db.js';
import { computeAimForTarget, getBestTargetId } from './aimbot.js';

const SCAN_STALENESS_MS = 2000;
const BS_STALENESS_MS   = 2000;
const RING_SEGS = 32;

let _bs = null;
let _bsTs = 0;
let _targetCount = 0;
let _enemyRingCount = 0;
let _myRingValid = false;
let _aimLine = null;
let _selfValid = false;
let _selfX = 0;
let _selfY = 0;
let _sw = 0;
let _sh = 0;
let _lastUpd = 0;

let _glReady = false;
let _glFailed = false;
let _prog = 0;
let _posLoc = -1;
let _colLoc = -1;
let _vbo = 0;
const _MAX_VERTS = 2048;
const _STRIDE_F  = 6;
const _STRIDE_B  = 24;
const _verts     = new Float32Array(_MAX_VERTS * _STRIDE_F);
const _vertsU8   = new Uint8Array(_verts.buffer);
const _buf       = Memory.alloc(_verts.byteLength);
let _vertCount   = 0;

const GL_ARRAY_BUFFER        = 0x8892;
const GL_DYNAMIC_DRAW        = 0x88E8;
const GL_FLOAT               = 0x1406;
const GL_LINES               = 0x0001;
const GL_BLEND               = 0x0BE2;
const GL_SRC_ALPHA           = 0x0302;
const GL_ONE_MINUS_SRC_ALPHA = 0x0303;
const GL_VERTEX_SHADER       = 0x8B31;
const GL_FRAGMENT_SHADER     = 0x8B30;
const GL_DEPTH_TEST          = 0x0B71;
const GL_CULL_FACE           = 0x0B44;
const GL_SCISSOR_TEST        = 0x0C11;

let _gl = {};

function _tryLoadGL() {
  const libs = ['libGLESv2.so', 'libGLES_mali.so', 'libGLES_adreno.so', 'libGL.so'];
  for (const lib of libs) {
    try {
      if (Module.findExportByName(lib, 'glCreateShader')) return lib;
    } catch (_) {}
  }
  return null;
}

function _loadGLFunctions(lib) {
  const f = (n, r, a) => new NativeFunction(Module.findExportByName(lib, n), r, a);
  _gl.createShader        = f('glCreateShader',            'uint',  ['uint']);
  _gl.shaderSource        = f('glShaderSource',            'void',  ['uint','int','pointer','pointer']);
  _gl.compileShader       = f('glCompileShader',           'void',  ['uint']);
  _gl.createProgram       = f('glCreateProgram',           'uint',  []);
  _gl.attachShader        = f('glAttachShader',            'void',  ['uint','uint']);
  _gl.linkProgram         = f('glLinkProgram',             'void',  ['uint']);
  _gl.useProgram          = f('glUseProgram',              'void',  ['uint']);
  _gl.getAttribLoc        = f('glGetAttribLocation',       'int',   ['uint','pointer']);
  _gl.getUniformLoc       = f('glGetUniformLocation',      'int',   ['uint','pointer']);
  _gl.uniform4f           = f('glUniform4f',               'void',  ['int','float','float','float','float']);
  _gl.enableVertexAttrib  = f('glEnableVertexAttribArray', 'void',  ['uint']);
  _gl.vertexAttribPtr     = f('glVertexAttribPointer',     'void',  ['uint','int','uint','uint8','int','pointer']);
  _gl.drawArrays          = f('glDrawArrays',              'void',  ['uint','int','int']);
  _gl.genBuffers          = f('glGenBuffers',              'void',  ['int','pointer']);
  _gl.bindBuffer          = f('glBindBuffer',              'void',  ['uint','uint']);
  _gl.bufferData          = f('glBufferData',              'void',  ['uint','int64','pointer','uint']);
  _gl.enable              = f('glEnable',                  'void',  ['uint']);
  _gl.disable             = f('glDisable',                 'void',  ['uint']);
  _gl.blendFunc           = f('glBlendFunc',               'void',  ['uint','uint']);
  _gl.lineWidth           = f('glLineWidth',               'void',  ['float']);
}

const _VERT = 'attribute vec2 p;attribute vec4 vc;varying vec4 fc;void main(){fc=vc;gl_Position=vec4(p,0.0,1.0);}';
const _FRAG = 'precision mediump float;varying vec4 fc;void main(){gl_FragColor=fc;}';

function _initGL() {
  if (_glReady || _glFailed) return;
  try {
    const lib = _tryLoadGL();
    if (!lib) {
      _glFailed = true;
      try { send({ type: 'WARN', code: 3, text: 'esp: no GLES library found, ESP disabled' }); } catch (_) {}
      return;
    }
    _loadGLFunctions(lib);

    const mkShader = (type, src) => {
      const s = _gl.createShader(type);
      const sp = Memory.allocUtf8String(src);
      const pp = Memory.alloc(Process.pointerSize);
      pp.writePointer(sp);
      _gl.shaderSource(s, 1, pp, ptr(0));
      _gl.compileShader(s);
      return s;
    };

    const vs = mkShader(GL_VERTEX_SHADER,   _VERT);
    const fs = mkShader(GL_FRAGMENT_SHADER, _FRAG);

    _prog = _gl.createProgram();
    if (_prog === 0) {
      _glFailed = true;
      try { send({ type: 'WARN', code: 3, text: 'esp: glCreateProgram returned 0, ESP disabled' }); } catch (_) {}
      return;
    }

    _gl.attachShader(_prog, vs);
    _gl.attachShader(_prog, fs);
    _gl.linkProgram(_prog);

    _posLoc = _gl.getAttribLoc(_prog, Memory.allocUtf8String('p'));
    _colLoc = _gl.getAttribLoc(_prog, Memory.allocUtf8String('vc'));

    const vp = Memory.alloc(4);
    _gl.genBuffers(1, vp);
    _vbo = vp.readU32();

    _glReady = true;
  } catch (e) {
    _glFailed = true;
    try { send({ type: 'WARN', code: 3, text: 'esp: init error: ' + (e && e.message ? e.message : e) }); } catch (_) {}
  }
}

function _setVert(idx, nx, ny, r, g, b, a) {
  const off = idx * _STRIDE_F;
  _verts[off    ] = nx;
  _verts[off + 1] = ny;
  _verts[off + 2] = r;
  _verts[off + 3] = g;
  _verts[off + 4] = b;
  _verts[off + 5] = a;
}

function _pushSeg(idx, ax, ay, bx, by, r, g, b_, a) {
  if (idx + 2 > _MAX_VERTS) return idx;
  _setVert(idx,     ax, ay, r, g, b_, a);
  _setVert(idx + 1, bx, by, r, g, b_, a);
  return idx + 2;
}

function _pushBox(idx, sx, sy, r, g, b, a) {
  const nx = (sx / _sw) * 2 - 1;
  const ny = 1 - (sy / _sh) * 2;
  const bw = 80 / _sw, bh = 120 / _sh;
  const x0 = nx - bw / 2, x1 = nx + bw / 2;
  idx = _pushSeg(idx, x0, ny,      x1, ny,      r, g, b, a);
  idx = _pushSeg(idx, x1, ny,      x1, ny + bh, r, g, b, a);
  idx = _pushSeg(idx, x1, ny + bh, x0, ny + bh, r, g, b, a);
  idx = _pushSeg(idx, x0, ny + bh, x0, ny,      r, g, b, a);
  return idx;
}

function _pushRing(idx, pts, r, g, b, a) {
  const n = RING_SEGS;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % n];
    if (!p1.valid || !p2.valid) continue;
    const ax = (p1.sx / _sw) * 2 - 1, ay = 1 - (p1.sy / _sh) * 2;
    const bx = (p2.sx / _sw) * 2 - 1, by_ = 1 - (p2.sy / _sh) * 2;
    idx = _pushSeg(idx, ax, ay, bx, by_, r, g, b, a);
  }
  return idx;
}

function _drawFrame() {
  if (!_glReady || _sw <= 0 || _sh <= 0) return;
  if (_lastUpd > 0 && Date.now() - _lastUpd > 1500) {
    _targetCount = 0; _enemyRingCount = 0; _myRingValid = false; _aimLine = null; _selfValid = false;
  }
  if (_targetCount === 0 && !_myRingValid && _enemyRingCount === 0 && !_aimLine) return;
  try {
    let idx = 0;

    for (let i = 0; i < _enemyRingCount; i++) {
      idx = _pushRing(idx, _ringPools[i], 0.0, 0.0, 0.0, 0.6);
    }

    if (_myRingValid) idx = _pushRing(idx, _myRingPool, 0.2, 0.9, 0.95, 0.55);

    const ox = _selfValid ? (_selfX / _sw) * 2 - 1 : 0;
    const oy = _selfValid ? 1 - (_selfY / _sh) * 2 : 0;
    for (let i = 0; i < _targetCount; i++) {
      const t = _targetsPool[i];
      if (t.los && _selfValid) {
        const tx = (t.sx / _sw) * 2 - 1;
        const ty = 1 - (t.sy / _sh) * 2;
        idx = _pushSeg(idx, ox, oy, tx, ty, 1.0, 0.2, 0.2, 0.9);
      }
      idx = _pushBox(idx, t.sx, t.sy, 1.0, 0.2, 0.2, 0.9);
    }

    if (_aimLine) {
      const al = _aimLine;
      const ax = (al.ax / _sw) * 2 - 1, ay = 1 - (al.ay / _sh) * 2;
      const bx = (al.bx / _sw) * 2 - 1, by_ = 1 - (al.by / _sh) * 2;
      idx = _pushSeg(idx, ax, ay, bx, by_, 1.0, 1.0, 0.15, 0.95);
    }

    if (idx === 0) return;
    _vertCount = idx;

    _buf.writeByteArray(_vertsU8.subarray(0, _vertCount * _STRIDE_B));

    _gl.disable(GL_DEPTH_TEST);
    _gl.disable(GL_CULL_FACE);
    _gl.disable(GL_SCISSOR_TEST);
    _gl.enable(GL_BLEND);
    _gl.blendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    _gl.useProgram(_prog);
    _gl.bindBuffer(GL_ARRAY_BUFFER, _vbo);
    _gl.bufferData(GL_ARRAY_BUFFER, _vertCount * _STRIDE_B, _buf, GL_DYNAMIC_DRAW);
    _gl.enableVertexAttrib(_posLoc);
    _gl.vertexAttribPtr(_posLoc, 2, GL_FLOAT, 0, _STRIDE_B, ptr(0));
    _gl.enableVertexAttrib(_colLoc);
    _gl.vertexAttribPtr(_colLoc, 4, GL_FLOAT, 0, _STRIDE_B, ptr(8));
    _gl.lineWidth(3);
    _gl.drawArrays(GL_LINES, 0, _vertCount);

    _gl.useProgram(0);
    _gl.bindBuffer(GL_ARRAY_BUFFER, 0);
  } catch (_) {
    _glFailed = true;
  }
}

let _mSW = 0, _mSH = 0;
const _mMat = new Float32Array(16);
const _ringCos = new Float32Array(RING_SEGS);
const _ringSin = new Float32Array(RING_SEGS);
(function () {
  for (let i = 0; i < RING_SEGS; i++) {
    const a = i * (Math.PI * 2 / RING_SEGS);
    _ringCos[i] = Math.cos(a);
    _ringSin[i] = Math.sin(a);
  }
})();

const _MAX_RINGS = 8;
const _ringPools = new Array(_MAX_RINGS);
for (let i = 0; i < _MAX_RINGS; i++) {
  const r = new Array(RING_SEGS);
  for (let j = 0; j < RING_SEGS; j++) r[j] = { sx: 0, sy: 0, valid: false };
  _ringPools[i] = r;
}
const _myRingPool = new Array(RING_SEGS);
for (let i = 0; i < RING_SEGS; i++) _myRingPool[i] = { sx: 0, sy: 0, valid: false };
const _targetsPool = new Array(_MAX_RINGS);
for (let i = 0; i < _MAX_RINGS; i++) _targetsPool[i] = { sx: 0, sy: 0, los: false };
const _w2sTmp = { sx: 0, sy: 0, valid: false };

function _refreshMatrix(bs) {
  try {
    _mSW = bs.add(offsets.BattleScreen_screenWidth).readFloat();
    _mSH = bs.add(offsets.BattleScreen_screenHeight).readFloat();
    if (_mSW <= 0 || _mSH <= 0) return false;
    const buf = bs.add(offsets.BattleScreen_viewMatrix).readByteArray(64);
    if (!buf) return false;
    const dv = new DataView(buf);
    for (let i = 0; i < 16; i++) _mMat[i] = dv.getFloat32(i * 4, true);
    return true;
  } catch (_) { return false; }
}

function _w2sInto(wx, wy, out) {
  const M = _mMat;
  const y = -wy;
  const cx = M[0]*wx + M[4]*y + M[12];
  const cy = M[1]*wx + M[5]*y + M[13];
  const cw = M[3]*wx + M[7]*y + M[15];
  if (cw <= 1e-6) { out.valid = false; return false; }
  const iw = 1 / cw;
  out.sx = (cx*iw*0.5+0.5)*_mSW;
  out.sy = (1-(cy*iw*0.5+0.5))*_mSH;
  out.valid = true;
  return true;
}

let _hookCb = null;

function _parseGOTFromPLT(pltAddr) {
  try {
    const insn0 = pltAddr.readU32();
    const insn1 = pltAddr.add(4).readU32();
    if ((insn0 >>> 24 & 0x9F) !== 0x90) return null;
    const immlo  = (insn0 >>> 29) & 3;
    const immhi  = (insn0 >>> 5) & 0x7FFFF;
    const imm21  = (immhi << 2) | immlo;
    const signed = (imm21 & 0x100000) ? (imm21 - 0x200000) : imm21;
    const imm12  = (insn1 >>> 10) & 0xFFF;
    const ldrOff = imm12 * 8;
    const pcPage = ptr(pltAddr).and(ptr('0xFFFFFFFFFFFFF000'));
    const gotPage = signed >= 0 ? pcPage.add(signed * 0x1000) : pcPage.sub(-signed * 0x1000);
    return gotPage.add(ldrOff);
  } catch (_) { return null; }
}

function _scanGOT(libgMod, eglReal) {
  const tmp = Memory.alloc(8);
  tmp.writePointer(eglReal);
  const patBytes = [];
  for (let i = 0; i < 8; i++) patBytes.push(tmp.add(i).readU8().toString(16).padStart(2, '0'));
  const pattern = patBytes.join(' ');
  const libgEnd = libgMod.base.add(libgMod.size);
  for (const prot of ['r--', 'rw-']) {
    for (const range of Process.enumerateRanges(prot)) {
      if (range.base.compare(libgMod.base) < 0 || range.base.compare(libgEnd) >= 0) continue;
      const hits = Memory.scanSync(range.base, range.size, pattern);
      if (hits.length > 0) return hits[0].address;
    }
  }
  return null;
}

function _installHook(eglReal, slot) {
  const origFn = new NativeFunction(eglReal, 'uint', ['pointer', 'pointer']);
  _hookCb = new NativeCallback(function (dpy, surface) {
    try {
      if (!_glReady && !_glFailed) _initGL();
      _drawFrame();
    } catch (_) {}
    return origFn(dpy, surface);
  }, 'uint', ['pointer', 'pointer']);
  try { Memory.protect(slot, 8, 'rw-'); } catch (_) {}
  slot.writePointer(_hookCb);
}

export function setupESP(base) {
  try {
    Interceptor.attach(base.add(offsets.BattleScreen__updateCameraParameters), {
      onEnter: function (args) {
        _bs = args[0];
        _bsTs = Date.now();
      }
    });
  } catch (_) {}

  try {
    const libgMod = Process.findModuleByName('libg.so');
    if (!libgMod) return;

    const eglReal = Module.findExportByName('libEGL.so', 'eglSwapBuffers');
    if (!eglReal) return;

    const pltEntry = libgMod.enumerateImports().find(i => i.name === 'eglSwapBuffers');
    if (!pltEntry) return;

    let slot = _parseGOTFromPLT(pltEntry.address);
    let valid = false;
    try { valid = slot && slot.readPointer().compare(eglReal) === 0; } catch (_) {}
    if (!valid) slot = _scanGOT(libgMod, eglReal);
    if (!slot) return;

    _installHook(eglReal, slot);
  } catch (_) {}
}

function _ringPointsInto(cx, cy, r, pool) {
  for (let i = 0; i < RING_SEGS; i++) {
    _w2sInto(cx + _ringCos[i] * r, cy + _ringSin[i] * r, pool[i]);
  }
}

const _aimLineSlot = { ax: 0, ay: 0, bx: 0, by: 0 };
const _aimW2sTmp = { sx: 0, sy: 0, valid: false };

export function updateESP() {
  const now = Date.now();
  if (!_bs || _bs.isNull() || (_bsTs > 0 && now - _bsTs > BS_STALENESS_MS) ||
      scanData.lastUpdate === 0 || now - scanData.lastUpdate > SCAN_STALENESS_MS ||
      !scanData.ownCharacter ||
      scanData.myX === undefined || scanData.myX === -1) {
    _targetCount = 0; _enemyRingCount = 0; _myRingValid = false; _aimLine = null; _selfValid = false; return;
  }
  if (!_refreshMatrix(_bs)) {
    _targetCount = 0; _enemyRingCount = 0; _myRingValid = false; _aimLine = null; _selfValid = false; return;
  }
  _sw = _mSW; _sh = _mSH;

  const mx = scanData.myX, my = scanData.myY;
  _selfValid = _w2sInto(mx, my, _w2sTmp);
  if (_selfValid) { _selfX = _w2sTmp.sx; _selfY = _w2sTmp.sy; }

  const myRange = resolveBrawlerRange(scanData.myBrawlerName, scanData.myBrawlerId);
  if (myRange > 0) {
    _ringPointsInto(mx, my, myRange, _myRingPool);
    _myRingValid = true;
  } else {
    _myRingValid = false;
  }

  const enemies = scanData.enemies;
  let tCount = 0;
  let rCount = 0;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e || e.x === -1 || e.y === -1) continue;
    if (tCount >= _MAX_RINGS) break;
    if (!_w2sInto(e.x, e.y, _w2sTmp)) continue;
    const slot = _targetsPool[tCount];
    slot.sx = _w2sTmp.sx;
    slot.sy = _w2sTmp.sy;
    slot.los = losCheck(mx, my, e.x, e.y, 0x40);
    tCount++;
    const eR = resolveBrawlerRange(e.brawlerName, e.brawlerId);
    if (eR <= 0) continue;
    _ringPointsInto(e.x, e.y, eR, _ringPools[rCount]);
    rCount++;
  }
  _targetCount = tCount;
  _enemyRingCount = rCount;

  _aimLine = null;
  if (_selfValid && (state.aimbot || state.killaura)) {
    const tid = getBestTargetId();
    if (tid) {
      const aim = computeAimForTarget(tid, mx, my);
      if (aim && _w2sInto(aim.x, aim.y, _aimW2sTmp)) {
        _aimLineSlot.ax = _selfX;
        _aimLineSlot.ay = _selfY;
        _aimLineSlot.bx = _aimW2sTmp.sx;
        _aimLineSlot.by = _aimW2sTmp.sy;
        _aimLine = _aimLineSlot;
      }
    }
  }

  _lastUpd = now;
}

export function resetESP() {
  _targetCount = 0;
  _enemyRingCount = 0;
  _myRingValid = false;
  _aimLine = null;
  _selfValid = false;
  _sw = 0;
  _sh = 0;
  _lastUpd = 0;
  _bs = null;
  _bsTs = 0;
}
