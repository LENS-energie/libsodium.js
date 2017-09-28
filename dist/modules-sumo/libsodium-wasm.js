(function(root) {

function expose_libsodium(exports) {
    "use strict";
    var Module = exports;
// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;

// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)

if (Module['ENVIRONMENT']) {
  if (Module['ENVIRONMENT'] === 'WEB') {
    ENVIRONMENT_IS_WEB = true;
  } else if (Module['ENVIRONMENT'] === 'WORKER') {
    ENVIRONMENT_IS_WORKER = true;
  } else if (Module['ENVIRONMENT'] === 'NODE') {
    ENVIRONMENT_IS_NODE = true;
  } else if (Module['ENVIRONMENT'] === 'SHELL') {
    ENVIRONMENT_IS_SHELL = true;
  } else {
    throw new Error('The provided Module[\'ENVIRONMENT\'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.');
  }
} else {
  ENVIRONMENT_IS_WEB = typeof window === 'object';
  ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
  ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
  ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
}


if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = console.log;
  if (!Module['printErr']) Module['printErr'] = console.warn;

  var nodeFS;
  var nodePath;

  Module['read'] = function shell_read(filename, binary) {
    if (!nodeFS) nodeFS = require('fs');
    if (!nodePath) nodePath = require('path');
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    return binary ? ret : ret.toString();
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function shell_read() { throw 'no read() available' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof quit === 'function') {
    Module['quit'] = function(status, toThrow) {
      quit(status);
    }
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function shell_read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (ENVIRONMENT_IS_WORKER) {
    Module['readBinary'] = function readBinary(url) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(xhr.response);
    };
  }

  Module['readAsync'] = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
      } else {
        onerror();
      }
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function shell_print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function shell_printErr(x) {
      console.warn(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  abort('NO_DYNAMIC_EXECUTION=1 was set, cannot eval');
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}
if (!Module['quit']) {
  Module['quit'] = function(status, toThrow) {
    throw toThrow;
  }
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = undefined;



// {{PREAMBLE_ADDITIONS}}

// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
    return value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [null,null,null,null,null,null,null,null],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 1*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-1)/1] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    if (!func) return; // on null pointer, return undefined
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      // optimize away arguments usage in common cases
      if (sig.length === 1) {
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func);
        };
      } else if (sig.length === 2) {
        sigCache[func] = function dynCall_wrapper(arg) {
          return Runtime.dynCall(sig, func, [arg]);
        };
      } else {
        // general case
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func, Array.prototype.slice.call(arguments));
        };
      }
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = HEAP32[DYNAMICTOP_PTR>>2];var end = (((ret + size + 15)|0) & -16);HEAP32[DYNAMICTOP_PTR>>2] = end;if (end >= TOTAL_MEMORY) {var success = enlargeMemory();if (!success) {HEAP32[DYNAMICTOP_PTR>>2] = ret;return 0;}}return ret;},
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 1024,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var ABORT = 0; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    abort('NO_DYNAMIC_EXECUTION=1 was set, cannot eval');
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        var len = (str.length << 2) + 1;
        ret = Runtime.stackAlloc(len);
        stringToUTF8(str, ret, len);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface.
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  // NO_DYNAMIC_EXECUTION is on, so we can't use the fast version of cwrap.
  // Fall back to returning a bound version of ccall.
  cwrap = function cwrap(ident, returnType, argTypes) {
    return function() {
      return ccall(ident, returnType, argTypes, arguments);
    }
  }
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

/** @type {function(number, number, string, boolean=)} */
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;

/** @type {function(number, string, boolean=)} */
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
/** @type {function((TypedArray|Array<number>|number), string, number, number=)} */
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [typeof _malloc === 'function' ? _malloc : Runtime.staticAlloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(/** @type {!Uint8Array} */ (slab), ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if (!runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

/** @type {function(number, number=)} */
function Pointer_stringify(ptr, length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
function UTF8ArrayToString(u8Array, idx) {
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  while (u8Array[endPtr]) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
    var u0, u1, u2, u3, u4, u5;

    var str = '';
    while (1) {
      // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
      u0 = u8Array[idx++];
      if (!u0) return str;
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      u1 = u8Array[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      u2 = u8Array[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u3 = u8Array[idx++] & 63;
        if ((u0 & 0xF8) == 0xF0) {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
        } else {
          u4 = u8Array[idx++] & 63;
          if ((u0 & 0xFC) == 0xF8) {
            u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
          } else {
            u5 = u8Array[idx++] & 63;
            u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
          }
        }
      }
      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}


// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}


// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}


function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}


// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}


// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}


function demangle(func) {
  var __cxa_demangle_func = Module['___cxa_demangle'] || Module['__cxa_demangle'];
  if (__cxa_demangle_func) {
    try {
      var s =
        func.substr(1);
      var len = lengthBytesUTF8(s)+1;
      var buf = _malloc(len);
      stringToUTF8(s, buf, len);
      var status = _malloc(4);
      var ret = __cxa_demangle_func(buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed
    } catch(e) {
      // ignore problems here
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
    // failure when using libcxxabi, don't demangle
    return func;
  }
  Runtime.warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  return func;
}

function demangleAll(text) {
  var regex =
    /__Z[\w\d_]+/g;
  return text.replace(regex,
    function(x) {
      var y = demangle(x);
      return x === y ? x : (x + ' [' + y + ']');
    });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  var js = jsStackTrace();
  if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
  return demangleAll(js);
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;
var MIN_TOTAL_MEMORY = 16777216;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple);
  }
  return x;
}

var HEAP,
/** @type {ArrayBuffer} */
  buffer,
/** @type {Int8Array} */
  HEAP8,
/** @type {Uint8Array} */
  HEAPU8,
/** @type {Int16Array} */
  HEAP16,
/** @type {Uint16Array} */
  HEAPU16,
/** @type {Int32Array} */
  HEAP32,
/** @type {Uint32Array} */
  HEAPU32,
/** @type {Float32Array} */
  HEAPF32,
/** @type {Float64Array} */
  HEAPF64;

function updateGlobalBuffer(buf) {
  Module['buffer'] = buffer = buf;
}

function updateGlobalBufferViews() {
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
}

var STATIC_BASE, STATICTOP, staticSealed; // static area
var STACK_BASE, STACKTOP, STACK_MAX; // stack area
var DYNAMIC_BASE, DYNAMICTOP_PTR; // dynamic area handled by sbrk

  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  staticSealed = false;



function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

if (!Module['reallocBuffer']) Module['reallocBuffer'] = function(size) {
  var ret;
  try {
    if (ArrayBuffer.transfer) {
      ret = ArrayBuffer.transfer(buffer, size);
    } else {
      var oldHEAP8 = HEAP8;
      ret = new ArrayBuffer(size);
      var temp = new Int8Array(ret);
      temp.set(oldHEAP8);
    }
  } catch(e) {
    return false;
  }
  var success = _emscripten_replace_memory(ret);
  if (!success) return false;
  return ret;
};

function enlargeMemory() {
  // TOTAL_MEMORY is the current size of the actual array, and DYNAMICTOP is the new top.


  var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE; // In wasm, heap size must be a multiple of 64KB. In asm.js, they need to be multiples of 16MB.
  var LIMIT = 2147483648 - PAGE_MULTIPLE; // We can do one page short of 2GB as theoretical maximum.

  if (HEAP32[DYNAMICTOP_PTR>>2] > LIMIT) {
    return false;
  }

  var OLD_TOTAL_MEMORY = TOTAL_MEMORY;
  TOTAL_MEMORY = Math.max(TOTAL_MEMORY, MIN_TOTAL_MEMORY); // So the loop below will not be infinite, and minimum asm.js memory size is 16MB.

  while (TOTAL_MEMORY < HEAP32[DYNAMICTOP_PTR>>2]) { // Keep incrementing the heap size as long as it's less than what is requested.
    if (TOTAL_MEMORY <= 536870912) {
      TOTAL_MEMORY = alignUp(2 * TOTAL_MEMORY, PAGE_MULTIPLE); // Simple heuristic: double until 1GB...
    } else {
      TOTAL_MEMORY = Math.min(alignUp((3 * TOTAL_MEMORY + 2147483648) / 4, PAGE_MULTIPLE), LIMIT); // ..., but after that, add smaller increments towards 2GB, which we cannot reach
    }
  }


  var replacement = Module['reallocBuffer'](TOTAL_MEMORY);
  if (!replacement || replacement.byteLength != TOTAL_MEMORY) {
    // restore the state to before this call, we failed
    TOTAL_MEMORY = OLD_TOTAL_MEMORY;
    return false;
  }

  // everything worked

  updateGlobalBuffer(replacement);
  updateGlobalBufferViews();




  return true;
}

var byteLength;
try {
  byteLength = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get);
  byteLength(new ArrayBuffer(4)); // can fail on older ie
} catch(e) { // can fail on older node/v8
  byteLength = function(buffer) { return buffer.byteLength; };
}

var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr('TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');

// Initialize the runtime's memory



// Use a provided buffer, if there is one, or else allocate a new one
if (Module['buffer']) {
  buffer = Module['buffer'];
} else {
  // Use a WebAssembly memory where available
  if (typeof WebAssembly === 'object' && typeof WebAssembly.Memory === 'function') {
    Module['wasmMemory'] = new WebAssembly.Memory({ 'initial': TOTAL_MEMORY / WASM_PAGE_SIZE });
    buffer = Module['wasmMemory'].buffer;
  } else
  {
    buffer = new ArrayBuffer(TOTAL_MEMORY);
  }
}
updateGlobalBufferViews();


function getTotalMemory() {
  return TOTAL_MEMORY;
}

// Endianness check (note: assumes compiler arch was little-endian)
  HEAP32[0] = 0x63736d65; /* 'emsc' */
HEAP16[1] = 0x6373;
if (HEAPU8[2] !== 0x73 || HEAPU8[3] !== 0x63) throw 'Runtime error: expected the system to be little-endian!';

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func);
      } else {
        Module['dynCall_vi'](func, callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools

/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
/** @deprecated */
function writeStringToMemory(string, buffer, dontAddNull) {
  Runtime.warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var /** @type {number} */ lastChar, /** @type {number} */ end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer);
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];

if (!Math['fround']) {
  var froundBuffer = new Float32Array(1);
  Math['fround'] = function(x) { froundBuffer[0] = x; return froundBuffer[0] };
}
Math.fround = Math['fround'];

if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

if (!Math['trunc']) Math['trunc'] = function(x) {
  return x < 0 ? Math.ceil(x) : Math.floor(x);
};
Math.trunc = Math['trunc'];

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;





function integrateWasmJS() {
  // wasm.js has several methods for creating the compiled code module here:
  //  * 'native-wasm' : use native WebAssembly support in the browser
  //  * 'interpret-s-expr': load s-expression code from a .wast and interpret
  //  * 'interpret-binary': load binary wasm and interpret
  //  * 'interpret-asm2wasm': load asm.js code, translate to wasm, and interpret
  //  * 'asmjs': no wasm, just load the asm.js code and use that (good for testing)
  // The method can be set at compile time (BINARYEN_METHOD), or runtime by setting Module['wasmJSMethod'].
  // The method can be a comma-separated list, in which case, we will try the
  // options one by one. Some of them can fail gracefully, and then we can try
  // the next.

  // inputs

  var method = Module['wasmJSMethod'] || 'native-wasm';
  Module['wasmJSMethod'] = method;

  var wasmTextFile = Module['wasmTextFile'] || 'libsodium.wast';
  var wasmBinaryFile = Module['wasmBinaryFile'] || 'libsodium.wasm';
  var asmjsCodeFile = Module['asmjsCodeFile'] || 'libsodium.temp.asm.js';

  if (typeof Module['locateFile'] === 'function') {
    wasmTextFile = Module['locateFile'](wasmTextFile);
    wasmBinaryFile = Module['locateFile'](wasmBinaryFile);
    asmjsCodeFile = Module['locateFile'](asmjsCodeFile);
  }

  // utilities

  var wasmPageSize = 64*1024;

  var asm2wasmImports = { // special asm2wasm imports
    "f64-rem": function(x, y) {
      return x % y;
    },
    "f64-to-int": function(x) {
      return x | 0;
    },
    "i32s-div": function(x, y) {
      return ((x | 0) / (y | 0)) | 0;
    },
    "i32u-div": function(x, y) {
      return ((x >>> 0) / (y >>> 0)) >>> 0;
    },
    "i32s-rem": function(x, y) {
      return ((x | 0) % (y | 0)) | 0;
    },
    "i32u-rem": function(x, y) {
      return ((x >>> 0) % (y >>> 0)) >>> 0;
    },
    "debugger": function() {
      debugger;
    },
  };

  var info = {
    'global': null,
    'env': null,
    'asm2wasm': asm2wasmImports,
    'parent': Module // Module inside wasm-js.cpp refers to wasm-js.cpp; this allows access to the outside program.
  };

  var exports = null;

  function lookupImport(mod, base) {
    var lookup = info;
    if (mod.indexOf('.') < 0) {
      lookup = (lookup || {})[mod];
    } else {
      var parts = mod.split('.');
      lookup = (lookup || {})[parts[0]];
      lookup = (lookup || {})[parts[1]];
    }
    if (base) {
      lookup = (lookup || {})[base];
    }
    if (lookup === undefined) {
      abort('bad lookupImport to (' + mod + ').' + base);
    }
    return lookup;
  }

  function mergeMemory(newBuffer) {
    // The wasm instance creates its memory. But static init code might have written to
    // buffer already, including the mem init file, and we must copy it over in a proper merge.
    // TODO: avoid this copy, by avoiding such static init writes
    // TODO: in shorter term, just copy up to the last static init write
    var oldBuffer = Module['buffer'];
    if (newBuffer.byteLength < oldBuffer.byteLength) {
      Module['printErr']('the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here');
    }
    var oldView = new Int8Array(oldBuffer);
    var newView = new Int8Array(newBuffer);

    // If we have a mem init file, do not trample it
    if (!memoryInitializer) {
      oldView.set(newView.subarray(Module['STATIC_BASE'], Module['STATIC_BASE'] + Module['STATIC_BUMP']), Module['STATIC_BASE']);
    }

    newView.set(oldView);
    updateGlobalBuffer(newBuffer);
    updateGlobalBufferViews();
  }

  var WasmTypes = {
    none: 0,
    i32: 1,
    i64: 2,
    f32: 3,
    f64: 4
  };

  function fixImports(imports) {
    if (!0) return imports;
    var ret = {};
    for (var i in imports) {
      var fixed = i;
      if (fixed[0] == '_') fixed = fixed.substr(1);
      ret[fixed] = imports[i];
    }
    return ret;
  }

  function getBinary() {
    try {
      var binary;
      if (Module['wasmBinary']) {
        binary = Module['wasmBinary'];
        binary = new Uint8Array(binary);
      } else if (Module['readBinary']) {
        binary = Module['readBinary'](wasmBinaryFile);
      } else {
        throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)";
      }
      return binary;
    }
    catch (err) {
      abort(err);
    }
  }

  function getBinaryPromise() {
    // if we don't have the binary yet, and have the Fetch api, use that
    // in some environments, like Electron's render process, Fetch api may be present, but have a different context than expected, let's only use it on the Web
    if (!Module['wasmBinary'] && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === 'function') {
      return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
        if (!response['ok']) {
          throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
        }
        return response['arrayBuffer']();
      });
    }
    // Otherwise, getBinary should be able to get it synchronously
    return new Promise(function(resolve, reject) {
      resolve(getBinary());
    });
  }

  // do-method functions

  function doJustAsm(global, env, providedBuffer) {
    // if no Module.asm, or it's the method handler helper (see below), then apply
    // the asmjs
    if (typeof Module['asm'] !== 'function' || Module['asm'] === methodHandler) {
      if (!Module['asmPreload']) {
        // you can load the .asm.js file before this, to avoid this sync xhr and eval
        abort('NO_DYNAMIC_EXECUTION=1 was set, cannot eval'); // set Module.asm
      } else {
        Module['asm'] = Module['asmPreload'];
      }
    }
    if (typeof Module['asm'] !== 'function') {
      Module['printErr']('asm evalling did not set the module properly');
      return false;
    }
    return Module['asm'](global, env, providedBuffer);
  }

  function doNativeWasm(global, env, providedBuffer) {
    if (typeof WebAssembly !== 'object') {
      Module['printErr']('no native wasm support detected');
      return false;
    }
    // prepare memory import
    if (!(Module['wasmMemory'] instanceof WebAssembly.Memory)) {
      Module['printErr']('no native wasm Memory in use');
      return false;
    }
    env['memory'] = Module['wasmMemory'];
    // Load the wasm module and create an instance of using native support in the JS engine.
    info['global'] = {
      'NaN': NaN,
      'Infinity': Infinity
    };
    info['global.Math'] = global.Math;
    info['env'] = env;
    // handle a generated wasm instance, receiving its exports and
    // performing other necessary setup
    function receiveInstance(instance) {
      exports = instance.exports;
      if (exports.memory) mergeMemory(exports.memory);
      Module['asm'] = exports;
      Module["usingWasm"] = true;
      removeRunDependency('wasm-instantiate');
    }

    addRunDependency('wasm-instantiate'); // we can't run yet

    // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
    // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
    // to any other async startup actions they are performing.
    if (Module['instantiateWasm']) {
      try {
        return Module['instantiateWasm'](info, receiveInstance);
      } catch(e) {
        Module['printErr']('Module.instantiateWasm callback failed with error: ' + e);
        return false;
      }
    }

    getBinaryPromise().then(function(binary) {
      return WebAssembly.instantiate(binary, info)
    }).then(function(output) {
      // receiveInstance() will swap in the exports (to Module.asm) so they can be called
      receiveInstance(output['instance']);
    }).catch(function(reason) {
      Module['printErr']('failed to asynchronously prepare wasm: ' + reason);
      abort(reason);
    });
    return {}; // no exports yet; we'll fill them in later
  }

  function doWasmPolyfill(global, env, providedBuffer, method) {
    if (typeof WasmJS !== 'function') {
      Module['printErr']('WasmJS not detected - polyfill not bundled?');
      return false;
    }

    // Use wasm.js to polyfill and execute code in a wasm interpreter.
    var wasmJS = WasmJS({});

    // XXX don't be confused. Module here is in the outside program. wasmJS is the inner wasm-js.cpp.
    wasmJS['outside'] = Module; // Inside wasm-js.cpp, Module['outside'] reaches the outside module.

    // Information for the instance of the module.
    wasmJS['info'] = info;

    wasmJS['lookupImport'] = lookupImport;

    assert(providedBuffer === Module['buffer']); // we should not even need to pass it as a 3rd arg for wasm, but that's the asm.js way.

    info.global = global;
    info.env = env;

    // polyfill interpreter expects an ArrayBuffer
    assert(providedBuffer === Module['buffer']);
    env['memory'] = providedBuffer;
    assert(env['memory'] instanceof ArrayBuffer);

    wasmJS['providedTotalMemory'] = Module['buffer'].byteLength;

    // Prepare to generate wasm, using either asm2wasm or s-exprs
    var code;
    if (method === 'interpret-binary') {
      code = getBinary();
    } else {
      code = Module['read'](method == 'interpret-asm2wasm' ? asmjsCodeFile : wasmTextFile);
    }
    var temp;
    if (method == 'interpret-asm2wasm') {
      temp = wasmJS['_malloc'](code.length + 1);
      wasmJS['writeAsciiToMemory'](code, temp);
      wasmJS['_load_asm2wasm'](temp);
    } else if (method === 'interpret-s-expr') {
      temp = wasmJS['_malloc'](code.length + 1);
      wasmJS['writeAsciiToMemory'](code, temp);
      wasmJS['_load_s_expr2wasm'](temp);
    } else if (method === 'interpret-binary') {
      temp = wasmJS['_malloc'](code.length);
      wasmJS['HEAPU8'].set(code, temp);
      wasmJS['_load_binary2wasm'](temp, code.length);
    } else {
      throw 'what? ' + method;
    }
    wasmJS['_free'](temp);

    wasmJS['_instantiate'](temp);

    if (Module['newBuffer']) {
      mergeMemory(Module['newBuffer']);
      Module['newBuffer'] = null;
    }

    exports = wasmJS['asmExports'];

    return exports;
  }

  // We may have a preloaded value in Module.asm, save it
  Module['asmPreload'] = Module['asm'];

  // Memory growth integration code

  var asmjsReallocBuffer = Module['reallocBuffer'];

  var wasmReallocBuffer = function(size) {
    var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE; // In wasm, heap size must be a multiple of 64KB. In asm.js, they need to be multiples of 16MB.
    size = alignUp(size, PAGE_MULTIPLE); // round up to wasm page size
    var old = Module['buffer'];
    var oldSize = old.byteLength;
    if (Module["usingWasm"]) {
      // native wasm support
      try {
        var result = Module['wasmMemory'].grow((size - oldSize) / wasmPageSize); // .grow() takes a delta compared to the previous size
        if (result !== (-1 | 0)) {
          // success in native wasm memory growth, get the buffer from the memory
          return Module['buffer'] = Module['wasmMemory'].buffer;
        } else {
          return null;
        }
      } catch(e) {
        return null;
      }
    } else {
      // wasm interpreter support
      exports['__growWasmMemory']((size - oldSize) / wasmPageSize); // tiny wasm method that just does grow_memory
      // in interpreter, we replace Module.buffer if we allocate
      return Module['buffer'] !== old ? Module['buffer'] : null; // if it was reallocated, it changed
    }
  };

  Module['reallocBuffer'] = function(size) {
    if (finalMethod === 'asmjs') {
      return asmjsReallocBuffer(size);
    } else {
      return wasmReallocBuffer(size);
    }
  };

  // we may try more than one; this is the final one, that worked and we are using
  var finalMethod = '';

  // Provide an "asm.js function" for the application, called to "link" the asm.js module. We instantiate
  // the wasm module at that time, and it receives imports and provides exports and so forth, the app
  // doesn't need to care that it is wasm or olyfilled wasm or asm.js.

  Module['asm'] = function(global, env, providedBuffer) {
    global = fixImports(global);
    env = fixImports(env);

    // import table
    if (!env['table']) {
      var TABLE_SIZE = Module['wasmTableSize'];
      if (TABLE_SIZE === undefined) TABLE_SIZE = 1024; // works in binaryen interpreter at least
      var MAX_TABLE_SIZE = Module['wasmMaxTableSize'];
      if (typeof WebAssembly === 'object' && typeof WebAssembly.Table === 'function') {
        if (MAX_TABLE_SIZE !== undefined) {
          env['table'] = new WebAssembly.Table({ 'initial': TABLE_SIZE, 'maximum': MAX_TABLE_SIZE, 'element': 'anyfunc' });
        } else {
          env['table'] = new WebAssembly.Table({ 'initial': TABLE_SIZE, element: 'anyfunc' });
        }
      } else {
        env['table'] = new Array(TABLE_SIZE); // works in binaryen interpreter at least
      }
      Module['wasmTable'] = env['table'];
    }

    if (!env['memoryBase']) {
      env['memoryBase'] = Module['STATIC_BASE']; // tell the memory segments where to place themselves
    }
    if (!env['tableBase']) {
      env['tableBase'] = 0; // table starts at 0 by default, in dynamic linking this will change
    }

    // try the methods. each should return the exports if it succeeded

    var exports;
    exports = doNativeWasm(global, env, providedBuffer);


    return exports;
  };

  var methodHandler = Module['asm']; // note our method handler, as we may modify Module['asm'] later
}

