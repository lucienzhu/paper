import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import { ChatError } from './design-chat.mjs';

export const qwenModel = 'Qwen-Image-2.1';
// 与第 4 章 E3 设计通路已归档的请求是同一套工作流和设置（experiments/e3-quad-qwen/requests/*.request.json）。
// 4.5.2：负向词全研究统一（作者 2026-11-26 把细节交给 Claude 定）。工作台原有的 10 个词，加 5 个桨叶词；不加相机位置词（那是设计选择）。
// 各批 GPU 请求用的也是这一份：experiments/workbench-graph 按本函数生成并逐份核对。
export const comfyDefaults = { unet:'qwen_image_2.1_bf16.safetensors', clip:'qwen3vl_8b_bf16.safetensors', vae:'qwen_image_2.1_vae_bf16.safetensors',
  steps:40, cfg:3, sampler_name:'euler', scheduler:'simple',
  negative_prompt:'flat schematic, line drawing, collage, text, labels, logo, cropped rotor, disconnected arm, extra rotor, perspective camera, '
    +'V-shaped propeller, blades at an acute angle, single-blade propeller, missing blade, unequal blades' };
// 4.6：装相机的任务（日常航拍四旋）另加 4 个只压相机伪影的词：朝上的镜片、长颈、立柱。它们不限定相机装在哪。
// 真机开发小批（experiments/20261126-camera-dev）：没有这 4 个词时基准的相机 4 张里 3 张外突；加上并用 v1.6 的内嵌原句后 4/4 内嵌。
// 农业植保六旋不装相机，不带这几个词（圆形加注口不能被当成镜片压掉；出图防错清单第 5 条）。
export const cameraNegative = 'camera lens visible from above, upward-facing lens, camera on a neck or stalk, camera on a post';
export const negativeFor = (task, base=comfyDefaults.negative_prompt) => task==='hexa' ? base : base+', '+cameraNegative;
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
  // 4.6：任务决定负向词用哪一份。没写的（4.6 以前留下、还没发出的轮次）按四旋算。
  if (![undefined,'quad','hexa'].includes(request?.task)) fail(400,'图像请求的任务无法识别。');
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
  return {attemptId,prompt,references,free,task:request.task ?? 'quad'};
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

