import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createImageJobs } from './image-jobs.mjs';

test('a job binds the prompt, ordered reference images and at most one enqueue to an attempt', async () => {
  const directory=await mkdtemp(join(tmpdir(),'image-job-test-'));
  const png=await readFile(new URL('../src/data/history/quad-guide.png',import.meta.url));
  const base64=png.toString('base64');
  const digest=createHash('sha256').update(png).digest('hex');
  const input={attemptId:randomUUID(),prompt:'civilian product study',
    inputs:[{role:'layout',sha256:digest,dataUrl:'data:image/png;base64,'+base64}]};
  let release, enqueued=0;
  const gate=new Promise(resolve=>{release=resolve;});
  const options={backend:{provider:'qwen-comfy',url:'http://gpu.test:8188',pollMs:5},directory,fetchImpl:async(url,init={})=>{
    const {pathname}=new URL(url);
    if(pathname==='/upload/image'){ const file=init.body.get('image'); return Response.json({name:file.name,subfolder:'',type:'input'}); }
    if(pathname==='/queue') return Response.json({queue_running:[],queue_pending:[]});
    if(pathname==='/prompt'){ enqueued++; const body=JSON.parse(init.body); assert.equal(body.prompt['4'].inputs.prompt,input.prompt); return Response.json({prompt_id:'run-1',node_errors:{}}); }
    if(pathname==='/history/run-1'){ await gate; return Response.json({'run-1':{status:{completed:true,status_str:'success'},
      outputs:{12:{images:[{filename:'studio-x_00001_.png',subfolder:'',type:'output'}]}}}}); }
    if(pathname==='/view') return new Response(png);
    return new Response('',{status:404});
  }};
  try {
    const jobs=createImageJobs(options);
    await Promise.all([jobs.submit(input), jobs.submit(input)]);
    await assert.rejects(jobs.submit({...input,prompt:'changed'}),error=>error.status===409);
    await assert.rejects(jobs.submit({...input,inputs:[{...input.inputs[0],sha256:'0'.repeat(64)}]}),error=>error.status===400);
    release();
    let result;
    for(let i=0;i<200;i++){
      result=await jobs.get(input.attemptId);
      if(result.status==='succeeded' || result.status==='failed') break;
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert.equal(result.status,'succeeded',result.error);
    assert.equal(result.outputs[0].sha256,digest);
    assert.equal(enqueued,1);
    const restarted=createImageJobs(options);
    await restarted.submit(input);
    assert.equal((await restarted.get(input.attemptId)).outputs[0].dataUrl,input.inputs[0].dataUrl);
    assert.equal(enqueued,1);
  } finally {
    release();
    await rm(directory,{recursive:true,force:true});
  }
});

test('the image service only runs Qwen on ComfyUI: any other backend is refused', () => {
  assert.throws(()=>createImageJobs({backend:{provider:'minimax'}}),/只能是本机 ComfyUI 上的 Qwen-Image 2.1/);
  assert.throws(()=>createImageJobs({backend:{provider:'other',url:'http://x'}}),/只能是本机 ComfyUI 上的 Qwen-Image 2.1/);
  const jobs=createImageJobs({directory:join(tmpdir(),'never-used')});
  assert.deepEqual([jobs.describe().provider,jobs.describe().model,jobs.describe().configured],['qwen-comfy','Qwen-Image-2.1',false]);
});

test('a Qwen job runs the archived E3 workflow on ComfyUI, keeps the raw receipts and reuses its seed', async () => {
  const { comfyDefaults, negativeFor, seedOf, qwenModel } = await import('./image-jobs.mjs');
  const directory=await mkdtemp(join(tmpdir(),'qwen-job-test-'));
  const png=await readFile(new URL('../src/data/history/quad-guide.png',import.meta.url));
  const digest=createHash('sha256').update(png).digest('hex');
  const input={attemptId:randomUUID(),prompt:'civilian product study',
    inputs:[{role:'layout',sha256:digest,dataUrl:'data:image/png;base64,'+png.toString('base64')}]};
  const seen=[]; let polls=0, graph;
  const fetchImpl=async(url,init={})=>{
    const {pathname,searchParams}=new URL(url); seen.push(pathname);
    if(pathname==='/upload/image'){ const file=init.body.get('image'); assert.equal(file.name,'studio-'+digest+'.png');
      assert.equal(createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex'),digest); return Response.json({name:file.name,subfolder:'',type:'input'}); }
    if(pathname==='/queue') return Response.json({queue_running:[],queue_pending:[]});
    if(pathname==='/prompt'){ graph=JSON.parse(init.body).prompt; return Response.json({prompt_id:'run-1',node_errors:{}}); }
    if(pathname==='/history/run-1') return Response.json(++polls<2 ? {} : {'run-1':{status:{completed:true,status_str:'success'},
      outputs:{12:{images:[{filename:'studio-x_00001_.png',subfolder:'',type:'output'}]}}}});
    if(pathname==='/view'){ assert.equal(searchParams.get('filename'),'studio-x_00001_.png'); return new Response(png); }
    return new Response('',{status:404});
  };
  try {
    const jobs=createImageJobs({backend:{provider:'qwen-comfy',url:'http://gpu.test:8188/',pollMs:5},fetchImpl,directory});
    assert.deepEqual(jobs.describe(),{provider:'qwen-comfy',model:qwenModel,endpoint:'/prompt',label:'Qwen-Image 2.1（本机 ComfyUI）',configured:true});
    assert.deepEqual(await jobs.submit(input),{attemptId:input.attemptId,jobId:input.attemptId,provider:'qwen-comfy',model:qwenModel});
    let job; for(let i=0;i<200 && (job=await jobs.get(input.attemptId)).status==='running';i++) await new Promise(r=>setTimeout(r,10));
    assert.equal(job.status,'succeeded',job.error);
    // 发出前先看一眼队列接口（4.3.1），确认服务在，再入队
    assert.deepEqual(seen.filter(p=>p!=='/history/run-1'),['/upload/image','/queue','/prompt','/view']);
    // 与归档的 E3 请求同构：节点类别、权重文件名、采样设置、负面词、条件图接在 image_1
    assert.deepEqual(Object.fromEntries(Object.entries(graph).map(([k,v])=>[k,v.class_type])),
      {1:'UNETLoader',2:'CLIPLoader',3:'VAELoader',4:'TextEncodeQwenImage21',10:'KSampler',11:'VAEDecode',12:'SaveImage',15:'LoadImage'});
    assert.equal(graph['1'].inputs.unet_name,'qwen_image_2.1_bf16.safetensors');
    assert.deepEqual({steps:graph['10'].inputs.steps,cfg:graph['10'].inputs.cfg,sampler:graph['10'].inputs.sampler_name,scheduler:graph['10'].inputs.scheduler,denoise:graph['10'].inputs.denoise},
      {steps:40,cfg:3,sampler:'euler',scheduler:'simple',denoise:1});
    assert.equal(graph['4'].inputs.negative_prompt,negativeFor('quad'));
    assert.equal(graph['4'].inputs.prompt,input.prompt);
    assert.deepEqual(graph['4'].inputs['images.image_1'],['15',0]);
    assert.equal(graph['15'].inputs.image,'studio-'+digest+'.png');
    assert.equal(graph['10'].inputs.seed,seedOf(input.attemptId));
    assert.equal(job.evidence.request.seed,seedOf(input.attemptId));
    assert.equal(job.evidence.request.endpoint,'/prompt');
    assert.equal(job.evidence.response.traceId,'run-1');
    assert.equal(job.outputs[0].sha256,digest);
    for(const kind of ['request','ack','history']) assert.ok((await readFile(join(directory,input.attemptId+'.comfy-'+kind+'.json'))).length>10);
    // 同一轮次重交：不再调用服务，种子不变
    const before=seen.length; await jobs.submit(input); assert.equal(seen.length,before);
    // 没有配置地址时，记录失败而不是去连别的服务
    const none=createImageJobs({backend:{provider:'qwen-comfy'},fetchImpl:async()=>{throw new Error('should not be called');},directory});
    const other={...input,attemptId:randomUUID()}; await none.submit(other);
    assert.match((await none.get(other.attemptId)).error,/尚未配置 Qwen/);
  } finally { await rm(directory,{recursive:true,force:true}); }
});

test('a free-prompt Qwen job sends only the designer text, with the same settings, seed rule and receipts as a structured one', async () => {
  const { comfyDefaults, negativeFor, seedOf } = await import('./image-jobs.mjs');
  const { existsSync } = await import('node:fs');
  const directory=await mkdtemp(join(tmpdir(),'qwen-free-test-'));
  const png=await readFile(new URL('../src/data/history/quad-guide.png',import.meta.url));
  const digest=createHash('sha256').update(png).digest('hex');
  const image=role=>({role,sha256:digest,dataUrl:'data:image/png;base64,'+png.toString('base64')});
  const graphs=[]; let uploads=0;
  const fetchImpl=async(url,init={})=>{
    const {pathname}=new URL(url);
    if(pathname==='/upload/image'){ uploads++; return Response.json({name:init.body.get('image').name,subfolder:'',type:'input'}); }
    if(pathname==='/queue') return Response.json({queue_running:[],queue_pending:[]});
    if(pathname==='/prompt'){ graphs.push(JSON.parse(init.body).prompt); return Response.json({prompt_id:'run-'+graphs.length,node_errors:{}}); }
    if(pathname.startsWith('/history/')){ const id=pathname.slice(9); return Response.json({[id]:{status:{completed:true,status_str:'success'},
      outputs:{12:{images:[{filename:'studio-x_00001_.png',subfolder:'',type:'output'}]}}}}); }
    if(pathname==='/view') return new Response(png);
    return new Response('',{status:404});
  };
  const done=async(jobs,id)=>{ let job; for(let i=0;i<200 && (job=await jobs.get(id)).status==='running';i++) await new Promise(r=>setTimeout(r,10)); return job; };
  try {
    const jobs=createImageJobs({backend:{provider:'qwen-comfy',url:'http://gpu.test:8188',pollMs:5},fetchImpl,directory});
    const words='一架日常携带的四旋翼，俯视时显得紧凑，前向相机与机鼻衔接协调';
    // 第一轮：只有设计者的原文
    const first={attemptId:randomUUID(),condition:'free',prompt:words,inputs:[]};
    await jobs.submit(first);
    const job=await done(jobs,first.attemptId);
    assert.equal(job.status,'succeeded',job.error);
    assert.equal(uploads,0);
    const text=graphs[0];
    assert.deepEqual(Object.fromEntries(Object.entries(text).map(([k,v])=>[k,v.class_type])),
      {1:'UNETLoader',2:'CLIPLoader',3:'VAELoader',4:'TextEncodeQwenImage21',10:'KSampler',11:'VAEDecode',12:'SaveImage'});
    assert.deepEqual(text['4'].inputs,{clip:['2',0],prompt:words,negative_prompt:negativeFor('quad'),resolution:1024});
    assert.equal(text['10'].inputs.seed,seedOf(first.attemptId));
    assert.deepEqual(job.evidence.request.images,[]);
    assert.equal(job.evidence.request.condition,'free');
    assert.equal(job.evidence.request.prompt,words);
    for(const kind of ['request','ack','history']) assert.ok((await readFile(join(directory,first.attemptId+'.comfy-'+kind+'.json'))).length>10);
    // 与 E1 纯文字组已归档的请求同构（库里有这份归档时才比；离线包里没有）
    const archived=new URL('../../../evidence/e1-open-20261112/E1-actual/E1-text-wl1.00-r1/request.json',import.meta.url);
    if(existsSync(archived)) {
      const old=JSON.parse(await readFile(archived,'utf8')).prompt;
      assert.deepEqual(Object.fromEntries(Object.entries(text).map(([k,v])=>[k,v.class_type])),Object.fromEntries(Object.entries(old).map(([k,v])=>[k,v.class_type])));
      for(const node of Object.keys(old)) assert.deepEqual(Object.keys(text[node].inputs).sort(),Object.keys(old[node].inputs).sort(),'节点 '+node+' 的输入项');
      for(const key of ['unet_name','weight_dtype']) assert.equal(text['1'].inputs[key],old['1'].inputs[key]);
      assert.equal(text['2'].inputs.clip_name,old['2'].inputs.clip_name);
      assert.equal(text['3'].inputs.vae_name,old['3'].inputs.vae_name);
      assert.equal(text['4'].inputs.negative_prompt,old['4'].inputs.negative_prompt);
    }
    // 同一批里的结构化请求：除了文字和图，采样设置逐项相同
    const structured={attemptId:randomUUID(),prompt:'compiled text',inputs:[image('layout')]};
    await jobs.submit(structured); await done(jobs,structured.attemptId);
    const same=({seed,...rest})=>{ void seed; return rest; };
    assert.deepEqual(same(text['10'].inputs),same(graphs[1]['10'].inputs));
    for(const node of ['1','2','3','11']) assert.deepEqual(text[node],graphs[1][node]);
    const settings=({prompt,images,seed,condition,...rest})=>{ void prompt; void images; void seed; void condition; return rest; };
    assert.deepEqual(settings(job.evidence.request),settings((await jobs.get(structured.attemptId)).evidence.request));
    // 后续轮次：设计者的原文加一张父图，仍然没有布局条件图
    const next={attemptId:randomUUID(),condition:'free',prompt:'机身再窄一些',inputs:[image('parent')]};
    await jobs.submit(next);
    const revised=await done(jobs,next.attemptId);
    assert.equal(revised.status,'succeeded',revised.error);
    assert.deepEqual(revised.evidence.request.images,[{role:'parent',sha256:digest}]);
    assert.deepEqual(graphs[2]['4'].inputs['images.image_1'],['15',0]);
    assert.equal(graphs[2]['4'].inputs['images.image_2'],undefined);
    assert.deepEqual(graphs[2]['4'].inputs.vae,['3',0]);
    // 方式与图不匹配的请求不接收
    await assert.rejects(jobs.submit({attemptId:randomUUID(),condition:'free',prompt:words,inputs:[image('layout')]}),/参考图格式或顺序/);
    await assert.rejects(jobs.submit({attemptId:randomUUID(),prompt:words,inputs:[]}),/缺少本轮目标或布局图/);
    await assert.rejects(jobs.submit({attemptId:randomUUID(),condition:'other',prompt:words,inputs:[]}),/生成方式无法识别/);
  } finally { await rm(directory,{recursive:true,force:true}); }
});

test('a record replace that hits a transient Windows lock is retried instead of leaving the round stuck', async () => {
  const { mkdtemp, readFile, writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { replaceFile } = await import('./image-jobs.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'replace-'));
  const target = join(dir, 'a.json'), tmp = join(dir, 'a.json.tmp');
  await writeFile(target, 'old'); await writeFile(tmp, 'new');
  // 冒充 Windows：前两次 rename 报 EPERM。
  const fs = await import('node:fs/promises');
  const real = fs.rename; let calls = 0;
  const { syncBuiltinESMExports } = await import('node:module');
  fs.default.rename = async (...args) => { calls++; if (calls <= 2) { const e = new Error('locked'); e.code = 'EPERM'; throw e; } return real(...args); };
  syncBuiltinESMExports();
  try { await replaceFile(tmp, target); }
  finally { fs.default.rename = real; syncBuiltinESMExports(); }
  assert.equal(await readFile(target, 'utf8'), 'new');
  assert.equal(calls, 3);
});

test('a Qwen round that was queued survives a dropped connection, a lost receipt and a service restart: it is fetched by its prompt_id and queued only once', async () => {
  const { writeFile: write, readFile: read } = await import('node:fs/promises');
  const directory=await mkdtemp(join(tmpdir(),'qwen-resume-test-'));
  const png=await readFile(new URL('../src/data/history/quad-guide.png',import.meta.url));
  const digest=createHash('sha256').update(png).digest('hex');
  const image={role:'layout',sha256:digest,dataUrl:'data:image/png;base64,'+png.toString('base64')};
  // 可控的 ComfyUI：job 在 doneAt 之后才进历史；down 时一切请求都连不上；dropAck 时请求送到了、回执丢了。
  const state={down:false,dropAck:false,prompts:[],jobs:new Map(),runMs:60};
  const fetchImpl=async(url,init={})=>{
    if(state.down) throw new TypeError('fetch failed');
    const {pathname}=new URL(url);
    if(pathname==='/upload/image') return Response.json({name:init.body.get('image').name,subfolder:'',type:'input'});
    if(pathname==='/prompt'){ const body=JSON.parse(init.body); state.prompts.push(body);
      const id=body.prompt_id ?? 'run-'+state.prompts.length; state.jobs.set(id,{clientId:body.client_id,doneAt:Date.now()+state.runMs,number:state.prompts.length,graph:body.prompt});
      if(state.dropAck){ state.dropAck=false; throw new TypeError('connection reset'); }
      return Response.json({prompt_id:id,number:state.prompts.length,node_errors:{}}); }
    if(pathname==='/queue'){ const items=[...state.jobs].filter(([,j])=>Date.now()<j.doneAt).map(([id,j])=>[j.number,id,j.graph,{client_id:j.clientId},['12']]); return Response.json({queue_running:items,queue_pending:[]}); }
    if(pathname==='/history' || pathname.startsWith('/history/')){ const want=pathname.slice('/history/'.length);
      return Response.json(Object.fromEntries([...state.jobs].filter(([id,j])=>Date.now()>=j.doneAt && (!want || want===id)).map(([id,j])=>[id,{prompt:[j.number,id,j.graph,{client_id:j.clientId},['12']],
        status:{completed:true,status_str:'success',messages:[['execution_start',{timestamp:j.doneAt-40}],['execution_success',{timestamp:j.doneAt}]]},outputs:{12:{images:[{filename:'studio-x_00001_.png',subfolder:'',type:'output'}]}}}]))); }
    if(pathname==='/view') return new Response(png);
    return new Response('',{status:404});
  };
  const backend={provider:'qwen-comfy',url:'http://gpu.test:8188',pollMs:5};
  const settle=async(jobs,id,stop=s=>!['running'].includes(s))=>{ let job; for(let i=0;i<400;i++){ job=await jobs.get(id); if(stop(job.status)) return job; await new Promise(r=>setTimeout(r,10)); } return job; };
  try {
    // 1. 入队以后连不上：不记失败，记“待核对”，带着 prompt_id；接上以后按原作业取回
    const jobs=createImageJobs({backend,fetchImpl,directory});
    const a={attemptId:randomUUID(),prompt:'drop after enqueue',inputs:[image]};
    state.runMs=200;
    await jobs.submit(a);
    for(let i=0;i<100 && !state.prompts.length;i++) await new Promise(r=>setTimeout(r,5));
    state.down=true;
    let job=await settle(jobs,a.attemptId,s=>s==='unconfirmed');
    assert.equal(job.status,'unconfirmed');
    assert.equal(job.pending.promptId,a.attemptId,'prompt_id 由工作台给定，回执丢了也知道该找哪一个');
    assert.equal(job.pending.enqueue,'confirmed');
    state.down=false;
    await new Promise(r=>setTimeout(r,3100)); // 待核对的自动重试有 3 秒节流
    job=await settle(jobs,a.attemptId,s=>s==='succeeded' || s==='failed');
    assert.equal(job.status,'succeeded',job.error);
    assert.equal(state.prompts.filter(p=>p.client_id==='studio-'+a.attemptId).length,1,'只入队一次');
    assert.ok(job.comfy.executionStart && job.comfy.executionEnd && job.comfy.enqueuedAt,'记下了入队、开始和结束的时间');
    // 2. 入队请求送到了、回执丢了：先在队列里按本轮编号找到，不再入队
    const b={attemptId:randomUUID(),prompt:'lost acknowledgement',inputs:[image]};
    state.runMs=400; state.dropAck=true;
    await jobs.submit(b);
    job=await settle(jobs,b.attemptId,s=>s==='unconfirmed');
    assert.equal(job.pending.enqueue,'unknown');
    await jobs.resume(b.attemptId,{force:true});
    job=await settle(jobs,b.attemptId,s=>s==='succeeded' || s==='failed');
    assert.equal(job.status,'succeeded',job.error);
    assert.equal(state.prompts.filter(p=>p.client_id==='studio-'+b.attemptId).length,1,'回执丢了也只入队一次');
    const filesB=await jobs.files(b.attemptId);
    assert.ok(filesB.missing.includes('comfy-ack.json'),'没收到的入队回执列为缺失');
    assert.match(filesB.notes.join(''),/在 ComfyUI 的队列里按本轮编号找到/);
    // 3. 工作台服务在等回图时重启：新进程接手，按原 prompt_id 取回
    const c={attemptId:randomUUID(),prompt:'service restarts',inputs:[image]};
    state.runMs=300;
    const hung={dead:false};
    const old=createImageJobs({backend,fetchImpl:(u,i)=>hung.dead ? new Promise(()=>{}) : fetchImpl(u,i),directory});
    await old.submit(c);
    for(let i=0;i<100 && !state.prompts.some(p=>p.client_id==='studio-'+c.attemptId);i++) await new Promise(r=>setTimeout(r,5));
    await new Promise(r=>setTimeout(r,30));
    hung.dead=true;
    const recordFile=join(directory,c.attemptId+'.json');
    await write(recordFile,JSON.stringify({...JSON.parse(await read(recordFile,'utf8')),ownerPid:2147480000}));
    const fresh=createImageJobs({backend,fetchImpl,directory});
    job=await settle(fresh,c.attemptId,s=>s==='succeeded' || s==='failed');
    assert.equal(job.status,'succeeded',job.error);
    assert.equal(state.prompts.filter(p=>p.client_id==='studio-'+c.attemptId).length,1,'重启以后也只入队一次');
    // 成功的一轮：服务端原件齐全
    const filesC=await fresh.files(c.attemptId);
    assert.deepEqual(filesC.files.map(f=>f.name).sort(),['QWEN-'+c.attemptId+'.png','comfy-ack.json','comfy-history.json','comfy-request.json','input-1-layout.png','job.json','prompt.txt','原名-studio-x_00001_.png'].sort());
    assert.deepEqual(filesC.missing,[]);
    // 4. ComfyUI 拒收（缺权重）：记失败，保留它报的节点和原因，原始回答另存
    const refuse=createImageJobs({backend,directory,fetchImpl:async(url,init={})=>new URL(url).pathname==='/prompt'
      ? Response.json({error:{type:'prompt_outputs_failed_validation',message:'Prompt outputs failed validation'},node_errors:{1:{class_type:'UNETLoader',errors:[{message:'Value not in list',details:"unet_name: 'qwen_image_2.1_bf16.safetensors' not in []"}]}}},{status:400})
      : fetchImpl(url,init)});
    const d={attemptId:randomUUID(),prompt:'missing weights',inputs:[image]};
    await refuse.submit(d);
    job=await settle(refuse,d.attemptId,s=>s==='failed' || s==='succeeded');
    assert.equal(job.status,'failed');
    assert.match(job.error,/HTTP 400.*Prompt outputs failed validation.*节点 1 UNETLoader：Value not in list：unet_name: 'qwen_image_2.1_bf16.safetensors' not in \[\]/);
    const filesD=await refuse.files(d.attemptId);
    assert.ok(filesD.files.some(f=>f.name==='comfy-error.json'));
    assert.ok(!filesD.missing.length,filesD.missing.join());
    // 5. 远端丢了这一轮（GPU 主机重启）：不自动重新入队，等人决定
    const lost=createImageJobs({backend,directory,fetchImpl:async(url,init={})=>{ const p=new URL(url).pathname;
      if(p==='/prompt'){ state.prompts.push(JSON.parse(init.body)); return Response.json({prompt_id:'gone-1',number:99,node_errors:{}}); }
      if(p==='/queue') return Response.json({queue_running:[],queue_pending:[]});
      if(p.startsWith('/history')) return Response.json({});
      return fetchImpl(url,init); }});
    const e={attemptId:randomUUID(),prompt:'lost on the GPU host',inputs:[image]};
    await lost.submit(e);
    job=await settle(lost,e.attemptId,s=>s==='unconfirmed');
    assert.equal(job.pending.lost,true);
    assert.match(job.pending.reason,/队列和历史里都找不到这一轮/);
    const before=state.prompts.length;
    await new Promise(r=>setTimeout(r,3100));
    assert.equal((await lost.get(e.attemptId)).status,'unconfirmed','丢了的轮次不自动重试');
    assert.equal(state.prompts.length,before,'也不重新入队');
  } finally { await rm(directory,{recursive:true,force:true}); }
});

test('GPT 复测三条：回执在远端校验时丢了、远端收下后报 502 或回执正文断开、发出前就连不上：每轮只入队一次，接上后取回原图；明确拒收和运行失败保留具体回执', async t => {
  const { createServer } = await import('node:http');
  const directory=await mkdtemp(join(tmpdir(),'qwen-ambiguous-test-'));
  const png=await readFile(new URL('../src/data/history/quad-guide.png',import.meta.url));
  // 冒充 ComfyUI 的 HTTP 服务：真的走网络，Node 的 fetch 按真实情况报错。next 是下一次入队时出的状况。
  const s={prompts:[],jobs:new Map(),next:null,validateMs:0,runMs:150};
  const entry=(id,j)=>[j.number,id,j.graph,{client_id:j.clientId},['12']];
  const server=createServer((req,res)=>{
    const chunks=[]; req.on('data',c=>chunks.push(c));
    req.on('end',()=>{
      const url=new URL(req.url,'http://comfy');
      const send=(status,body,type='application/json')=>{ res.writeHead(status,{'Content-Type':type}); res.end(typeof body==='string' ? body : JSON.stringify(body)); };
      if(url.pathname==='/prompt' && req.method==='POST'){
        const body=JSON.parse(Buffer.concat(chunks).toString()); s.prompts.push(body);
        const id=body.prompt_id, mode=s.next; s.next=null;
        const queue=()=>s.jobs.set(id,{clientId:body.client_id,number:s.prompts.length,graph:body.prompt,doneAt:Date.now()+s.runMs,error:mode==='exec-error'});
        if(mode==='refuse') return send(400,{error:{type:'prompt_outputs_failed_validation',message:'Prompt outputs failed validation'},
          node_errors:{1:{class_type:'UNETLoader',errors:[{message:'Value not in list',details:"unet_name: 'qwen_image_2.1_bf16.safetensors' not in []"}]}}});
        // 远端还在校验，连接就断了：校验完才进队列，这段时间里队列和历史都查不到这一轮。forget：校验没过或主机重启，始终不进队列。
        if(mode==='drop-while-validating' || mode==='forget'){ if(mode!=='forget') setTimeout(queue,s.validateMs); req.socket.destroy(); return; }
        queue();
        const ack=JSON.stringify({prompt_id:id,number:s.prompts.length,node_errors:{}});
        if(mode==='bad-gateway') return send(502,'<html><head><title>502 Bad Gateway</title></head><body><center><h1>502 Bad Gateway</h1></center></body></html>','text/html');
        if(mode==='cut-body'){ res.writeHead(200,{'Content-Type':'application/json','Content-Length':String(Buffer.byteLength(ack))}); res.write(ack.slice(0,9)); setTimeout(()=>req.socket.destroy(),20); return; }
        return send(200,ack);
      }
      if(url.pathname==='/queue'){ const now=Date.now(); return send(200,{queue_running:[...s.jobs].filter(([,j])=>now<j.doneAt).map(([id,j])=>entry(id,j)),queue_pending:[]}); }
      if(url.pathname==='/history' || url.pathname.startsWith('/history/')){
        const want=decodeURIComponent(url.pathname.slice('/history/'.length));
        return send(200,Object.fromEntries([...s.jobs].filter(([id,j])=>Date.now()>=j.doneAt && (!want || want===id)).map(([id,j])=>[id,{prompt:entry(id,j),
          status:j.error ? {status_str:'error',completed:false,messages:[['execution_start',{timestamp:j.doneAt-100}],['execution_error',{node_type:'KSampler',exception_type:'torch.OutOfMemoryError',exception_message:'CUDA out of memory',timestamp:j.doneAt}]]}
            : {status_str:'success',completed:true,messages:[['execution_start',{timestamp:j.doneAt-100}],['execution_success',{timestamp:j.doneAt}]]},
          outputs:j.error ? {} : {12:{images:[{filename:'studio-'+id+'_00001_.png',subfolder:'',type:'output'}]}}}])));
      }
      if(url.pathname==='/view'){ res.writeHead(200,{'Content-Type':'image/png'}); res.end(png); return; }
      send(404,{error:'not found'});
    });
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port;
  // retryMs：待核对时自动再查的间隔；confirmWindowMs：入队结果不明、远端一直找不到时，多久以后停下来等人决定。测试里调短。
  const jobs=createImageJobs({backend:{provider:'qwen-comfy',url:'http://127.0.0.1:'+port,pollMs:20,retryMs:200,confirmWindowMs:2500},directory});
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const sent=id=>s.prompts.filter(p=>p.client_id==='studio-'+id).length;
  const until=async(id,stop,ms=12000)=>{ const end=Date.now()+ms; let job; do { job=await jobs.get(id); if(stop(job)) return job; await sleep(25); } while(Date.now()<end); return job; };
  const over=j=>['succeeded','failed'].includes(j.status) || !!j.pending?.lost;
  const state=j=>({status:j.status,enqueue:j.pending?.enqueue ?? null,promptId:j.pending?.promptId ?? null,lost:!!j.pending?.lost});
  async function round(mode,{validateMs=0,poke=false}={}){
    s.next=mode; s.validateMs=validateMs;
    const id=randomUUID();
    await jobs.submit({attemptId:id,condition:'free',prompt:'round with '+mode,inputs:[]});
    const first=await until(id,j=>j.status!=='running');
    let poked=null;
    // 设计者马上点“取回”：这时远端还在校验，队列和历史里都没有这一轮
    if(poke){ await jobs.resume(id,{force:true}); poked=await until(id,j=>j.status!=='running'); }
    const last=await until(id,over);
    return {id,first:state(first),...(poke ? {poked:{...state(poked),sent:sent(id)}} : {}),last:state(last),sent:sent(id),
      enqueueRequests:last.comfy?.enqueueRequests ?? null,found:['queue','history'].includes(last.comfy?.foundBy) ? 'lookup' : last.comfy?.foundBy ?? null,job:last};
  }
  const unknown={status:'unconfirmed',enqueue:'unknown',promptId:null,lost:false};
  const done={status:'succeeded',enqueue:null,promptId:null,lost:false};
  try {
    await t.test('1. 回执在远端校验时丢了，马上查队列和历史都还查不到：不重发，接着找，找到后取回原图', async () => {
      const r=await round('drop-while-validating',{validateMs:1200,poke:true});
      const {id,job,...seen}=r; void id; void job;
      assert.deepEqual(seen,{first:unknown,poked:{...unknown,sent:1},last:done,sent:1,enqueueRequests:1,found:'lookup'});
    });
    await t.test('2a. 远端已经收下，中间的代理回 502：记待核对，找到原作业后取回原图；502 的原文留在服务端原件里', async () => {
      const r=await round('bad-gateway');
      const {id,job,...seen}=r;
      assert.deepEqual(seen,{first:unknown,last:done,sent:1,enqueueRequests:1,found:'lookup'});
      const kept=await jobs.files(id);
      assert.ok(kept.files.some(f=>f.name==='comfy-enqueue-reply.txt' && Buffer.from(f.base64,'base64').toString().includes('502 Bad Gateway')),'502 的原文另存');
      assert.match(kept.notes.join(''),/HTTP 502/);
      assert.equal(job.comfy.enqueuedAt ?? null,null,'没有收到回执，就不把找到的时间当作入队时间');
    });
    await t.test('2b. 回执的响应头到了、正文传到一半断了：记待核对，找到原作业后取回原图', async () => {
      const r=await round('cut-body');
      const {id,job,...seen}=r; void id; void job;
      assert.deepEqual(seen,{first:unknown,last:done,sent:1,enqueueRequests:1,found:'lookup'});
    });
    await t.test('2c. 明确拒收（HTTP 400、节点错误）和运行失败：记失败，保留具体回执', async () => {
      const refused=await round('refuse');
      assert.equal(refused.last.status,'failed');
      assert.match(refused.job.error,/HTTP 400.*节点 1 UNETLoader：Value not in list/);
      assert.ok((await jobs.files(refused.id)).files.some(f=>f.name==='comfy-error.json'));
      const crashed=await round('exec-error');
      assert.equal(crashed.last.status,'failed');
      assert.match(crashed.job.error,/运行失败（error）：KSampler：torch\.OutOfMemoryError：CUDA out of memory/);
      assert.ok((await jobs.files(crashed.id)).files.some(f=>f.name==='comfy-history.json'));
      assert.equal(refused.sent+crashed.sent,2);
    });
    await t.test('2d. 发出后远端始终没有这一轮：过了等待时限停下来等人决定，不自动重发；点“取回”只再找一次', async () => {
      const r=await round('forget');
      const {id,job,...seen}=r;
      assert.deepEqual(seen,{first:unknown,last:{...unknown,lost:true},sent:1,enqueueRequests:1,found:null});
      assert.match(job.pending.reason,/不会自动重发/);
      await jobs.resume(id,{force:true});
      const again=await until(id,j=>j.status!=='running');
      assert.deepEqual(state(again),{...unknown,lost:true});
      assert.equal(sent(id),1,'取回只是再找一次');
    });
    await t.test('3. 发出前就连不上（服务没开）：记“还没发出”，不说已入队；接上以后照常发出，入队请求只计 1 次', async () => {
      server.close(); server.closeAllConnections();
      const id=randomUUID();
      await jobs.submit({attemptId:id,condition:'free',prompt:'service is down at submission',inputs:[]});
      const first=await until(id,j=>j.status!=='running');
      await sleep(300);
      await new Promise(r=>server.listen(port,'127.0.0.1',r));
      const last=await until(id,over);
      assert.deepEqual({first:state(first),last:state(last),sent:sent(id),enqueueRequests:last.comfy?.enqueueRequests ?? null},
        {first:{status:'unconfirmed',enqueue:'not-sent',promptId:null,lost:false},last:done,sent:1,enqueueRequests:1});
    });
  } finally { server.close(); server.closeAllConnections(); await rm(directory,{recursive:true,force:true}); }
});

// 4.5.2（Codex 2026-11-26 复现）：浏览器里存着的旧项目可能带着 4.5 以前开发用后端出的图。父图的来源在服务端按内容摘要核对：
// 只认这台服务自己从 Qwen 取回并记为成功的原图；别的后端的旧记录、没出过的图、软件夹具的图（对真实服务）都不接收。
test('a parent image is accepted only if this service received it from a completed Qwen job', async () => {
  const { deflateSync } = await import('node:zlib');
  const { writeFile, mkdir, readdir } = await import('node:fs/promises');
  // 两张内容不同的合法 PNG（1024×1024 纯色，出图服务的回图必须是这个尺寸）。
  const crcTable=Array.from({length:256},(_,n)=>{ let c=n; for(let k=0;k<8;k++) c=c&1 ? 0xedb88320^(c>>>1) : c>>>1; return c>>>0; });
  const crc=bytes=>{ let c=0xffffffff; for(const b of bytes) c=crcTable[(c^b)&0xff]^(c>>>8); return (c^0xffffffff)>>>0; };
  const chunk=(type,data)=>{ const head=Buffer.alloc(4); head.writeUInt32BE(data.length); const body=Buffer.concat([Buffer.from(type,'ascii'),data]);
    const tail=Buffer.alloc(4); tail.writeUInt32BE(crc(body)); return Buffer.concat([head,body,tail]); };
  const solid=grey=>{ const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(1024,0); ihdr.writeUInt32BE(1024,4); ihdr[8]=8; ihdr[9]=0;
    const row=Buffer.concat([Buffer.from([0]),Buffer.alloc(1024,grey)]);
    return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Buffer.concat(Array(1024).fill(row)))),chunk('IEND',Buffer.alloc(0))]); };
  const qwenOut=solid(40), foreign=solid(200);
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  const as=(role,bytes)=>({role,sha256:sha(bytes),dataUrl:'data:image/png;base64,'+bytes.toString('base64')});
  const directory=await mkdtemp(join(tmpdir(),'image-job-parent-'));
  let prompts=0;
  const fetchImpl=async(url,init={})=>{
    const {pathname}=new URL(url);
    if(pathname==='/upload/image') return Response.json({name:init.body.get('image').name,subfolder:'',type:'input'});
    if(pathname==='/queue') return Response.json({queue_running:[],queue_pending:[]});
    if(pathname==='/prompt'){ prompts++; return Response.json({prompt_id:'run-'+prompts,node_errors:{}}); }
    if(pathname.startsWith('/history/')){ const id=pathname.slice(9); return Response.json({[id]:{status:{completed:true,status_str:'success'},
      outputs:{12:{images:[{filename:'studio-x_00001_.png',subfolder:'',type:'output'}]}}}}); }
    if(pathname==='/view') return new Response(qwenOut);
    return new Response('',{status:404});
  };
  const done=async(jobs,id)=>{ let job; for(let i=0;i<200 && (job=await jobs.get(id)).status==='running';i++) await new Promise(r=>setTimeout(r,10)); return job; };
  const refused=error=>error.status===422 && /父图不是这台工作台从 Qwen 取回的原图/.test(error.message);
  try {
    const jobs=createImageJobs({backend:{provider:'qwen-comfy',url:'http://gpu.test:8188',pollMs:5},fetchImpl,directory});
    // 还没有任何成功的 Qwen 轮次：什么图都不能当父图。
    await assert.rejects(jobs.submit({attemptId:randomUUID(),condition:'free',prompt:'机身再窄一些',inputs:[as('parent',qwenOut)]}),refused);
    assert.equal(prompts,0,'被拒收的请求没有发给出图服务');
    const first={attemptId:randomUUID(),condition:'free',prompt:'一架紧凑的四旋翼',inputs:[]};
    await jobs.submit(first);
    const job=await done(jobs,first.attemptId);
    assert.equal(job.status,'succeeded',job.error);
    assert.equal(job.outputs[0].sha256,sha(qwenOut));
    // 这台服务从 Qwen 取回的原图可以当父图；结构化方式的第二张图同样核对。
    const second={attemptId:randomUUID(),condition:'free',prompt:'机身再窄一些',inputs:[as('parent',qwenOut)]};
    await jobs.submit(second);
    assert.equal((await done(jobs,second.attemptId)).status,'succeeded');
    await assert.rejects(jobs.submit({attemptId:randomUUID(),prompt:'compiled text',inputs:[as('layout',qwenOut),as('parent',foreign)]}),refused);
    // 别处来的图：内容对不上任何一轮的原图。
    await assert.rejects(jobs.submit({attemptId:randomUUID(),condition:'free',prompt:'机身再窄一些',inputs:[as('parent',foreign)]}),refused);
    // 4.5 以前开发用后端留在作业目录里的旧记录：记录上写着成功，也不认。
    const oldId=randomUUID();
    await mkdir(directory,{recursive:true});
    await writeFile(join(directory,oldId+'.json'),JSON.stringify({attemptId:oldId,jobId:oldId,provider:'minimax',model:'MiniMax-H3-Image',status:'succeeded',
      outputs:[{name:'H3-'+oldId+'.png',mimeType:'image/png',sha256:sha(foreign)}]}));
    await assert.rejects(jobs.submit({attemptId:randomUUID(),condition:'free',prompt:'机身再窄一些',inputs:[as('parent',foreign)]}),refused);
    // 重启后的服务按同一个目录里的记录认。
    const restarted=createImageJobs({backend:{provider:'qwen-comfy',url:'http://gpu.test:8188',pollMs:5},fetchImpl,directory});
    const third={attemptId:randomUUID(),condition:'free',prompt:'臂根再宽一些',inputs:[as('parent',qwenOut)]};
    await restarted.submit(third);
    assert.equal((await done(restarted,third.attemptId)).status,'succeeded');
    // 软件夹具出的图只在夹具服务里能当父图：同一个目录换成夹具服务，不认真实服务的图；反过来也不认。
    const fixtureJobs=createImageJobs({fixture:true,backend:{provider:'qwen-comfy',url:'http://gpu.test:8188',pollMs:5},fetchImpl,directory});
    await assert.rejects(fixtureJobs.submit({attemptId:randomUUID(),condition:'free',prompt:'机身再窄一些',inputs:[as('parent',qwenOut)]}),refused);
    const before=prompts;
    assert.equal((await readdir(directory)).filter(n=>/^[a-f\d-]{36}\.json$/.test(n)).length,4,'被拒收的请求不留作业记录（三轮成功的，加一份旧后端的记录）');
    assert.equal(prompts,before);
  } finally { await rm(directory,{recursive:true,force:true}); }
});

test('the negative prompt is the unified one: the workbench ten terms plus five blade terms, no camera-position terms', async () => {
  const { comfyDefaults, negativeFor, cameraNegative } = await import('./image-jobs.mjs');
  // 4.6：装相机的任务另加 4 个压相机伪影的词；植保六旋不带。没有机尾的词。
  assert.equal(negativeFor('hexa'),comfyDefaults.negative_prompt);
  assert.equal(negativeFor('quad'),comfyDefaults.negative_prompt+', '+cameraNegative);
  assert.deepEqual(cameraNegative.split(', '),['camera lens visible from above','upward-facing lens','camera on a neck or stalk','camera on a post']);
  assert.ok(!/tail/.test(negativeFor('quad')));
  const terms=comfyDefaults.negative_prompt.split(', ');
  assert.equal(terms.length,15);
  assert.deepEqual(terms.slice(0,10),['flat schematic','line drawing','collage','text','labels','logo','cropped rotor','disconnected arm','extra rotor','perspective camera']);
  assert.deepEqual(terms.slice(10),['V-shaped propeller','blades at an acute angle','single-blade propeller','missing blade','unequal blades']);
  assert.ok(!/lens|stalk|post|tail/.test(comfyDefaults.negative_prompt));
});

test('the task chooses the negative prompt: camera terms for the quad task, none for the plant-protection hexacopter', async () => {
  const { comfyDefaults, negativeFor } = await import('./image-jobs.mjs');
  const directory=await mkdtemp(join(tmpdir(),'image-job-task-'));
  const png=await readFile(new URL('../src/data/history/quad-guide.png',import.meta.url));
  const digest=createHash('sha256').update(png).digest('hex');
  const layout={role:'layout',sha256:digest,dataUrl:'data:image/png;base64,'+png.toString('base64')};
  const graphs=[];
  const fetchImpl=async(url,init={})=>{
    const {pathname}=new URL(url);
    if(pathname==='/upload/image') return Response.json({name:init.body.get('image').name,subfolder:'',type:'input'});
    if(pathname==='/queue') return Response.json({queue_running:[],queue_pending:[]});
    if(pathname==='/prompt'){ graphs.push(JSON.parse(init.body).prompt); return Response.json({prompt_id:'run-'+graphs.length,node_errors:{}}); }
    if(pathname.startsWith('/history/')){ const id=pathname.slice(9); return Response.json({[id]:{status:{completed:true,status_str:'success'},
      outputs:{12:{images:[{filename:'studio-x_00001_.png',subfolder:'',type:'output'}]}}}}); }
    if(pathname==='/view') return new Response(png);
    return new Response('',{status:404});
  };
  const done=async(jobs,id)=>{ let job; for(let i=0;i<200 && (job=await jobs.get(id)).status==='running';i++) await new Promise(r=>setTimeout(r,10)); return job; };
  try {
    const jobs=createImageJobs({backend:{provider:'qwen-comfy',url:'http://gpu.test:8188',pollMs:5},fetchImpl,directory});
    const run=async extra=>{ const request={attemptId:randomUUID(),prompt:'compiled text',inputs:[layout],...extra}; await jobs.submit(request); return done(jobs,request.attemptId); };
    const quad=await run({task:'quad'}), unstated=await run({}), hexa=await run({task:'hexa'});
    assert.equal(graphs[0]['4'].inputs.negative_prompt,negativeFor('quad'));
    assert.equal(graphs[1]['4'].inputs.negative_prompt,negativeFor('quad'),'没写任务的按四旋算');
    assert.equal(graphs[2]['4'].inputs.negative_prompt,comfyDefaults.negative_prompt);
    assert.deepEqual([quad.evidence.request.task,unstated.evidence.request.task,hexa.evidence.request.task],['quad','quad','hexa']);
    assert.equal(hexa.evidence.request.negative_prompt,graphs[2]['4'].inputs.negative_prompt,'记录里的负向词就是实际发出的');
    await assert.rejects(jobs.submit({attemptId:randomUUID(),prompt:'compiled text',inputs:[layout],task:'octo'}),/任务无法识别/);
  } finally { await rm(directory,{recursive:true,force:true}); }
});
