import {DiscordSDK,Events} from '@discord/embedded-app-sdk';
const $=id=>document.getElementById(id);
const el=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value??'';if(cls)e.className=cls;return e};
let sdk=null; let refreshing=false;
function participants(data){
 const list=Array.isArray(data?.participants)?data.participants:[];
 $('count').textContent=String(list.length);
 const target=$('people');target.replaceChildren();
 for(const p of list){target.append(el('li',p.global_name||p.nickname||p.username||'Participante','person'))}
 if(!list.length)target.append(el('li','Nenhum participante informado ainda.','muted'));
}
async function connect(){
 const params=new URLSearchParams(location.search);
 if(!params.has('frame_id')||!params.has('instance_id')){
  $('connection').textContent='Prévia no navegador · abra pelo menu de Atividades da call';
  return;
 }
 try{
  const config=await fetch('/activity/config',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('config');return r.json()});
  sdk=new DiscordSDK(config.applicationId);
  await Promise.race([sdk.ready(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),12000))]);
  $('connection').textContent='Conectado à Activity do Discord';
  $('room').textContent=sdk.channelId?'Sessão compartilhada na call':'Sessão compartilhada do Discord';
  try{participants(await sdk.commands.getActivityInstanceConnectedParticipants());
    await sdk.subscribe(Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE,participants);
  }catch{$('people').replaceChildren(el('li','Lista de participantes indisponível neste cliente.','muted'))}
 }catch{$('connection').textContent='Não foi possível conectar ao Discord. Feche e reabra a atividade.';sdk=null}
}
async function loadClips(){
 if(refreshing)return;refreshing=true;
 try{
  const r=await fetch('/live/api/feed',{cache:'no-store'});if(!r.ok)throw Error();
  const data=await r.json();const grid=$('clips');grid.replaceChildren();
  for(const item of data.clips??[]){
   let url;try{url=new URL(item.url);if(url.protocol!=='https:'||!['www.youtube.com','clips.twitch.tv'].includes(url.hostname))continue}catch{continue}
   const tile=el('article','','tile');tile.append(el('span','CLIPE DA COMUNIDADE','tag'),el('h3',item.title),el('p',item.owner_name));
   const b=el('button','Abrir na plataforma');b.addEventListener('click',async()=>{try{if(sdk)await sdk.commands.openExternalLink({url:url.href});else window.open(url.href,'_blank','noopener,noreferrer')}catch{$('feedback').textContent='Não foi possível abrir esse link.'}});tile.append(b);grid.append(tile);
  }
  if(!grid.children.length)grid.append(el('p','Nenhum clipe publicado.','muted'));
  $('feedback').textContent='';
 }catch{$('feedback').textContent='Não foi possível carregar os clipes.'}finally{refreshing=false}
}
$('refresh').addEventListener('click',loadClips);
connect();loadClips();setInterval(loadClips,30000);
