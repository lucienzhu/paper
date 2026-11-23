import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import { ChatError } from './design-chat.mjs';

export const imageModel = 'MiniMax-H3-Image';
export const qwenModel = 'Qwen-Image-2.1';
// 与第 4 章 E3 设计通路已归档的请求是同一套工作流和设置（experiments/e3-quad-qwen/requests/*.request.json）。
export const comfyDefaults = { unet:'qwen_image_2.1_bf16.safetensors', clip:'qwen3vl_8b_bf16.safetensors', vae:'qwen_image_2.1_vae_bf16.safetensors',
  steps:40, cfg:3, sampler_name:'euler', scheduler:'simple',
  negative_prompt:'flat schematic, line drawing, collage, text, labels, logo, cropped rotor, disconnected arm, extra rotor, perspective camera' };
// 不带图的自由提示与 E1 纯文字组已归档的请求同构（evidence/e1-open-20261112/E1-actual/E1-text-*/request.json）：编码器只接文字，不接 VAE。
export function comfyGraph(id, prompt, seed, imageNames, s=comfyDefaults) {
  const encoder={clip:['2',0],...(imageNames.length ? {vae:['3',0]} : {}),prompt,negative_prompt:s.negative_prompt,resolution:1024};
  const graph={
    '1':{class_type:'UNETLoader',inputs:{unet_name:s.unet,weight_dtype:'default'}},
    '2':{class_type:'CLIPLoader',inputs:{clip_name:s.clip,type:'qwen_image',device:'default'}},
    '3':{class_type:'VAELoader',inputs:{vae_name:s.vae}},
    '4':{class_type:'TextEncodeQwenImage21',inputs:encoder},
    '10':{class_type:'KSampler',inputs:{model:['1',0],positive:['4',0],negative:['4',1],latent_image:['4',2],
      seed,steps:s.steps,cfg:s.cfg,sampler_name:s.sampler_name,scheduler:s.scheduler,denoise:1}},
    '11':{class_type:'VAEDecode',inputs:{samples:['10',0],vae:['3',0]}},
    '12':{class_type:'SaveImage',inputs:{images:['11',0],filename_prefix:'studio-'+id}},
  };
  imageNames.forEach((name,index)=>{ const node=String(15+index); graph[node]={class_type:'LoadImage',inputs:{image:name}}; encoder['images.image_'+(index+1)]=[node,0]; });
  return graph;
}
// 同一轮次重交时种子不变：取轮次编号摘要的前 32 位。
export const seedOf = id => parseInt(sha(id).slice(0,8),16);
const origins = { global:'https://api.minimax.io', cn:'https://api.minimaxi.com' };
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const dataHeader = 'data:image/png;base64,';
const signature = Buffer.from('89504e470d0a1a0a','hex');
const fail = (code,message) => { throw new ChatError(code,'image_job_error',message); };
function checkedPng(bytes, inbound) {
  if (bytes.length < 33 || !bytes.subarray(0,8).equals(signature) || bytes.toString('ascii',12,16)!=='IHDR') return false;
  const w=bytes.readUInt32BE(16), h=bytes.readUInt32BE(20);
  return inbound ? Math.min(w,h)>=128 && Math.max(w,h)<=8192 && Math.max(w,h)/Math.min(w,h)<=4 : w===1024 && h===1024;
}
// 两种方式共用同一个入口。结构化：布局条件图在前，可再带一张父图或参考图。自由提示：只有设计者的原文，可带一张父图或参考图，不带布局条件图。
function validate(request) {
  const {attemptId,prompt,inputs}=request ?? {};
  if (![undefined,'structured','free'].includes(request?.condition)) fail(400,'图像请求的生成方式无法识别。');
  const free=request.condition==='free';
  if (typeof attemptId!=='string' || !uuid.test(attemptId) || typeof prompt!=='string' || !prompt.trim() ||
      prompt.length>32000 || !Array.isArray(inputs) || !(free ? [0,1] : [1,2]).includes(inputs.length)) fail(400,free ? '自由提示请求缺少文字，或带了多余的图。' : '图像请求缺少本轮目标或布局图。');
  const references=inputs.map((input,i)=>{
    if (input?.role!==(!free && i===0?'layout':'parent') || typeof input.dataUrl!=='string' || !input.dataUrl.startsWith(dataHeader) ||
        !/^[a-f\d]{64}$/.test(input.sha256)) fail(400,'参考图格式或顺序与本轮规格不符。');
    const bytes=Buffer.from(input.dataUrl.slice(dataHeader.length),'base64');
    if(!checkedPng(bytes,true) || sha(bytes)!==input.sha256) fail(400,'参考图的尺寸、格式或内容摘要校验失败。');
    return {role:input.role, sha256:input.sha256, dataUrl:input.dataUrl};
  });
  return {attemptId,prompt,references,free};
}