integrateWasmJS();

// === Body ===

var ASM_CONSTS = [function() { return Module.getRandomValue(); },
 function() { if (Module.getRandomValue === undefined) { try { var window_ = 'object' === typeof window ? window : self; var crypto_ = typeof window_.crypto !== 'undefined' ? window_.crypto : window_.msCrypto; var randomValuesStandard = function() { var buf = new Uint32Array(1); crypto_.getRandomValues(buf); return buf[0] >>> 0; }; randomValuesStandard(); Module.getRandomValue = randomValuesStandard; } catch (e) { try { var crypto = require('crypto'); var randomValueNodeJS = function() { var buf = crypto.randomBytes(4); return (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0; }; randomValueNodeJS(); Module.getRandomValue = randomValueNodeJS; } catch (e) { throw 'No secure random number generator found'; } } } }];

function _emscripten_asm_const_i(code) {
  return ASM_CONSTS[code]();
}



STATIC_BASE = Runtime.GLOBAL_BASE;

STATICTOP = STATIC_BASE + 38224;
/* global initializers */  __ATINIT__.push();


memoryInitializer = Module["wasmJSMethod"].indexOf("asmjs") >= 0 || Module["wasmJSMethod"].indexOf("interpret-asm2wasm") >= 0 ? "libsodium.js.mem" : null;




var STATIC_BUMP = 38224;
Module["STATIC_BASE"] = STATIC_BASE;
Module["STATIC_BUMP"] = STATIC_BUMP;

/* no memory initializer */
var tempDoublePtr = STATICTOP; STATICTOP += 16;

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      return value;
    } 

  
  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    }  

   

  function ___lock() {}

  var _emscripten_asm_const_int=true;


  function _abort() {
      Module['abort']();
    }

  
  var SYSCALLS={varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      // NOTE: offset_high is unused - Emscripten's off_t is 32-bit
      var offset = offset_low;
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      // hack to support printf in NO_FILESYSTEM
      var stream = SYSCALLS.get(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffer) {
        ___syscall146.buffers = [null, [], []]; // 1 => stdout, 2 => stderr
        ___syscall146.printChar = function(stream, curr) {
          var buffer = ___syscall146.buffers[stream];
          assert(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? Module['print'] : Module['printErr'])(UTF8ArrayToString(buffer, 0));
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        };
      }
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(((iov)+(i*8))>>2)];
        var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
        for (var j = 0; j < len; j++) {
          ___syscall146.printChar(stream, HEAPU8[ptr+j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___unlock() {}

  function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
/* flush anything remaining in the buffer during shutdown */ __ATEXIT__.push(function() { var fflush = Module["_fflush"]; if (fflush) fflush(0); var printChar = ___syscall146.printChar; if (!printChar) return; var buffers = ___syscall146.buffers; if (buffers[1].length) printChar(1, 10); if (buffers[2].length) printChar(2, 10); });;
DYNAMICTOP_PTR = allocate(1, "i32", ALLOC_STATIC);

STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = Runtime.alignMemory(STACK_MAX);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;

staticSealed = true; // seal the static portion of memory


Module['wasmTableSize'] = 64;

Module['wasmMaxTableSize'] = 64;

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function jsCall_ii(index,a1) {
    return Runtime.functionPointers[index](a1);
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function jsCall_iiii(index,a1,a2,a3) {
    return Runtime.functionPointers[index](a1,a2,a3);
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity, "byteLength": byteLength };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "enlargeMemory": enlargeMemory, "getTotalMemory": getTotalMemory, "abortOnCannotGrowMemory": abortOnCannotGrowMemory, "invoke_ii": invoke_ii, "jsCall_ii": jsCall_ii, "invoke_iiii": invoke_iiii, "jsCall_iiii": jsCall_iiii, "_emscripten_asm_const_i": _emscripten_asm_const_i, "___lock": ___lock, "_abort": _abort, "___setErrNo": ___setErrNo, "___syscall6": ___syscall6, "___syscall140": ___syscall140, "_emscripten_memcpy_big": _emscripten_memcpy_big, "___syscall54": ___syscall54, "___unlock": ___unlock, "___assert_fail": ___assert_fail, "___syscall146": ___syscall146, "DYNAMICTOP_PTR": DYNAMICTOP_PTR, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX };
// EMSCRIPTEN_START_ASM
var asm =Module["asm"]// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);

Module["asm"] = asm;
var _crypto_onetimeauth_poly1305_init = Module["_crypto_onetimeauth_poly1305_init"] = function() {  return Module["asm"]["_crypto_onetimeauth_poly1305_init"].apply(null, arguments) };
var _crypto_hash_sha512_init = Module["_crypto_hash_sha512_init"] = function() {  return Module["asm"]["_crypto_hash_sha512_init"].apply(null, arguments) };
var _crypto_sign_ed25519_pk_to_curve25519 = Module["_crypto_sign_ed25519_pk_to_curve25519"] = function() {  return Module["asm"]["_crypto_sign_ed25519_pk_to_curve25519"].apply(null, arguments) };
var _sodium_unpad = Module["_sodium_unpad"] = function() {  return Module["asm"]["_sodium_unpad"].apply(null, arguments) };
var _crypto_scalarmult_primitive = Module["_crypto_scalarmult_primitive"] = function() {  return Module["asm"]["_crypto_scalarmult_primitive"].apply(null, arguments) };
var _crypto_scalarmult_base = Module["_crypto_scalarmult_base"] = function() {  return Module["asm"]["_crypto_scalarmult_base"].apply(null, arguments) };
var _crypto_auth_bytes = Module["_crypto_auth_bytes"] = function() {  return Module["asm"]["_crypto_auth_bytes"].apply(null, arguments) };
var _crypto_stream_chacha20_keybytes = Module["_crypto_stream_chacha20_keybytes"] = function() {  return Module["asm"]["_crypto_stream_chacha20_keybytes"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_decrypt_detached = Module["_crypto_aead_chacha20poly1305_decrypt_detached"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_decrypt_detached"].apply(null, arguments) };
var _crypto_kdf_blake2b_bytes_min = Module["_crypto_kdf_blake2b_bytes_min"] = function() {  return Module["asm"]["_crypto_kdf_blake2b_bytes_min"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_open_easy_afternm = Module["_crypto_box_curve25519xchacha20poly1305_open_easy_afternm"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_open_easy_afternm"].apply(null, arguments) };
var _crypto_generichash_blake2b_keybytes_max = Module["_crypto_generichash_blake2b_keybytes_max"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_keybytes_max"].apply(null, arguments) };
var _crypto_box_beforenmbytes = Module["_crypto_box_beforenmbytes"] = function() {  return Module["asm"]["_crypto_box_beforenmbytes"].apply(null, arguments) };
var _crypto_stream_salsa208 = Module["_crypto_stream_salsa208"] = function() {  return Module["asm"]["_crypto_stream_salsa208"].apply(null, arguments) };
var _crypto_sign_ed25519_sk_to_curve25519 = Module["_crypto_sign_ed25519_sk_to_curve25519"] = function() {  return Module["asm"]["_crypto_sign_ed25519_sk_to_curve25519"].apply(null, arguments) };
var _crypto_stream_chacha20_ietf_xor_ic = Module["_crypto_stream_chacha20_ietf_xor_ic"] = function() {  return Module["asm"]["_crypto_stream_chacha20_ietf_xor_ic"].apply(null, arguments) };
var _crypto_secretbox_xsalsa20poly1305_open = Module["_crypto_secretbox_xsalsa20poly1305_open"] = function() {  return Module["asm"]["_crypto_secretbox_xsalsa20poly1305_open"].apply(null, arguments) };
var _crypto_box_zerobytes = Module["_crypto_box_zerobytes"] = function() {  return Module["asm"]["_crypto_box_zerobytes"].apply(null, arguments) };
var _crypto_secretbox_xchacha20poly1305_open_detached = Module["_crypto_secretbox_xchacha20poly1305_open_detached"] = function() {  return Module["asm"]["_crypto_secretbox_xchacha20poly1305_open_detached"].apply(null, arguments) };
var _crypto_stream_salsa208_keybytes = Module["_crypto_stream_salsa208_keybytes"] = function() {  return Module["asm"]["_crypto_stream_salsa208_keybytes"].apply(null, arguments) };
var _crypto_hash_sha512_bytes = Module["_crypto_hash_sha512_bytes"] = function() {  return Module["asm"]["_crypto_hash_sha512_bytes"].apply(null, arguments) };
var _crypto_pwhash_argon2id_opslimit_interactive = Module["_crypto_pwhash_argon2id_opslimit_interactive"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_opslimit_interactive"].apply(null, arguments) };
var _crypto_stream_xsalsa20_xor_ic = Module["_crypto_stream_xsalsa20_xor_ic"] = function() {  return Module["asm"]["_crypto_stream_xsalsa20_xor_ic"].apply(null, arguments) };
var _crypto_core_hsalsa20_keybytes = Module["_crypto_core_hsalsa20_keybytes"] = function() {  return Module["asm"]["_crypto_core_hsalsa20_keybytes"].apply(null, arguments) };
var _crypto_sign_primitive = Module["_crypto_sign_primitive"] = function() {  return Module["asm"]["_crypto_sign_primitive"].apply(null, arguments) };
var _crypto_scalarmult_curve25519_bytes = Module["_crypto_scalarmult_curve25519_bytes"] = function() {  return Module["asm"]["_crypto_scalarmult_curve25519_bytes"].apply(null, arguments) };
var _crypto_scalarmult_curve25519_scalarbytes = Module["_crypto_scalarmult_curve25519_scalarbytes"] = function() {  return Module["asm"]["_crypto_scalarmult_curve25519_scalarbytes"].apply(null, arguments) };
var _crypto_sign_ed25519_bytes = Module["_crypto_sign_ed25519_bytes"] = function() {  return Module["asm"]["_crypto_sign_ed25519_bytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i_str_verify = Module["_crypto_pwhash_argon2i_str_verify"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_str_verify"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_secretkeybytes = Module["_crypto_box_curve25519xchacha20poly1305_secretkeybytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_secretkeybytes"].apply(null, arguments) };
var _crypto_auth_hmacsha512_keygen = Module["_crypto_auth_hmacsha512_keygen"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512_keygen"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_sealbytes = Module["_crypto_box_curve25519xchacha20poly1305_sealbytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_sealbytes"].apply(null, arguments) };
var _crypto_box_detached_afternm = Module["_crypto_box_detached_afternm"] = function() {  return Module["asm"]["_crypto_box_detached_afternm"].apply(null, arguments) };
var _crypto_stream_salsa20_xor_ic = Module["_crypto_stream_salsa20_xor_ic"] = function() {  return Module["asm"]["_crypto_stream_salsa20_xor_ic"].apply(null, arguments) };
var _crypto_auth_hmacsha256_init = Module["_crypto_auth_hmacsha256_init"] = function() {  return Module["asm"]["_crypto_auth_hmacsha256_init"].apply(null, arguments) };
var _crypto_stream_chacha20_ietf_xor = Module["_crypto_stream_chacha20_ietf_xor"] = function() {  return Module["asm"]["_crypto_stream_chacha20_ietf_xor"].apply(null, arguments) };
var _crypto_auth_hmacsha512256_final = Module["_crypto_auth_hmacsha512256_final"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512256_final"].apply(null, arguments) };
var _crypto_pwhash_argon2id_opslimit_sensitive = Module["_crypto_pwhash_argon2id_opslimit_sensitive"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_opslimit_sensitive"].apply(null, arguments) };
var setThrew = Module["setThrew"] = function() {  return Module["asm"]["setThrew"].apply(null, arguments) };
var _crypto_pwhash_argon2id_passwd_min = Module["_crypto_pwhash_argon2id_passwd_min"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_passwd_min"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_keygen = Module["_crypto_secretstream_xchacha20poly1305_keygen"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_keygen"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_ietf_nsecbytes = Module["_crypto_aead_chacha20poly1305_ietf_nsecbytes"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_ietf_nsecbytes"].apply(null, arguments) };
var _crypto_kdf_blake2b_derive_from_key = Module["_crypto_kdf_blake2b_derive_from_key"] = function() {  return Module["asm"]["_crypto_kdf_blake2b_derive_from_key"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_keypair = Module["_crypto_box_curve25519xsalsa20poly1305_keypair"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_keypair"].apply(null, arguments) };
var _crypto_hash_sha256_init = Module["_crypto_hash_sha256_init"] = function() {  return Module["asm"]["_crypto_hash_sha256_init"].apply(null, arguments) };
var _crypto_stream_xsalsa20_noncebytes = Module["_crypto_stream_xsalsa20_noncebytes"] = function() {  return Module["asm"]["_crypto_stream_xsalsa20_noncebytes"].apply(null, arguments) };
var _crypto_generichash_keybytes_max = Module["_crypto_generichash_keybytes_max"] = function() {  return Module["asm"]["_crypto_generichash_keybytes_max"].apply(null, arguments) };
var _crypto_verify_64 = Module["_crypto_verify_64"] = function() {  return Module["asm"]["_crypto_verify_64"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256 = Module["_crypto_pwhash_scryptsalsa208sha256"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_keypair = Module["_crypto_box_curve25519xchacha20poly1305_keypair"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_keypair"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_open = Module["_crypto_box_curve25519xsalsa20poly1305_open"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_open"].apply(null, arguments) };
var _crypto_pwhash_memlimit_sensitive = Module["_crypto_pwhash_memlimit_sensitive"] = function() {  return Module["asm"]["_crypto_pwhash_memlimit_sensitive"].apply(null, arguments) };
var _crypto_pwhash_argon2i_opslimit_interactive = Module["_crypto_pwhash_argon2i_opslimit_interactive"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_opslimit_interactive"].apply(null, arguments) };
var _crypto_kdf_blake2b_keybytes = Module["_crypto_kdf_blake2b_keybytes"] = function() {  return Module["asm"]["_crypto_kdf_blake2b_keybytes"].apply(null, arguments) };
var _crypto_pwhash_argon2id_str = Module["_crypto_pwhash_argon2id_str"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_str"].apply(null, arguments) };
var _crypto_hash_sha512_update = Module["_crypto_hash_sha512_update"] = function() {  return Module["asm"]["_crypto_hash_sha512_update"].apply(null, arguments) };
var _crypto_core_hchacha20 = Module["_crypto_core_hchacha20"] = function() {  return Module["asm"]["_crypto_core_hchacha20"].apply(null, arguments) };
var _crypto_pwhash_bytes_min = Module["_crypto_pwhash_bytes_min"] = function() {  return Module["asm"]["_crypto_pwhash_bytes_min"].apply(null, arguments) };
var _crypto_secretbox_open = Module["_crypto_secretbox_open"] = function() {  return Module["asm"]["_crypto_secretbox_open"].apply(null, arguments) };
var _crypto_auth_hmacsha256_final = Module["_crypto_auth_hmacsha256_final"] = function() {  return Module["asm"]["_crypto_auth_hmacsha256_final"].apply(null, arguments) };
var _crypto_verify_16 = Module["_crypto_verify_16"] = function() {  return Module["asm"]["_crypto_verify_16"].apply(null, arguments) };
var _crypto_pwhash_argon2id = Module["_crypto_pwhash_argon2id"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_memlimit_max = Module["_crypto_pwhash_scryptsalsa208sha256_memlimit_max"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_memlimit_max"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_ll = Module["_crypto_pwhash_scryptsalsa208sha256_ll"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_ll"].apply(null, arguments) };
var _crypto_pwhash_argon2id_memlimit_interactive = Module["_crypto_pwhash_argon2id_memlimit_interactive"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_memlimit_interactive"].apply(null, arguments) };
var _crypto_stream_salsa208_xor = Module["_crypto_stream_salsa208_xor"] = function() {  return Module["asm"]["_crypto_stream_salsa208_xor"].apply(null, arguments) };
var _crypto_secretbox_xsalsa20poly1305_keygen = Module["_crypto_secretbox_xsalsa20poly1305_keygen"] = function() {  return Module["asm"]["_crypto_secretbox_xsalsa20poly1305_keygen"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_abytes = Module["_crypto_aead_chacha20poly1305_abytes"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_abytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i_bytes_max = Module["_crypto_pwhash_argon2i_bytes_max"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_bytes_max"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_easy_afternm = Module["_crypto_box_curve25519xchacha20poly1305_easy_afternm"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_easy_afternm"].apply(null, arguments) };
var _crypto_onetimeauth_poly1305_update = Module["_crypto_onetimeauth_poly1305_update"] = function() {  return Module["asm"]["_crypto_onetimeauth_poly1305_update"].apply(null, arguments) };
var _crypto_pwhash_memlimit_max = Module["_crypto_pwhash_memlimit_max"] = function() {  return Module["asm"]["_crypto_pwhash_memlimit_max"].apply(null, arguments) };
var _crypto_verify_64_bytes = Module["_crypto_verify_64_bytes"] = function() {  return Module["asm"]["_crypto_verify_64_bytes"].apply(null, arguments) };
var _crypto_onetimeauth_poly1305_keygen = Module["_crypto_onetimeauth_poly1305_keygen"] = function() {  return Module["asm"]["_crypto_onetimeauth_poly1305_keygen"].apply(null, arguments) };
var _crypto_generichash_blake2b_keygen = Module["_crypto_generichash_blake2b_keygen"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_keygen"].apply(null, arguments) };
var _crypto_pwhash_argon2i_strprefix = Module["_crypto_pwhash_argon2i_strprefix"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_strprefix"].apply(null, arguments) };
var _crypto_auth_hmacsha256_update = Module["_crypto_auth_hmacsha256_update"] = function() {  return Module["asm"]["_crypto_auth_hmacsha256_update"].apply(null, arguments) };
var _crypto_aead_xchacha20poly1305_ietf_encrypt = Module["_crypto_aead_xchacha20poly1305_ietf_encrypt"] = function() {  return Module["asm"]["_crypto_aead_xchacha20poly1305_ietf_encrypt"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_strbytes = Module["_crypto_pwhash_scryptsalsa208sha256_strbytes"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_strbytes"].apply(null, arguments) };
var _crypto_stream_xsalsa20_keybytes = Module["_crypto_stream_xsalsa20_keybytes"] = function() {  return Module["asm"]["_crypto_stream_xsalsa20_keybytes"].apply(null, arguments) };
var _crypto_generichash_keygen = Module["_crypto_generichash_keygen"] = function() {  return Module["asm"]["_crypto_generichash_keygen"].apply(null, arguments) };
var _crypto_pwhash_argon2i_str = Module["_crypto_pwhash_argon2i_str"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_str"].apply(null, arguments) };
var _crypto_pwhash_argon2id_bytes_max = Module["_crypto_pwhash_argon2id_bytes_max"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_bytes_max"].apply(null, arguments) };
var _crypto_box_sealbytes = Module["_crypto_box_sealbytes"] = function() {  return Module["asm"]["_crypto_box_sealbytes"].apply(null, arguments) };
var _crypto_onetimeauth = Module["_crypto_onetimeauth"] = function() {  return Module["asm"]["_crypto_onetimeauth"].apply(null, arguments) };
var _crypto_secretbox_boxzerobytes = Module["_crypto_secretbox_boxzerobytes"] = function() {  return Module["asm"]["_crypto_secretbox_boxzerobytes"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_ietf_keygen = Module["_crypto_aead_chacha20poly1305_ietf_keygen"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_ietf_keygen"].apply(null, arguments) };
var _crypto_stream_chacha20 = Module["_crypto_stream_chacha20"] = function() {  return Module["asm"]["_crypto_stream_chacha20"].apply(null, arguments) };
var _crypto_box_open_afternm = Module["_crypto_box_open_afternm"] = function() {  return Module["asm"]["_crypto_box_open_afternm"].apply(null, arguments) };
var _sodium_bin2base64 = Module["_sodium_bin2base64"] = function() {  return Module["asm"]["_sodium_bin2base64"].apply(null, arguments) };
var _crypto_pwhash_opslimit_moderate = Module["_crypto_pwhash_opslimit_moderate"] = function() {  return Module["asm"]["_crypto_pwhash_opslimit_moderate"].apply(null, arguments) };
var _crypto_box_macbytes = Module["_crypto_box_macbytes"] = function() {  return Module["asm"]["_crypto_box_macbytes"].apply(null, arguments) };
var _crypto_shorthash_bytes = Module["_crypto_shorthash_bytes"] = function() {  return Module["asm"]["_crypto_shorthash_bytes"].apply(null, arguments) };
var _crypto_pwhash_argon2id_saltbytes = Module["_crypto_pwhash_argon2id_saltbytes"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_saltbytes"].apply(null, arguments) };
var _crypto_generichash_primitive = Module["_crypto_generichash_primitive"] = function() {  return Module["asm"]["_crypto_generichash_primitive"].apply(null, arguments) };
var _crypto_sign_ed25519_keypair = Module["_crypto_sign_ed25519_keypair"] = function() {  return Module["asm"]["_crypto_sign_ed25519_keypair"].apply(null, arguments) };
var _crypto_sign_ed25519ph_statebytes = Module["_crypto_sign_ed25519ph_statebytes"] = function() {  return Module["asm"]["_crypto_sign_ed25519ph_statebytes"].apply(null, arguments) };
var _crypto_aead_xchacha20poly1305_ietf_keybytes = Module["_crypto_aead_xchacha20poly1305_ietf_keybytes"] = function() {  return Module["asm"]["_crypto_aead_xchacha20poly1305_ietf_keybytes"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_rekey = Module["_crypto_secretstream_xchacha20poly1305_rekey"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_rekey"].apply(null, arguments) };
var _crypto_auth_primitive = Module["_crypto_auth_primitive"] = function() {  return Module["asm"]["_crypto_auth_primitive"].apply(null, arguments) };
var _crypto_core_salsa2012_keybytes = Module["_crypto_core_salsa2012_keybytes"] = function() {  return Module["asm"]["_crypto_core_salsa2012_keybytes"].apply(null, arguments) };
var _malloc = Module["_malloc"] = function() {  return Module["asm"]["_malloc"].apply(null, arguments) };
var _crypto_stream_noncebytes = Module["_crypto_stream_noncebytes"] = function() {  return Module["asm"]["_crypto_stream_noncebytes"].apply(null, arguments) };
var _crypto_secretbox_xchacha20poly1305_keybytes = Module["_crypto_secretbox_xchacha20poly1305_keybytes"] = function() {  return Module["asm"]["_crypto_secretbox_xchacha20poly1305_keybytes"].apply(null, arguments) };
var _emscripten_replace_memory = Module["_emscripten_replace_memory"] = function() {  return Module["asm"]["_emscripten_replace_memory"].apply(null, arguments) };
var _crypto_secretbox_xsalsa20poly1305_keybytes = Module["_crypto_secretbox_xsalsa20poly1305_keybytes"] = function() {  return Module["asm"]["_crypto_secretbox_xsalsa20poly1305_keybytes"].apply(null, arguments) };
var _crypto_pwhash_saltbytes = Module["_crypto_pwhash_saltbytes"] = function() {  return Module["asm"]["_crypto_pwhash_saltbytes"].apply(null, arguments) };
var _crypto_secretbox_noncebytes = Module["_crypto_secretbox_noncebytes"] = function() {  return Module["asm"]["_crypto_secretbox_noncebytes"].apply(null, arguments) };
var _crypto_pwhash_str_alg = Module["_crypto_pwhash_str_alg"] = function() {  return Module["asm"]["_crypto_pwhash_str_alg"].apply(null, arguments) };
var _crypto_secretbox_xsalsa20poly1305_macbytes = Module["_crypto_secretbox_xsalsa20poly1305_macbytes"] = function() {  return Module["asm"]["_crypto_secretbox_xsalsa20poly1305_macbytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i_opslimit_max = Module["_crypto_pwhash_argon2i_opslimit_max"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_opslimit_max"].apply(null, arguments) };
var _crypto_auth_hmacsha512_bytes = Module["_crypto_auth_hmacsha512_bytes"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512_bytes"].apply(null, arguments) };
var _crypto_generichash_keybytes = Module["_crypto_generichash_keybytes"] = function() {  return Module["asm"]["_crypto_generichash_keybytes"].apply(null, arguments) };
var _crypto_hash_bytes = Module["_crypto_hash_bytes"] = function() {  return Module["asm"]["_crypto_hash_bytes"].apply(null, arguments) };
var _crypto_sign_publickeybytes = Module["_crypto_sign_publickeybytes"] = function() {  return Module["asm"]["_crypto_sign_publickeybytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i_memlimit_moderate = Module["_crypto_pwhash_argon2i_memlimit_moderate"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_memlimit_moderate"].apply(null, arguments) };
var _crypto_generichash_blake2b = Module["_crypto_generichash_blake2b"] = function() {  return Module["asm"]["_crypto_generichash_blake2b"].apply(null, arguments) };
var _crypto_core_hchacha20_keybytes = Module["_crypto_core_hchacha20_keybytes"] = function() {  return Module["asm"]["_crypto_core_hchacha20_keybytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i_opslimit_moderate = Module["_crypto_pwhash_argon2i_opslimit_moderate"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_opslimit_moderate"].apply(null, arguments) };
var _randombytes_implementation_name = Module["_randombytes_implementation_name"] = function() {  return Module["asm"]["_randombytes_implementation_name"].apply(null, arguments) };
var _crypto_stream_xchacha20_noncebytes = Module["_crypto_stream_xchacha20_noncebytes"] = function() {  return Module["asm"]["_crypto_stream_xchacha20_noncebytes"].apply(null, arguments) };
var _crypto_sign_ed25519_verify_detached = Module["_crypto_sign_ed25519_verify_detached"] = function() {  return Module["asm"]["_crypto_sign_ed25519_verify_detached"].apply(null, arguments) };
var _crypto_hash_sha512_statebytes = Module["_crypto_hash_sha512_statebytes"] = function() {  return Module["asm"]["_crypto_hash_sha512_statebytes"].apply(null, arguments) };
var _crypto_secretbox_primitive = Module["_crypto_secretbox_primitive"] = function() {  return Module["asm"]["_crypto_secretbox_primitive"].apply(null, arguments) };
var _crypto_verify_32_bytes = Module["_crypto_verify_32_bytes"] = function() {  return Module["asm"]["_crypto_verify_32_bytes"].apply(null, arguments) };
var stackRestore = Module["stackRestore"] = function() {  return Module["asm"]["stackRestore"].apply(null, arguments) };
var _crypto_kdf_keygen = Module["_crypto_kdf_keygen"] = function() {  return Module["asm"]["_crypto_kdf_keygen"].apply(null, arguments) };
var _crypto_stream_xsalsa20_xor = Module["_crypto_stream_xsalsa20_xor"] = function() {  return Module["asm"]["_crypto_stream_xsalsa20_xor"].apply(null, arguments) };
var _crypto_stream_chacha20_ietf_keygen = Module["_crypto_stream_chacha20_ietf_keygen"] = function() {  return Module["asm"]["_crypto_stream_chacha20_ietf_keygen"].apply(null, arguments) };
var _crypto_stream_chacha20_keygen = Module["_crypto_stream_chacha20_keygen"] = function() {  return Module["asm"]["_crypto_stream_chacha20_keygen"].apply(null, arguments) };
var _crypto_box_easy = Module["_crypto_box_easy"] = function() {  return Module["asm"]["_crypto_box_easy"].apply(null, arguments) };
var _crypto_hash_sha256 = Module["_crypto_hash_sha256"] = function() {  return Module["asm"]["_crypto_hash_sha256"].apply(null, arguments) };
var _crypto_sign_ed25519_seedbytes = Module["_crypto_sign_ed25519_seedbytes"] = function() {  return Module["asm"]["_crypto_sign_ed25519_seedbytes"].apply(null, arguments) };
var _crypto_pwhash_alg_argon2i13 = Module["_crypto_pwhash_alg_argon2i13"] = function() {  return Module["asm"]["_crypto_pwhash_alg_argon2i13"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_seal_open = Module["_crypto_box_curve25519xchacha20poly1305_seal_open"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_seal_open"].apply(null, arguments) };
var _crypto_pwhash_opslimit_min = Module["_crypto_pwhash_opslimit_min"] = function() {  return Module["asm"]["_crypto_pwhash_opslimit_min"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_publickeybytes = Module["_crypto_box_curve25519xsalsa20poly1305_publickeybytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_publickeybytes"].apply(null, arguments) };
var _crypto_kdf_blake2b_bytes_max = Module["_crypto_kdf_blake2b_bytes_max"] = function() {  return Module["asm"]["_crypto_kdf_blake2b_bytes_max"].apply(null, arguments) };
var _crypto_hash_sha256_statebytes = Module["_crypto_hash_sha256_statebytes"] = function() {  return Module["asm"]["_crypto_hash_sha256_statebytes"].apply(null, arguments) };
var _crypto_stream_chacha20_ietf_noncebytes = Module["_crypto_stream_chacha20_ietf_noncebytes"] = function() {  return Module["asm"]["_crypto_stream_chacha20_ietf_noncebytes"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_memlimit_sensitive = Module["_crypto_pwhash_scryptsalsa208sha256_memlimit_sensitive"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_memlimit_sensitive"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_open_easy = Module["_crypto_box_curve25519xchacha20poly1305_open_easy"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_open_easy"].apply(null, arguments) };
var _crypto_box_beforenm = Module["_crypto_box_beforenm"] = function() {  return Module["asm"]["_crypto_box_beforenm"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_afternm = Module["_crypto_box_curve25519xsalsa20poly1305_afternm"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_afternm"].apply(null, arguments) };
var _crypto_sign_statebytes = Module["_crypto_sign_statebytes"] = function() {  return Module["asm"]["_crypto_sign_statebytes"].apply(null, arguments) };
var _crypto_sign_open = Module["_crypto_sign_open"] = function() {  return Module["asm"]["_crypto_sign_open"].apply(null, arguments) };
var stackSave = Module["stackSave"] = function() {  return Module["asm"]["stackSave"].apply(null, arguments) };
var _crypto_box_seed_keypair = Module["_crypto_box_seed_keypair"] = function() {  return Module["asm"]["_crypto_box_seed_keypair"].apply(null, arguments) };
var _crypto_auth_hmacsha512_init = Module["_crypto_auth_hmacsha512_init"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512_init"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_str_needs_rehash = Module["_crypto_pwhash_scryptsalsa208sha256_str_needs_rehash"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_str_needs_rehash"].apply(null, arguments) };
var _crypto_sign_ed25519_sk_to_pk = Module["_crypto_sign_ed25519_sk_to_pk"] = function() {  return Module["asm"]["_crypto_sign_ed25519_sk_to_pk"].apply(null, arguments) };
var _crypto_scalarmult_curve25519 = Module["_crypto_scalarmult_curve25519"] = function() {  return Module["asm"]["_crypto_scalarmult_curve25519"].apply(null, arguments) };
var _crypto_box_open_easy = Module["_crypto_box_open_easy"] = function() {  return Module["asm"]["_crypto_box_open_easy"].apply(null, arguments) };
var _crypto_auth_hmacsha512 = Module["_crypto_auth_hmacsha512"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512"].apply(null, arguments) };
var _crypto_stream_keygen = Module["_crypto_stream_keygen"] = function() {  return Module["asm"]["_crypto_stream_keygen"].apply(null, arguments) };
var _crypto_secretbox_xsalsa20poly1305_zerobytes = Module["_crypto_secretbox_xsalsa20poly1305_zerobytes"] = function() {  return Module["asm"]["_crypto_secretbox_xsalsa20poly1305_zerobytes"].apply(null, arguments) };
var _crypto_auth_hmacsha512256_keybytes = Module["_crypto_auth_hmacsha512256_keybytes"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512256_keybytes"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_keybytes = Module["_crypto_aead_chacha20poly1305_keybytes"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_keybytes"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_tag_message = Module["_crypto_secretstream_xchacha20poly1305_tag_message"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_tag_message"].apply(null, arguments) };
var _free = Module["_free"] = function() {  return Module["asm"]["_free"].apply(null, arguments) };
var _crypto_kx_client_session_keys = Module["_crypto_kx_client_session_keys"] = function() {  return Module["asm"]["_crypto_kx_client_session_keys"].apply(null, arguments) };
var _crypto_sign_verify_detached = Module["_crypto_sign_verify_detached"] = function() {  return Module["asm"]["_crypto_sign_verify_detached"].apply(null, arguments) };
var _crypto_onetimeauth_poly1305_keybytes = Module["_crypto_onetimeauth_poly1305_keybytes"] = function() {  return Module["asm"]["_crypto_onetimeauth_poly1305_keybytes"].apply(null, arguments) };
var _crypto_sign_ed25519_secretkeybytes = Module["_crypto_sign_ed25519_secretkeybytes"] = function() {  return Module["asm"]["_crypto_sign_ed25519_secretkeybytes"].apply(null, arguments) };
var _crypto_kdf_blake2b_contextbytes = Module["_crypto_kdf_blake2b_contextbytes"] = function() {  return Module["asm"]["_crypto_kdf_blake2b_contextbytes"].apply(null, arguments) };
var _crypto_stream_salsa2012 = Module["_crypto_stream_salsa2012"] = function() {  return Module["asm"]["_crypto_stream_salsa2012"].apply(null, arguments) };
var _crypto_sign_seedbytes = Module["_crypto_sign_seedbytes"] = function() {  return Module["asm"]["_crypto_sign_seedbytes"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_beforenmbytes = Module["_crypto_box_curve25519xchacha20poly1305_beforenmbytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_beforenmbytes"].apply(null, arguments) };
var _randombytes_random = Module["_randombytes_random"] = function() {  return Module["asm"]["_randombytes_random"].apply(null, arguments) };
var _crypto_sign_ed25519ph_update = Module["_crypto_sign_ed25519ph_update"] = function() {  return Module["asm"]["_crypto_sign_ed25519ph_update"].apply(null, arguments) };
var _crypto_auth_hmacsha256_keygen = Module["_crypto_auth_hmacsha256_keygen"] = function() {  return Module["asm"]["_crypto_auth_hmacsha256_keygen"].apply(null, arguments) };
var _crypto_auth_hmacsha256_statebytes = Module["_crypto_auth_hmacsha256_statebytes"] = function() {  return Module["asm"]["_crypto_auth_hmacsha256_statebytes"].apply(null, arguments) };
var _randombytes_buf_deterministic = Module["_randombytes_buf_deterministic"] = function() {  return Module["asm"]["_randombytes_buf_deterministic"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_encrypt_detached = Module["_crypto_aead_chacha20poly1305_encrypt_detached"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_encrypt_detached"].apply(null, arguments) };
var _crypto_stream_xsalsa20_keygen = Module["_crypto_stream_xsalsa20_keygen"] = function() {  return Module["asm"]["_crypto_stream_xsalsa20_keygen"].apply(null, arguments) };
var _crypto_hash_primitive = Module["_crypto_hash_primitive"] = function() {  return Module["asm"]["_crypto_hash_primitive"].apply(null, arguments) };
var _crypto_pwhash_argon2id_passwd_max = Module["_crypto_pwhash_argon2id_passwd_max"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_passwd_max"].apply(null, arguments) };
var _crypto_shorthash_siphash24 = Module["_crypto_shorthash_siphash24"] = function() {  return Module["asm"]["_crypto_shorthash_siphash24"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_macbytes = Module["_crypto_box_curve25519xsalsa20poly1305_macbytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_macbytes"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_saltbytes = Module["_crypto_pwhash_scryptsalsa208sha256_saltbytes"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_saltbytes"].apply(null, arguments) };
var _crypto_sign_ed25519 = Module["_crypto_sign_ed25519"] = function() {  return Module["asm"]["_crypto_sign_ed25519"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_seal = Module["_crypto_box_curve25519xchacha20poly1305_seal"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_seal"].apply(null, arguments) };
var _crypto_core_salsa20_constbytes = Module["_crypto_core_salsa20_constbytes"] = function() {  return Module["asm"]["_crypto_core_salsa20_constbytes"].apply(null, arguments) };
var _crypto_pwhash_argon2id_str_verify = Module["_crypto_pwhash_argon2id_str_verify"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_str_verify"].apply(null, arguments) };
var _crypto_box_boxzerobytes = Module["_crypto_box_boxzerobytes"] = function() {  return Module["asm"]["_crypto_box_boxzerobytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i_saltbytes = Module["_crypto_pwhash_argon2i_saltbytes"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_saltbytes"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_open_detached_afternm = Module["_crypto_box_curve25519xchacha20poly1305_open_detached_afternm"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_open_detached_afternm"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_beforenmbytes = Module["_crypto_box_curve25519xsalsa20poly1305_beforenmbytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_beforenmbytes"].apply(null, arguments) };
var _crypto_stream_xchacha20_keygen = Module["_crypto_stream_xchacha20_keygen"] = function() {  return Module["asm"]["_crypto_stream_xchacha20_keygen"].apply(null, arguments) };
var _crypto_core_hchacha20_constbytes = Module["_crypto_core_hchacha20_constbytes"] = function() {  return Module["asm"]["_crypto_core_hchacha20_constbytes"].apply(null, arguments) };
var _crypto_stream_xchacha20_xor = Module["_crypto_stream_xchacha20_xor"] = function() {  return Module["asm"]["_crypto_stream_xchacha20_xor"].apply(null, arguments) };
var _randombytes_seedbytes = Module["_randombytes_seedbytes"] = function() {  return Module["asm"]["_randombytes_seedbytes"].apply(null, arguments) };
var _crypto_sign_final_create = Module["_crypto_sign_final_create"] = function() {  return Module["asm"]["_crypto_sign_final_create"].apply(null, arguments) };
var _crypto_kx_secretkeybytes = Module["_crypto_kx_secretkeybytes"] = function() {  return Module["asm"]["_crypto_kx_secretkeybytes"].apply(null, arguments) };
var _crypto_box_detached = Module["_crypto_box_detached"] = function() {  return Module["asm"]["_crypto_box_detached"].apply(null, arguments) };
var _randombytes_buf = Module["_randombytes_buf"] = function() {  return Module["asm"]["_randombytes_buf"].apply(null, arguments) };
var _crypto_generichash_blake2b_saltbytes = Module["_crypto_generichash_blake2b_saltbytes"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_saltbytes"].apply(null, arguments) };
var _crypto_box_open_detached = Module["_crypto_box_open_detached"] = function() {  return Module["asm"]["_crypto_box_open_detached"].apply(null, arguments) };
var _crypto_kx_seedbytes = Module["_crypto_kx_seedbytes"] = function() {  return Module["asm"]["_crypto_kx_seedbytes"].apply(null, arguments) };
var _crypto_pwhash_argon2id_strprefix = Module["_crypto_pwhash_argon2id_strprefix"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_strprefix"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_open_detached = Module["_crypto_box_curve25519xchacha20poly1305_open_detached"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_open_detached"].apply(null, arguments) };
var _crypto_generichash_blake2b_keybytes = Module["_crypto_generichash_blake2b_keybytes"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_keybytes"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_easy = Module["_crypto_box_curve25519xchacha20poly1305_easy"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_easy"].apply(null, arguments) };
var _crypto_pwhash_argon2i_bytes_min = Module["_crypto_pwhash_argon2i_bytes_min"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_bytes_min"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_str = Module["_crypto_pwhash_scryptsalsa208sha256_str"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_str"].apply(null, arguments) };
var _crypto_pwhash_argon2id_bytes_min = Module["_crypto_pwhash_argon2id_bytes_min"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_bytes_min"].apply(null, arguments) };
var _crypto_box_seedbytes = Module["_crypto_box_seedbytes"] = function() {  return Module["asm"]["_crypto_box_seedbytes"].apply(null, arguments) };
var _crypto_generichash_blake2b_bytes_min = Module["_crypto_generichash_blake2b_bytes_min"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_bytes_min"].apply(null, arguments) };
var _crypto_hash = Module["_crypto_hash"] = function() {  return Module["asm"]["_crypto_hash"].apply(null, arguments) };
var _crypto_generichash_blake2b_statebytes = Module["_crypto_generichash_blake2b_statebytes"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_statebytes"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_beforenm = Module["_crypto_box_curve25519xsalsa20poly1305_beforenm"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_beforenm"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_headerbytes = Module["_crypto_secretstream_xchacha20poly1305_headerbytes"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_headerbytes"].apply(null, arguments) };
var _crypto_sign_ed25519ph_final_create = Module["_crypto_sign_ed25519ph_final_create"] = function() {  return Module["asm"]["_crypto_sign_ed25519ph_final_create"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_ietf_decrypt_detached = Module["_crypto_aead_chacha20poly1305_ietf_decrypt_detached"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_ietf_decrypt_detached"].apply(null, arguments) };
var _crypto_generichash_final = Module["_crypto_generichash_final"] = function() {  return Module["asm"]["_crypto_generichash_final"].apply(null, arguments) };
var _crypto_auth_hmacsha512_update = Module["_crypto_auth_hmacsha512_update"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512_update"].apply(null, arguments) };
var _crypto_auth_hmacsha256 = Module["_crypto_auth_hmacsha256"] = function() {  return Module["asm"]["_crypto_auth_hmacsha256"].apply(null, arguments) };
var _crypto_box_keypair = Module["_crypto_box_keypair"] = function() {  return Module["asm"]["_crypto_box_keypair"].apply(null, arguments) };
var _crypto_hash_sha256_bytes = Module["_crypto_hash_sha256_bytes"] = function() {  return Module["asm"]["_crypto_hash_sha256_bytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i_passwd_max = Module["_crypto_pwhash_argon2i_passwd_max"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_passwd_max"].apply(null, arguments) };
var _sodium_init = Module["_sodium_init"] = function() {  return Module["asm"]["_sodium_init"].apply(null, arguments) };
var _crypto_secretbox_macbytes = Module["_crypto_secretbox_macbytes"] = function() {  return Module["asm"]["_crypto_secretbox_macbytes"].apply(null, arguments) };
var _crypto_aead_xchacha20poly1305_ietf_npubbytes = Module["_crypto_aead_xchacha20poly1305_ietf_npubbytes"] = function() {  return Module["asm"]["_crypto_aead_xchacha20poly1305_ietf_npubbytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i_opslimit_min = Module["_crypto_pwhash_argon2i_opslimit_min"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_opslimit_min"].apply(null, arguments) };
var _fflush = Module["_fflush"] = function() {  return Module["asm"]["_fflush"].apply(null, arguments) };
var setTempRet0 = Module["setTempRet0"] = function() {  return Module["asm"]["setTempRet0"].apply(null, arguments) };
var _crypto_shorthash_siphash24_keybytes = Module["_crypto_shorthash_siphash24_keybytes"] = function() {  return Module["asm"]["_crypto_shorthash_siphash24_keybytes"].apply(null, arguments) };
var _crypto_core_hchacha20_inputbytes = Module["_crypto_core_hchacha20_inputbytes"] = function() {  return Module["asm"]["_crypto_core_hchacha20_inputbytes"].apply(null, arguments) };
var _crypto_core_salsa2012_constbytes = Module["_crypto_core_salsa2012_constbytes"] = function() {  return Module["asm"]["_crypto_core_salsa2012_constbytes"].apply(null, arguments) };
var _crypto_kx_seed_keypair = Module["_crypto_kx_seed_keypair"] = function() {  return Module["asm"]["_crypto_kx_seed_keypair"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_detached_afternm = Module["_crypto_box_curve25519xchacha20poly1305_detached_afternm"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_detached_afternm"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305 = Module["_crypto_box_curve25519xsalsa20poly1305"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_nsecbytes = Module["_crypto_aead_chacha20poly1305_nsecbytes"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_nsecbytes"].apply(null, arguments) };
var _sodium_library_minimal = Module["_sodium_library_minimal"] = function() {  return Module["asm"]["_sodium_library_minimal"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_keybytes = Module["_crypto_secretstream_xchacha20poly1305_keybytes"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_keybytes"].apply(null, arguments) };
var ___errno_location = Module["___errno_location"] = function() {  return Module["asm"]["___errno_location"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_pull = Module["_crypto_secretstream_xchacha20poly1305_pull"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_pull"].apply(null, arguments) };
var _crypto_pwhash_argon2i_strbytes = Module["_crypto_pwhash_argon2i_strbytes"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_strbytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i_memlimit_max = Module["_crypto_pwhash_argon2i_memlimit_max"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_memlimit_max"].apply(null, arguments) };
var _crypto_generichash_blake2b_salt_personal = Module["_crypto_generichash_blake2b_salt_personal"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_salt_personal"].apply(null, arguments) };
var _crypto_kdf_derive_from_key = Module["_crypto_kdf_derive_from_key"] = function() {  return Module["asm"]["_crypto_kdf_derive_from_key"].apply(null, arguments) };
var _crypto_secretbox_xsalsa20poly1305_noncebytes = Module["_crypto_secretbox_xsalsa20poly1305_noncebytes"] = function() {  return Module["asm"]["_crypto_secretbox_xsalsa20poly1305_noncebytes"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_opslimit_interactive = Module["_crypto_pwhash_scryptsalsa208sha256_opslimit_interactive"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_opslimit_interactive"].apply(null, arguments) };
var _crypto_pwhash_argon2i_memlimit_interactive = Module["_crypto_pwhash_argon2i_memlimit_interactive"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_memlimit_interactive"].apply(null, arguments) };
var _crypto_pwhash_alg_argon2id13 = Module["_crypto_pwhash_alg_argon2id13"] = function() {  return Module["asm"]["_crypto_pwhash_alg_argon2id13"].apply(null, arguments) };
var _crypto_stream_keybytes = Module["_crypto_stream_keybytes"] = function() {  return Module["asm"]["_crypto_stream_keybytes"].apply(null, arguments) };
var _crypto_pwhash_memlimit_min = Module["_crypto_pwhash_memlimit_min"] = function() {  return Module["asm"]["_crypto_pwhash_memlimit_min"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_ietf_npubbytes = Module["_crypto_aead_chacha20poly1305_ietf_npubbytes"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_ietf_npubbytes"].apply(null, arguments) };
var _crypto_stream_salsa208_noncebytes = Module["_crypto_stream_salsa208_noncebytes"] = function() {  return Module["asm"]["_crypto_stream_salsa208_noncebytes"].apply(null, arguments) };
var _sodium_library_version_minor = Module["_sodium_library_version_minor"] = function() {  return Module["asm"]["_sodium_library_version_minor"].apply(null, arguments) };
var _crypto_onetimeauth_bytes = Module["_crypto_onetimeauth_bytes"] = function() {  return Module["asm"]["_crypto_onetimeauth_bytes"].apply(null, arguments) };
var _crypto_box_open = Module["_crypto_box_open"] = function() {  return Module["asm"]["_crypto_box_open"].apply(null, arguments) };
var _crypto_secretbox_xchacha20poly1305_open_easy = Module["_crypto_secretbox_xchacha20poly1305_open_easy"] = function() {  return Module["asm"]["_crypto_secretbox_xchacha20poly1305_open_easy"].apply(null, arguments) };
var _crypto_scalarmult_curve25519_base = Module["_crypto_scalarmult_curve25519_base"] = function() {  return Module["asm"]["_crypto_scalarmult_curve25519_base"].apply(null, arguments) };
var _crypto_sign_ed25519_open = Module["_crypto_sign_ed25519_open"] = function() {  return Module["asm"]["_crypto_sign_ed25519_open"].apply(null, arguments) };
var _crypto_stream_chacha20_ietf_keybytes = Module["_crypto_stream_chacha20_ietf_keybytes"] = function() {  return Module["asm"]["_crypto_stream_chacha20_ietf_keybytes"].apply(null, arguments) };
var _crypto_box_noncebytes = Module["_crypto_box_noncebytes"] = function() {  return Module["asm"]["_crypto_box_noncebytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i_str_needs_rehash = Module["_crypto_pwhash_argon2i_str_needs_rehash"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_str_needs_rehash"].apply(null, arguments) };
var _crypto_core_hchacha20_outputbytes = Module["_crypto_core_hchacha20_outputbytes"] = function() {  return Module["asm"]["_crypto_core_hchacha20_outputbytes"].apply(null, arguments) };
var _crypto_stream_salsa2012_xor = Module["_crypto_stream_salsa2012_xor"] = function() {  return Module["asm"]["_crypto_stream_salsa2012_xor"].apply(null, arguments) };
var _crypto_onetimeauth_keygen = Module["_crypto_onetimeauth_keygen"] = function() {  return Module["asm"]["_crypto_onetimeauth_keygen"].apply(null, arguments) };
var _crypto_pwhash_strbytes = Module["_crypto_pwhash_strbytes"] = function() {  return Module["asm"]["_crypto_pwhash_strbytes"].apply(null, arguments) };
var _crypto_auth_hmacsha512256_update = Module["_crypto_auth_hmacsha512256_update"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512256_update"].apply(null, arguments) };
var _crypto_core_salsa208_outputbytes = Module["_crypto_core_salsa208_outputbytes"] = function() {  return Module["asm"]["_crypto_core_salsa208_outputbytes"].apply(null, arguments) };
var _crypto_onetimeauth_poly1305 = Module["_crypto_onetimeauth_poly1305"] = function() {  return Module["asm"]["_crypto_onetimeauth_poly1305"].apply(null, arguments) };
var _crypto_secretbox_xchacha20poly1305_macbytes = Module["_crypto_secretbox_xchacha20poly1305_macbytes"] = function() {  return Module["asm"]["_crypto_secretbox_xchacha20poly1305_macbytes"].apply(null, arguments) };
var _crypto_kdf_bytes_min = Module["_crypto_kdf_bytes_min"] = function() {  return Module["asm"]["_crypto_kdf_bytes_min"].apply(null, arguments) };
var _crypto_sign_ed25519_sk_to_seed = Module["_crypto_sign_ed25519_sk_to_seed"] = function() {  return Module["asm"]["_crypto_sign_ed25519_sk_to_seed"].apply(null, arguments) };
var stackAlloc = Module["stackAlloc"] = function() {  return Module["asm"]["stackAlloc"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_memlimit_interactive = Module["_crypto_pwhash_scryptsalsa208sha256_memlimit_interactive"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_memlimit_interactive"].apply(null, arguments) };
var _crypto_stream_xsalsa20 = Module["_crypto_stream_xsalsa20"] = function() {  return Module["asm"]["_crypto_stream_xsalsa20"].apply(null, arguments) };
var _crypto_box_open_easy_afternm = Module["_crypto_box_open_easy_afternm"] = function() {  return Module["asm"]["_crypto_box_open_easy_afternm"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_seedbytes = Module["_crypto_box_curve25519xsalsa20poly1305_seedbytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_seedbytes"].apply(null, arguments) };
var _crypto_stream_salsa20_keybytes = Module["_crypto_stream_salsa20_keybytes"] = function() {  return Module["asm"]["_crypto_stream_salsa20_keybytes"].apply(null, arguments) };
var _crypto_kdf_primitive = Module["_crypto_kdf_primitive"] = function() {  return Module["asm"]["_crypto_kdf_primitive"].apply(null, arguments) };
var _crypto_sign_ed25519ph_final_verify = Module["_crypto_sign_ed25519ph_final_verify"] = function() {  return Module["asm"]["_crypto_sign_ed25519ph_final_verify"].apply(null, arguments) };
var _crypto_sign_ed25519_publickeybytes = Module["_crypto_sign_ed25519_publickeybytes"] = function() {  return Module["asm"]["_crypto_sign_ed25519_publickeybytes"].apply(null, arguments) };
var _crypto_shorthash = Module["_crypto_shorthash"] = function() {  return Module["asm"]["_crypto_shorthash"].apply(null, arguments) };
var _crypto_auth_keybytes = Module["_crypto_auth_keybytes"] = function() {  return Module["asm"]["_crypto_auth_keybytes"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_open_afternm = Module["_crypto_box_curve25519xsalsa20poly1305_open_afternm"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_open_afternm"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_npubbytes = Module["_crypto_aead_chacha20poly1305_npubbytes"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_npubbytes"].apply(null, arguments) };
var _crypto_aead_xchacha20poly1305_ietf_abytes = Module["_crypto_aead_xchacha20poly1305_ietf_abytes"] = function() {  return Module["asm"]["_crypto_aead_xchacha20poly1305_ietf_abytes"].apply(null, arguments) };
var _crypto_onetimeauth_poly1305_final = Module["_crypto_onetimeauth_poly1305_final"] = function() {  return Module["asm"]["_crypto_onetimeauth_poly1305_final"].apply(null, arguments) };
var _crypto_onetimeauth_poly1305_bytes = Module["_crypto_onetimeauth_poly1305_bytes"] = function() {  return Module["asm"]["_crypto_onetimeauth_poly1305_bytes"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_seed_keypair = Module["_crypto_box_curve25519xsalsa20poly1305_seed_keypair"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_seed_keypair"].apply(null, arguments) };
var _crypto_box_primitive = Module["_crypto_box_primitive"] = function() {  return Module["asm"]["_crypto_box_primitive"].apply(null, arguments) };
var _crypto_pwhash_str = Module["_crypto_pwhash_str"] = function() {  return Module["asm"]["_crypto_pwhash_str"].apply(null, arguments) };
var _crypto_auth_hmacsha512_keybytes = Module["_crypto_auth_hmacsha512_keybytes"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512_keybytes"].apply(null, arguments) };
var _crypto_auth = Module["_crypto_auth"] = function() {  return Module["asm"]["_crypto_auth"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_bytes_min = Module["_crypto_pwhash_scryptsalsa208sha256_bytes_min"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_bytes_min"].apply(null, arguments) };
var _crypto_core_salsa20_keybytes = Module["_crypto_core_salsa20_keybytes"] = function() {  return Module["asm"]["_crypto_core_salsa20_keybytes"].apply(null, arguments) };
var _crypto_box_afternm = Module["_crypto_box_afternm"] = function() {  return Module["asm"]["_crypto_box_afternm"].apply(null, arguments) };
var _crypto_core_salsa208_constbytes = Module["_crypto_core_salsa208_constbytes"] = function() {  return Module["asm"]["_crypto_core_salsa208_constbytes"].apply(null, arguments) };
var _crypto_pwhash_argon2id_memlimit_sensitive = Module["_crypto_pwhash_argon2id_memlimit_sensitive"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_memlimit_sensitive"].apply(null, arguments) };
var _crypto_onetimeauth_primitive = Module["_crypto_onetimeauth_primitive"] = function() {  return Module["asm"]["_crypto_onetimeauth_primitive"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_str_verify = Module["_crypto_pwhash_scryptsalsa208sha256_str_verify"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_str_verify"].apply(null, arguments) };
var _sodium_version_string = Module["_sodium_version_string"] = function() {  return Module["asm"]["_sodium_version_string"].apply(null, arguments) };
var _crypto_stream_xchacha20_xor_ic = Module["_crypto_stream_xchacha20_xor_ic"] = function() {  return Module["asm"]["_crypto_stream_xchacha20_xor_ic"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_passwd_min = Module["_crypto_pwhash_scryptsalsa208sha256_passwd_min"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_passwd_min"].apply(null, arguments) };
var _crypto_stream_chacha20_ietf = Module["_crypto_stream_chacha20_ietf"] = function() {  return Module["asm"]["_crypto_stream_chacha20_ietf"].apply(null, arguments) };
var _crypto_generichash = Module["_crypto_generichash"] = function() {  return Module["asm"]["_crypto_generichash"].apply(null, arguments) };
var _crypto_core_hsalsa20_outputbytes = Module["_crypto_core_hsalsa20_outputbytes"] = function() {  return Module["asm"]["_crypto_core_hsalsa20_outputbytes"].apply(null, arguments) };
var _crypto_pwhash_opslimit_interactive = Module["_crypto_pwhash_opslimit_interactive"] = function() {  return Module["asm"]["_crypto_pwhash_opslimit_interactive"].apply(null, arguments) };
var getTempRet0 = Module["getTempRet0"] = function() {  return Module["asm"]["getTempRet0"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_noncebytes = Module["_crypto_box_curve25519xsalsa20poly1305_noncebytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_noncebytes"].apply(null, arguments) };
var _crypto_stream_salsa2012_noncebytes = Module["_crypto_stream_salsa2012_noncebytes"] = function() {  return Module["asm"]["_crypto_stream_salsa2012_noncebytes"].apply(null, arguments) };
var _crypto_core_salsa208_keybytes = Module["_crypto_core_salsa208_keybytes"] = function() {  return Module["asm"]["_crypto_core_salsa208_keybytes"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_tag_final = Module["_crypto_secretstream_xchacha20poly1305_tag_final"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_tag_final"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_ietf_keybytes = Module["_crypto_aead_chacha20poly1305_ietf_keybytes"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_ietf_keybytes"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_ietf_decrypt = Module["_crypto_aead_chacha20poly1305_ietf_decrypt"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_ietf_decrypt"].apply(null, arguments) };
var _crypto_auth_hmacsha512256_init = Module["_crypto_auth_hmacsha512256_init"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512256_init"].apply(null, arguments) };
var _crypto_kx_server_session_keys = Module["_crypto_kx_server_session_keys"] = function() {  return Module["asm"]["_crypto_kx_server_session_keys"].apply(null, arguments) };
var _crypto_onetimeauth_poly1305_verify = Module["_crypto_onetimeauth_poly1305_verify"] = function() {  return Module["asm"]["_crypto_onetimeauth_poly1305_verify"].apply(null, arguments) };
var _crypto_auth_hmacsha512_final = Module["_crypto_auth_hmacsha512_final"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512_final"].apply(null, arguments) };
var _crypto_auth_hmacsha512256_verify = Module["_crypto_auth_hmacsha512256_verify"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512256_verify"].apply(null, arguments) };
var _crypto_box_secretkeybytes = Module["_crypto_box_secretkeybytes"] = function() {  return Module["asm"]["_crypto_box_secretkeybytes"].apply(null, arguments) };
var _crypto_stream_salsa2012_keygen = Module["_crypto_stream_salsa2012_keygen"] = function() {  return Module["asm"]["_crypto_stream_salsa2012_keygen"].apply(null, arguments) };
var _crypto_onetimeauth_update = Module["_crypto_onetimeauth_update"] = function() {  return Module["asm"]["_crypto_onetimeauth_update"].apply(null, arguments) };
var _crypto_core_salsa20 = Module["_crypto_core_salsa20"] = function() {  return Module["asm"]["_crypto_core_salsa20"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_abytes = Module["_crypto_secretstream_xchacha20poly1305_abytes"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_abytes"].apply(null, arguments) };
var _crypto_pwhash_memlimit_interactive = Module["_crypto_pwhash_memlimit_interactive"] = function() {  return Module["asm"]["_crypto_pwhash_memlimit_interactive"].apply(null, arguments) };
var _crypto_scalarmult_bytes = Module["_crypto_scalarmult_bytes"] = function() {  return Module["asm"]["_crypto_scalarmult_bytes"].apply(null, arguments) };
var _crypto_secretbox_zerobytes = Module["_crypto_secretbox_zerobytes"] = function() {  return Module["asm"]["_crypto_secretbox_zerobytes"].apply(null, arguments) };
var _crypto_pwhash_argon2id_memlimit_moderate = Module["_crypto_pwhash_argon2id_memlimit_moderate"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_memlimit_moderate"].apply(null, arguments) };
var _crypto_secretbox_detached = Module["_crypto_secretbox_detached"] = function() {  return Module["asm"]["_crypto_secretbox_detached"].apply(null, arguments) };
var _crypto_stream_xor = Module["_crypto_stream_xor"] = function() {  return Module["asm"]["_crypto_stream_xor"].apply(null, arguments) };
var _crypto_secretbox_xchacha20poly1305_easy = Module["_crypto_secretbox_xchacha20poly1305_easy"] = function() {  return Module["asm"]["_crypto_secretbox_xchacha20poly1305_easy"].apply(null, arguments) };
var _crypto_secretbox_easy = Module["_crypto_secretbox_easy"] = function() {  return Module["asm"]["_crypto_secretbox_easy"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_init_pull = Module["_crypto_secretstream_xchacha20poly1305_init_pull"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_init_pull"].apply(null, arguments) };
var _crypto_aead_xchacha20poly1305_ietf_decrypt_detached = Module["_crypto_aead_xchacha20poly1305_ietf_decrypt_detached"] = function() {  return Module["asm"]["_crypto_aead_xchacha20poly1305_ietf_decrypt_detached"].apply(null, arguments) };
var _crypto_stream_salsa20 = Module["_crypto_stream_salsa20"] = function() {  return Module["asm"]["_crypto_stream_salsa20"].apply(null, arguments) };
var _sodium_base642bin = Module["_sodium_base642bin"] = function() {  return Module["asm"]["_sodium_base642bin"].apply(null, arguments) };
var _sodium_bin2hex = Module["_sodium_bin2hex"] = function() {  return Module["asm"]["_sodium_bin2hex"].apply(null, arguments) };
var _crypto_auth_hmacsha512_statebytes = Module["_crypto_auth_hmacsha512_statebytes"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512_statebytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i_opslimit_sensitive = Module["_crypto_pwhash_argon2i_opslimit_sensitive"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_opslimit_sensitive"].apply(null, arguments) };
var _crypto_generichash_blake2b_bytes_max = Module["_crypto_generichash_blake2b_bytes_max"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_bytes_max"].apply(null, arguments) };
var _crypto_hash_sha256_update = Module["_crypto_hash_sha256_update"] = function() {  return Module["asm"]["_crypto_hash_sha256_update"].apply(null, arguments) };
var _crypto_core_hsalsa20_constbytes = Module["_crypto_core_hsalsa20_constbytes"] = function() {  return Module["asm"]["_crypto_core_hsalsa20_constbytes"].apply(null, arguments) };
var _crypto_box_easy_afternm = Module["_crypto_box_easy_afternm"] = function() {  return Module["asm"]["_crypto_box_easy_afternm"].apply(null, arguments) };
var _crypto_pwhash_memlimit_moderate = Module["_crypto_pwhash_memlimit_moderate"] = function() {  return Module["asm"]["_crypto_pwhash_memlimit_moderate"].apply(null, arguments) };
var _crypto_core_salsa20_inputbytes = Module["_crypto_core_salsa20_inputbytes"] = function() {  return Module["asm"]["_crypto_core_salsa20_inputbytes"].apply(null, arguments) };
var _crypto_box_publickeybytes = Module["_crypto_box_publickeybytes"] = function() {  return Module["asm"]["_crypto_box_publickeybytes"].apply(null, arguments) };
var _crypto_sign_secretkeybytes = Module["_crypto_sign_secretkeybytes"] = function() {  return Module["asm"]["_crypto_sign_secretkeybytes"].apply(null, arguments) };
var _crypto_scalarmult_scalarbytes = Module["_crypto_scalarmult_scalarbytes"] = function() {  return Module["asm"]["_crypto_scalarmult_scalarbytes"].apply(null, arguments) };
var _crypto_verify_32 = Module["_crypto_verify_32"] = function() {  return Module["asm"]["_crypto_verify_32"].apply(null, arguments) };
var _crypto_kx_sessionkeybytes = Module["_crypto_kx_sessionkeybytes"] = function() {  return Module["asm"]["_crypto_kx_sessionkeybytes"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_decrypt = Module["_crypto_aead_chacha20poly1305_decrypt"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_decrypt"].apply(null, arguments) };
var _crypto_pwhash_argon2id_opslimit_moderate = Module["_crypto_pwhash_argon2id_opslimit_moderate"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_opslimit_moderate"].apply(null, arguments) };
var _crypto_pwhash_argon2id_opslimit_min = Module["_crypto_pwhash_argon2id_opslimit_min"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_opslimit_min"].apply(null, arguments) };
var _crypto_sign = Module["_crypto_sign"] = function() {  return Module["asm"]["_crypto_sign"].apply(null, arguments) };
var _crypto_pwhash_argon2id_memlimit_min = Module["_crypto_pwhash_argon2id_memlimit_min"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_memlimit_min"].apply(null, arguments) };
var _crypto_pwhash_passwd_max = Module["_crypto_pwhash_passwd_max"] = function() {  return Module["asm"]["_crypto_pwhash_passwd_max"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_opslimit_min = Module["_crypto_pwhash_scryptsalsa208sha256_opslimit_min"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_opslimit_min"].apply(null, arguments) };
var _sodium_hex2bin = Module["_sodium_hex2bin"] = function() {  return Module["asm"]["_sodium_hex2bin"].apply(null, arguments) };
var _crypto_pwhash_argon2i_alg_argon2i13 = Module["_crypto_pwhash_argon2i_alg_argon2i13"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_alg_argon2i13"].apply(null, arguments) };
var _crypto_secretbox_keybytes = Module["_crypto_secretbox_keybytes"] = function() {  return Module["asm"]["_crypto_secretbox_keybytes"].apply(null, arguments) };
var _crypto_pwhash_argon2id_alg_argon2id13 = Module["_crypto_pwhash_argon2id_alg_argon2id13"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_alg_argon2id13"].apply(null, arguments) };
var _randombytes = Module["_randombytes"] = function() {  return Module["asm"]["_randombytes"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_ietf_abytes = Module["_crypto_aead_chacha20poly1305_ietf_abytes"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_ietf_abytes"].apply(null, arguments) };
var _crypto_stream_salsa20_keygen = Module["_crypto_stream_salsa20_keygen"] = function() {  return Module["asm"]["_crypto_stream_salsa20_keygen"].apply(null, arguments) };
var _crypto_pwhash_str_needs_rehash = Module["_crypto_pwhash_str_needs_rehash"] = function() {  return Module["asm"]["_crypto_pwhash_str_needs_rehash"].apply(null, arguments) };
var _crypto_generichash_bytes_max = Module["_crypto_generichash_bytes_max"] = function() {  return Module["asm"]["_crypto_generichash_bytes_max"].apply(null, arguments) };
var _crypto_pwhash_argon2i_passwd_min = Module["_crypto_pwhash_argon2i_passwd_min"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_passwd_min"].apply(null, arguments) };
var _crypto_pwhash_opslimit_sensitive = Module["_crypto_pwhash_opslimit_sensitive"] = function() {  return Module["asm"]["_crypto_pwhash_opslimit_sensitive"].apply(null, arguments) };
var _crypto_sign_init = Module["_crypto_sign_init"] = function() {  return Module["asm"]["_crypto_sign_init"].apply(null, arguments) };
var _crypto_generichash_blake2b_personalbytes = Module["_crypto_generichash_blake2b_personalbytes"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_personalbytes"].apply(null, arguments) };
var _crypto_stream_chacha20_xor_ic = Module["_crypto_stream_chacha20_xor_ic"] = function() {  return Module["asm"]["_crypto_stream_chacha20_xor_ic"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_seedbytes = Module["_crypto_box_curve25519xchacha20poly1305_seedbytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_seedbytes"].apply(null, arguments) };
var _crypto_onetimeauth_verify = Module["_crypto_onetimeauth_verify"] = function() {  return Module["asm"]["_crypto_onetimeauth_verify"].apply(null, arguments) };
var _crypto_sign_ed25519_detached = Module["_crypto_sign_ed25519_detached"] = function() {  return Module["asm"]["_crypto_sign_ed25519_detached"].apply(null, arguments) };
var _crypto_generichash_init = Module["_crypto_generichash_init"] = function() {  return Module["asm"]["_crypto_generichash_init"].apply(null, arguments) };
var _crypto_sign_bytes = Module["_crypto_sign_bytes"] = function() {  return Module["asm"]["_crypto_sign_bytes"].apply(null, arguments) };
var _crypto_generichash_update = Module["_crypto_generichash_update"] = function() {  return Module["asm"]["_crypto_generichash_update"].apply(null, arguments) };
var _crypto_scalarmult = Module["_crypto_scalarmult"] = function() {  return Module["asm"]["_crypto_scalarmult"].apply(null, arguments) };
var _crypto_sign_detached = Module["_crypto_sign_detached"] = function() {  return Module["asm"]["_crypto_sign_detached"].apply(null, arguments) };
var _crypto_generichash_blake2b_update = Module["_crypto_generichash_blake2b_update"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_update"].apply(null, arguments) };
var _sodium_base64_encoded_len = Module["_sodium_base64_encoded_len"] = function() {  return Module["asm"]["_sodium_base64_encoded_len"].apply(null, arguments) };
var _crypto_generichash_blake2b_bytes = Module["_crypto_generichash_blake2b_bytes"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_bytes"].apply(null, arguments) };
var _crypto_auth_hmacsha512256_bytes = Module["_crypto_auth_hmacsha512256_bytes"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512256_bytes"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_noncebytes = Module["_crypto_box_curve25519xchacha20poly1305_noncebytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_noncebytes"].apply(null, arguments) };
var _randombytes_uniform = Module["_randombytes_uniform"] = function() {  return Module["asm"]["_randombytes_uniform"].apply(null, arguments) };
var _crypto_sign_seed_keypair = Module["_crypto_sign_seed_keypair"] = function() {  return Module["asm"]["_crypto_sign_seed_keypair"].apply(null, arguments) };
var _crypto_shorthash_keygen = Module["_crypto_shorthash_keygen"] = function() {  return Module["asm"]["_crypto_shorthash_keygen"].apply(null, arguments) };
var _crypto_onetimeauth_init = Module["_crypto_onetimeauth_init"] = function() {  return Module["asm"]["_crypto_onetimeauth_init"].apply(null, arguments) };
var _crypto_sign_ed25519_seed_keypair = Module["_crypto_sign_ed25519_seed_keypair"] = function() {  return Module["asm"]["_crypto_sign_ed25519_seed_keypair"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_init_push = Module["_crypto_secretstream_xchacha20poly1305_init_push"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_init_push"].apply(null, arguments) };
var _crypto_stream_salsa20_xor = Module["_crypto_stream_salsa20_xor"] = function() {  return Module["asm"]["_crypto_stream_salsa20_xor"].apply(null, arguments) };
var _crypto_auth_hmacsha512_verify = Module["_crypto_auth_hmacsha512_verify"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512_verify"].apply(null, arguments) };
var _crypto_generichash_blake2b_keybytes_min = Module["_crypto_generichash_blake2b_keybytes_min"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_keybytes_min"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_statebytes = Module["_crypto_secretstream_xchacha20poly1305_statebytes"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_statebytes"].apply(null, arguments) };
var _crypto_kx_publickeybytes = Module["_crypto_kx_publickeybytes"] = function() {  return Module["asm"]["_crypto_kx_publickeybytes"].apply(null, arguments) };
var _crypto_pwhash_bytes_max = Module["_crypto_pwhash_bytes_max"] = function() {  return Module["asm"]["_crypto_pwhash_bytes_max"].apply(null, arguments) };
var _crypto_pwhash_argon2id_str_needs_rehash = Module["_crypto_pwhash_argon2id_str_needs_rehash"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_str_needs_rehash"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_ietf_encrypt_detached = Module["_crypto_aead_chacha20poly1305_ietf_encrypt_detached"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_ietf_encrypt_detached"].apply(null, arguments) };
var _sodium_pad = Module["_sodium_pad"] = function() {  return Module["asm"]["_sodium_pad"].apply(null, arguments) };
var _crypto_stream = Module["_crypto_stream"] = function() {  return Module["asm"]["_crypto_stream"].apply(null, arguments) };
var _sbrk = Module["_sbrk"] = function() {  return Module["asm"]["_sbrk"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_beforenm = Module["_crypto_box_curve25519xchacha20poly1305_beforenm"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_beforenm"].apply(null, arguments) };
var _memcpy = Module["_memcpy"] = function() {  return Module["asm"]["_memcpy"].apply(null, arguments) };
var _crypto_pwhash = Module["_crypto_pwhash"] = function() {  return Module["asm"]["_crypto_pwhash"].apply(null, arguments) };
var _crypto_auth_hmacsha512256 = Module["_crypto_auth_hmacsha512256"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512256"].apply(null, arguments) };
var _crypto_secretbox_xsalsa20poly1305 = Module["_crypto_secretbox_xsalsa20poly1305"] = function() {  return Module["asm"]["_crypto_secretbox_xsalsa20poly1305"].apply(null, arguments) };
var _crypto_verify_16_bytes = Module["_crypto_verify_16_bytes"] = function() {  return Module["asm"]["_crypto_verify_16_bytes"].apply(null, arguments) };
var _crypto_stream_salsa208_keygen = Module["_crypto_stream_salsa208_keygen"] = function() {  return Module["asm"]["_crypto_stream_salsa208_keygen"].apply(null, arguments) };
var _emscripten_get_global_libc = Module["_emscripten_get_global_libc"] = function() {  return Module["asm"]["_emscripten_get_global_libc"].apply(null, arguments) };
var _crypto_shorthash_siphashx24_bytes = Module["_crypto_shorthash_siphashx24_bytes"] = function() {  return Module["asm"]["_crypto_shorthash_siphashx24_bytes"].apply(null, arguments) };
var _crypto_generichash_blake2b_final = Module["_crypto_generichash_blake2b_final"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_final"].apply(null, arguments) };
var _crypto_generichash_blake2b_init_salt_personal = Module["_crypto_generichash_blake2b_init_salt_personal"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_init_salt_personal"].apply(null, arguments) };
var _crypto_box_seal = Module["_crypto_box_seal"] = function() {  return Module["asm"]["_crypto_box_seal"].apply(null, arguments) };
var _crypto_aead_xchacha20poly1305_ietf_keygen = Module["_crypto_aead_xchacha20poly1305_ietf_keygen"] = function() {  return Module["asm"]["_crypto_aead_xchacha20poly1305_ietf_keygen"].apply(null, arguments) };
var _crypto_kx_keypair = Module["_crypto_kx_keypair"] = function() {  return Module["asm"]["_crypto_kx_keypair"].apply(null, arguments) };
var runPostSets = Module["runPostSets"] = function() {  return Module["asm"]["runPostSets"].apply(null, arguments) };
var _crypto_pwhash_alg_default = Module["_crypto_pwhash_alg_default"] = function() {  return Module["asm"]["_crypto_pwhash_alg_default"].apply(null, arguments) };
var _crypto_box = Module["_crypto_box"] = function() {  return Module["asm"]["_crypto_box"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_tag_rekey = Module["_crypto_secretstream_xchacha20poly1305_tag_rekey"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_tag_rekey"].apply(null, arguments) };
var _crypto_stream_primitive = Module["_crypto_stream_primitive"] = function() {  return Module["asm"]["_crypto_stream_primitive"].apply(null, arguments) };
var _crypto_secretbox_xsalsa20poly1305_boxzerobytes = Module["_crypto_secretbox_xsalsa20poly1305_boxzerobytes"] = function() {  return Module["asm"]["_crypto_secretbox_xsalsa20poly1305_boxzerobytes"].apply(null, arguments) };
var _crypto_pwhash_str_verify = Module["_crypto_pwhash_str_verify"] = function() {  return Module["asm"]["_crypto_pwhash_str_verify"].apply(null, arguments) };
var _crypto_generichash_keybytes_min = Module["_crypto_generichash_keybytes_min"] = function() {  return Module["asm"]["_crypto_generichash_keybytes_min"].apply(null, arguments) };
var _crypto_generichash_statebytes = Module["_crypto_generichash_statebytes"] = function() {  return Module["asm"]["_crypto_generichash_statebytes"].apply(null, arguments) };
var _crypto_onetimeauth_poly1305_statebytes = Module["_crypto_onetimeauth_poly1305_statebytes"] = function() {  return Module["asm"]["_crypto_onetimeauth_poly1305_statebytes"].apply(null, arguments) };
var _crypto_sign_final_verify = Module["_crypto_sign_final_verify"] = function() {  return Module["asm"]["_crypto_sign_final_verify"].apply(null, arguments) };
var _crypto_pwhash_strprefix = Module["_crypto_pwhash_strprefix"] = function() {  return Module["asm"]["_crypto_pwhash_strprefix"].apply(null, arguments) };
var _crypto_secretbox_keygen = Module["_crypto_secretbox_keygen"] = function() {  return Module["asm"]["_crypto_secretbox_keygen"].apply(null, arguments) };
var _crypto_secretbox_xchacha20poly1305_noncebytes = Module["_crypto_secretbox_xchacha20poly1305_noncebytes"] = function() {  return Module["asm"]["_crypto_secretbox_xchacha20poly1305_noncebytes"].apply(null, arguments) };
var _crypto_hash_sha512 = Module["_crypto_hash_sha512"] = function() {  return Module["asm"]["_crypto_hash_sha512"].apply(null, arguments) };
var _crypto_shorthash_siphash24_bytes = Module["_crypto_shorthash_siphash24_bytes"] = function() {  return Module["asm"]["_crypto_shorthash_siphash24_bytes"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_push = Module["_crypto_secretstream_xchacha20poly1305_push"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_push"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_bytes_max = Module["_crypto_pwhash_scryptsalsa208sha256_bytes_max"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_bytes_max"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_detached = Module["_crypto_box_curve25519xchacha20poly1305_detached"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_detached"].apply(null, arguments) };
var _sodium_library_version_major = Module["_sodium_library_version_major"] = function() {  return Module["asm"]["_sodium_library_version_major"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_ietf_encrypt = Module["_crypto_aead_chacha20poly1305_ietf_encrypt"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_ietf_encrypt"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_tag_push = Module["_crypto_secretstream_xchacha20poly1305_tag_push"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_tag_push"].apply(null, arguments) };
var _crypto_secretbox_xchacha20poly1305_detached = Module["_crypto_secretbox_xchacha20poly1305_detached"] = function() {  return Module["asm"]["_crypto_secretbox_xchacha20poly1305_detached"].apply(null, arguments) };
var _crypto_generichash_blake2b_init = Module["_crypto_generichash_blake2b_init"] = function() {  return Module["asm"]["_crypto_generichash_blake2b_init"].apply(null, arguments) };
var _randombytes_close = Module["_randombytes_close"] = function() {  return Module["asm"]["_randombytes_close"].apply(null, arguments) };
var _crypto_pwhash_primitive = Module["_crypto_pwhash_primitive"] = function() {  return Module["asm"]["_crypto_pwhash_primitive"].apply(null, arguments) };
var _crypto_onetimeauth_keybytes = Module["_crypto_onetimeauth_keybytes"] = function() {  return Module["asm"]["_crypto_onetimeauth_keybytes"].apply(null, arguments) };
var _crypto_pwhash_argon2i = Module["_crypto_pwhash_argon2i"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i"].apply(null, arguments) };
var _crypto_pwhash_argon2id_strbytes = Module["_crypto_pwhash_argon2id_strbytes"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_strbytes"].apply(null, arguments) };
var _crypto_pwhash_argon2id_opslimit_max = Module["_crypto_pwhash_argon2id_opslimit_max"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_opslimit_max"].apply(null, arguments) };
var _crypto_kdf_keybytes = Module["_crypto_kdf_keybytes"] = function() {  return Module["asm"]["_crypto_kdf_keybytes"].apply(null, arguments) };
var establishStackSpace = Module["establishStackSpace"] = function() {  return Module["asm"]["establishStackSpace"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_encrypt = Module["_crypto_aead_chacha20poly1305_encrypt"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_encrypt"].apply(null, arguments) };
var _crypto_core_salsa2012_inputbytes = Module["_crypto_core_salsa2012_inputbytes"] = function() {  return Module["asm"]["_crypto_core_salsa2012_inputbytes"].apply(null, arguments) };
var _crypto_secretstream_xchacha20poly1305_messagebytes_max = Module["_crypto_secretstream_xchacha20poly1305_messagebytes_max"] = function() {  return Module["asm"]["_crypto_secretstream_xchacha20poly1305_messagebytes_max"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_memlimit_min = Module["_crypto_pwhash_scryptsalsa208sha256_memlimit_min"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_memlimit_min"].apply(null, arguments) };
var _crypto_core_salsa208 = Module["_crypto_core_salsa208"] = function() {  return Module["asm"]["_crypto_core_salsa208"].apply(null, arguments) };
var _crypto_pwhash_opslimit_max = Module["_crypto_pwhash_opslimit_max"] = function() {  return Module["asm"]["_crypto_pwhash_opslimit_max"].apply(null, arguments) };
var _crypto_aead_xchacha20poly1305_ietf_nsecbytes = Module["_crypto_aead_xchacha20poly1305_ietf_nsecbytes"] = function() {  return Module["asm"]["_crypto_aead_xchacha20poly1305_ietf_nsecbytes"].apply(null, arguments) };
var _crypto_auth_verify = Module["_crypto_auth_verify"] = function() {  return Module["asm"]["_crypto_auth_verify"].apply(null, arguments) };
var _crypto_generichash_bytes = Module["_crypto_generichash_bytes"] = function() {  return Module["asm"]["_crypto_generichash_bytes"].apply(null, arguments) };
var _crypto_auth_hmacsha512256_keygen = Module["_crypto_auth_hmacsha512256_keygen"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512256_keygen"].apply(null, arguments) };
var _randombytes_stir = Module["_randombytes_stir"] = function() {  return Module["asm"]["_randombytes_stir"].apply(null, arguments) };
var _memset = Module["_memset"] = function() {  return Module["asm"]["_memset"].apply(null, arguments) };
var _crypto_box_open_detached_afternm = Module["_crypto_box_open_detached_afternm"] = function() {  return Module["asm"]["_crypto_box_open_detached_afternm"].apply(null, arguments) };
var _crypto_pwhash_argon2i_memlimit_sensitive = Module["_crypto_pwhash_argon2i_memlimit_sensitive"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_memlimit_sensitive"].apply(null, arguments) };
var _crypto_kx_primitive = Module["_crypto_kx_primitive"] = function() {  return Module["asm"]["_crypto_kx_primitive"].apply(null, arguments) };
var _crypto_stream_salsa2012_keybytes = Module["_crypto_stream_salsa2012_keybytes"] = function() {  return Module["asm"]["_crypto_stream_salsa2012_keybytes"].apply(null, arguments) };
var _crypto_aead_xchacha20poly1305_ietf_decrypt = Module["_crypto_aead_xchacha20poly1305_ietf_decrypt"] = function() {  return Module["asm"]["_crypto_aead_xchacha20poly1305_ietf_decrypt"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_strprefix = Module["_crypto_pwhash_scryptsalsa208sha256_strprefix"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_strprefix"].apply(null, arguments) };
var _crypto_core_salsa20_outputbytes = Module["_crypto_core_salsa20_outputbytes"] = function() {  return Module["asm"]["_crypto_core_salsa20_outputbytes"].apply(null, arguments) };
var _crypto_auth_keygen = Module["_crypto_auth_keygen"] = function() {  return Module["asm"]["_crypto_auth_keygen"].apply(null, arguments) };
var _crypto_secretbox = Module["_crypto_secretbox"] = function() {  return Module["asm"]["_crypto_secretbox"].apply(null, arguments) };
var _crypto_aead_xchacha20poly1305_ietf_encrypt_detached = Module["_crypto_aead_xchacha20poly1305_ietf_encrypt_detached"] = function() {  return Module["asm"]["_crypto_aead_xchacha20poly1305_ietf_encrypt_detached"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_passwd_max = Module["_crypto_pwhash_scryptsalsa208sha256_passwd_max"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_passwd_max"].apply(null, arguments) };
var _crypto_auth_hmacsha256_bytes = Module["_crypto_auth_hmacsha256_bytes"] = function() {  return Module["asm"]["_crypto_auth_hmacsha256_bytes"].apply(null, arguments) };
var _crypto_auth_hmacsha256_verify = Module["_crypto_auth_hmacsha256_verify"] = function() {  return Module["asm"]["_crypto_auth_hmacsha256_verify"].apply(null, arguments) };
var _crypto_sign_keypair = Module["_crypto_sign_keypair"] = function() {  return Module["asm"]["_crypto_sign_keypair"].apply(null, arguments) };
var _crypto_stream_xchacha20 = Module["_crypto_stream_xchacha20"] = function() {  return Module["asm"]["_crypto_stream_xchacha20"].apply(null, arguments) };
var _crypto_onetimeauth_statebytes = Module["_crypto_onetimeauth_statebytes"] = function() {  return Module["asm"]["_crypto_onetimeauth_statebytes"].apply(null, arguments) };
var _crypto_sign_ed25519ph_init = Module["_crypto_sign_ed25519ph_init"] = function() {  return Module["asm"]["_crypto_sign_ed25519ph_init"].apply(null, arguments) };
var _crypto_stream_salsa20_noncebytes = Module["_crypto_stream_salsa20_noncebytes"] = function() {  return Module["asm"]["_crypto_stream_salsa20_noncebytes"].apply(null, arguments) };
var _crypto_shorthash_keybytes = Module["_crypto_shorthash_keybytes"] = function() {  return Module["asm"]["_crypto_shorthash_keybytes"].apply(null, arguments) };
var _crypto_aead_chacha20poly1305_keygen = Module["_crypto_aead_chacha20poly1305_keygen"] = function() {  return Module["asm"]["_crypto_aead_chacha20poly1305_keygen"].apply(null, arguments) };
var _crypto_shorthash_siphashx24 = Module["_crypto_shorthash_siphashx24"] = function() {  return Module["asm"]["_crypto_shorthash_siphashx24"].apply(null, arguments) };
var _memmove = Module["_memmove"] = function() {  return Module["asm"]["_memmove"].apply(null, arguments) };
var _crypto_hash_sha512_final = Module["_crypto_hash_sha512_final"] = function() {  return Module["asm"]["_crypto_hash_sha512_final"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_zerobytes = Module["_crypto_box_curve25519xsalsa20poly1305_zerobytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_zerobytes"].apply(null, arguments) };
var _crypto_shorthash_siphashx24_keybytes = Module["_crypto_shorthash_siphashx24_keybytes"] = function() {  return Module["asm"]["_crypto_shorthash_siphashx24_keybytes"].apply(null, arguments) };
var _crypto_pwhash_passwd_min = Module["_crypto_pwhash_passwd_min"] = function() {  return Module["asm"]["_crypto_pwhash_passwd_min"].apply(null, arguments) };
var _crypto_kdf_bytes_max = Module["_crypto_kdf_bytes_max"] = function() {  return Module["asm"]["_crypto_kdf_bytes_max"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_boxzerobytes = Module["_crypto_box_curve25519xsalsa20poly1305_boxzerobytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_boxzerobytes"].apply(null, arguments) };
var _crypto_generichash_bytes_min = Module["_crypto_generichash_bytes_min"] = function() {  return Module["asm"]["_crypto_generichash_bytes_min"].apply(null, arguments) };
var _crypto_core_salsa2012_outputbytes = Module["_crypto_core_salsa2012_outputbytes"] = function() {  return Module["asm"]["_crypto_core_salsa2012_outputbytes"].apply(null, arguments) };
var _crypto_auth_hmacsha256_keybytes = Module["_crypto_auth_hmacsha256_keybytes"] = function() {  return Module["asm"]["_crypto_auth_hmacsha256_keybytes"].apply(null, arguments) };
var _crypto_core_salsa208_inputbytes = Module["_crypto_core_salsa208_inputbytes"] = function() {  return Module["asm"]["_crypto_core_salsa208_inputbytes"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_opslimit_max = Module["_crypto_pwhash_scryptsalsa208sha256_opslimit_max"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_opslimit_max"].apply(null, arguments) };
var _crypto_sign_update = Module["_crypto_sign_update"] = function() {  return Module["asm"]["_crypto_sign_update"].apply(null, arguments) };
var _crypto_stream_salsa208_messagebytes_max = Module["_crypto_stream_salsa208_messagebytes_max"] = function() {  return Module["asm"]["_crypto_stream_salsa208_messagebytes_max"].apply(null, arguments) };
var _crypto_stream_chacha20_noncebytes = Module["_crypto_stream_chacha20_noncebytes"] = function() {  return Module["asm"]["_crypto_stream_chacha20_noncebytes"].apply(null, arguments) };
var _crypto_secretbox_open_detached = Module["_crypto_secretbox_open_detached"] = function() {  return Module["asm"]["_crypto_secretbox_open_detached"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_seed_keypair = Module["_crypto_box_curve25519xchacha20poly1305_seed_keypair"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_seed_keypair"].apply(null, arguments) };
var _crypto_pwhash_argon2id_memlimit_max = Module["_crypto_pwhash_argon2id_memlimit_max"] = function() {  return Module["asm"]["_crypto_pwhash_argon2id_memlimit_max"].apply(null, arguments) };
var _crypto_pwhash_argon2i_memlimit_min = Module["_crypto_pwhash_argon2i_memlimit_min"] = function() {  return Module["asm"]["_crypto_pwhash_argon2i_memlimit_min"].apply(null, arguments) };
var _crypto_pwhash_scryptsalsa208sha256_opslimit_sensitive = Module["_crypto_pwhash_scryptsalsa208sha256_opslimit_sensitive"] = function() {  return Module["asm"]["_crypto_pwhash_scryptsalsa208sha256_opslimit_sensitive"].apply(null, arguments) };
var _crypto_box_curve25519xsalsa20poly1305_secretkeybytes = Module["_crypto_box_curve25519xsalsa20poly1305_secretkeybytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xsalsa20poly1305_secretkeybytes"].apply(null, arguments) };
var _crypto_kdf_contextbytes = Module["_crypto_kdf_contextbytes"] = function() {  return Module["asm"]["_crypto_kdf_contextbytes"].apply(null, arguments) };
var _crypto_hash_sha256_final = Module["_crypto_hash_sha256_final"] = function() {  return Module["asm"]["_crypto_hash_sha256_final"].apply(null, arguments) };
var _crypto_stream_xchacha20_keybytes = Module["_crypto_stream_xchacha20_keybytes"] = function() {  return Module["asm"]["_crypto_stream_xchacha20_keybytes"].apply(null, arguments) };
var _crypto_box_seal_open = Module["_crypto_box_seal_open"] = function() {  return Module["asm"]["_crypto_box_seal_open"].apply(null, arguments) };
var _crypto_shorthash_primitive = Module["_crypto_shorthash_primitive"] = function() {  return Module["asm"]["_crypto_shorthash_primitive"].apply(null, arguments) };
var _crypto_core_hsalsa20_inputbytes = Module["_crypto_core_hsalsa20_inputbytes"] = function() {  return Module["asm"]["_crypto_core_hsalsa20_inputbytes"].apply(null, arguments) };
var _crypto_onetimeauth_final = Module["_crypto_onetimeauth_final"] = function() {  return Module["asm"]["_crypto_onetimeauth_final"].apply(null, arguments) };
var _crypto_secretbox_open_easy = Module["_crypto_secretbox_open_easy"] = function() {  return Module["asm"]["_crypto_secretbox_open_easy"].apply(null, arguments) };
var _crypto_core_salsa2012 = Module["_crypto_core_salsa2012"] = function() {  return Module["asm"]["_crypto_core_salsa2012"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_macbytes = Module["_crypto_box_curve25519xchacha20poly1305_macbytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_macbytes"].apply(null, arguments) };
var _crypto_auth_hmacsha512256_statebytes = Module["_crypto_auth_hmacsha512256_statebytes"] = function() {  return Module["asm"]["_crypto_auth_hmacsha512256_statebytes"].apply(null, arguments) };
var _crypto_box_curve25519xchacha20poly1305_publickeybytes = Module["_crypto_box_curve25519xchacha20poly1305_publickeybytes"] = function() {  return Module["asm"]["_crypto_box_curve25519xchacha20poly1305_publickeybytes"].apply(null, arguments) };
var _crypto_stream_chacha20_xor = Module["_crypto_stream_chacha20_xor"] = function() {  return Module["asm"]["_crypto_stream_chacha20_xor"].apply(null, arguments) };
var _crypto_core_hsalsa20 = Module["_crypto_core_hsalsa20"] = function() {  return Module["asm"]["_crypto_core_hsalsa20"].apply(null, arguments) };
var dynCall_ii = Module["dynCall_ii"] = function() {  return Module["asm"]["dynCall_ii"].apply(null, arguments) };
var dynCall_iiii = Module["dynCall_iiii"] = function() {  return Module["asm"]["dynCall_iiii"].apply(null, arguments) };
;
Runtime.stackAlloc = Module['stackAlloc'];
Runtime.stackSave = Module['stackSave'];
Runtime.stackRestore = Module['stackRestore'];
Runtime.establishStackSpace = Module['establishStackSpace'];
Runtime.setTempRet0 = Module['setTempRet0'];
Runtime.getTempRet0 = Module['getTempRet0'];


// === Auto-generated postamble setup entry stuff ===

Module['asm'] = asm;



if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, Runtime.GLOBAL_BASE);
  } else {
    addRunDependency('memory initializer');
    var applyMemoryInitializer = function(data) {
      if (data.byteLength) data = new Uint8Array(data);
      HEAPU8.set(data, Runtime.GLOBAL_BASE);
      // Delete the typed array that contains the large blob of the memory initializer request response so that
      // we won't keep unnecessary memory lying around. However, keep the XHR object itself alive so that e.g.
      // its .status field can still be accessed later.
      if (Module['memoryInitializerRequest']) delete Module['memoryInitializerRequest'].response;
      removeRunDependency('memory initializer');
    }
    function doBrowserLoad() {
      Module['readAsync'](memoryInitializer, applyMemoryInitializer, function() {
        throw 'could not load memory initializer ' + memoryInitializer;
      });
    }
    if (Module['memoryInitializerRequest']) {
      // a network request has already been created, just use that
      function useRequest() {
        var request = Module['memoryInitializerRequest'];
        if (request.status !== 200 && request.status !== 0) {
          // If you see this warning, the issue may be that you are using locateFile or memoryInitializerPrefixURL, and defining them in JS. That
          // means that the HTML file doesn't know about them, and when it tries to create the mem init request early, does it to the wrong place.
          // Look in your browser's devtools network console to see what's going on.
          console.warn('a problem seems to have happened with Module.memoryInitializerRequest, status: ' + request.status + ', retrying ' + memoryInitializer);
          doBrowserLoad();
          return;
        }
        applyMemoryInitializer(request.response);
      }
      if (Module['memoryInitializerRequest'].response) {
        setTimeout(useRequest, 0); // it's already here; but, apply it asynchronously
      } else {
        Module['memoryInitializerRequest'].addEventListener('load', useRequest); // wait for it
      }
    } else {
      // fetch it from the network ourselves
      doBrowserLoad();
    }
  }
}



/**
 * @constructor
 * @extends {Error}
 */
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      var toLog = e;
      if (e && typeof e === 'object' && e.stack) {
        toLog = [e, e.stack];
      }
      Module.printErr('exception thrown: ' + toLog);
      Module['quit'](1, e);
    }
  } finally {
    calledMain = true;
  }
}




/** @type {function(Array=)} */
function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    return;
  }


  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return;

    ensureInitRuntime();

    preMain();


    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    return;
  }

  if (Module['noExitRuntime']) {
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    process['exit'](status);
  }
  Module['quit'](status, new ExitStatus(status));
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}





// {{MODULE_ADDITIONS}}



    ENVIRONMENT_IS_NODE && !process.removeAllListeners("uncaughtException");
    return Module;
}

if (typeof define === 'function' && define.amd) {
  define(['exports'], expose_libsodium);
} else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
  expose_libsodium(exports);
} else {
  root.libsodium = expose_libsodium(root.libsodium_mod || (root.commonJsStrict = {}));
}

})(this);
