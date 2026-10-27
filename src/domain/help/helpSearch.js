// Local search over the help drafts. Accent and case insensitive; every word must match.
import { plainText } from './helpText';

const STOP_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas', 'y', 'o', 'a', 'al', 'en', 'que', 'para',
  'por', 'con', 'como', 'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'se', 'me', 'lo', 'es', 'son', 'hacer', 'hago', 'puedo', 'quiero', 'como']);
const SYNONYMS = {
  borrar: ['borrar', 'eliminar', 'archivar', 'cancelar'], eliminar: ['eliminar', 'borrar', 'archivar', 'cancelar'],
  password: ['contrasena'], clave: ['contrasena', 'clave'], medico: ['doctor', 'medico'], dentista: ['doctor', 'dentista'],
  usuario: ['usuario', 'personal', 'equipo'], empleado: ['personal', 'equipo', 'usuario'], horario: ['horario', 'agenda'],
  expediente: ['expediente', 'paciente'], imprimir: ['imprimir', 'impresion'], firmar: ['firma'], login: ['sesion', 'acceso']
};

export const normalize = text => plainText(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Light Spanish stemming: keeps a prefix so emito/emitir, cita/citas or aparecen/aparece match.
const stem = word => (word.length >= 6 ? word.slice(0, Math.max(5, word.length - 2)) : word.length === 5 ? word.slice(0, 4) : word);

export function queryTerms(query) {
  return normalize(query).split(/[^a-z0-9]+/).filter(word => word.length > 1 && !STOP_WORDS.has(word))
    .map(word => (SYNONYMS[word] || SYNONYMS[word.replace(/e?s$/, '')] || [stem(word)]));
}

export function buildHelpIndex({ entries, articles, answers, topics }) {
  return entries.filter(entry => (entry.type === 'guide' ? articles[entry.id] : answers[entry.id])).map(entry => {
    const article = articles[entry.id];
    const body = article
      ? article.sections.map(section => [section.title].concat(section.paragraphs || [], section.steps || [], section.items || []).join(' ')).join(' ')
      : answers[entry.id].join(' ');
    const topic = topics.find(item => item.id === entry.topic);
    return {
      entry, topic,
      snippet: plainText(article ? article.summary : answers[entry.id][0]),
      title: normalize(entry.title), summary: normalize(article ? article.summary : ''), body: normalize(body), topicTitle: normalize(topic.title)
    };
  });
}

export function searchHelp(index, query, limit = 12) {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  return index.map(item => {
    let score = 0;
    for (const options of terms) {
      const best = Math.max(...options.map(word => (item.title.includes(word) ? 10 : item.summary.includes(word) ? 4 : item.topicTitle.includes(word) ? 2 : item.body.includes(word) ? 1 : 0)));
      if (!best) return null;
      score += best;
    }
    return { ...item, score: score + (item.entry.type === 'guide' ? 0.5 : 0) };
  }).filter(Boolean).sort((left, right) => right.score - left.score || left.entry.order - right.entry.order).slice(0, limit);
}
