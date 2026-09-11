/** Execute JS in an opaque-origin iframe; its worker inherits a restrictive CSP. */
export function javascriptSandbox(code: string) {
  const workerSource = `const send=self.postMessage.bind(self);console.log=(...args)=>send(args.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '));console.error=console.log;try{${code}\n}catch(e){console.log(e.message)};send({done:true});`;
  const script = `const source=${JSON.stringify(workerSource).replaceAll('<', '\\u003c')};const u=URL.createObjectURL(new Blob([source],{type:'application/javascript'}));const worker=new Worker(u);URL.revokeObjectURL(u);let count=0;worker.onmessage=e=>{if(++count<102)parent.postMessage({lab:true,result:e.data},'*')};worker.onerror=e=>parent.postMessage({lab:true,result:e.message},'*');setTimeout(()=>{worker.terminate();parent.postMessage({lab:true,result:{done:true}},'*')},2000);`;
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; connect-src 'none'; form-action 'none'; base-uri 'none'"><script>${script}<\/script>`;
}
