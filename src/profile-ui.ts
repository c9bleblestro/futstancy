import {account,lineup} from './storage.ts';
import {squadStats} from './squad-layout.ts';
import {card,button,rows,PURPLE,message} from './ui.ts';
import type {Env,Interaction,Account,LineupRow} from './types.ts';

const ORIGIN='https://futstancy.likeparaopeixe.workers.dev';
const photoHash=(value:unknown):string=>{
  const s=String(value??'');
  return /^(?:a_)?[a-f0-9]{32}$/i.test(s)?s:'';
};
const safeLabel=(value:unknown):string=>String(value??'').replace(/[\r\n\t]/g,' ')
  .replace(/[<>]/g,'').trim().slice(0,32);
export function profileImageUrl(owner:string,i:Interaction):string{
  const params=new URLSearchParams({user:owner,rev:'v594.'+Date.now().toString(36)});
  if(i.guild_id&&/^\d{15,22}$/.test(i.guild_id))params.set('guild',i.guild_id);
  const actor=i.member?.user??i.user;
  const name=safeLabel(i.member?.nick??actor?.global_name??actor?.username??'');
  if(name)params.set('name',name);
  const avatar=photoHash(actor?.avatar);
  const gavatar=photoHash(i.member?.avatar);
  if(avatar)params.set('avatar',avatar);
  if(gavatar)params.set('gavatar',gavatar);
  return ORIGIN+'/art/profile.png?'+params.toString();
}
export function profileButtons(owner:string):object[]{
  return rows([
    button('🔄 Atualizar','profile:refresh:'+owner,1),
    button('⚽ Time','profile:team:'+owner,2),
    button('📚 Coleção','profile:collection:'+owner,2),
    button('🛒 Mercado','profile:market:'+owner,2),
  ]);
}
export async function profilePanel(env:Env,owner:string,i:Interaction){
  const [me,team]=await Promise.all([account(env.DB,owner),lineup(env.DB,owner)]);
  if(!me)return message('Seu clube ainda não existe. Use **/fut iniciar**.',true);
  const games=me.wins+me.draws+me.losses;
  const stats=squadStats(team);
  return card('🪪 Perfil do treinador',
    '**Treinador:** <@'+owner+'>\n'+
    '**Registro:** '+games+' partidas  ·  '+(me.wins*3+me.draws)+' pontos  ·  **'+(stats.ovr||'--')+' OVR**\n'+
    '-# Foto, nome e números são carregados do Discord e do banco D1 sempre que você abre ou atualiza este perfil.\n'+
    '-# A arte é informativa; os botões reais do Discord estão logo abaixo.',
    PURPLE,false,profileButtons(owner),[profileImageUrl(owner,i)]);
}
