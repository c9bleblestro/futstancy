import { getPlayer, type Player } from './catalog.ts';
import { EDITIONS, ART_REV, playerArtUrl } from './editions.ts';

export type ArtTier = 'comum' | 'prata' | 'ouro' | 'premium' | 'icone' | 'lendario' | 'eclipse';
export type PackType = 'misto' | Exclude<ArtTier, 'premium'>;
export type CollectionTier = PackType | 'premium' | 'legado' | 'todas';

export interface EditionCard { player: Player; edition: string; tier: Exclude<ArtTier,'premium'>; file: string }
export interface PackDefinition { label: string; cost: number; description: string }
export const PACKS: Record<PackType, PackDefinition> = {
  misto: { label: '🎲 Misto', cost: 900, description: '3 cartas de raridades variadas' },
  comum: { label: '⚪ Comum', cost: 450, description: '3 cartas comuns garantidas' },
  prata: { label: '🥈 Prata', cost: 900, description: '3 cartas prata garantidas' },
  ouro: { label: '🥇 Ouro', cost: 2100, description: '3 cartas ouro garantidas' },
  icone: { label: '🌈 Ícone', cost: 4500, description: '3 cartas ícone garantidas' },
  lendario: { label: '🔥 Lendário', cost: 8500, description: '3 cartas lendárias garantidas' },
  eclipse: { label: '🌑 Eclipse', cost: 12500, description: '3 cartas Eclipse garantidas' },
};
export const PACK_TYPES = Object.keys(PACKS) as PackType[];
export const GALLERY_TIERS: ArtTier[] = ['comum', 'prata', 'ouro', 'premium', 'icone', 'lendario', 'eclipse'];

export const TIER_NAMES: Record<string,string> = {
  comum:'Comum',prata:'Prata',ouro:'Ouro',premium:'Premium (prévia)',
  icone:'Ícone',lendario:'Lendário',eclipse:'Eclipse',legado:'Clássica (legado)',misto:'Misto',todas:'Todas',
};

export function editionTier(edition: string): ArtTier | 'legado' {
  if (edition.startsWith('eclipse')) return 'eclipse';
  if (edition.startsWith('lendario')) return 'lendario';
  if (edition.startsWith('icone')) return 'icone';
  if (edition.startsWith('premium')) return 'premium';
  if (edition.startsWith('ouro')) return 'ouro';
  if (edition.startsWith('prata')) return 'prata';
  if (edition.startsWith('comum')) return 'comum';
  return 'legado';
}

// Todas as 75 imagens ficam na galeria. Só as 53 artes completas podem ser sorteadas.
export const ALL_ARTS = Object.entries(EDITIONS).flatMap(([playerKey, entries]) =>
  entries.map(entry => ({playerKey, ...entry, tier: editionTier(entry.edition)})));

export const PLAYABLE_ARTS: EditionCard[] = ALL_ARTS.flatMap(a => {
  const player = getPlayer(a.playerKey);
  if (a.quality !== 'full' || !player || a.tier === 'premium' || a.tier === 'legado') return [];
  return [{ player, edition:a.edition, tier:a.tier, file:a.file }];
});

export const PACK_ODDS: ReadonlyArray<{tier: Exclude<ArtTier,'premium'>; percent:number}> = [
  {tier:'comum', percent:55},
  {tier:'prata', percent:22},
  {tier:'ouro', percent:12},
  {tier:'icone', percent:7},
  {tier:'lendario', percent:3},
  {tier:'eclipse', percent:1},
];

export function editionArtUrl(playerKey: string, edition: string): string {
  const item = (EDITIONS[playerKey] ?? []).find(e => e.edition === edition && e.quality === 'full');
  if (item) return 'https://raw.githubusercontent.com/c9bleblestro/futstancy/main/' + item.file + '?v=' + ART_REV;
  const player = getPlayer(playerKey);
  return player ? playerArtUrl(player, 0) : '';
}

export function tierCount(tier: ArtTier): { full: number; previews: number } {
  const entries = ALL_ARTS.filter(e => e.tier === tier);
  return {full: entries.filter(e=>e.quality==='full').length,previews:entries.filter(e=>e.quality!=='full').length};
}

export function drawEdition(type: PackType='misto', random:()=>number=Math.random): EditionCard {
  let tier: Exclude<ArtTier, 'premium'>;
  if (type === 'misto') {
    const roll = Math.max(0, Math.min(0.999999999, random())) * 100;
    let cumulative = 0;
    tier = 'comum';
    for (const chance of PACK_ODDS) {
      cumulative += chance.percent;
      if (roll < cumulative) { tier = chance.tier; break; }
    }
  } else tier = type;
  const pool = PLAYABLE_ARTS.filter(e => e.tier === tier);
  if (!pool.length) throw new Error('Pacote sem artes completas: ' + tier);
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
  return pool[index];
}

export function drawEditionPack(type:PackType='misto',random:()=>number=Math.random):EditionCard[] {
  return Array.from({length:3},()=>drawEdition(type,random));
}

export function galleryArtFiles(tier:ArtTier|'todas'='todas'):string[] {
  return ALL_ARTS.filter(a=>tier==='todas'||a.tier===tier).map(a=>a.file);
}
