import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { legacyEnglishTranslations } from '@/i18n/legacyEnglishTranslations';

const translatedAttributes = ['aria-label', 'placeholder', 'title'] as const;
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

const translateText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const direct = legacyEnglishTranslations[trimmed];
  return direct ? value.replace(trimmed, direct) : value;
};

const shouldSkipText = (node: Text) => {
  const parent = node.parentElement;
  return !parent || Boolean(parent.closest('script, style, code, pre, [data-no-auto-translate]'));
};

const translateElement = (element: Element) => {
  translatedAttributes.forEach((attribute) => {
    const value = element.getAttribute(attribute);
    if (!value) return;
    const translated = translateText(value);
    if (translated === value) return;
    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = new Map();
      originalAttributes.set(element, originals);
    }
    if (!originals.has(attribute)) originals.set(attribute, value);
    element.setAttribute(attribute, translated);
  });

  if (element.getAttribute('dir') === 'rtl') {
    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = new Map();
      originalAttributes.set(element, originals);
    }
    if (!originals.has('dir')) originals.set('dir', 'rtl');
    element.setAttribute('dir', 'ltr');
  }
};

const translateTree = (root: Node) => {
  if (root.nodeType === Node.TEXT_NODE) {
    const text = root as Text;
    if (shouldSkipText(text)) return;
    const value = text.nodeValue ?? '';
    const translated = translateText(value);
    if (translated !== value) {
      if (!originalText.has(text)) originalText.set(text, value);
      text.nodeValue = translated;
    }
    return;
  }

  if (!(root instanceof Element)) return;
  translateElement(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      const text = current as Text;
      if (!shouldSkipText(text)) {
        const value = text.nodeValue ?? '';
        const translated = translateText(value);
        if (translated !== value) {
          if (!originalText.has(text)) originalText.set(text, value);
          text.nodeValue = translated;
        }
      }
    } else if (current instanceof Element) {
      translateElement(current);
    }
    current = walker.nextNode();
  }
};

const restoreArabic = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let current: Node | null = document.body;
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      const text = current as Text;
      const original = originalText.get(text);
      if (original !== undefined) text.nodeValue = original;
    } else if (current instanceof Element) {
      originalAttributes.get(current)?.forEach((value, attribute) => current.setAttribute(attribute, value));
    }
    current = walker.nextNode();
  }
};

export const LegacyTranslationBridge = () => {
  const { lang } = useLanguage();

  useEffect(() => {
    if (lang === 'ar') {
      restoreArabic();
      return;
    }

    translateTree(document.body);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') translateTree(mutation.target);
        mutation.addedNodes.forEach(translateTree);
        if (mutation.type === 'attributes' && mutation.target instanceof Element) translateElement(mutation.target);
      });
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatedAttributes, 'dir'],
    });
    return () => observer.disconnect();
  }, [lang]);

  return null;
};