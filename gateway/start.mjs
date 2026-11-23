import { Client, Events, GatewayIntentBits, Routes } from 'discord.js';

const token=process.env.DISCORD_BOT_TOKEN?.trim();
const sharedSecret=process.env.PREFIX_GATEWAY_SECRET?.trim();
const workerEndpoint=process.env.FUTSTANCY_WORKER_URL?.trim();
const known=new Set(['ajuda','iniciar','obter','daily','pacote','colecao','artes','time','auto',
  'escalar','desafiar','perfil','ranking','mercado','vender','comprar','cancelar']);
function normalize(v){return v.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function looksLikeCommand(content){
  if(typeof content!=='string'||content.length>2000)return false;
  const input=content.trim();
  if(!input||normalize(input[0])!=='s'||input.startsWith('/'))return false;
  const raw=input.slice(1).trim();
  return !raw||known.has(normalize(raw.split(/\s+/)[0]));
}
if(!token||!workerEndpoint||!sharedSecret||sharedSecret.length<32){
  throw new Error('Gateway: configure DISCORD_BOT_TOKEN, FUTSTANCY_WORKER_URL e PREFIX_GATEWAY_SECRET (mínimo 32 caracteres).');
}
const endpoint=new URL(workerEndpoint);
if(endpoint.protocol!=='https:'||!endpoint.pathname.endsWith('/prefix/execute')){
  throw new Error('FUTSTANCY_WORKER_URL deve ser uma URL HTTPS terminando em /prefix/execute.');
}

const client=new Client({intents:[
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
]});
const seen=new Map();
function recentlySeen(id){
  const now=Date.now();
  for(const [key,time] of seen)if(now-time>300000)seen.delete(key);
  if(seen.has(id))return true;
  seen.set(id,now);
  while(seen.size>5000)seen.delete(seen.keys().next().value);
  return false;
}
const fallback={
  flags:32768,
  allowed_mentions:{parse:[]},
  components:[{type:17,accent_color:0xf87171,components:[
    {type:10,content:'⚠️ **FUTSTANCY**\nNão foi possível executar o comando agora. Tente novamente mais tarde.'},
  ]}],
};
async function sendReply(source,payload){
  if(!Array.isArray(payload.components)||!payload.components.length)throw new Error('Payload do Worker inválido');
  await client.rest.post(Routes.channelMessages(source.channelId),{body:{
    flags:32768,
    components:payload.components,
    allowed_mentions:{parse:[]},
    message_reference:{message_id:source.id,fail_if_not_exists:false},
  }});
}
client.on(Events.ClientReady,ready=>{
  console.log('[PREFIX] Gateway conectado como '+ready.user.tag+'; prefixo S ativado');
});
client.on(Events.Error,err=>console.error('[GATEWAY]',err?.message??String(err)));
client.on(Events.MessageCreate,async source=>{
  if(!source.inGuild()||source.author.bot||source.webhookId||!looksLikeCommand(source.content))return;
  if(recentlySeen(source.id))return;
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{
      'content-type':'application/json',
      'authorization':'Bearer '+sharedSecret,
    },body:JSON.stringify({
      content:source.content,
      user_id:source.author.id,
      guild_id:source.guildId,
      channel_id:source.channelId,
      message_id:source.id,
    }),signal:AbortSignal.timeout(15000)});
    if(response.status===204)return; // duplicated or unrecognized
    if(!response.ok)throw new Error('Cloudflare HTTP '+response.status);
    const payload=await response.json();
    await sendReply(source,payload);
  }catch(err){
    console.error('[PREFIX] Falha ao executar mensagem '+source.id+': '+(err?.message??String(err)));
    try{await sendReply(source,fallback);}catch(sendError){
      console.error('[PREFIX] Falha ao responder: '+(sendError?.message??String(sendError)));
    }
  }
});
process.once('SIGTERM',()=>client.destroy());
process.once('SIGINT',()=>client.destroy());
await client.login(token);
