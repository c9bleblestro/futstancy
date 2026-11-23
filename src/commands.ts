const sub = (name: string, description: string, options: object[] = []) => ({ type: 1, name, description, options });
const str = (name: string, description: string) => ({ type: 3, name, description, required: true });
const int = (name: string, description: string, min = 1, max = 200000) => ({ type: 4, name, description, required: true, min_value: min, max_value: max });
const user = (name: string, description: string) => ({ type: 6, name, description, required: true });

export const COMMAND_ROOT = 's';
export const COMMAND_VERSION = 'v5.0.1-s-prefix';
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
    sub('ajuda', 'Veja todos os sistemas do jogo.'),
    sub('iniciar', 'Crie seu clube e ganhe 11 jogadores titulares.'),
    sub('obter', 'Receba uma carta de jogador gratuitamente a cada 25 minutos.'),
    sub('daily', 'Receba sua recompensa de moedas.'),
    sub('pacote', 'Loja de pacotes por raridade.', [select('tipo','Vazio: abrir loja; com tipo: comprar e abrir',packs)]),
    sub('colecao', 'Veja suas cartas com filtros.', [select('raridade','Filtrar raridade',tiers)]),
    sub('artes', 'Veja todos os lotes e conceitos visuais do Futstancy.'),
    sub('time', 'Veja sua escalação 4-3-3 e força do elenco.'),
    sub('auto', 'Monte o melhor time automaticamente.'),
    sub('escalar', 'Escale uma carta em uma das 11 vagas.', [str('id', 'ID da carta em /s colecao'), int('vaga', '1=GOL; 2–5=ZAG; 6–8=MEI; 9–11=ATA', 1, 11)]),
    sub('desafiar', 'Convide outro jogador para uma partida PvP.', [user('membro', 'Adversário que receberá o convite')]),
    sub('perfil', 'Veja seu histórico, vitórias e coins.'),
    sub('ranking', 'Tabela global de melhores clubes.'),
    sub('mercado', 'Veja cartas anunciadas por raridade.', [select('raridade','Filtrar raridade',tiers)]),
    sub('vender', 'Anuncie uma carta que não esteja escalada.', [str('id', 'ID da carta'), int('preco', 'Preço de 100 a 200.000 coins', 100, 200000)]),
    sub('comprar', 'Compre uma carta anunciada no mercado.', [str('codigo', 'Código do anúncio')]),
    sub('cancelar', 'Cancele seu anúncio ativo.', [str('codigo', 'Código do anúncio')]),
  ],
}];
