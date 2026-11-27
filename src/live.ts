import type {Env,Interaction,Option} from './types.ts';
import { LIVE_HTML, LIVE_JS, LIVE_CSS } from './live-page.ts';
const HOURS=4*3600000;
// Safety pause: live distribution is not offered in this release.
const TRANSMISSIONS_PAUSED:boolean=true;
const idPattern=/^[a-f0-9]{32}$/;
const tokenPattern=/^[a-f0-9]{64}$/;
const randomId=()=>crypto.randomUUID().replaceAll('-','');
const sha=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const clean=(value:unknown,max=80)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
const safeUrl=(value:string|undefined,protocol:string)=>{try{const u=new URL(value??'');return u.protocol===protocol&&!u.username&&!u.password&&!u.search&&!u.hash?u:null;}catch{return null;}};
const panel=(env:Env)=>safeUrl(env.LIVE_PANEL_URL,'https:')?.href??'https://futstancy.likeparaopeixe.workers.dev/live';
const result=(content:string,link?:string)=>({type:4,data:{flags:32768|64,allowed_mentions:{parse:[]},components:[{type:17,components:[{type:10,content:'## GAMESTANCY LIVE\n'+content},...(link?[{type:1,components:[{type:2,style:5,label:'Abrir central LIVE',url:link}]}]:[])]}]}});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const no=(status=403)=>new Response(null,{status});
export function clipUrl(raw:string):string|null{
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
    let id:string|null=null;
    if(u.hostname==='youtu.be')id=u.pathname.slice(1);
    if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)){
      if(u.pathname==='/watch')id=u.searchParams.get('v');
      else if(u.pathname.startsWith('/shorts/'))id=u.pathname.slice(8);
    }
    if(id&&/^[\w-]{11}$/.test(id))return 'https://www.youtube.com/watch?v='+id;
    const slug=u.hostname==='clips.twitch.tv'?u.pathname.slice(1):(['www.twitch.tv','twitch.tv'].includes(u.hostname)?u.pathname.match(/^\/[^/]+\/clip\/([\w-]+)$/)?.[1]:'');
    if(slug&&/^[\w-]{1,100}$/.test(slug))return 'https://clips.twitch.tv/'+slug;
  }catch{}
  return null;
}
interface Room {id:string;title:string;owner_name:string;owner_id:string;key_hash:string;expires_ms:number;created_ms:number}
export async function handleLiveCommand(i:Interaction,env:Env,uid:string,args:Option[]):Promise<object>{
  const opt=(name:string)=>String(args.find(x=>x.name===name)?.value??'');
  const action=opt('acao')||'painel';
  const genuine=Boolean(i.token&&i.application_id);
  const owner=clean(i.member?.user?.global_name??i.member?.user?.username??i.user?.username??'Criador',60);
  if(action==='painel')return result('Abra GAMESTANCY LIVE pelo menu de Atividades da call. Clipes e criadores da comunidade. Transmissão ao vivo temporariamente indisponível.',panel(env));
  if(!genuine)return result('Use o comando slash /fut live para esta ação. O prefixo S não pode exibir credenciais privadas.');
  if(action==='abrir')return env.LIVE_ACTIVITY_ENABLED==='1'?{type:12}:result('A Activity ainda precisa ser habilitada no Developer Portal. A central web está disponível no botão.',panel(env));
  if(action==='iniciar'){
    if(TRANSMISSIONS_PAUSED)return result('Transmissão ao vivo indisponível nesta versão; o servidor de vídeo ainda não está disponível.');
    const ingest=safeUrl(env.LIVE_INGEST_URL,'rtmps:');
    if(!ingest||!safeUrl(env.LIVE_HLS_ORIGIN,'https:'))return result('Servidor de vídeo ainda não configurado. Nenhuma transmissão foi criada.',panel(env));
    const title=clean(opt('titulo'));
    if(!title)return result('Informe um título para a transmissão pública.');
    const now=Date.now(),id=randomId(),key=randomId()+randomId(),hash=await sha(key);
    const row=await env.DB.prepare('INSERT INTO live_rooms(id,owner_id,title,owner_name,key_hash,created_ms,expires_ms) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM live_rooms WHERE expires_ms>? AND owner_id<>?)<5 ON CONFLICT(owner_id) DO UPDATE SET id=excluded.id,title=excluded.title,owner_name=excluded.owner_name,key_hash=excluded.key_hash,created_ms=excluded.created_ms,expires_ms=excluded.expires_ms').bind(id,uid,title,owner,hash,now,now+HOURS,now,uid).run();
    if(!row.meta.changes)return result('Limite de cinco salas simultâneas atingido. Tente novamente depois.');
    const target=ingest.href.replace(/\/$/,'')+'/'+id+'?user=live&pass='+key;
    return result('Sala pública criada por 4 horas. No OBS selecione serviço Personalizado e use esta URL em Servidor (chave do OBS vazia):\n\n'+String.fromCharCode(96)+target+String.fromCharCode(96)+'\n\n**Segredo:** não compartilhe esta URL. Comece a transmissão no OBS em H.264/AAC, 720p30. Para parar, interrompa o OBS e use /fut live acao:encerrar. Não há gravação automática.',panel(env));
  }
  if(action==='encerrar'){
    await env.DB.prepare('DELETE FROM live_rooms WHERE owner_id=?').bind(uid).run();
    return result('Sala removida da central e acesso pelo player revogado. Pare também a transmissão no OBS.');
  }
  if(action==='clipe'){
    const title=clean(opt('titulo')),url=clipUrl(opt('url'));
    if(!title||!url)return result('Informe título e link válido de YouTube ou Twitch Clips.');
    const now=Date.now(),id=randomId();
    const r=await env.DB.prepare('INSERT INTO live_clips(id,owner_id,owner_name,title,url,created_ms) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM live_clips WHERE owner_id=? AND created_ms>?)<10').bind(id,uid,owner,title,url,now,uid,now-86400000).run();
    if(!r.meta.changes)return result('Limite de 10 clipes por dia atingido.');
    return result('Clipe publicado na central pública. Código para remover: '+id,panel(env));
  }
  if(action==='remover'){
    const id=opt('url');if(!idPattern.test(id))return result('Informe o código do clipe em url.');
    const r=await env.DB.prepare('DELETE FROM live_clips WHERE id=? AND owner_id=?').bind(id,uid).run();
    return result(r.meta.changes?'Clipe removido.':'Clipe inexistente ou não pertence a você.');
  }
  return result('Ação desconhecida.');
}
async function room(env:Env,id:string):Promise<Room|null>{return env.DB.prepare('SELECT * FROM live_rooms WHERE id=? AND expires_ms>?').bind(id,Date.now()).first<Room>();}
export async function handleLiveHttp(request:Request,env:Env):Promise<Response>{
  const u=new URL(request.url),p=u.pathname;
  try{
    if(TRANSMISSIONS_PAUSED&&(p==='/live/auth'||p.startsWith('/live/media/')))return no(p==='/live/auth'&&request.method!=='POST'?405:403);
    if(p==='/live/auth'){
      if(request.method!=='POST')return no(405);
      if(Number(request.headers.get('content-length')??0)>4096)return no(413);
      const body=await request.text();if(body.length>4096)return no(413);
      const data=JSON.parse(body) as {action?:string;protocol?:string;path?:string;user?:string;password?:string};
      if(!data.path||!idPattern.test(data.path))return no();
      const row=await room(env,data.path);if(!row)return no();
      if(data.action==='read'&&data.protocol==='hls')return no(204);
      if(data.action==='publish'&&data.protocol==='rtmp'&&data.user==='live'&&tokenPattern.test(data.password??'')&&await sha(data.password!)===row.key_hash)return no(204);
      return no();
    }
    if(request.method!=='GET'&&request.method!=='HEAD')return no(405);
    const asset=(body:string,type:string)=>new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'"}});
    if(p==='/live'||p==='/')return asset(LIVE_HTML,'text/html; charset=utf-8');
    if(p==='/live/app.js')return asset(LIVE_JS,'text/javascript; charset=utf-8');
    if(p==='/live/style.css')return asset(LIVE_CSS,'text/css; charset=utf-8');
    if(p==='/live/hls.js'){
      const response=await fetch('https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js',{redirect:'error'});
      if(!response.ok)return no(502);
      return new Response(response.body,{headers:{'Content-Type':'text/javascript','Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff'}});
    }
    if(p==='/live/api/feed'){
      const now=Date.now();
      const [rooms,clips]=await Promise.all([
        env.DB.prepare('SELECT id,title,owner_name,created_ms FROM live_rooms WHERE expires_ms>? ORDER BY created_ms DESC LIMIT 5').bind(now).all(),
        env.DB.prepare('SELECT id,title,owner_name,url,created_ms FROM live_clips ORDER BY created_ms DESC LIMIT 50').all()
      ]);
      return json({rooms:TRANSMISSIONS_PAUSED?[]:rooms.results,clips:clips.results,configured:!TRANSMISSIONS_PAUSED&&!!safeUrl(env.LIVE_HLS_ORIGIN,'https:')&&!!safeUrl(env.LIVE_INGEST_URL,'rtmps:')});
    }
    const m=p.match(/^\/live\/media\/([a-f0-9]{32})\/([\w.-]{1,120}\.(?:m3u8|mp4|m4s|ts))$/);
    if(m){
      const origin=safeUrl(env.LIVE_HLS_ORIGIN,'https:');
      if(!origin||!await room(env,m[1]))return no(404);
      const target=new URL(origin.href.replace(/\/$/,'')+'/'+m[1]+'/'+m[2]);
      // Only MediaMTX low-latency HLS parameters may pass to the trusted origin.
      for(const key of ['_HLS_msn','_HLS_part','_HLS_skip']){
        const v=u.searchParams.get(key);if(v&&/^(?:\d{1,12}|YES|v2)$/.test(v))target.searchParams.set(key,v);
      }
      const headers=new Headers();const range=request.headers.get('range');if(range&&/^bytes=\d*-\d*$/.test(range))headers.set('range',range);
      const upstream=await fetch(target,{method:request.method,headers,redirect:'manual'});
      if(![200,206,404,503].includes(upstream.status))return no(502);
      const out=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      for(const key of ['content-type','content-range','accept-ranges']){const value=upstream.headers.get(key);if(value)out.set(key,value);}
      return new Response(upstream.body,{status:upstream.status,headers:out});
    }
    return no(404);
  }catch{return json({error:'Serviço temporariamente indisponível'},503);}
}
