export type Position = 'GOL' | 'ZAG' | 'MEI' | 'ATA';
export interface Player { key: string; name: string; pos: Position; ovr: number; country: string; }

// Notas de overall são inventadas para o Futstancy; não são notas oficiais de nenhum jogo.
// Nomes de atletas são apenas referências textuais, sem logos, imagens ou cartas de terceiros.
export const PLAYERS: Player[] = [
  { key: 'courtois', name: 'Thibaut Courtois', pos: 'GOL', ovr: 91, country: 'Bélgica' },
  { key: 'alisson', name: 'Alisson Becker', pos: 'GOL', ovr: 89, country: 'Brasil' },
  { key: 'ederson', name: 'Ederson', pos: 'GOL', ovr: 87, country: 'Brasil' },
  { key: 'donnarumma', name: 'Donnarumma', pos: 'GOL', ovr: 87, country: 'Itália' },
  { key: 'terstegen', name: 'Ter Stegen', pos: 'GOL', ovr: 84, country: 'Alemanha' },
  { key: 'unai', name: 'Unai Simón', pos: 'GOL', ovr: 80, country: 'Espanha' },
  { key: 'bento', name: 'Bento', pos: 'GOL', ovr: 76, country: 'Brasil' },
  { key: 'mamardashvili', name: 'Mamardashvili', pos: 'GOL', ovr: 78, country: 'Geórgia' },
  { key: 'vandijk', name: 'Virgil van Dijk', pos: 'ZAG', ovr: 90, country: 'Holanda' },
  { key: 'rudiger', name: 'Antonio Rüdiger', pos: 'ZAG', ovr: 88, country: 'Alemanha' },
  { key: 'saliba', name: 'William Saliba', pos: 'ZAG', ovr: 87, country: 'França' },
  { key: 'dias', name: 'Rúben Dias', pos: 'ZAG', ovr: 87, country: 'Portugal' },
  { key: 'hakimi', name: 'Achraf Hakimi', pos: 'ZAG', ovr: 86, country: 'Marrocos' },
  { key: 'militao', name: 'Éder Militão', pos: 'ZAG', ovr: 85, country: 'Brasil' },
  { key: 'araujo', name: 'Ronald Araújo', pos: 'ZAG', ovr: 84, country: 'Uruguai' },
  { key: 'gabriel', name: 'Gabriel Magalhães', pos: 'ZAG', ovr: 85, country: 'Brasil' },
  { key: 'carvajal', name: 'Dani Carvajal', pos: 'ZAG', ovr: 81, country: 'Espanha' },
  { key: 'bremer', name: 'Bremer', pos: 'ZAG', ovr: 80, country: 'Brasil' },
  { key: 'renan', name: 'Renan Lodi', pos: 'ZAG', ovr: 76, country: 'Brasil' },
  { key: 'danilo', name: 'Danilo', pos: 'ZAG', ovr: 75, country: 'Brasil' },
  { key: 'casemiro', name: 'Casemiro', pos: 'MEI', ovr: 81, country: 'Brasil' },
  { key: 'rodri', name: 'Rodri', pos: 'MEI', ovr: 91, country: 'Espanha' },
  { key: 'bellingham', name: 'Jude Bellingham', pos: 'MEI', ovr: 91, country: 'Inglaterra' },
  { key: 'debruyne', name: 'Kevin De Bruyne', pos: 'MEI', ovr: 89, country: 'Bélgica' },
  { key: 'pedri', name: 'Pedri', pos: 'MEI', ovr: 88, country: 'Espanha' },
  { key: 'valverde', name: 'Federico Valverde', pos: 'MEI', ovr: 88, country: 'Uruguai' },
  { key: 'bruno', name: 'Bruno Fernandes', pos: 'MEI', ovr: 87, country: 'Portugal' },
  { key: 'musiala', name: 'Jamal Musiala', pos: 'MEI', ovr: 87, country: 'Alemanha' },
  { key: 'macallister', name: 'Alexis Mac Allister', pos: 'MEI', ovr: 83, country: 'Argentina' },
  { key: 'paqueta', name: 'Lucas Paquetá', pos: 'MEI', ovr: 81, country: 'Brasil' },
  { key: 'gerson', name: 'Gerson', pos: 'MEI', ovr: 78, country: 'Brasil' },
  { key: 'joaogomes', name: 'João Gomes', pos: 'MEI', ovr: 77, country: 'Brasil' },
  { key: 'mbappe', name: 'Kylian Mbappé', pos: 'ATA', ovr: 94, country: 'França' },
  { key: 'haaland', name: 'Erling Haaland', pos: 'ATA', ovr: 93, country: 'Noruega' },
  { key: 'vinicius', name: 'Vinícius Júnior', pos: 'ATA', ovr: 92, country: 'Brasil' },
  { key: 'salah', name: 'Mohamed Salah', pos: 'ATA', ovr: 91, country: 'Egito' },
  { key: 'kane', name: 'Harry Kane', pos: 'ATA', ovr: 91, country: 'Inglaterra' },
  { key: 'lamine', name: 'Lamine Yamal', pos: 'ATA', ovr: 90, country: 'Espanha' },
  { key: 'raphinha', name: 'Raphinha', pos: 'ATA', ovr: 89, country: 'Brasil' },
  { key: 'lautaro', name: 'Lautaro Martínez', pos: 'ATA', ovr: 88, country: 'Argentina' },
  { key: 'saka', name: 'Bukayo Saka', pos: 'ATA', ovr: 87, country: 'Inglaterra' },
  { key: 'leao', name: 'Rafael Leão', pos: 'ATA', ovr: 85, country: 'Portugal' },
  { key: 'richarlison', name: 'Richarlison', pos: 'ATA', ovr: 78, country: 'Brasil' },
  { key: 'endrick', name: 'Endrick', pos: 'ATA', ovr: 77, country: 'Brasil' },
];

export const STARTER_KEYS = [
  'bento', 'danilo', 'renan', 'carvajal', 'bremer',
  'gerson', 'joaogomes', 'casemiro', 'endrick', 'richarlison', 'leao',
];
const CATALOG = new Map(PLAYERS.map(p => [p.key, p]));
export function getPlayer(key: string): Player | undefined { return CATALOG.get(key); }
export function rarity(ovr: number): string { return ovr >= 90 ? '🌈 ÍCONE' : ovr >= 86 ? '💎 DIAMANTE' : ovr >= 80 ? '🥇 OURO' : '🥈 PRATA'; }
export function playerLabel(player: Player): string { return `**${player.name}** · ${player.pos} · **${player.ovr} OVR** · ${rarity(player.ovr)}`; }

export function drawPlayer(random: () => number = Math.random): Player {
  const chance = random();
  const pool = chance < 0.03 ? PLAYERS.filter(p => p.ovr >= 90)
    : chance < 0.15 ? PLAYERS.filter(p => p.ovr >= 86 && p.ovr < 90)
    : chance < 0.45 ? PLAYERS.filter(p => p.ovr >= 80 && p.ovr < 86)
    : PLAYERS.filter(p => p.ovr < 80);
  return pool[Math.floor(random() * pool.length) % pool.length];
}
