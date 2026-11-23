import { COMMANDS } from './commands.ts';
import type { Option } from './types.ts';

export interface ParsedPrefixCommand { name: string; options: Option[]; }
export type PrefixParseResult = ParsedPrefixCommand | { error: string } | null;

const TEXT_PREFIX = 's'; // Comandos de mensagem; slash /fut é separado.
const commandNames = new Set(COMMANDS[0].options.map(x => x.name));
const packTypes = new Set(['misto','comum','prata','ouro','icone','lendario','eclipse']);
const rarities = new Set(['todas','comum','prata','ouro','icone','lendario','eclipse','legado']);
const normalize = (value: string) => value.toLocaleLowerCase('pt-BR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const str = (name:string, value:string):Option => ({ name, value, type:3 });
const numberOption = (name:string,value:number):Option => ({ name,value,type:4 });

/** S prefix is plain message text, e.g. Sobter or S pacote ouro. Slash commands remain separate. */
export function parseTextPrefix(content: string):PrefixParseResult {
  if (typeof content !== 'string' || content.length>2000) return null;
  const input=content.trim();
  if (!input || normalize(input[0])!==TEXT_PREFIX || input.startsWith('/')) return null;
  const rest=input.slice(1).trim();
  if (!rest) return {name:'ajuda',options:[]};
  const [rawName,...args]=rest.split(/\s+/);
  const name=normalize(rawName);
  if (!commandNames.has(name)) return null;
  const usage=(example:string):PrefixParseResult => ({error:'Uso correto: **'+example+'**'});
  const first=normalize(args[0]??'');
  const opt:Option[]=[];
  switch(name){
    case 'pacote':
      if(args.length){
        if(!packTypes.has(first))return usage('Spacote [misto|comum|prata|ouro|icone|lendario|eclipse]');
        opt.push(str('tipo',first));
      }
      break;
    case 'colecao':
    case 'mercado':
      if(args.length){
        if(!rarities.has(first))return usage('S'+name+' [todas|comum|prata|ouro|icone|lendario|eclipse|legado]');
        opt.push(str('raridade',first));
      }
      break;
    case 'escalar':{
      const id=args[0]??'';
      const slot=Number(args[1]);
      if(!/^[a-f\d]{16}$/i.test(id)||!Number.isInteger(slot)||slot<1||slot>11)
        return usage('Sescalar <ID da carta> <vaga 1-11>');
      opt.push(str('id',id.toLowerCase()),numberOption('vaga',slot));
      break;
    }
    case 'desafiar':{
      const member=(args[0]??'').match(/^(?:<@!?(\d{15,22})>|(\d{15,22}))$/);
      if(!member)return usage('Sdesafiar @membro');
      opt.push({name:'membro',type:6,value:member[1]??member[2]});
      break;
    }
    case 'vender':{
      const id=args[0]??'';
      const rawPrice=args[1]??'';
      const price=Number(rawPrice.replace(/\./g,''));
      if(!/^[a-f\d]{16}$/i.test(id)||!Number.isInteger(price)||price<100||price>200000)
        return usage('Svender <ID da carta> <preço de 100 a 200000>');
      opt.push(str('id',id.toLowerCase()),numberOption('preco',price));
      break;
    }
    case 'comprar':
    case 'cancelar':
      if(!/^[a-f\d]{16}$/i.test(args[0]??''))return usage('S'+name+' <código do anúncio>');
      opt.push(str('codigo',args[0].toLowerCase()));
      break;
  }
  return {name,options:opt};
}
