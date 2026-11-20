export const PURPLE = 0x9d52ff;
export const GOLD = 0xf4c542;
export const GREEN = 0x22c55e;
export const ERROR = 0xef4444;

type Btn = { label: string; id: string; style?: number; disabled?: boolean; emoji?: { name: string } };
export function button(label: string, id: string, style = 2, disabled = false): Btn {
  return { label, id, style, disabled };
}
export function rows(buttons: Btn[]) {
  const result: object[] = [];
  for (let i = 0; i < Math.min(buttons.length, 25); i += 5) {
    result.push({
      type: 1,
      components: buttons.slice(i, i + 5).map(b => ({ type: 2, style: b.style ?? 2, label: b.label, custom_id: b.id, disabled: b.disabled ?? false })),
    });
  }
  return result;
}

export function message(content: string, ephemeral = true, components: object[] = []) {
  return { type: 4, data: { content, flags: ephemeral ? 64 : 0, components, allowed_mentions: { parse: [] } } };
}
export function card(title: string, description: string, color = PURPLE, ephemeral = true, components: object[] = []) {
  return {
    type: 4,
    data: {
      flags: ephemeral ? 64 : 0,
      embeds: [{ title, description, color, footer: { text: 'FUTSTANCY  •  Futebol no Discord' }, timestamp: new Date().toISOString() }],
      components,
      allowed_mentions: { parse: [] },
    },
  };
}
export function update(title: string, description: string, color = PURPLE) {
  return {
    type: 7,
    data: {
      embeds: [{ title, description, color, footer: { text: 'FUTSTANCY  •  Futebol no Discord' } }],
      components: [],
      allowed_mentions: { parse: [] },
    },
  };
}
export function jsonResponse(value: object, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
