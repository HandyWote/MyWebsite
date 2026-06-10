import { useEffect, useRef } from 'react';

const DEFAULT_META = {
  title: 'HandyWote',
  description: 'HandyWote 的文章与技术分享。'
};

const stripMarkdown = (text = '') => {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/[#>*_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const ensureMetaTag = (attr, key, content) => {
  if (typeof document === 'undefined' || !key) return null;
  let selector = `meta[${attr}="${key}"]`;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  if (content) {
    tag.setAttribute('content', content);
  }
  return tag;
};

const setMetaName = (name, content) => {
  if (!content) return;
  ensureMetaTag('name', name, content);
};

const setMetaProperty = (property, content) => {
  if (!content) return;
  ensureMetaTag('property', property, content);
};

const setCanonicalLink = (url) => {
  if (typeof document === 'undefined' || !url) return;
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
};

const setJsonLd = (data) => {
  if (typeof document === 'undefined' || !data) return;
  let script = document.getElementById('article-json-ld');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'article-json-ld';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
};

const removeJsonLd = () => {
  if (typeof document === 'undefined') return;
  const script = document.getElementById('article-json-ld');
  if (script && script.parentNode) {
    script.parentNode.removeChild(script);
  }
};

/**
 * 管理文章页面的 SEO meta 标签、JSON-LD 结构化数据和 canonical link。
 * 从 ArticleDetail 中提取，便于在其他需要 SEO 的页面复用。
 *
 * @param {object} article - 文章对象
 * @param {string} coverUrl - 解析后的封面 URL
 */
export default function useArticleSeo(article, coverUrl) {
  const defaultMetaRef = useRef(null);

  // 保存原始 meta 信息（仅首次执行）
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!defaultMetaRef.current) {
      const originalDescription = document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content');
      defaultMetaRef.current = {
        title: document.title || DEFAULT_META.title,
        description: originalDescription || DEFAULT_META.description
      };
    }
  }, []);

  useEffect(() => {
    if (!article || typeof document === 'undefined') return;

    const baseTitle = article.title
      ? `${article.title} - HandyWote`
      : (defaultMetaRef.current?.title || DEFAULT_META.title);

    const descriptionSource =
      article.summary ||
      stripMarkdown(article.content || '').slice(0, 160);
    const resolvedDescription =
      descriptionSource || defaultMetaRef.current?.description || DEFAULT_META.description;

    const canonicalUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/articles/${article.id}`
        : '';

    document.title = baseTitle;
    setMetaName('description', resolvedDescription);
    if (canonicalUrl) {
      setCanonicalLink(canonicalUrl);
    }
    setMetaProperty('og:title', baseTitle);
    setMetaProperty('og:description', resolvedDescription);
    if (canonicalUrl) {
      setMetaProperty('og:url', canonicalUrl);
    }
    setMetaProperty('og:type', 'article');
    setMetaProperty('og:site_name', 'HandyWote');
    if (coverUrl) {
      setMetaProperty('og:image', coverUrl);
      setMetaName('twitter:image', coverUrl);
    }
    setMetaName('twitter:card', coverUrl ? 'summary_large_image' : 'summary');
    setMetaName('twitter:title', baseTitle);
    setMetaName('twitter:description', resolvedDescription);
    if (canonicalUrl) {
      setMetaName('twitter:url', canonicalUrl);
    }

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title || defaultMetaRef.current?.title || DEFAULT_META.title,
      description: resolvedDescription,
      author: {
        '@type': 'Person',
        name: 'HandyWote'
      },
      datePublished: article.created_at || article.updated_at || null,
      dateModified: article.updated_at || article.created_at || null,
      image: coverUrl || undefined,
      url: canonicalUrl || undefined,
      inLanguage: 'zh-CN',
      keywords: Array.isArray(article.tags)
        ? article.tags.join(', ')
        : article.tags
    };
    setJsonLd(structuredData);

    return () => {
      if (defaultMetaRef.current) {
        document.title = defaultMetaRef.current.title || DEFAULT_META.title;
        setMetaName('description', defaultMetaRef.current.description || DEFAULT_META.description);
      }
      removeJsonLd();
    };
  }, [article, coverUrl]);
}
