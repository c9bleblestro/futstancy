import { parseTextPrefix } from './text-prefix.ts';
import { handleInteraction } from './handler.ts';
import { jsonResponse, message, V2 } from './ui.ts';
import { COMMAND_ROOT } from './commands.ts';
import type { Env, Interaction } from './types.ts';

interface PrefixEvent {
  content:string;
  user_id:string;
  guild_id:string;
  channel_id:string;
  message_id:string;
}
const snowflake=(s:unknown):s is string=>typeof s==='string'&&/^\d{15,22}$/.test(s);

/** Use a constant-time string comparison for the HTTPS shared Gateway secret. */
function safeEqual(a:string,b:string):boolean {
  const left=new TextEncoder().encode(a),right=new TextEncoder().encode(b);
  const max=Math.max(left.length,right.length);
  let different=left.length^right.length;
  for(let i=0;i<max;i++)different|=(left[i]??0)^(right[i]??0);
  return different===0;
}
export async function handleTextPrefixRequest(request:Request,env:Env):Promise<Response> {
  if(request.method!=='POST')return new Response('Method Not Allowed',{status:405});
  if(!env.PREFIX_GATEWAY_SECRET||env.PREFIX_GATEWAY_SECRET.length<32)
    return new Response('Prefix Gateway not configured',{status:503});
  const auth=request.headers.get('authorization')??'';
  if(auth.length>2048||!safeEqual(auth,'Bearer '+env.PREFIX_GATEWAY_SECRET))
    return new Response('Unauthorized',{status:401});
  if(Number(request.headers.get('content-length')??0)>8192)
    return new Response('Too Large',{status:413});
  const body=await request.text();
  if(body.length>8192)return new Response('Too Large',{status:413});
  let event:PrefixEvent;
  try{event=JSON.parse(body) as PrefixEvent;}
  catch{return new Response('Invalid JSON',{status:400});}
  if(!event||!snowflake(event.user_id)||!snowflake(event.guild_id)
    ||!snowflake(event.channel_id)||!snowflake(event.message_id)
    ||typeof event.content!=='string'||event.content.length>2000)
    return new Response('Invalid event',{status:400});
  const parsed=parseTextPrefix(event.content);
  if(!parsed)return new Response(null,{status:204});
  // Prevent duplicate Gateway deliveries from granting several packs or rewards.
  const reserved=await env.DB.prepare(
    'INSERT OR IGNORE INTO prefix_messages(message_id,created_ms) VALUES(?,?)'
  ).bind(event.message_id,Date.now()).run();
  if((reserved.meta.changes??0)===0)return new Response(null,{status:204});
  let response:object;
  if('error' in parsed){
    response=message('⚠️ '+parsed.error,true);
  }else{
    const interaction:Interaction={
      type:2,id:event.message_id,guild_id:event.guild_id,
      member:{user:{id:event.user_id,username:'jogador'}},
      data:{name:COMMAND_ROOT,options:[{type:1,name:parsed.name,options:parsed.options}]},
    };
    response=await handleInteraction(interaction,env);
  }
  const callback=response as {type?:number;data?:{components?:object[];flags?:number}};
  if(callback.type!==4||!Array.isArray(callback.data?.components))
    throw new Error('Prefix command returned an unsupported response');
  // A normal channel message cannot be ephemeral: strip flag 64.
  // The Gateway sender keeps Components V2 and replies to the original message.
  return jsonResponse({
    flags:V2,
    components:callback.data.components,
    allowed_mentions:{parse:[]},
  });
}
