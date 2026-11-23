import { handleInteraction } from './handler.ts';
import type { Env, Interaction } from './types.ts';
import { buildComponents, V2 } from './ui.ts';

type Callback={type?:number;data?:{components?:object[];flags?:number;allowed_mentions?:{parse:string[]}}};
type FetchFn=(url:string,init?:RequestInit)=>Promise<Response>;

/** ACK em menos de três segundos para botões de navegação, com edição posterior. */
const navigation=/^(?:art|col|colview|colfilter|colslot|mkt|mktowner|pack|auto|buy|match|team|profile):/;

export function shouldDeferInteraction(i:Interaction,env:Env):boolean {
  const app=i.application_id??env.DISCORD_APPLICATION_ID;
  return i.type===3 && !!i.token && !!app && /^\d{15,22}$/.test(app) &&
    navigation.test(i.data?.custom_id??'');
}

function webhookUrl(i:Interaction,env:Env):string {
  const app=i.application_id??env.DISCORD_APPLICATION_ID;
  if(!app||!i.token||!/^\d{15,22}$/.test(app))throw new Error('Discord interaction sem token/app válida');
  return 'https://discord.com/api/v10/webhooks/'+app+'/'+encodeURIComponent(i.token);
}

async function callDiscord(fetcher:FetchFn,url:string,method:string,body:unknown):Promise<void>{
  const response=await fetcher(url,{method,headers:{'content-type':'application/json'},
    body:JSON.stringify(body)});
  if(!response.ok){
    const details=(await response.text()).slice(0,500);
    throw new Error('Discord '+method+' falhou: HTTP '+response.status+' '+details);
  }
}

/** Retorna rápido (type 6) no Worker; esta função faz a edição in-place via webhook. */
export async function completeDeferredInteraction(i:Interaction,env:Env,fetcher:FetchFn=fetch):Promise<void>{
  const reply=await handleInteraction(i,env) as Callback;
  const base=webhookUrl(i,env);
  if(!reply.data?.components || (reply.type!==4 && reply.type!==7)){
    throw new Error('Callback incompatível com deferimento');
  }
  if(reply.type===4 && ((reply.data.flags??0)&64)!==0){
    // O painel público fica intacto quando o clique falha ou não é autorizado.
    await callDiscord(fetcher,base,'POST',{
      flags:V2|64,
      components:reply.data.components,
      allowed_mentions:{parse:[]},
    });
    return;
  }
  // A mensagem original já é Components V2; não é permitido revertê-la.
  await callDiscord(fetcher,base+'/messages/@original','PATCH',{
    components:reply.data.components,
    allowed_mentions:{parse:[]},
  });
}

export async function reportDeferredFailure(i:Interaction,env:Env,fetcher:FetchFn=fetch):Promise<void>{
  await callDiscord(fetcher,webhookUrl(i,env),'POST',{
    flags:V2|64,
    components:buildComponents('⚠️ Falha ao atualizar',
      'Não consegui atualizar o painel. Tente novamente com **/fut time**.'),
    allowed_mentions:{parse:[]},
  });
}
