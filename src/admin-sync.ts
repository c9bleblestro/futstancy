import {registeredCommands, COMMAND_VERSION} from './commands.ts';
import {message} from './ui.ts';
import type {Env,Interaction} from './types.ts';

/**
 * Comandos de administração adaptados de code (1).py.
 * Faz uma única sincronização real dos slash commands do FUTSTANCY.
 * Não existe loop de mensagens, raid, menções em massa ou trabalho em segundo plano.
 */
export const ADMIN_SYNC_NAMES=['sincronizar','parar_sincronizacao'] as const;
export function isAdminSyncName(name:string|undefined):boolean{
  return name==='sincronizar'||name==='parar_sincronizacao';
}
export function isAdministrator(i:Interaction):boolean{
  const value=i.member?.permissions;
  if(!i.guild_id||!value||!/^\d{1,21}$/.test(value))return false;
  try{return (BigInt(value)&8n)!==0n;}catch{return false;}
}
const MAX_SYNC_DURATION_MS=1800;
const SYNC_COOLDOWN_MS=30_000;
const lastSyncKey='admin_commands_sync_last_ms';
type SyncFetch=(url:string,init?:RequestInit)=>Promise<Response>;
export async function handleAdminSync(i:Interaction,env:Env,request:SyncFetch=fetch):Promise<object>{
  if(i.type!==2||!isAdminSyncName(i.data?.name))
    return message('Comando de administração não reconhecido.',true);
  if(!isAdministrator(i))return message('⛔ Apenas administradores do servidor podem utilizar este comando.',true);
  if(i.data?.name==='parar_sincronizacao'){
    return message('✅ Nenhuma sincronização contínua está ativa. A atualização de comandos é uma operação única, sem envio repetido de mensagens.',true);
  }
  if(!env.DISCORD_APPLICATION_ID||!env.DISCORD_BOT_TOKEN)
    return message('⚠️ Configure DISCORD_APPLICATION_ID e DISCORD_BOT_TOKEN nos secrets do Worker antes de sincronizar.',true);
  if(i.application_id&&i.application_id!==env.DISCORD_APPLICATION_ID)
    return message('⚠️ Esta interação não pertence à aplicação configurada.',true);
  const now=Date.now();
  let last:number|undefined;
  try{
    const result=await env.DB.prepare("SELECT value FROM bot_settings WHERE key=?")
      .bind(lastSyncKey).first<{value:string}>();
    last=result?Number(result.value):undefined;
  }catch{
    return message('⚠️ O banco D1 não está pronto para a verificação de sincronização.',true);
  }
  if(last&&Number.isFinite(last)&&now-last<SYNC_COOLDOWN_MS){
    return message('⏳ Sincronização recente. Aguarde alguns segundos antes de tentar novamente.',true);
  }
  let response:Response;
  try{
    response=await request(
      'https://discord.com/api/v10/applications/'+env.DISCORD_APPLICATION_ID+'/commands',
      {method:'PUT',
        headers:{Authorization:'Bot '+env.DISCORD_BOT_TOKEN,'Content-Type':'application/json'},
        body:JSON.stringify(registeredCommands(env.LIVE_ACTIVITY_ENABLED)),
        signal:AbortSignal.timeout(MAX_SYNC_DURATION_MS),
      }
    );
  }catch(error){
    console.error('[MANUAL SYNC]',error instanceof Error?error.message:String(error));
    return message('⚠️ Discord indisponível ou demorou a responder. Nenhuma mensagem foi enviada ao canal.',true);
  }
  if(!response.ok){
    const details=(await response.text()).slice(0,120);
    console.error('[MANUAL SYNC] Discord HTTP',response.status,details);
    return message('⚠️ Não consegui registrar os slash commands (Discord HTTP '+response.status+').',true);
  }
  try{
    await env.DB.prepare("INSERT INTO bot_settings(key,value) VALUES('commands_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .bind(COMMAND_VERSION+(env.LIVE_ACTIVITY_ENABLED==='1'?'-activity':'')).run();
    await env.DB.prepare("INSERT INTO bot_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .bind(lastSyncKey,String(now)).run();
  }catch(error){
    console.error('[MANUAL SYNC D1]',error instanceof Error?error.message:String(error));
    return message('⚠️ Comandos enviados ao Discord, mas não foi possível registrar a confirmação no D1.',true);
  }
  return message('✅ Sincronização concluída! Os comandos slash do FUTSTANCY foram enviados ao Discord, sem publicar mensagens no canal.',true);
}
