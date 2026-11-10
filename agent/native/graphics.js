import { findExport } from './module.js';

export function createLineRenderer() {
  const bind = (name, result, args) => {
    const address = findExport(name, ['libGLESv2.so', 'libGLESv2.so.2']);
    if (!address) throw new Error('Missing GLES export: ' + name);
    return new NativeFunction(address, result, args);
  };
  const gl = {
    createShader: bind('glCreateShader', 'uint', ['uint']),
    shaderSource: bind('glShaderSource', 'void', ['uint', 'int', 'pointer', 'pointer']),
    compileShader: bind('glCompileShader', 'void', ['uint']),
    getShader: bind('glGetShaderiv', 'void', ['uint', 'uint', 'pointer']),
    deleteShader: bind('glDeleteShader', 'void', ['uint']),
    createProgram: bind('glCreateProgram', 'uint', []),
    attachShader: bind('glAttachShader', 'void', ['uint', 'uint']),
    linkProgram: bind('glLinkProgram', 'void', ['uint']),
    getProgram: bind('glGetProgramiv', 'void', ['uint', 'uint', 'pointer']),
    deleteProgram: bind('glDeleteProgram', 'void', ['uint']),
    useProgram: bind('glUseProgram', 'void', ['uint']),
    attrib: bind('glGetAttribLocation', 'int', ['uint', 'pointer']),
    getInt: bind('glGetIntegerv', 'void', ['uint', 'pointer']),
    getFloat: bind('glGetFloatv', 'void', ['uint', 'pointer']),
    getBoolean: bind('glGetBooleanv', 'void', ['uint', 'pointer']),
    colorMask: bind('glColorMask', 'void', ['uchar', 'uchar', 'uchar', 'uchar']),
    enabled: bind('glIsEnabled', 'uchar', ['uint']),
    enable: bind('glEnable', 'void', ['uint']),
    disable: bind('glDisable', 'void', ['uint']),
    genBuffers: bind('glGenBuffers', 'void', ['int', 'pointer']),
    deleteBuffers: bind('glDeleteBuffers', 'void', ['int', 'pointer']),
    bindBuffer: bind('glBindBuffer', 'void', ['uint', 'uint']),
    bufferData: bind('glBufferData', 'void', ['uint', 'ulong', 'pointer', 'uint']),
    getAttrib: bind('glGetVertexAttribiv', 'void', ['uint', 'uint', 'pointer']),
    getAttribPointer: bind('glGetVertexAttribPointerv', 'void', ['uint', 'uint', 'pointer']),
    enableAttrib: bind('glEnableVertexAttribArray', 'void', ['uint']),
    disableAttrib: bind('glDisableVertexAttribArray', 'void', ['uint']),
    pointer: bind('glVertexAttribPointer', 'void', [
      'uint',
      'int',
      'uint',
      'uchar',
      'int',
      'pointer',
    ]),
    draw: bind('glDrawArrays', 'void', ['uint', 'int', 'int']),
    blend: bind('glBlendFuncSeparate', 'void', ['uint', 'uint', 'uint', 'uint']),
    equation: bind('glBlendEquationSeparate', 'void', ['uint', 'uint']),
    lineWidth: bind('glLineWidth', 'void', ['float']),
  };
  const scratch = Memory.alloc(64);
  const integer = (key) => {
    gl.getInt(key, scratch);
    return scratch.readS32();
  };
  const attrib = (index, key) => {
    gl.getAttrib(index, key, scratch);
    return scratch.readS32();
  };
  let program = 0,
    buffer = 0,
    position = -1,
    color = -1,
    capacity = 0,
    memory = null,
    vertexData = null;
  let vao = 0,
    vaoApi = null;
  function shader(type, source) {
    const id = gl.createShader(type);
    if (!id) throw new Error('Overlay shader allocation failed');
    try {
      const sources = Memory.alloc(8);
      sources.writePointer(Memory.allocUtf8String(source));
      gl.shaderSource(id, 1, sources, ptr(0));
      gl.compileShader(id);
      gl.getShader(id, 0x8b81, scratch);
      if (!scratch.readS32()) throw new Error('Overlay shader failed');
      return id;
    } catch (error) {
      gl.deleteShader(id);
      throw error;
    }
  }
  function dispose() {
    if (vao) {
      scratch.writeU32(vao);
      vaoApi.remove(1, scratch);
      vao = 0;
    }
    if (buffer) {
      scratch.writeU32(buffer);
      gl.deleteBuffers(1, scratch);
      buffer = 0;
    }
    if (program) {
      gl.deleteProgram(program);
      program = 0;
    }
  }
  function initialize() {
    const vertex = shader(
      0x8b31,
      'attribute vec2 position; attribute vec4 color; varying vec4 tint; void main(){tint=color;gl_Position=vec4(position,0.0,1.0);}',
    );
    let fragment = 0;
    try {
      fragment = shader(
        0x8b30,
        'precision mediump float; varying vec4 tint; void main(){gl_FragColor=tint;}',
      );
      program = gl.createProgram();
      if (!program) throw new Error('Overlay program allocation failed');
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.getProgram(program, 0x8b82, scratch);
      if (!scratch.readS32()) throw new Error('Overlay link failed');
      position = gl.attrib(program, Memory.allocUtf8String('position'));
      color = gl.attrib(program, Memory.allocUtf8String('color'));
      if (position < 0 || color < 0) throw new Error('Overlay attributes missing');
      gl.genBuffers(1, scratch);
      buffer = scratch.readU32();
      if (!buffer) throw new Error('Overlay buffer allocation failed');
      const versionAddress = findExport('glGetString', ['libGLESv2.so', 'libGLESv2.so.2']);
      const version = versionAddress
        ? new NativeFunction(versionAddress, 'pointer', ['uint'])(0x1f02)
        : null;
      if (version && !version.isNull() && /OpenGL ES 3/.test(version.readCString())) {
        const resolve = (name, result, args) => {
          const address = findExport(name, ['libGLESv2.so', 'libGLESv3.so']);
          if (!address) throw new Error('Missing GLES3 export: ' + name);
          return new NativeFunction(address, result, args);
        };
        vaoApi = {
          make: resolve('glGenVertexArrays', 'void', ['int', 'pointer']),
          bind: resolve('glBindVertexArray', 'void', ['uint']),
          remove: resolve('glDeleteVertexArrays', 'void', ['int', 'pointer']),
        };
        vaoApi.make(1, scratch);
        vao = scratch.readU32();
        if (!vao) throw new Error('Overlay vertex array allocation failed');
      }
    } catch (error) {
      dispose();
      throw error;
    } finally {
      gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }
  }
  function saveAttribute(index) {
    const result = {
      index,
      enabled: attrib(index, 0x8622),
      size: attrib(index, 0x8623),
      type: attrib(index, 0x8625),
      normalized: attrib(index, 0x886a),
      stride: attrib(index, 0x8624),
      buffer: attrib(index, 0x889f),
    };
    gl.getAttribPointer(index, 0x8645, scratch);
    result.pointer = scratch.readPointer();
    return result;
  }
  return {
    dispose,
    draw(vertices) {
      if (!vertices.length) return;
      if (!program) initialize();
      const oldProgram = integer(0x8b8d),
        oldBuffer = integer(0x8894),
        attributes = vao ? [] : [saveAttribute(position), saveAttribute(color)];
      const oldVao = vao ? integer(0x85b5) : 0;
      const capabilities = [0x0b71, 0x0b90, 0x0c11, 0x0be2, 0x0b44],
        enabled = capabilities.map((cap) => gl.enabled(cap));
      const blend = [integer(0x80c9), integer(0x80c8), integer(0x80cb), integer(0x80ca)];
      const equation = [integer(0x8009), integer(0x883d)];
      gl.getBoolean(0x0c23, scratch);
      const mask = Array.from(new Uint8Array(scratch.readByteArray(4)));
      gl.getFloat(0x0b21, scratch);
      const width = scratch.readFloat();
      try {
        for (const cap of capabilities) gl.disable(cap);
        gl.enable(0x0be2);
        gl.blend(0x0302, 0x0303, 0x0302, 0x0303);
        gl.equation(0x8006, 0x8006);
        gl.colorMask(1, 1, 1, 1);
        gl.lineWidth(3);
        gl.useProgram(program);
        if (vao) vaoApi.bind(vao);
        const byteLength = vertices.length * 4;
        if (byteLength > capacity) {
          capacity = Math.max(byteLength, capacity * 2, 4096);
          memory = Memory.alloc(capacity);
          vertexData = new Float32Array(capacity / 4);
        }
        vertexData.set(vertices);
        memory.writeByteArray(new Uint8Array(vertexData.buffer, 0, byteLength));
        gl.bindBuffer(0x8892, buffer);
        gl.bufferData(0x8892, byteLength, memory, 0x88e8);
        gl.enableAttrib(position);
        gl.pointer(position, 2, 0x1406, 0, 24, ptr(0));
        gl.enableAttrib(color);
        gl.pointer(color, 4, 0x1406, 0, 24, ptr(8));
        gl.draw(1, 0, vertices.length / 6);
      } finally {
        for (const item of attributes) {
          gl.bindBuffer(0x8892, item.buffer);
          gl.pointer(item.index, item.size, item.type, item.normalized, item.stride, item.pointer);
          if (!item.enabled) gl.disableAttrib(item.index);
        }
        if (vao) vaoApi.bind(oldVao);
        gl.bindBuffer(0x8892, oldBuffer);
        gl.useProgram(oldProgram);
        gl.blend(...blend);
        gl.equation(...equation);
        gl.colorMask(...mask);
        gl.lineWidth(width);
        capabilities.forEach((cap, i) => {
          if (enabled[i]) gl.enable(cap);
          else gl.disable(cap);
        });
      }
    },
  };
}
