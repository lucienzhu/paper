import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createImageJobs } from './image-jobs.mjs';

test('an H3 job binds the prompt, ordered reference images and at most one provider call to an attempt', async () => {
  const directory=await mkdtemp(join(tmpdir(),'h3-job-test-'));
  const png=await readFile(new URL('../src/data/history/quad-guide.png',import.meta.url));
  const base64=png.toString('base64');
  const digest=createHash('sha256').update(png).digest('hex');
  const input={attemptId:randomUUID(),prompt:'civilian product study',
    inputs:[{role:'layout',sha256:digest,dataUrl:'data:image/png;base64,'+base64}]};
  let resolveProvider, calls=0;
  const provider=new Promise(resolve=>{resolveProvider=resolve;});
  const options={apiKey:'fixture',directory,fetchImpl:async(url,init)=>{
    calls++;
    const body=JSON.parse(init.body);
    assert.equal(url,'https://api.minimax.io/v1/images/edits');
    assert.equal(body.images[0].image_url,input.inputs[0].dataUrl);
    assert.equal(body.prompt,input.prompt);
    assert.equal(body.size,'1024x1024');
    assert.equal('disable_prompt_enhanced' in body,false);
    await provider;
    return Response.json({data:[{b64_json:base64,revised_prompt:'provider text'}]},{headers:{'trace-id':'fixture-trace'}});
  }};
  try {
    const jobs=createImageJobs(options);
    await Promise.all([jobs.submit(input), jobs.submit(input)]);
    assert.equal(calls,1);
    assert.equal((await jobs.get(input.attemptId)).status,'running');
    await assert.rejects(jobs.submit({...input,prompt:'changed'}),error=>error.status===409);
    await assert.rejects(jobs.submit({...input,inputs:[{...input.inputs[0],sha256:'0'.repeat(64)}]}),error=>error.status===400);
    resolveProvider();
    let result;
    for(let i=0;i<100;i++){
      result=await jobs.get(input.attemptId);
      if(result.status!=='running') break;
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert.equal(result.status,'succeeded');
    assert.equal(result.outputs[0].sha256,digest);
    assert.equal(result.evidence.response.traceId,'fixture-trace');
    assert.equal(result.evidence.response.revisedPrompt,'provider text');
    const restarted=createImageJobs(options);
    await restarted.submit(input);
    assert.equal((await restarted.get(input.attemptId)).outputs[0].dataUrl,input.inputs[0].dataUrl);
    assert.equal(calls,1);
  } finally {
    resolveProvider();
    await rm(directory,{recursive:true,force:true});
  }
});

test('a Qwen job runs the archived E3 workflow on ComfyUI, keeps the raw receipts and reuses its seed', async () => {
  const { comfyDefaults, seedOf, qwenModel } = await import('./image-jobs.mjs');
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
    assert.deepEqual(seen.filter(p=>p!=='/history/run-1'),['/upload/image','/prompt','/view']);
    // 与归档的 E3 请求同构：节点类别、权重文件名、采样设置、负面词、条件图接在 image_1
    assert.deepEqual(Object.fromEntries(Object.entries(graph).map(([k,v])=>[k,v.class_type])),
      {1:'UNETLoader',2:'CLIPLoader',3:'VAELoader',4:'TextEncodeQwenImage21',10:'KSampler',11:'VAEDecode',12:'SaveImage',15:'LoadImage'});
    assert.equal(graph['1'].inputs.unet_name,'qwen_image_2.1_bf16.safetensors');
    assert.deepEqual({steps:graph['10'].inputs.steps,cfg:graph['10'].inputs.cfg,sampler:graph['10'].inputs.sampler_name,scheduler:graph['10'].inputs.scheduler,denoise:graph['10'].inputs.denoise},
      {steps:40,cfg:3,sampler:'euler',scheduler:'simple',denoise:1});
    assert.equal(graph['4'].inputs.negative_prompt,comfyDefaults.negative_prompt);
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
  const { comfyDefaults, seedOf } = await import('./image-jobs.mjs');
  const { existsSync } = await import('node:fs');
  const directory=await mkdtemp(join(tmpdir(),'qwen-free-test-'));
  const png=await readFile(new URL('../src/data/history/quad-guide.png',import.meta.url));
  const digest=createHash('sha256').update(png).digest('hex');
  const image=role=>({role,sha256:digest,dataUrl:'data:image/png;base64,'+png.toString('base64')});
  const graphs=[]; let uploads=0;
  const fetchImpl=async(url,init={})=>{
    const {pathname}=new URL(url);
    if(pathname==='/upload/image'){ uploads++; return Response.json({name:init.body.get('image').name,subfolder:'',type:'input'}); }
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
    assert.deepEqual(text['4'].inputs,{clip:['2',0],prompt:words,negative_prompt:comfyDefaults.negative_prompt,resolution:1024});
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
    // 开发用的 MiniMax 后端不接受不带图的自由提示，也不会为它发起调用
    const dev=createImageJobs({apiKey:'k',fetchImpl:async()=>{throw new Error('should not be called');},directory});
    await assert.rejects(dev.submit({attemptId:randomUUID(),condition:'free',prompt:words,inputs:[]}),/MiniMax 后端不接受不带图的自由提示/);
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
