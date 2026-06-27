import { useEffect } from 'react';
import type { LanguageCode } from '../types';
import { visualI18nSources, type VisualI18nKey } from '../utils/visualI18nSources';
import { visualI18nRu } from '../utils/visualI18nRu';
import { visualI18nJa } from '../utils/visualI18nJa';
import { visualI18nZh } from '../utils/visualI18nZh';
import { visualI18nPt, visualI18nFr, visualI18nDe } from '../utils/visualI18nLatins';
import { visualI18nIt, visualI18nNl } from '../utils/visualI18nMoreLatins';

const LANGUAGE_KEY = 'pollazo_language';
const SKIP_SELECTOR = 'script,style,textarea,select,input,.maplibregl-map,.maplibregl-map *,[contenteditable="true"]';

const targets: Partial<Record<LanguageCode, Partial<Record<VisualI18nKey, string>>>> = {
  pt: visualI18nPt,
  fr: visualI18nFr,
  de: visualI18nDe,
  it: visualI18nIt,
  nl: visualI18nNl,
  ru: visualI18nRu,
  ja: visualI18nJa,
  zh: visualI18nZh,
};

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();

const sourceIndex = new Map<string, VisualI18nKey>();
Object.entries(visualI18nSources).forEach(([id, phrases]) => {
  phrases.forEach(phrase => sourceIndex.set(normalize(phrase), id as VisualI18nKey));
});

const currentLanguage = (): LanguageCode => {
  const raw = window.localStorage.getItem(LANGUAGE_KEY) as LanguageCode | null;
  return raw || 'es';
};

const findTranslation = (value: string, language: LanguageCode) => {
  if (language === 'es') return '';

  const id = sourceIndex.get(normalize(value));
  if (!id) return '';

  const languageTargets = targets[language];
  return languageTargets?.[id] || '';
};

export default function PollazoLanguagePolish() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let timer = 0;

    const run = () => {
      timer = 0;
      const language = currentLanguage();
      if (language === 'es') return;

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
          const key = normalize(node.nodeValue || '');
          if (!key || key.length > 120) return NodeFilter.FILTER_REJECT;
          return sourceIndex.has(key) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        },
      });

      const nodes: Text[] = [];
      let node = walker.nextNode();
      while (node && nodes.length < 320) {
        nodes.push(node as Text);
        node = walker.nextNode();
      }

      nodes.forEach(textNode => {
        const current = textNode.nodeValue || '';
        const replacement = findTranslation(current, language);
        if (!replacement) return;
        textNode.nodeValue = current.replace(current.trim(), replacement);
      });
    };

    const schedule = () => {
      if (timer) return;
      timer = window.setTimeout(run, 120);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    schedule();
    window.addEventListener('click', schedule, true);
    window.addEventListener('input', schedule, true);
    window.addEventListener('popstate', schedule);

    return () => {
      if (timer) window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('click', schedule, true);
      window.removeEventListener('input', schedule, true);
      window.removeEventListener('popstate', schedule);
    };
  }, []);

  return null;
}
