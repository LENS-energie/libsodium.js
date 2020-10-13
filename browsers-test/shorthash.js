var Module=typeof Module!=="undefined"?Module:{};try{this["Module"]=Module;Module.test}catch(e){this["Module"]=Module={}}if(typeof process==="object"){if(typeof FS==="object"){Module["preRun"]=Module["preRun"]||[];Module["preRun"].push(function(){FS.init();FS.mkdir("/test-data");FS.mount(NODEFS,{root:"."},"/test-data")})}}else{Module["print"]=function(x){var event=new Event("test-output");event.data=x;window.dispatchEvent(event)}}var moduleOverrides={};var key;for(key in Module){if(Module.hasOwnProperty(key)){moduleOverrides[key]=Module[key]}}var arguments_=[];var thisProgram="./this.program";var quit_=function(status,toThrow){throw toThrow};var ENVIRONMENT_IS_WEB=false;var ENVIRONMENT_IS_WORKER=false;var ENVIRONMENT_IS_NODE=false;var ENVIRONMENT_IS_SHELL=false;ENVIRONMENT_IS_WEB=typeof window==="object";ENVIRONMENT_IS_WORKER=typeof importScripts==="function";ENVIRONMENT_IS_NODE=typeof process==="object"&&typeof process.versions==="object"&&typeof process.versions.node==="string";ENVIRONMENT_IS_SHELL=!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_NODE&&!ENVIRONMENT_IS_WORKER;var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var read_,readAsync,readBinary,setWindowTitle;var nodeFS;var nodePath;if(ENVIRONMENT_IS_NODE){if(ENVIRONMENT_IS_WORKER){scriptDirectory=require("path").dirname(scriptDirectory)+"/"}else{scriptDirectory=__dirname+"/"}read_=function shell_read(filename,binary){var ret=tryParseAsDataURI(filename);if(ret){return binary?ret:ret.toString()}if(!nodeFS)nodeFS=require("fs");if(!nodePath)nodePath=require("path");filename=nodePath["normalize"](filename);return nodeFS["readFileSync"](filename,binary?null:"utf8")};readBinary=function readBinary(filename){var ret=read_(filename,true);if(!ret.buffer){ret=new Uint8Array(ret)}assert(ret.buffer);return ret};if(process["argv"].length>1){thisProgram=process["argv"][1].replace(/\\/g,"/")}arguments_=process["argv"].slice(2);if(typeof module!=="undefined"){module["exports"]=Module}process["on"]("unhandledRejection",abort);quit_=function(status){process["exit"](status)};Module["inspect"]=function(){return"[Emscripten Module object]"}}else if(ENVIRONMENT_IS_SHELL){if(typeof read!="undefined"){read_=function shell_read(f){var data=tryParseAsDataURI(f);if(data){return intArrayToString(data)}return read(f)}}readBinary=function readBinary(f){var data;data=tryParseAsDataURI(f);if(data){return data}if(typeof readbuffer==="function"){return new Uint8Array(readbuffer(f))}data=read(f,"binary");assert(typeof data==="object");return data};if(typeof scriptArgs!="undefined"){arguments_=scriptArgs}else if(typeof arguments!="undefined"){arguments_=arguments}if(typeof quit==="function"){quit_=function(status){quit(status)}}if(typeof print!=="undefined"){if(typeof console==="undefined")console={};console.log=print;console.warn=console.error=typeof printErr!=="undefined"?printErr:print}}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){if(ENVIRONMENT_IS_WORKER){scriptDirectory=self.location.href}else if(document.currentScript){scriptDirectory=document.currentScript.src}if(scriptDirectory.indexOf("blob:")!==0){scriptDirectory=scriptDirectory.substr(0,scriptDirectory.lastIndexOf("/")+1)}else{scriptDirectory=""}{read_=function shell_read(url){try{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.send(null);return xhr.responseText}catch(err){var data=tryParseAsDataURI(url);if(data){return intArrayToString(data)}throw err}};if(ENVIRONMENT_IS_WORKER){readBinary=function readBinary(url){try{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}catch(err){var data=tryParseAsDataURI(url);if(data){return data}throw err}}}readAsync=function readAsync(url,onload,onerror){var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=function xhr_onload(){if(xhr.status==200||xhr.status==0&&xhr.response){onload(xhr.response);return}var data=tryParseAsDataURI(url);if(data){onload(data.buffer);return}onerror()};xhr.onerror=onerror;xhr.send(null)}}setWindowTitle=function(title){document.title=title}}else{}var out=Module["print"]||console.log.bind(console);var err=Module["printErr"]||console.warn.bind(console);for(key in moduleOverrides){if(moduleOverrides.hasOwnProperty(key)){Module[key]=moduleOverrides[key]}}moduleOverrides=null;if(Module["arguments"])arguments_=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["quit"])quit_=Module["quit"];var wasmBinary;if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];var noExitRuntime;if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(typeof WebAssembly!=="object"){abort("no native wasm support detected")}var wasmMemory;var wasmTable;var ABORT=false;var EXITSTATUS=0;function assert(condition,text){if(!condition){abort("Assertion failed: "+text)}}var UTF8Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf8"):undefined;function UTF8ArrayToString(heap,idx,maxBytesToRead){var endIdx=idx+maxBytesToRead;var endPtr=idx;while(heap[endPtr]&&!(endPtr>=endIdx))++endPtr;if(endPtr-idx>16&&heap.subarray&&UTF8Decoder){return UTF8Decoder.decode(heap.subarray(idx,endPtr))}else{var str="";while(idx<endPtr){var u0=heap[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=heap[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=heap[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u0=(u0&7)<<18|u1<<12|u2<<6|heap[idx++]&63}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}}return str}function UTF8ToString(ptr,maxBytesToRead){return ptr?UTF8ArrayToString(HEAPU8,ptr,maxBytesToRead):""}var WASM_PAGE_SIZE=65536;var buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateGlobalBufferAndViews(buf){buffer=buf;Module["HEAP8"]=HEAP8=new Int8Array(buf);Module["HEAP16"]=HEAP16=new Int16Array(buf);Module["HEAP32"]=HEAP32=new Int32Array(buf);Module["HEAPU8"]=HEAPU8=new Uint8Array(buf);Module["HEAPU16"]=HEAPU16=new Uint16Array(buf);Module["HEAPU32"]=HEAPU32=new Uint32Array(buf);Module["HEAPF32"]=HEAPF32=new Float32Array(buf);Module["HEAPF64"]=HEAPF64=new Float64Array(buf)}var INITIAL_INITIAL_MEMORY=Module["INITIAL_MEMORY"]||16777216;if(Module["wasmMemory"]){wasmMemory=Module["wasmMemory"]}else{wasmMemory=new WebAssembly.Memory({"initial":INITIAL_INITIAL_MEMORY/WASM_PAGE_SIZE,"maximum":2147483648/WASM_PAGE_SIZE})}if(wasmMemory){buffer=wasmMemory.buffer}INITIAL_INITIAL_MEMORY=buffer.byteLength;updateGlobalBufferAndViews(buffer);var __ATPRERUN__=[];var __ATINIT__=[];var __ATMAIN__=[];var __ATPOSTRUN__=[];var runtimeInitialized=false;var runtimeExited=false;function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(__ATPRERUN__)}function initRuntime(){runtimeInitialized=true;callRuntimeCallbacks(__ATINIT__)}function preMain(){callRuntimeCallbacks(__ATMAIN__)}function exitRuntime(){runtimeExited=true}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(__ATPOSTRUN__)}function addOnPreRun(cb){__ATPRERUN__.unshift(cb)}function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb)}var runDependencies=0;var runDependencyWatcher=null;var dependenciesFulfilled=null;function addRunDependency(id){runDependencies++;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}}function removeRunDependency(id){runDependencies--;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}if(runDependencies==0){if(runDependencyWatcher!==null){clearInterval(runDependencyWatcher);runDependencyWatcher=null}if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}}Module["preloadedImages"]={};Module["preloadedAudios"]={};function abort(what){if(Module["onAbort"]){Module["onAbort"](what)}what+="";err(what);ABORT=true;EXITSTATUS=1;what="abort("+what+"). Build with -s ASSERTIONS=1 for more info.";var e=new WebAssembly.RuntimeError(what);throw e}function hasPrefix(str,prefix){return String.prototype.startsWith?str.startsWith(prefix):str.indexOf(prefix)===0}var dataURIPrefix="data:application/octet-stream;base64,";function isDataURI(filename){return hasPrefix(filename,dataURIPrefix)}var fileURIPrefix="file://";function isFileURI(filename){return hasPrefix(filename,fileURIPrefix)}var wasmBinaryFile="data:application/octet-stream;base64,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";if(!isDataURI(wasmBinaryFile)){wasmBinaryFile=locateFile(wasmBinaryFile)}function getBinary(){try{if(wasmBinary){return new Uint8Array(wasmBinary)}var binary=tryParseAsDataURI(wasmBinaryFile);if(binary){return binary}if(readBinary){return readBinary(wasmBinaryFile)}else{throw"both async and sync fetching of the wasm failed"}}catch(err){abort(err)}}function getBinaryPromise(){if(!wasmBinary&&(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER)&&typeof fetch==="function"&&!isFileURI(wasmBinaryFile)){return fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(response){if(!response["ok"]){throw"failed to load wasm binary file at '"+wasmBinaryFile+"'"}return response["arrayBuffer"]()}).catch(function(){return getBinary()})}return Promise.resolve().then(getBinary)}function createWasm(){var info={"a":asmLibraryArg};function receiveInstance(instance,module){var exports=instance.exports;Module["asm"]=exports;wasmTable=Module["asm"]["h"];removeRunDependency("wasm-instantiate")}addRunDependency("wasm-instantiate");function receiveInstantiatedSource(output){receiveInstance(output["instance"])}function instantiateArrayBuffer(receiver){return getBinaryPromise().then(function(binary){return WebAssembly.instantiate(binary,info)}).then(receiver,function(reason){err("failed to asynchronously prepare wasm: "+reason);abort(reason)})}function instantiateAsync(){if(!wasmBinary&&typeof WebAssembly.instantiateStreaming==="function"&&!isDataURI(wasmBinaryFile)&&!isFileURI(wasmBinaryFile)&&typeof fetch==="function"){fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(response){var result=WebAssembly.instantiateStreaming(response,info);return result.then(receiveInstantiatedSource,function(reason){err("wasm streaming compile failed: "+reason);err("falling back to ArrayBuffer instantiation");return instantiateArrayBuffer(receiveInstantiatedSource)})})}else{return instantiateArrayBuffer(receiveInstantiatedSource)}}if(Module["instantiateWasm"]){try{var exports=Module["instantiateWasm"](info,receiveInstance);return exports}catch(e){err("Module.instantiateWasm callback failed with error: "+e);return false}}instantiateAsync();return{}}var ASM_CONSTS={1331:function(){return Module.getRandomValue()},1369:function(){if(Module.getRandomValue===undefined){try{var window_="object"===typeof window?window:self;var crypto_=typeof window_.crypto!=="undefined"?window_.crypto:window_.msCrypto;var randomValuesStandard=function(){var buf=new Uint32Array(1);crypto_.getRandomValues(buf);return buf[0]>>>0};randomValuesStandard();Module.getRandomValue=randomValuesStandard}catch(e){try{var crypto=require("crypto");var randomValueNodeJS=function(){var buf=crypto["randomBytes"](4);return(buf[0]<<24|buf[1]<<16|buf[2]<<8|buf[3])>>>0};randomValueNodeJS();Module.getRandomValue=randomValueNodeJS}catch(e){throw"No secure random number generator found"}}}}};function callRuntimeCallbacks(callbacks){while(callbacks.length>0){var callback=callbacks.shift();if(typeof callback=="function"){callback(Module);continue}var func=callback.func;if(typeof func==="number"){if(callback.arg===undefined){wasmTable.get(func)()}else{wasmTable.get(func)(callback.arg)}}else{func(callback.arg===undefined?null:callback.arg)}}}function ___assert_fail(condition,filename,line,func){abort("Assertion failed: "+UTF8ToString(condition)+", at: "+[filename?UTF8ToString(filename):"unknown filename",line,func?UTF8ToString(func):"unknown function"])}function _abort(){abort()}function _emscripten_asm_const_int(code,sigPtr,argbuf){var args=readAsmConstArgs(sigPtr,argbuf);return ASM_CONSTS[code].apply(null,args)}function _emscripten_memcpy_big(dest,src,num){HEAPU8.copyWithin(dest,src,src+num)}var SYSCALLS={mappings:{},buffers:[null,[],[]],printChar:function(stream,curr){var buffer=SYSCALLS.buffers[stream];if(curr===0||curr===10){(stream===1?out:err)(UTF8ArrayToString(buffer,0));buffer.length=0}else{buffer.push(curr)}},varargs:undefined,get:function(){SYSCALLS.varargs+=4;var ret=HEAP32[SYSCALLS.varargs-4>>2];return ret},getStr:function(ptr){var ret=UTF8ToString(ptr);return ret},get64:function(low,high){return low}};function _fd_write(fd,iov,iovcnt,pnum){var num=0;for(var i=0;i<iovcnt;i++){var ptr=HEAP32[iov+i*8>>2];var len=HEAP32[iov+(i*8+4)>>2];for(var j=0;j<len;j++){SYSCALLS.printChar(fd,HEAPU8[ptr+j])}num+=len}HEAP32[pnum>>2]=num;return 0}function setErrNo(value){HEAP32[___errno_location()>>2]=value;return value}function _sysconf(name){switch(name){case 30:return 16384;case 85:var maxHeapSize=2147483648;return maxHeapSize/16384;case 132:case 133:case 12:case 137:case 138:case 15:case 235:case 16:case 17:case 18:case 19:case 20:case 149:case 13:case 10:case 236:case 153:case 9:case 21:case 22:case 159:case 154:case 14:case 77:case 78:case 139:case 80:case 81:case 82:case 68:case 67:case 164:case 11:case 29:case 47:case 48:case 95:case 52:case 51:case 46:case 79:return 200809;case 27:case 246:case 127:case 128:case 23:case 24:case 160:case 161:case 181:case 182:case 242:case 183:case 184:case 243:case 244:case 245:case 165:case 178:case 179:case 49:case 50:case 168:case 169:case 175:case 170:case 171:case 172:case 97:case 76:case 32:case 173:case 35:return-1;case 176:case 177:case 7:case 155:case 8:case 157:case 125:case 126:case 92:case 93:case 129:case 130:case 131:case 94:case 91:return 1;case 74:case 60:case 69:case 70:case 4:return 1024;case 31:case 42:case 72:return 32;case 87:case 26:case 33:return 2147483647;case 34:case 1:return 47839;case 38:case 36:return 99;case 43:case 37:return 2048;case 0:return 2097152;case 3:return 65536;case 28:return 32768;case 44:return 32767;case 75:return 16384;case 39:return 1e3;case 89:return 700;case 71:return 256;case 40:return 255;case 2:return 100;case 180:return 64;case 25:return 20;case 5:return 16;case 6:return 6;case 73:return 4;case 84:{if(typeof navigator==="object")return navigator["hardwareConcurrency"]||1;return 1}}setErrNo(28);return-1}var readAsmConstArgsArray=[];function readAsmConstArgs(sigPtr,buf){readAsmConstArgsArray.length=0;var ch;buf>>=2;while(ch=HEAPU8[sigPtr++]){var double=ch<105;if(double&&buf&1)buf++;readAsmConstArgsArray.push(double?HEAPF64[buf++>>1]:HEAP32[buf]);++buf}return readAsmConstArgsArray}var ASSERTIONS=false;function intArrayToString(array){var ret=[];for(var i=0;i<array.length;i++){var chr=array[i];if(chr>255){if(ASSERTIONS){assert(false,"Character code "+chr+" ("+String.fromCharCode(chr)+")  at offset "+i+" not in 0x00-0xFF.")}chr&=255}ret.push(String.fromCharCode(chr))}return ret.join("")}var decodeBase64=typeof atob==="function"?atob:function(input){var keyStr="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";var output="";var chr1,chr2,chr3;var enc1,enc2,enc3,enc4;var i=0;input=input.replace(/[^A-Za-z0-9\+\/\=]/g,"");do{enc1=keyStr.indexOf(input.charAt(i++));enc2=keyStr.indexOf(input.charAt(i++));enc3=keyStr.indexOf(input.charAt(i++));enc4=keyStr.indexOf(input.charAt(i++));chr1=enc1<<2|enc2>>4;chr2=(enc2&15)<<4|enc3>>2;chr3=(enc3&3)<<6|enc4;output=output+String.fromCharCode(chr1);if(enc3!==64){output=output+String.fromCharCode(chr2)}if(enc4!==64){output=output+String.fromCharCode(chr3)}}while(i<input.length);return output};function intArrayFromBase64(s){if(typeof ENVIRONMENT_IS_NODE==="boolean"&&ENVIRONMENT_IS_NODE){var buf;try{buf=Buffer.from(s,"base64")}catch(_){buf=new Buffer(s,"base64")}return new Uint8Array(buf["buffer"],buf["byteOffset"],buf["byteLength"])}try{var decoded=decodeBase64(s);var bytes=new Uint8Array(decoded.length);for(var i=0;i<decoded.length;++i){bytes[i]=decoded.charCodeAt(i)}return bytes}catch(_){throw new Error("Converting base64 string to bytes failed.")}}function tryParseAsDataURI(filename){if(!isDataURI(filename)){return}return intArrayFromBase64(filename.slice(dataURIPrefix.length))}__ATINIT__.push({func:function(){___wasm_call_ctors()}});var asmLibraryArg={"g":___assert_fail,"f":_abort,"c":_emscripten_asm_const_int,"d":_emscripten_memcpy_big,"b":_fd_write,"a":wasmMemory,"e":_sysconf};var asm=createWasm();var ___wasm_call_ctors=Module["___wasm_call_ctors"]=function(){return(___wasm_call_ctors=Module["___wasm_call_ctors"]=Module["asm"]["i"]).apply(null,arguments)};var _main=Module["_main"]=function(){return(_main=Module["_main"]=Module["asm"]["j"]).apply(null,arguments)};var ___errno_location=Module["___errno_location"]=function(){return(___errno_location=Module["___errno_location"]=Module["asm"]["k"]).apply(null,arguments)};var calledRun;function ExitStatus(status){this.name="ExitStatus";this.message="Program terminated with exit("+status+")";this.status=status}var calledMain=false;dependenciesFulfilled=function runCaller(){if(!calledRun)run();if(!calledRun)dependenciesFulfilled=runCaller};function callMain(args){var entryFunction=Module["_main"];var argc=0;var argv=0;try{var ret=entryFunction(argc,argv);exit(ret,true)}catch(e){if(e instanceof ExitStatus){return}else if(e=="unwind"){noExitRuntime=true;return}else{var toLog=e;if(e&&typeof e==="object"&&e.stack){toLog=[e,e.stack]}err("exception thrown: "+toLog);quit_(1,e)}}finally{calledMain=true}}function run(args){args=args||arguments_;if(runDependencies>0){return}preRun();if(runDependencies>0)return;function doRun(){if(calledRun)return;calledRun=true;Module["calledRun"]=true;if(ABORT)return;initRuntime();preMain();if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();if(shouldRunNow)callMain(args);postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(function(){setTimeout(function(){Module["setStatus"]("")},1);doRun()},1)}else{doRun()}}Module["run"]=run;function exit(status,implicit){if(implicit&&noExitRuntime&&status===0){return}if(noExitRuntime){}else{EXITSTATUS=status;exitRuntime();if(Module["onExit"])Module["onExit"](status);ABORT=true}quit_(status,new ExitStatus(status))}if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()()}}var shouldRunNow=true;if(Module["noInitialRun"])shouldRunNow=false;noExitRuntime=true;run();