function providerMessage(status, code, detail) {
  if (status===402 || String(code)==='1008' || /insufficient balance/i.test(detail)) return 'MiniMax 账户图像 API 余额不足。';
  if ([401,403].includes(status) || ['1004','2049'].includes(String(code)) || /not support|not authorized|permission/i.test(detail) && /plan|auth|model/i.test(detail))
    return 'MiniMax 未授权此密钥调用 H3 Image。请核对密钥区域和图像模型权限。';
  if(status===429) return 'MiniMax 当前达到调用限额，请稍后开启新一轮。';
  return 'MiniMax 未完成本轮图像生成。' + (detail ? ' '+String(detail).replace(/sk-[\w-]+|Bearer\s+\S+|https?:\/\/\S+/gi,'[已隐藏]').slice(0,280) : '');
}

/**
 * 用临时文件替换记录。Windows 上目标文件正被读取（工作台每隔一两秒查一次进度）或被杀毒软件打开时，
 * rename 会报 EPERM、EACCES 或 EBUSY；这时稍等再试，最多约 6 秒，不把这一轮卡在“等待回图”。
 */
export async function replaceFile(tmp, target, attempts = 30) {
  for (let i = 0; ; i++) {
    try { await rename(tmp, target); return; }
    catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || i >= attempts - 1) { await unlink(tmp).catch(() => {}); throw error; }
      await new Promise(resolve => setTimeout(resolve, Math.min(400, 20 * (i + 1))));
    }
  }
}