// 出图只接本机 ComfyUI 上的 Qwen-Image 2.1（4.5：作者 2026-11-26 定研究控制变量，文字模型 MiniMax、出图模型 Qwen；原先开发用的托管出图后端已去掉）。
// 发图前先在本机落一份作业记录，再入队。fixture: true 表示后端由软件夹具冒充，只在标签上写明，其余流程不变。
export function createImageJobs({fetchImpl=globalThis.fetch,backend={provider:'qwen-comfy'},fixture=false,
  directory=path.join(process.env.LOCALAPPDATA || homedir(),'Freeloop','multirotor-workbench','image-jobs')}={}) {
  if (backend?.provider!=='qwen-comfy') throw new Error('出图后端只能是本机 ComfyUI 上的 Qwen-Image 2.1。');
  const comfy={...comfyDefaults,...Object.fromEntries(Object.entries(backend).filter(([,v])=>v!==undefined && v!==''))};
  const ident={provider:'qwen-comfy',model:qwenModel};
  const baseRecord=id=>({attemptId:id,jobId:id,...ident,...(fixture ? {fixture:true} : {})});
  // 软件夹具冒充后端接口时，标签直说不出真图，免得把走查截图当成真实回图。
  const realLabel='Qwen-Image 2.1（本机 ComfyUI）';
  const describe=()=>({...ident,endpoint:'/prompt',label:fixture ? '软件夹具（接口同 '+realLabel.replace(/（.*?）/,'')+'，不出真图）' : realLabel,
    configured:!!comfy.url,...(fixture ? {fixture:true} : {})});
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
  // 只有远端明确拒收（HTTP 4xx、节点错误）或报告运行失败时才记失败。
  // 4.3.1（GPT 复测）：每轮只发一次入队请求。请求发出后没有收到完整回执（连接断了、超时、代理回 5xx、正文传到一半断了），
  // 进没进队列都不知道：记“待确认入队”，只按本轮编号在 ComfyUI 的队列和历史里找，找到就接着等、取回原图，找不到也不重发，
  // 过了时限停下来等人决定。只有连接根本没建立（服务没开）时才确定没有发出，接上以后照常发出。
  class Offline extends Error {}
  class Lost extends Offline {}
  class Refused extends Error {}
  const base=()=>String(comfy.url).replace(/\/+$/,'');
  // 连接还没建立就失败（服务没开、地址解析不了、连不上主机）：请求一个字节也没有发出去。其余（发出后断开、超时）都不能确定对方收没收到。
  const unsent=new Set(['ECONNREFUSED','ENOTFOUND','EAI_AGAIN','EHOSTUNREACH','ENETUNREACH','EADDRNOTAVAIL','UND_ERR_CONNECT_TIMEOUT']);
  const reach=async(route,init={})=>{
    try { return await fetchImpl(base()+route,{redirect:'error',signal:AbortSignal.timeout(60000),...init}); }
    catch(e){ throw Object.assign(new Offline(e?.name==='TimeoutError' ? '等 Qwen 服务回应超时' : '连不上 Qwen 服务'),{neverSent:unsent.has(e?.cause?.code) || unsent.has(e?.code)}); }
  };
  /** 读回答的正文。传到一半断了、或者不是 JSON（多半是中间代理的页面），都只是“暂时不知道”，不记失败。 */
  const textOf=async(res,what)=>{ try { return await res.text(); } catch { throw new Offline(`读 Qwen 服务的${what}时连接断了`); } };
  const jsonOf=async(res,what)=>{ const text=await textOf(res,what); try { return {text,data:JSON.parse(text)}; } catch { throw new Offline(`Qwen 服务的${what}不是完整的 JSON（可能是中间代理的页面）`); } };
  /** 这一轮不再等核对：把这段待核对的经过（从何时起、因为什么、当时入队到了哪一步）留在记录里，再清掉。 */
  const settle=record=>{ if(record.pending){ record.pendingLog=[...(record.pendingLog ?? []),{...record.pending,until:new Date().toISOString()}]; delete record.pending; } };
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
    const {data:q}=await jsonOf(queue,'队列');
    const queued=[...(q?.queue_running ?? []),...(q?.queue_pending ?? [])].find(mine);
    if(queued) return {promptId:queued[1],number:queued[0],where:'queue'};
    const history=await reach('/history?max_items=200');
    if(!history.ok) throw new Offline('Qwen 服务查询历史时返回 HTTP '+history.status);
    const {data:h}=await jsonOf(history,'历史');
    const done=Object.entries(h ?? {}).find(([,v])=>mine(v?.prompt));
    return done ? {promptId:done[0],number:done[1].prompt?.[0] ?? null,where:'history'} : null;
  }
  async function enqueue(record, refs) {
    const names=[];
    for (const ref of refs) {
      const form=new FormData();
      form.append('image',new Blob([Buffer.from(ref.dataUrl.slice(dataHeader.length),'base64')],{type:'image/png'}),'studio-'+ref.sha256+'.png');
      form.append('type','input'); form.append('overwrite','true');
      const res=await reach('/upload/image',{method:'POST',body:form});
      const text=await textOf(res,'上传回执');
      if(!res.ok){
        // 输入图按内容摘要命名、允许覆盖，重传无害：服务端或代理出错（5xx、408）时等接上再传；明确拒收才记失败。
        if(res.status>=500 || res.status===408) throw new Offline(`上传输入图时 Qwen 服务返回 HTTP ${res.status}`);
        await writeFile(file(record.jobId,'.comfy-error.json'),text,{mode:0o600}); throw new Refused(refusal(res.status,text).replace('拒收了这一轮','没有接收输入图'));
      }
      let up; try { up=JSON.parse(text); } catch { up=null; }
      if(typeof up?.name!=='string' || !up.name) throw new Refused('Qwen 服务没有返回输入图的名称。');
      names.push([up.subfolder,up.name].filter(Boolean).join('/'));
    }
    // 实际发出的请求、入队回执和运行历史原样存盘，供主持人登记场次时使用。prompt_id 由工作台给定（ComfyUI 支持时沿用），回执丢了也知道该找哪一个。
    const body=JSON.stringify({client_id:'studio-'+record.jobId,prompt_id:record.jobId,prompt:comfyGraph(record.jobId,record.evidence.request.prompt,record.evidence.request.seed,names,{...comfy,negative_prompt:record.evidence.request.negative_prompt ?? comfy.negative_prompt})});
    await writeFile(file(record.jobId,'.comfy-request.json'),body,{mode:0o600});
    // 实际发给模型的文字另存一份纯文本（不加换行），主持人登记时直接引用。自由提示这一份就是设计者的原文。
    await writeFile(file(record.jobId,'.prompt.txt'),record.evidence.request.prompt,{mode:0o600});
    // 发出前先看一眼队列接口：服务没开、代理报错时这一轮还没有发出，接上以后照常发出（不带图的自由提示第一轮没有上传，这一步就是唯一的事先确认）。
    const ready=await reach('/queue');
    const readyText=await ready.text().catch(()=>'');
    if(!ready.ok){
      if(ready.status>=400 && ready.status<500 && ready.status!==408){
        await writeFile(file(record.jobId,'.comfy-error.json'),readyText,{mode:0o600});
        throw new Refused(`出图服务地址上没有 ComfyUI 的队列接口（HTTP ${ready.status}），这一轮没有发出。请核对出图服务地址。`);
      }
      throw new Offline(`出图服务还没准备好（查询队列时返回 HTTP ${ready.status}），入队请求没有发出`);
    }
    // 发出之前先存盘：万一服务进程在等回执时停了，重启后知道这一轮可能已经进了队列，只找、不重发。
    record.comfy={...record.comfy,clientId:'studio-'+record.jobId,enqueueRequests:(record.comfy?.enqueueRequests ?? 0)+1,enqueueSentAt:new Date().toISOString(),inputNames:names};
    await save(record);
    let res;
    try { res=await reach('/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body}); }
    catch(e){
      if(e.neverSent){
        // 连接都没有建立：这次入队请求没有发出，不计数；出图服务接上以后照常发出。
        record.comfy.enqueueRequests-=1; delete record.comfy.enqueueSentAt; record.comfy.notSent=(record.comfy.notSent ?? 0)+1;
        throw new Offline('连不上 Qwen 服务，入队请求没有发出');
      }
      throw new Offline(/超时/.test(e.message) ? '等入队回执超时，不能确定进了队列' : '入队请求发出后连接断了，没有收到回执');
    }
    let text;
    try { text=await res.text(); }
    catch { record.comfy.enqueueReply={httpStatus:res.status,complete:false}; throw new Offline(`入队回执只收到一半（HTTP ${res.status}）连接就断了，不能确定进了队列`); }
    let ack=null; try { ack=JSON.parse(text); } catch { /* 不是 JSON */ }
    if(res.ok && typeof ack?.prompt_id==='string' && ack.prompt_id){
      // ComfyUI 回了作业号就是已经进了队列（回执里的 node_errors 原样留在回执文件里）。
      await writeFile(file(record.jobId,'.comfy-ack.json'),text,{mode:0o600});
      adopt(record,{promptId:ack.prompt_id,number:ack.number ?? null,where:'ack'},sha(body));
      await save(record);
      return;
    }
    if(res.status>=400 && res.status<500 && res.status!==408){
      // 明确拒收（例如工作流校验没过、缺权重）：记失败，保留 ComfyUI 报的节点和原因。
      await writeFile(file(record.jobId,'.comfy-error.json'),text,{mode:0o600});
      throw new Refused(refusal(res.status,text));
    }
    // 5xx、408，或者 200 却没有作业号：多半是中间的代理报的，远端可能已经收下。原文另存；不重发，按本轮编号去队列和历史里找。
    await writeFile(file(record.jobId,'.comfy-enqueue-reply.txt'),text,{mode:0o600});
    record.comfy.enqueueReply={httpStatus:res.status,complete:true};
    throw new Offline(`入队请求得到 HTTP ${res.status}${res.ok ? '，回答里却没有作业号' : ''}（可能是中间的代理报的），不能确定进了队列`);
  }
  function adopt(record,found,requestSha256){
    const now=new Date().toISOString();
    // 收到回执才有入队时间；回执丢了、后来在队列或历史里找到的，只记找到的时间，不拿它充当入队时间。
    record.comfy={...record.comfy,promptId:found.promptId,number:found.number,foundBy:found.where,
      ...(found.where==='ack' ? {enqueuedAt:record.comfy?.enqueuedAt ?? now} : {foundAt:now})};
    record.evidence.response={...record.evidence.response,httpStatus:200,traceId:found.promptId,
      ...(requestSha256 ? {requestSha256} : {}),inputNames:record.comfy.inputNames ?? record.evidence.response?.inputNames ?? []};
    settle(record);
  }
  async function waitRemote(record) {
    const id=record.comfy.promptId, deadline=Date.now()+(comfy.timeoutMs ?? 600000);
    for(let polls=1; Date.now()<deadline; polls++) {
      const res=await reach('/history/'+encodeURIComponent(id));
      if(!res.ok) throw new Offline('Qwen 服务查询进度时返回 HTTP '+res.status);
      const {text,data}=await jsonOf(res,'进度');
      const run=data?.[id];
      record.comfy.lastCheckAt=new Date().toISOString();
      if(run && (run.status?.completed || ['error','interrupted'].includes(run.status?.status_str))) return {run,text};
      // 隔一阵看一眼队列：历史里没有、队列里也没有，说明远端丢了这一轮（例如 GPU 主机重启）。不自动重新入队。
      if(polls%15===0 && !(await lookup(record))) throw new Lost('ComfyUI 的队列和历史里都找不到这一轮（GPU 主机可能重启过）。不会自动重发；可以放弃这一轮，或者另开一轮。');
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
    let png; try { png=Buffer.from(await view.arrayBuffer()); } catch { throw new Offline('取图时连接断了'); }
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
        if(record.comfy?.enqueueSentAt){
          // 入队请求发出过、没有确认：只按本轮编号在队列和历史里找，不再发一次。远端可能还在校验，找不到就接着等；
          // 过了时限还找不到，停下来等人决定（放弃这一轮，或者点“取回”再找一次）。
          const found=await lookup(record);
          if(!found){
            const waited=Date.now()-Date.parse(record.comfy.enqueueSentAt);
            if(waited>=(comfy.confirmWindowMs ?? 120000)) throw new Lost(`入队请求发出 ${Math.round(waited/1000)} 秒了，ComfyUI 的队列和历史里一直找不到这一轮：可能没有送到、没有通过校验，或者 GPU 主机重启过。不会自动重发；可以点“取回”再找一次，或者放弃这一轮。`);
            throw new Offline('入队请求已经发出，还没在 ComfyUI 的队列和历史里找到这一轮（远端可能还在校验）');
          }
          adopt(record,found); await save(record);
        } else await enqueue(record,refs);
      }
      const {run,text}=await waitRemote(record);
      await collect(record,run,text);
      record.status='succeeded'; settle(record);
      record.completedAt=new Date().toISOString();
    } catch(err) {
      if(err instanceof Offline){
        // 结果还不知道：不记失败。记下从什么时候、因为什么在等核对，接上以后按原作业取回。
        const enqueued=!!record.comfy?.promptId;
        record.status='unconfirmed';
        record.pending={...record.pending,since:record.pending?.since ?? new Date().toISOString(),lastTryAt:new Date().toISOString(),reason:err.message,
          promptId:record.comfy?.promptId ?? null,enqueue:enqueued ? 'confirmed' : record.comfy?.enqueueSentAt ? 'unknown' : 'not-sent',lost:err instanceof Lost};
      } else {
        record.status='failed'; settle(record);
        record.error=err instanceof Refused ? err.message : '处理 Qwen 回执时出错，已保留本轮记录。';
        record.completedAt=new Date().toISOString();
      }
    }
    await save(record);
  }
  // 4.5.2：父图的来源在服务端核对。父图只能是这台服务自己从 Qwen 取回、并记为成功的原图（按内容摘要在本机作业记录里找）。
  // 浏览器里的轮次记录可能是旧版本留下的（4.5 以前开发用的托管后端），也可能被改过，页面上的标签不作数。
  // 软件夹具出的图只在夹具服务里能当父图，真实服务不认。
  const known=new Set();
  async function fromQwen(sha256) {
    if(known.has(sha256)) return true;
    let names;
    try { names=await readdir(directory); } catch(e){ if(e.code==='ENOENT') return false; throw e; }
    for(const name of names){
      if(!name.endsWith('.json') || !uuid.test(name.slice(0,-5))) continue;
      let record; try { record=JSON.parse(await readFile(path.join(directory,name),'utf8')); } catch { continue; }
      if(record?.provider!=='qwen-comfy' || record.status!=='succeeded' || !!record.fixture!==!!fixture) continue;
      for(const out of record.outputs ?? []) if(/^[a-f\d]{64}$/.test(out?.sha256 ?? '')) known.add(out.sha256);
      if(known.has(sha256)) return true;
    }
    return false;
  }
  async function submit(raw) {
    const {attemptId,prompt,references,free,task}=validate(raw);
    for(const ref of references) if(ref.role==='parent' && !(await fromQwen(ref.sha256)))
      fail(422,'父图不是这台工作台从 Qwen 取回的原图，这一轮没有发出。父图只能选本机 Qwen 出图成功的候选。');
    const hashes=references.map(x=>x.sha256);
    const images=references.map(({role,sha256})=>({role,sha256}));
    // 两种方式的模型、画幅、步数、引导强度、采样器、负向词和种子规则完全相同；差别只在发什么文字、带不带布局条件图。
    const request={model:qwenModel,prompt,size:'1024x1024',n:1,output_format:'png',endpoint:'/prompt',seed:seedOf(attemptId),
        steps:comfy.steps,cfg:comfy.cfg,sampler_name:comfy.sampler_name,scheduler:comfy.scheduler,negative_prompt:negativeFor(task,comfy.negative_prompt),task,
        weights:{unet:comfy.unet,clip:comfy.clip,vae:comfy.vae},images,...(free ? {condition:'free'} : {})};
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
    } else if (!comfy.url) {
      record.status='failed';record.error='尚未配置 Qwen 图像服务地址。';await save(record);
    } else {
      // 输入图另存一份：待核对之后要重新入队（回执确实丢了、队列里也没有）时，服务重启过也拿得到原件。
      // 先登记到 active 再等存盘，免得这段时间里的查询以为没人在管这一轮。
      const work=(async()=>{ await saveInputs(record,references); await executeComfy(record,references); })()
        .catch(err=>console.error('保存图像回执失败',err.code || err.name)).finally(()=>active.delete(attemptId));
      active.set(attemptId,work);
    }
    return baseRecord(attemptId);
  }
  const alive=pid=>{ if(pid===process.pid) return true; if(!Number.isSafeInteger(pid)) return false; try { process.kill(pid,0); return true; } catch { return false; } };
  /**
   * 接着取回一轮：只查 ComfyUI（按原 prompt_id；回执丢了就按本轮编号在队列和历史里找），不会再发一次已经发出的入队请求。
   * 入队请求确定没有发出（服务没开）的，这时才发出。
   * force：设计者点了“取回”，不等节流。另一个仍在运行的服务进程在管这一轮时不抢。
   */
  async function resume(id,{force=false}={}) {
    if(!uuid.test(id))fail(400,'轮次编号格式不正确。');
    const record=await read(id);
    if(!record)fail(404,'未找到这次图像生成记录。');
    // 不是 Qwen 出图的旧记录（4.5 以前开发用后端留下的）不取回。
    if(record.provider!=='qwen-comfy' || ['succeeded','failed'].includes(record.status)) return false;
    if(record.status==='running' && record.ownerPid!==process.pid && alive(record.ownerPid)) return false;
    // 远端已经找不到这一轮（GPU 主机重启过、或者入队结果不明而一直找不到）时不自动重试，等设计者或主持人决定；点了“取回”才再查一次。
    if(!force && record.status==='unconfirmed' && (record.pending?.lost || Date.now()-Date.parse(record.pending?.lastTryAt ?? 0)<(comfy.retryMs ?? 3000))) return false;
    // 最后一个 await 之后才查 active 并登记：同时来的两次查询只会有一次接手。
    if(active.has(id)) return false;
    const work=(async()=>{
      record.ownerPid=process.pid; record.status='running'; record.resumes=(record.resumes ?? 0)+1;
      // 在等核对的，接手期间仍按待核对显示（页面据此不写“已入队”）；没在等核对的（服务进程重启过）不凭空造一条。
      if(record.pending) record.pending={...record.pending,lastTryAt:new Date().toISOString(),lost:false};
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
        ['comfy-error.json',id+'.comfy-error.json',refused],
        // 入队请求得到的不是 ComfyUI 的回执（代理的 502 页面等）：原文另存
        ['comfy-enqueue-reply.txt',id+'.comfy-enqueue-reply.txt',!!record.comfy?.enqueueReply?.complete]);
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
    const reply=record.comfy?.enqueueReply;
    if(reply) notes.push(`入队请求得到的回答是 HTTP ${reply.httpStatus}${reply.complete ? '' : '（正文没有收完）'}，当时不能确定进了队列；没有重发。`);
    if(record.comfy?.foundBy && record.comfy.foundBy!=='ack') notes.push(`入队回执没有收到；作业号 ${record.comfy.promptId} 是 ${record.comfy.foundAt ?? ''} 在 ComfyUI 的${record.comfy.foundBy==='queue' ? '队列' : '历史'}里按本轮编号找到的，入队时间不知道。`);
    if(record.comfy?.notSent) notes.push(`有 ${record.comfy.notSent} 次因为连不上出图服务，入队请求没有发出（不计入入队请求数）。`);
    if((record.comfy?.enqueueRequests ?? 0)>1) notes.push(`这一轮发过 ${record.comfy.enqueueRequests} 次入队请求。`);
    if(record.status==='unconfirmed') notes.push('导出时这一轮仍在等核对：'+(record.pending?.reason ?? '').replace(/。$/,'')+'。');
    return {attemptId:id,status:record.status,comfy:record.comfy ?? null,pending:record.pending ?? null,files:found,missing,notes};
  }
  async function get(id) {
    if(!uuid.test(id))fail(400,'轮次编号格式不正确。');
    let record=await read(id);
    if(!record)fail(404,'未找到这次图像生成记录。');
    // Qwen：管这一轮的服务进程已经不在（重启过），或者这一轮在等核对，就按原 prompt_id 接着取回，不再报失败、不再入队。
    if(record.provider==='qwen-comfy' && !active.has(id) && ((record.status==='running' && (!alive(record.ownerPid) || record.ownerPid===process.pid)) || record.status==='unconfirmed')) {
      if(await resume(id)) record=await read(id);
    }
    const {fingerprint,ownerPid,...visible}=record;
    // 不是 Qwen 出图的旧记录还停在进行中时，不再取回，只显示为未完成。
    if(record.provider!=='qwen-comfy' && ['running','unconfirmed'].includes(visible.status)){
      visible.status='failed';visible.error='这一轮不是 Qwen 出图的记录，不再取回。';
    }
    if(visible.outputs)visible.outputs=await Promise.all(visible.outputs.map(async file=>({...file,dataUrl:dataHeader+(await readFile(path.join(directory,file.name))).toString('base64')})));
    return visible;
  }
  return {submit,get,resume,files,describe};
}
