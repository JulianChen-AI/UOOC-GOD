const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const enginePathFile = path.join(__dirname, 'engine-path.txt');
const engine = process.env.UOOC_ENGINE || (fs.existsSync(enginePathFile) ? fs.readFileSync(enginePathFile, 'utf8').trim() : path.join(__dirname, 'engine'));
const port = Number(process.env.PORT || 4319);
const token = require('crypto').randomBytes(24).toString('hex');
let scanning = false, courses = [];
let legacy = null;
let child = null, startedAt = null, exitCode = null, logs = [], sequence = 0;
function readConfig() {
  return Object.fromEntries(fs.readFileSync(path.join(engine, 'config.txt'), 'utf8').split('\n').filter(x => x.trim() && !x.trim().startsWith('#')).map(x => { const i = x.indexOf('='); return [x.slice(0,i).trim(),x.slice(i+1).trim()]; }));
}
function log(text) {
  const cfg = readConfig();
  for (const key of ['PASSWORD','API_KEY','USERNAME']) if (cfg[key]) text = text.split(cfg[key]).join('••••');
  logs.push({ id: ++sequence, time: new Date().toLocaleTimeString('zh-CN'), text });
  if (logs.length > 800) logs.shift();
}
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control','no-store');
  if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) { res.writeHead(403).end(); return; }
  const json = (status, value) => { res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(value)); };
  if (req.url === '/' && req.method === 'GET') { res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('__TOKEN__',token)); return; }
  if (req.headers['x-console-token'] !== token) return json(403,{error:'请从本机页面操作'});
  try {
    if (legacy && ['/api/state','/api/stop','/api/start'].includes(req.url)) {
      try {
        const state = await (await fetch(legacy.url + '/api/state',{headers:{'x-console-token':legacy.token}})).json();
        if (state.running) {
          if (req.url === '/api/state') return json(200,state);
          if (req.url === '/api/start') return json(409,{error:'已有任务运行中，请先停止'});
          await fetch(legacy.url + '/api/stop',{method:'POST',headers:{'x-console-token':legacy.token,'Content-Type':'application/json'},body:'{}'});
          return json(200,{});
        }
        legacy = null;
      } catch { legacy = null; }
    }
    if (req.url === '/api/courses' && req.method === 'GET') return json(200,{courses,scanning});
    if (req.url === '/api/state' && req.method === 'GET') return json(200,{running:!!child,startedAt,exitCode,logs});
    if (req.url === '/api/config' && req.method === 'GET') {
      const cfg = readConfig();
      return json(200,{model:cfg.MODEL,base:cfg.BASE_URL,hasKey:!!cfg.API_KEY,hasAccount:!!cfg.USERNAME && !!cfg.PASSWORD});
    }
    if (req.method !== 'POST') return json(404,{});
    let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 12000) return json(413,{error:'输入太长'}); }
    const data = JSON.parse(body || '{}');
    if (req.url === '/api/scan') {
      if (scanning) return json(200,{});
      scanning = true;
      const scan = spawn(process.execPath,[path.join(__dirname,'runner.cjs')],{cwd:engine,env:{...process.env,UOOC_ENGINE:engine},stdio:['pipe','pipe','pipe','ipc']});
      scan.stdout.on('data',b=>log(b.toString())); scan.stderr.on('data',b=>log(b.toString()));
      scan.on('message',message=>{if(Array.isArray(message.courses)) courses=message.courses;});
      scan.on('error',e=>log(e.message));
      scan.on('close',()=>{scanning=false;log(courses.length ? '已读取 '+courses.length+' 门课程' : '未读取到课程，请检查登录状态后重试');});
      scan.stdin.end(JSON.stringify({mode:'scan',concurrent:1,courses:[],config:{}}));
      return json(200,{});
    }
    if (req.url === '/api/stop') { if (child) { child.kill('SIGTERM'); log('正在停止任务并关闭自动化浏览器…'); } return json(200,{}); }
    if (req.url === '/api/start') {
      if (child) return json(409,{error:'任务正在运行'});
      const concurrent = Number(data.concurrent);
      if (![1,2,3].includes(concurrent)) throw Error('请选择 1–3 门并行');
      if (!data.courses) throw Error('请至少勾选一门课程');
      const courses = String(data.courses || '').split(/[\s,，]+/).filter(Boolean).map(x => { const m = x.match(/^(?:https?:\/\/www\.uooc\.net\.cn\/home\/(?:course|learn(?:\/new)?)\/)?(\d+)\/?$/); if (!m) throw Error('请填写数字课程 ID 或课程链接'); return m[1]; });
      if (data.base && !/^https:\/\//.test(data.base)) throw Error('接口地址需要使用 HTTPS');
      logs = []; exitCode = null; startedAt = Date.now();
      const config = {MODEL_NAME:data.model,RETRY_MODEL:data.model,API_BASE_URL:data.base,API_KEY:data.key};
      child = spawn(process.execPath,[path.join(__dirname,'runner.cjs')],{cwd:engine,env:{...process.env,UOOC_ENGINE:engine},stdio:['pipe','pipe','pipe']});
      const current = child;
      const redact = b => { let s = b.toString().replace(/\x1b\[[0-9;]*m/g,''); if (data.key) s = s.split(data.key).join('••••'); log(s); };
      current.stdout.on('data',redact); current.stderr.on('data',redact);
      current.on('error',e=>log(e.message));
      current.on('close',code=>{if(child===current) child=null; exitCode=code; log('任务已结束');});
      current.stdin.end(JSON.stringify({concurrent,courses,config}));
      log(`开始运行 · ${concurrent} 门并行 · ${courses.length ? '指定 '+courses.length+' 门课程' : '全部课程'}`);
      return json(200,{});
    }
    return json(404,{});
  } catch(e) { return json(400,{error:e.message}); }
});
(async()=>{
  if (port !== 4318) try {
    const url='http://127.0.0.1:4318';
    const html=await (await fetch(url)).text();
    const match=html.match(/const token='([^']+)'/);
    if(match) legacy={url,token:match[1]};
  } catch {}
  server.listen(port,'127.0.0.1',()=>console.log(`UOOC 控制台 http://127.0.0.1:${port}`));
})();
process.on('SIGTERM',()=>{child?.kill('SIGTERM');server.close();});
