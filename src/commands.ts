const sub = (name: string, description: string, options: object[] = []) => ({ type: 1, name, description, options });
const str = (name: string, description: string) => ({ type: 3, name, description, required: true });
const int = (name: string, description: string, min = 1, max = 200000) => ({ type: 4, name, description, required: true, min_value: min, max_value: max });
const user = (name: string, description: string) => ({ type: 6, name, description, required: true });

export const COMMAND_ROOT = 'fut';
export const COMMAND_VERSION = 'v5.9.4-gamestancy-activity-2';
const tiers=[{name:'Todas',value:'todas'},{name:'Comum',value:'comum'},{name:'Prata',value:'prata'},{name:'Ouro',value:'ouro'},{name:'Ícone',value:'icone'},{name:'Lendário',value:'lendario'},{name:'Eclipse',value:'eclipse'},{name:'Clássica/Legado',value:'legado'}];
const packs=[{name:'Misto — 900 coins',value:'misto'},{name:'Comum — 450',value:'comum'},{name:'Prata — 900',value:'prata'},{name:'Ouro — 2100',value:'ouro'},{name:'Ícone — 4500',value:'icone'},{name:'Lendário — 8500',value:'lendario'},{name:'Eclipse — 12500',value:'eclipse'}];
const select=(name:string,description:string,choices:{name:string;value:string}[])=>({type:3,name,description,required:false,choices});

export const COMMANDS = [{
  name: COMMAND_ROOT,
  description: '⚽ Futstancy — seu clube de futebol no Discord',
  type: 1,
  integration_types: [0],
  contexts: [0],
  options: [
    sub('live', 'GAMESTANCY LIVE: transmissões, clipes e central de criadores.', [
      select('acao','Escolha uma ação',[{name:'Painel',value:'painel'},{name:'Encerrar transmissão',value:'encerrar'},{name:'Publicar clipe',value:'clipe'},{name:'Remover clipe',value:'remover'},{name:'Abrir Activity (se habilitada)',value:'abrir'}]),
      {type:3,name:'titulo',description:'Título da transmissão ou clipe',required:false,max_length:80},
      {type:3,name:'url',description:'Link de clipe YouTube ou Twitch, ou código para remover',required:false,max_length:300},
    ]),
    sub('ajuda', 'Veja todos os sistemas do jogo.'),
    sub('iniciar', 'Crie seu clube e ganhe 11 jogadores titulares.'),
    sub('obter', 'Receba uma carta de jogador gratuitamente a cada 25 minutos.'),
    sub('daily', 'Receba sua recompensa de moedas.'),
    sub('pacote', 'Loja de pacotes por raridade.', [select('tipo','Vazio: abrir loja; com tipo: comprar e abrir',packs)]),
    sub('colecao', 'Veja suas cartas com filtros.', [select('raridade','Filtrar raridade',tiers)]),
    sub('artes', 'Veja todos os lotes e conceitos visuais do Futstancy.'),
    sub('time', 'Veja seu time em campo tático 4-3-3 e gerencie os titulares.'),
    sub('auto', 'Monte o melhor time automaticamente.'),
    sub('escalar', 'Escale uma carta em uma das 11 vagas.', [str('id', 'ID da carta em /fut colecao'), int('vaga', '1=GOL; 2–5=ZAG; 6–8=MEI; 9–11=ATA', 1, 11)]),
    sub('desafiar', 'Convide outro jogador para uma partida PvP.', [user('membro', 'Adversário que receberá o convite')]),
    sub('perfil', 'Veja seu dashboard com avatar real, saldo, desempenho e elenco.'),
    sub('ranking', 'Tabela global de melhores clubes.'),
    sub('mercado', 'Veja cartas anunciadas por raridade.', [select('raridade','Filtrar raridade',tiers)]),
    sub('vender', 'Anuncie uma carta que não esteja escalada.', [str('id', 'ID da carta'), int('preco', 'Preço de 100 a 200.000 coins', 100, 200000)]),
    sub('comprar', 'Compre uma carta anunciada no mercado.', [str('codigo', 'Código do anúncio')]),
    sub('cancelar', 'Cancele seu anúncio ativo.', [str('codigo', 'Código do anúncio')]),
  ],
} , {
  name:'sincronizar',
  description:'🔄 Sincronize uma vez os comandos do FUTSTANCY com o Discord (admin).',
  type:1,integration_types:[0],contexts:[0],default_member_permissions:'8',
},{
  name:'parar_sincronizacao',
  description:'🛑 Consulte ou encerre a sincronização (sem tarefa em segundo plano).',
  type:1,integration_types:[0],contexts:[0],default_member_permissions:'8',
}] as const;

/** Preserve the Activity entry point on bulk command registration once enabled. */
export function registeredCommands(activityEnabled?:string):readonly object[]{
  return activityEnabled==='1' ? [...COMMANDS,{name:'launch',description:'Abrir GAMESTANCY LIVE na call',type:4,handler:2,integration_types:[0,1],contexts:[0,1,2]}] : COMMANDS;
}