// The provider edits endpoint is synchronous and non-idempotent. Reserve a durable local job before calling it.
// fixture: true 表示后端由软件夹具冒充，只在标签上写明，其余流程不变。
export function createImageJobs({apiKey,region='global',fetchImpl=globalThis.fetch,backend,fixture=false,
  directory=path.join(process.env.LOCALAPPDATA || homedir(),'Freeloop','multirotor-workbench','image-jobs')}={}) {
  if (!Object.hasOwn(origins,region)) throw new Error('图像服务区域设置无效。');
  // backend 为 {provider:'qwen-comfy', url} 时走本机 ComfyUI 上的 Qwen；否则走 MiniMax H3（开发用）。
  const comfy=backend?.provider==='qwen-comfy' ? {...comfyDefaults,...Object.fromEntries(Object.entries(backend).filter(([,v])=>v!==undefined && v!==''))} : null;
  const ident=comfy ? {provider:'qwen-comfy',model:qwenModel} : {provider:'minimax',model:imageModel};
  const baseRecord=id=>({attemptId:id,jobId:id,...ident});
  // 软件夹具冒充后端接口时，标签直说不出真图，免得把走查截图当成真实回图。
  const realLabel=comfy ? 'Qwen-Image 2.1（本机 ComfyUI）' : 'MiniMax H3 Image';
  const describe=()=>({...ident,endpoint:comfy ? '/prompt' : '/v1/images/edits',label:fixture ? '软件夹具（接口同 '+realLabel.replace(/（.*?）/,'')+'，不出真图）' : realLabel,
    configured:comfy ? !!comfy.url : !!apiKey,...(fixture ? {fixture:true} : {})});
  const active=new Map();
  const filename=id=>path.join(directory,id+'.json');
  const read=async id=>{
    try {return JSON.parse(await readFile(filename(id),'utf8'));}
    catch(e){if(e.code==='ENOENT') return null;throw e;}
  };
  async function save(record) {
    const tmp=filename(record.jobId)+'.'+randomUUID()+'.tmp';
    await writeFile(tmp,JSON.stringify(record),{mode:0o600});
    await replaceFile(tmp,filename(record.jobId));
  }
  // ---------- Qwen（ComfyUI）：上传与入队、等远端跑完、取回原图 ----------
  // 4.3：入队以后连不上（断网、本机服务重启、超过等待时限）都不算失败，记成“待核对”（unconfirmed），之后按原 prompt_id 取回；
  // 只有远端明确拒收（HTTP 4xx、节点错误）或报告运行失败时才记失败。每轮只入队一次：入队请求发出后没收到回执时，
  // 先按 prompt_id 和 client_id 在 ComfyUI 的队列与历史里找，找到就接着等，确实不在才重新入队。
  class Offline extends Error {}
  class Lost extends Offline {}
  class Refused extends Error {}
  const base=()=>String(comfy.url).replace(/\/+$/,'');
  const reach=async(route,init={})=>{
    try { return await fetchImpl(base()+route,{redirect:'error',signal:AbortSignal.timeout(60000),...init}); }
    catch(e){ throw new Offline(e?.name==='TimeoutError' ? '等 Qwen 服务回应超时' : '连不上 Qwen 服务'); }
  };
  const file=(id,suffix)=>path.join(directory,id+suffix);
  /** ComfyUI 拒收时的回答：错误类型、出错的节点和原因（例如缺哪个权重文件），整理成一句话，原文另存。 */
  function refusal(status,text){
    let body=null; try { body=JSON.parse(text); } catch { /* 不是 JSON 就只报状态 */ }
    const nodes=Object.entries(body?.node_errors ?? {}).flatMap(([node,v])=>(v?.errors ?? []).map(e=>`节点 ${node} ${v.class_type ?? ''}：${e.message ?? e.type ?? ''}${e.details ? '：'+e.details : ''}`));
    const head=body?.error?.message || body?.error?.type || (typeof body?.error==='string' ? body.error : '');
    const detail=[head,...nodes].filter(Boolean).join('；').replace(/https?:\/\/\S+/g,'[已隐藏]').slice(0,420);
    return `Qwen 服务拒收了这一轮（HTTP ${status}）`+(detail ? '：'+detail : '。原始回答已保存。');
  }
  async function saveInputs(record, refs) {
    for (const [i,ref] of refs.entries()) await writeFile(file(record.jobId,`.input-${i+1}-${ref.role}.png`),Buffer.from(ref.dataUrl.slice(dataHeader.length),'base64'),{mode:0o600});
  }
  async function loadInputs(record) {
    const images=record.evidence?.request?.images ?? [];
    return Promise.all(images.map(async (image,i)=>{
      const bytes=await readFile(file(record.jobId,`.input-${i+1}-${image.role}.png`));
      if(sha(bytes)!==image.sha256) throw new Refused('本机存的输入图与这一轮的摘要不符，不能重新入队。');
      return {role:image.role,sha256:image.sha256,dataUrl:dataHeader+bytes.toString('base64')};
    }));
  }
  /** 入队回执丢了的时候：这一轮是不是已经在 ComfyUI 的队列或历史里。 */
  async function lookup(record) {
    const mine=item=>Array.isArray(item) && (item[1]===record.jobId || item[1]===record.comfy?.promptId || item[3]?.client_id==='studio-'+record.jobId);
    const queue=await reach('/queue');
    if(!queue.ok) throw new Offline('Qwen 服务查询队列时返回 HTTP '+queue.status);
    const q=await queue.json();
    const queued=[...(q.queue_running ?? []),...(q.queue_pending ?? [])].find(mine);
    if(queued) return {promptId:queued[1],number:queued[0],where:'queue'};
    const history=await reach('/history?max_items=200');
    if(!history.ok) throw new Offline('Qwen 服务查询历史时返回 HTTP '+history.status);
    const done=Object.entries(await history.json()).find(([,v])=>mine(v?.prompt));
    return done ? {promptId:done[0],number:done[1].prompt?.[0] ?? null,where:'history'} : null;
  }
  async function enqueue(record, refs) {
    const names=[];
    for (const ref of refs) {
      const form=new FormData();
      form.append('image',new Blob([Buffer.from(ref.dataUrl.slice(dataHeader.length),'base64')],{type:'image/png'}),'studio-'+ref.sha256+'.png');
      form.append('type','input'); form.append('overwrite','true');
      const res=await reach('/upload/image',{method:'POST',body:form});
      const text=await res.text();
      if(!res.ok){ await writeFile(file(record.jobId,'.comfy-error.json'),text,{mode:0o600}); throw new Refused(refusal(res.status,text).replace('拒收了这一轮','没有接收输入图')); }
      let up; try { up=JSON.parse(text); } catch { up=null; }
      if(typeof up?.name!=='string' || !up.name) throw new Refused('Qwen 服务没有返回输入图的名称。');
      names.push([up.subfolder,up.name].filter(Boolean).join('/'));
    }
    // 实际发出的请求、入队回执和运行历史原样存盘，供主持人登记场次时使用。prompt_id 由工作台给定（ComfyUI 支持时沿用），回执丢了也知道该找哪一个。
    const body=JSON.stringify({client_id:'studio-'+record.jobId,prompt_id:record.jobId,prompt:comfyGraph(record.jobId,record.evidence.request.prompt,record.evidence.request.seed,names,comfy)});
    await writeFile(file(record.jobId,'.comfy-request.json'),body,{mode:0o600});
    // 实际发给模型的文字另存一份纯文本（不加换行），主持人登记时直接引用。自由提示这一份就是设计者的原文。
    await writeFile(file(record.jobId,'.prompt.txt'),record.evidence.request.prompt,{mode:0o600});
    record.comfy={...record.comfy,clientId:'studio-'+record.jobId,enqueueRequests:(record.comfy?.enqueueRequests ?? 0)+1,enqueueSentAt:new Date().toISOString(),inputNames:names};
    await save(record);
    const res=await reach('/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body});
    const text=await res.text();
    if(!res.ok){ await writeFile(file(record.jobId,'.comfy-error.json'),text,{mode:0o600}); throw new Refused(refusal(res.status,text)); }
    await writeFile(file(record.jobId,'.comfy-ack.json'),text,{mode:0o600});
    let ack; try { ack=JSON.parse(text); } catch { ack=null; }
    if(typeof ack?.prompt_id!=='string' || !ack.prompt_id || Object.keys(ack.node_errors ?? {}).length){
      await writeFile(file(record.jobId,'.comfy-error.json'),text,{mode:0o600});
      throw new Refused(Object.keys(ack?.node_errors ?? {}).length ? refusal(200,text) : 'Qwen 服务未确认入队。请核对工作流节点和权重文件名。');
    }
    adopt(record,{promptId:ack.prompt_id,number:ack.number ?? null,where:'ack'},sha(body));
    await save(record);
  }
  function adopt(record,found,requestSha256){
    record.comfy={...record.comfy,promptId:found.promptId,number:found.number,enqueuedAt:record.comfy?.enqueuedAt ?? new Date().toISOString(),foundBy:found.where};
    record.evidence.response={...record.evidence.response,httpStatus:200,traceId:found.promptId,
      ...(requestSha256 ? {requestSha256} : {}),inputNames:record.comfy.inputNames ?? record.evidence.response?.inputNames ?? []};
  }
  async function waitRemote(record) {
    const id=record.comfy.promptId, deadline=Date.now()+(comfy.timeoutMs ?? 600000);
    for(let polls=1; Date.now()<deadline; polls++) {
      const res=await reach('/history/'+encodeURIComponent(id));
      if(!res.ok) throw new Offline('Qwen 服务查询进度时返回 HTTP '+res.status);
      const text=await res.text(), run=JSON.parse(text)[id];
      record.comfy.lastCheckAt=new Date().toISOString();
      if(run && (run.status?.completed || ['error','interrupted'].includes(run.status?.status_str))) return {run,text};
      // 隔一阵看一眼队列：历史里没有、队列里也没有，说明远端丢了这一轮（例如 GPU 主机重启）。不自动重新入队。
      if(polls%15===0 && !(await lookup(record))) throw new Lost('ComfyUI 的队列和历史里都找不到这一轮（GPU 主机可能重启过）。可以放弃这一轮，或者另开一轮。');
      await new Promise(resolve=>setTimeout(resolve,comfy.pollMs ?? 2000));
    }
    throw new Offline('等待时限内这一轮还没有跑完（远端可能仍在排队或运行）');
  }
  async function collect(record, run, historyText) {
    await writeFile(file(record.jobId,'.comfy-history.json'),historyText,{mode:0o600});
    const stamp=kind=>run.status?.messages?.find(m=>m[0]===kind)?.[1]?.timestamp;
    const started=stamp('execution_start'), ended=stamp('execution_success') ?? stamp('execution_error') ?? stamp('execution_interrupted');
    // ComfyUI 历史里的时间戳是 GPU 主机的钟，单独记，不和本机的钟混算。
    record.comfy={...record.comfy,executionStart:Number.isFinite(started) ? new Date(started).toISOString() : null,executionEnd:Number.isFinite(ended) ? new Date(ended).toISOString() : null};
    if(run.status?.status_str!=='success'){
      const err=run.status?.messages?.find(m=>m[0]==='execution_error')?.[1];
      throw new Refused('Qwen 服务报告本轮运行失败（'+(run.status?.status_str ?? '未知')+'）'+(err ? '：'+[err.node_type,err.exception_type,err.exception_message].filter(Boolean).join('：').slice(0,300) : '。原始记录已保存。'));
    }
    const images=Object.values(run.outputs ?? {}).flatMap(node=>node.images ?? []).filter(item=>item.type==='output');
    if(images.length!==1) throw new Refused('Qwen 服务返回了 '+images.length+' 张图，本轮只请求一张。');
    const query=new URLSearchParams({filename:images[0].filename,subfolder:images[0].subfolder ?? '',type:'output'});
    const view=await reach('/view?'+query);
    if(!view.ok) throw new Offline('Qwen 服务取图时返回 HTTP '+view.status);
    const png=Buffer.from(await view.arrayBuffer());
    if(!checkedPng(png,false)) throw new Refused('Qwen 回图未通过 1024 × 1024 PNG 校验。');
    const hash=sha(png), name='QWEN-'+record.jobId+'.png';
    await writeFile(path.join(directory,name),png,{mode:0o600});
    // 主持人的登记工具要求回图以后端报告的原文件名附上，所以按原名再存一份（文件名里带轮次编号，不会相互覆盖）。
    const original=path.basename(String(images[0].filename));
    if(/^[\w.-]+\.png$/i.test(original) && original!==name) await writeFile(path.join(directory,original),png,{mode:0o600});
    record.outputs=[{name,mimeType:'image/png',sha256:hash}];
    record.comfy.outputOriginalName=original;
    record.comfy.downloadedAt=new Date().toISOString();
    Object.assign(record.evidence.response,{outputHashes:[hash],outputName:images[0].filename});
  }
  async function executeComfy(record, refs) {
    try {
      if(!record.comfy?.promptId){
        // 上一次的入队请求发出去了却没收到回执：先找，找不到才重新入队。
        const found=record.comfy?.enqueueSentAt ? await lookup(record) : null;
        if(found){ adopt(record,found); await save(record); }
        else await enqueue(record,refs);
      }
      const {run,text}=await waitRemote(record);
      await collect(record,run,text);
      record.status='succeeded'; delete record.pending;
      record.completedAt=new Date().toISOString();
    } catch(err) {
      if(err instanceof Offline){
        // 结果还不知道：不记失败。记下从什么时候、因为什么在等核对，接上以后按原作业取回。
        const enqueued=!!record.comfy?.promptId;
        record.status='unconfirmed';
        record.pending={...record.pending,since:record.pending?.since ?? new Date().toISOString(),lastTryAt:new Date().toISOString(),reason:err.message,
          promptId:record.comfy?.promptId ?? null,enqueue:enqueued ? 'confirmed' : record.comfy?.enqueueSentAt ? 'unknown' : 'not-sent',lost:err instanceof Lost};
      } else {
        record.status='failed'; delete record.pending;
        record.error=err instanceof Refused ? err.message : '处理 Qwen 回执时出错，已保留本轮记录。';
        record.completedAt=new Date().toISOString();
      }
    }
    await save(record);
  }
  async function execute(record, refs) {
    if(comfy) return executeComfy(record,refs);
    const req=record.evidence.request;
    const {prompt,model,size,n,response_format,output_format}=req;
    try {
      const response=await fetchImpl(origins[region]+'/v1/images/edits',{
        method:'POST', redirect:'error',signal:AbortSignal.timeout(600000),
        headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
        body:JSON.stringify({prompt,model,size,n,response_format,output_format,images:refs.map(r=>({image_url:r.dataUrl}))}),
      });
      const data=await response.json().catch(()=>({}));
      const code=data.base_resp?.status_code ?? data.error?.code ?? data.data?.[0]?.error?.code;
      const traceId=(response.headers.get('trace-id') || response.headers.get('x-request-id') || data.request_id || data.id || '').toString().slice(0,160);
      const detail=data.error?.message || data.base_resp?.status_msg || data.data?.[0]?.error?.message || '';
      record.evidence.response={httpStatus:response.status,traceId,code:code ?? null,created:data.created ?? null,
        outputFormat:data.output_format ?? null,size:data.data?.[0]?.size ?? null,
        revisedPrompt:typeof data.data?.[0]?.revised_prompt==='string' ? data.data[0].revised_prompt : null};
      if (!response.ok || (code!=null && Number(code)!==0) || data.data?.[0]?.error || data.error) {
        throw new Error(providerMessage(response.status,code,detail));
      }
      const item=data.data?.[0];
      if(!item || data.data.length!==1 || typeof item.b64_json!=='string' || item.b64_json.length>32*1024*1024)
        throw new Error('MiniMax 回执未包含本轮请求的单张 PNG 原图。');
      const png=Buffer.from(item.b64_json,'base64');
      if (!checkedPng(png,false)) throw new Error('MiniMax 回图未通过 1024 × 1024 PNG 校验。');
      const hash=sha(png), name='H3-'+record.jobId+'.png';
      await writeFile(path.join(directory,name),png,{mode:0o600});
      record.outputs=[{name,mimeType:'image/png',sha256:hash}];
      record.evidence.response.outputHashes=[hash];
      record.status='succeeded';
    } catch(err) {
      record.status='failed';
      record.error=record.evidence.response ? err.message : '未收到 MiniMax 完整回执，已保留本轮记录。';
    }
    record.completedAt=new Date().toISOString();
    await save(record);
  }
  async function submit(raw) {
    const {attemptId,prompt,references,free}=validate(raw);
    // MiniMax 的接口是改图接口，必须带图。它只作开发用，不为它另接一个文生图接口。
    if(free && !comfy && !references.length) fail(400,'开发用的 MiniMax 后端不接受不带图的自由提示。请用 Qwen 后端启动工作台。');
    const hashes=references.map(x=>x.sha256);
    const images=references.map(({role,sha256})=>({role,sha256}));
    // 两种方式的模型、画幅、步数、引导强度、采样器、负向词和种子规则完全相同；差别只在发什么文字、带不带布局条件图。
    const request=comfy ? {model:qwenModel,prompt,size:'1024x1024',n:1,output_format:'png',endpoint:'/prompt',seed:seedOf(attemptId),
        steps:comfy.steps,cfg:comfy.cfg,sampler_name:comfy.sampler_name,scheduler:comfy.scheduler,negative_prompt:comfy.negative_prompt,
        weights:{unet:comfy.unet,clip:comfy.clip,vae:comfy.vae},images,...(free ? {condition:'free'} : {})}
      : {model:imageModel,prompt,size:'1024x1024',n:1,response_format:'b64_json',output_format:'png',endpoint:'/v1/images/edits',images,...(free ? {condition:'free'} : {})};
    const fingerprint=sha(JSON.stringify(request));
    await mkdir(directory,{recursive:true,mode:0o700});
    const record={...baseRecord(attemptId),status:'running',inputHashes:hashes,fingerprint,ownerPid:process.pid,startedAt:new Date().toISOString(),evidence:{request}};
    // A unique staging file plus a hard link publishes the complete reservation atomically, even to a second process.
    const stage=filename(attemptId)+'.'+randomUUID()+'.claim';
    await writeFile(stage,JSON.stringify(record),{mode:0o600});
    let claimed=false;
    try {await link(stage,filename(attemptId));claimed=true;}
    catch(e){if(e.code!=='EEXIST') throw e;}
    finally {await unlink(stage);}
    if(!claimed){
      const old=await read(attemptId);
      if(old?.fingerprint!==fingerprint)fail(409,'同一轮次编号已经用于另一组设计输入。');
    } else if (comfy ? !comfy.url : !apiKey) {
      record.status='failed';record.error=comfy ? '尚未配置 Qwen 图像服务地址。' : '尚未配置 MiniMax 图像服务凭据。';await save(record);
    } else {
      // 输入图另存一份：待核对之后要重新入队（回执确实丢了、队列里也没有）时，服务重启过也拿得到原件。
      // 先登记到 active 再等存盘，免得这段时间里的查询以为没人在管这一轮。
      const work=(async()=>{ if(comfy) await saveInputs(record,references); await execute(record,references); })()
        .catch(err=>console.error('保存图像回执失败',err.code || err.name)).finally(()=>active.delete(attemptId));
      active.set(attemptId,work);
    }
    return baseRecord(attemptId);
  }
  const alive=pid=>{ if(pid===process.pid) return true; if(!Number.isSafeInteger(pid)) return false; try { process.kill(pid,0); return true; } catch { return false; } };
  /**
   * 接着取回一轮：只查 ComfyUI（按原 prompt_id；回执丢了就先在队列和历史里找），不会再入队一次已经入队的轮次。
   * force：设计者点了“取回”，不等节流。另一个仍在运行的服务进程在管这一轮时不抢。
   */
  async function resume(id,{force=false}={}) {
    if(!uuid.test(id))fail(400,'轮次编号格式不正确。');
    const record=await read(id);
    if(!record)fail(404,'未找到这次图像生成记录。');
    if(!comfy || ['succeeded','failed'].includes(record.status)) return false;
    if(record.status==='running' && record.ownerPid!==process.pid && alive(record.ownerPid)) return false;
    // 远端已经找不到这一轮（GPU 主机重启过）时不自动重试，等设计者或主持人决定；点了“取回”才再查一次。
    if(!force && record.status==='unconfirmed' && (record.pending?.lost || Date.now()-Date.parse(record.pending?.lastTryAt ?? 0)<3000)) return false;
    // 最后一个 await 之后才查 active 并登记：同时来的两次查询只会有一次接手。
    if(active.has(id)) return false;
    const work=(async()=>{
      record.ownerPid=process.pid; record.status='running';
      record.pending={...record.pending,lastTryAt:new Date().toISOString(),resumes:(record.pending?.resumes ?? 0)+1,lost:false};
      await save(record);
      let refs=[];
      try { refs=record.comfy?.promptId ? [] : await loadInputs(record); }
      catch(e){ record.status='failed'; record.error=e.message; record.completedAt=new Date().toISOString(); await save(record); return; }
      await executeComfy(record,refs);
    })().catch(err=>console.error('取回图像回执失败',err.code || err.name)).finally(()=>active.delete(id));
    active.set(id,work);
    return true;
  }
  /** 这一轮在服务端留下的原件：记录、实发请求、实发文字、入队回执、运行历史、拒收时的回答、输入图和原图。缺的单列。 */
  async function files(id) {
    if(!uuid.test(id))fail(400,'轮次编号格式不正确。');
    const record=await read(id);
    if(!record)fail(404,'未找到这次图像生成记录。');
    const wanted=[['job.json',id+'.json',true]];
    if(record.provider==='qwen-comfy'){
      const sent=!!record.comfy?.enqueueSentAt, refused=record.status==='failed' && !record.comfy?.promptId;
      wanted.push(['comfy-request.json',id+'.comfy-request.json',sent],['prompt.txt',id+'.prompt.txt',sent],
        ['comfy-ack.json',id+'.comfy-ack.json',!!record.comfy?.promptId],
        ['comfy-history.json',id+'.comfy-history.json',record.status==='succeeded' || (record.status==='failed' && !!record.comfy?.promptId)],
        ['comfy-error.json',id+'.comfy-error.json',refused]);
      for(const [i,image] of (record.evidence?.request?.images ?? []).entries()) wanted.push([`input-${i+1}-${image.role}.png`,`${id}.input-${i+1}-${image.role}.png`,true]);
      if(record.comfy?.outputOriginalName && record.comfy.outputOriginalName!=='QWEN-'+id+'.png') wanted.push(['原名-'+record.comfy.outputOriginalName,record.comfy.outputOriginalName,record.status==='succeeded']);
    }
    for(const out of record.outputs ?? []) wanted.push([out.name,out.name,true]);
    const found=[], missing=[];
    for(const [name,disk,expected] of wanted){
      try {
        const info=await stat(path.join(directory,disk));
        if(!info.isFile()) throw new Error();
        const bytes=await readFile(path.join(directory,disk));
        found.push({name,bytes:bytes.length,sha256:sha(bytes),base64:bytes.toString('base64')});
      } catch { if(expected) missing.push(name); }
    }
    const notes=[];
    if(record.comfy?.foundBy && record.comfy.foundBy!=='ack') notes.push(`入队回执没有收到；作业号 ${record.comfy.promptId} 是在 ComfyUI 的${record.comfy.foundBy==='queue' ? '队列' : '历史'}里按本轮编号找到的。`);
    if((record.comfy?.enqueueRequests ?? 0)>1) notes.push(`这一轮发过 ${record.comfy.enqueueRequests} 次入队请求（前一次确认没有进入队列后才重发）。`);
    if(record.status==='unconfirmed') notes.push('导出时这一轮仍在等核对：'+(record.pending?.reason ?? '')+'。');
    return {attemptId:id,status:record.status,comfy:record.comfy ?? null,pending:record.pending ?? null,files:found,missing,notes};
  }
  async function get(id) {
    if(!uuid.test(id))fail(400,'轮次编号格式不正确。');
    let record=await read(id);
    if(!record)fail(404,'未找到这次图像生成记录。');
    // Qwen：管这一轮的服务进程已经不在（重启过），或者这一轮在等核对，就按原 prompt_id 接着取回，不再报失败、不再入队。
    if(comfy && !active.has(id) && ((record.status==='running' && (!alive(record.ownerPid) || record.ownerPid===process.pid)) || record.status==='unconfirmed')) {
      if(await resume(id)) record=await read(id);
    }
    const {fingerprint,ownerPid,...visible}=record;
    const ownerAlive=alive(ownerPid);
    // MiniMax 的改图接口不能重放：服务在收到回执前重启，这一轮只能记为未完成。
    if(!comfy && visible.status==='running' && (!ownerAlive || Date.now()-Date.parse(record.startedAt)>630000)){
      visible.status='failed';visible.error='工作台服务在收到完整回执前重启。请核对该轮服务记录，当前请求已保留。';
    }
    if(visible.outputs)visible.outputs=await Promise.all(visible.outputs.map(async file=>({...file,dataUrl:dataHeader+(await readFile(path.join(directory,file.name))).toString('base64')})));
    return visible;
  }
  return {submit,get,resume,files,describe};
}
