import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './lib/create-store.mjs';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
const root = path.dirname(fileURLToPath(import.meta.url));
const store = createStore(root);
const api = `https://api.telegram.org/bot${token}`;

async function call(method, payload = {}) {
  const response = await fetch(`${api}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!result.ok) throw new Error(result.description);
  return result.result;
}

async function send(chatId, text, extra = {}) { return call('sendMessage', { chat_id: chatId, text, ...extra }); }

async function onMessage(message) {
  const text = message.text || '';
  if (!text.startsWith('/start')) return send(message.chat.id, 'лагерная почта пока понимает только ссылку из заявки');
  const code = text.split(/\s+/)[1];
  if (!code) return send(message.chat.id, 'сначала заполни заявку по ссылке из чата буткемпа');
  let found = false;
  await store.update(data => ({ ...data, applications: data.applications.map(item => {
    if (item.botCode !== code) return item;
    found = true;
    return { ...item, telegramId: String(message.from.id), telegramUsername: message.from.username || null, status: 'confirmed', botCode: null, confirmedAt: new Date().toISOString() };
  }) }));
  if (!found) return send(message.chat.id, 'эта ссылка уже использована или устарела');
  return send(message.chat.id, 'ты в почтовом отряде ✉️\n\nперед жеребьёвкой я ещё раз уточню, получается ли участвовать. адреса в сообщениях не присылаю.');
}

let offset = 0;
console.log('Telegram bot polling started');
while (true) {
  try {
    const updates = await call('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] });
    for (const update of updates) {
      offset = update.update_id + 1;
      if (update.message) await onMessage(update.message);
    }
  } catch (error) {
    console.error(error.message);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
