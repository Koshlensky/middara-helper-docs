'use strict';

const asciidoctor = require('@asciidoctor/core')();
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const IMAGES_DIR = path.join(ROOT_DIR, 'images');
const ROOT_URL = (process.env.ROOT_URL || '').replace(/\/$/, '');

const FOLDER_NAMES = {
  players: 'Для игроков',
  advanced: 'Advanced',
  cards: 'Карты',
};

let siteTemplate = '';
const searchDocuments = [];

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stripTags(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getTitleFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^=\s+(.+)$/m);
    return match ? match[1].trim() : path.basename(filePath, '.adoc');
  } catch { return path.basename(filePath, '.adoc'); }
}

function getFolderDisplayName(name) {
  return FOLDER_NAMES[name] || name.charAt(0).toUpperCase() + name.slice(1);
}

function collectTree(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => {
      if (a.name === 'index.adoc') return -1;
      if (b.name === 'index.adoc') return 1;
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name, 'ru');
    });
  const items = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const children = collectTree(fullPath);
      if (children.length > 0) {
        items.push({ type: 'dir', name: entry.name, displayName: getFolderDisplayName(entry.name), children });
      }
    } else if (entry.name.endsWith('.adoc')) {
      const relPath = path.relative(DOCS_DIR, fullPath).replace(/\\/g, '/');
      const href = ROOT_URL + '/' + relPath.replace(/\.adoc$/, '.html');
      const title = getTitleFromFile(fullPath);
      items.push({ type: 'file', name: entry.name, title, href });
    }
  }
  return items;
}

function buildNavHtml(tree, currentHref) {
  function renderItems(items, depth) {
    const filtered = (depth === 0)
      ? items.filter(function(i) { return i.name !== 'index.adoc'; })
      : items;
    let html = '<ul class="nav-list' + (depth === 0 ? ' nav-root' : '') + '">';
    for (const item of filtered) {
      if (item.type === 'dir') {
        html += '<li class="nav-folder">'
          + '<button class="nav-folder-btn" aria-expanded="true">'
          + '<svg class="folder-chevron" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">'
          + '<path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>'
          + '<span>' + escapeHtml(item.displayName) + '</span>'
          + '</button>'
          + renderItems(item.children, depth + 1)
          + '</li>';
      } else {
        const isActive = item.href === currentHref;
        html += '<li class="nav-file' + (isActive ? ' active' : '') + '">'
          + '<a href="' + item.href + '">' + escapeHtml(item.title) + '</a>'
          + '</li>';
      }
    }
    html += '</ul>';
    return html;
  }
  return renderItems(tree, 0);
}

function buildTocHtml(sections) {
  if (!sections || sections.length === 0) return '';
  function renderSections(sects) {
    if (!sects || sects.length === 0) return '';
    let html = '<ul>';
    for (const sect of sects) {
      const id = sect.getId();
      const title = sect.getTitle();
      html += '<li><a href="#' + id + '" class="toc-link">' + escapeHtml(title) + '</a>'
        + renderSections(sect.getSections()) + '</li>';
    }
    html += '</ul>';
    return html;
  }
  return renderSections(sections);
}

function buildBreadcrumbs(filePath) {
  const rel = path.relative(DOCS_DIR, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  if (parts.length <= 1) return '';
  let html = '<nav class="breadcrumbs" aria-label="breadcrumb">';
  html += '<a href="' + (ROOT_URL || '/') + '" class="breadcrumb-link">Home</a>';
  for (let i = 0; i < parts.length - 1; i++) {
    const folder = parts[i];
    html += '<span class="breadcrumb-sep">\u203a</span>';
    html += '<span class="breadcrumb-item">' + escapeHtml(getFolderDisplayName(folder)) + '</span>';
  }
  html += '</nav>';
  return html;
}

function getDepth(filePath) {
  return path.relative(DOCS_DIR, filePath).split(path.sep).length - 1;
}

function processDoc(filePath, tree) {
  const depth = getDepth(filePath);
  const relPath = path.relative(DOCS_DIR, filePath).replace(/\\/g, '/');
  const href = ROOT_URL + '/' + relPath.replace(/\.adoc$/, '.html');
  const imagesDir = depth === 0 ? 'images' : '../'.repeat(depth) + 'images';
  const assetsUrl = ROOT_URL + '/assets';
  const rootUrl = ROOT_URL === '' ? '/' : ROOT_URL + '/';

  const doc = asciidoctor.loadFile(filePath, {
    safe: 'unsafe',
    base_dir: DOCS_DIR,
    attributes: {
      icons: 'font',
      stem: 'asciimath',
      imagesdir: imagesDir,
      'source-highlighter': 'highlight.js',
      'toc!': '',
      idseparator: '-',
      sectids: '',
      sectanchors: '',
    }
  });

  const title = doc.getDocumentTitle() || path.basename(filePath, '.adoc');
  const htmlContent = doc.convert();
  const tocHtml = buildTocHtml(doc.getSections());
  const navHtml = buildNavHtml(tree, href);
  const breadcrumbsHtml = buildBreadcrumbs(filePath);
  const bodyText = stripTags(htmlContent).substring(0, 1000);
  searchDocuments.push({ id: href, title: String(title), body: bodyText });

  const fullHtml = siteTemplate
    .replace(/\{\{pageTitle\}\}/g, escapeHtml(String(title)) + ' \u2014 Middara Helper')
    .replace(/\{\{content\}\}/g, htmlContent)
    .replace(/\{\{breadcrumbs\}\}/g, breadcrumbsHtml)
    .replace(/\{\{nav\}\}/g, navHtml)
    .replace(/\{\{toc\}\}/g, tocHtml)
    .replace(/\{\{assetsUrl\}\}/g, assetsUrl)
    .replace(/\{\{rootUrl\}\}/g, rootUrl);

  const outPath = path.join(DIST_DIR, relPath.replace(/\.adoc$/, '.html'));
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, fullHtml, 'utf8');
  console.log('  ' + relPath + ' -> ' + path.relative(ROOT_DIR, outPath).replace(/\\/g, '/'));
}

function walkDocs(dir, tree) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDocs(fullPath, tree);
    else if (entry.name.endsWith('.adoc')) processDoc(fullPath, tree);
  }
}

function build() {
  console.log('Building Middara Helper docs...');
  console.log('  ROOT_URL: "' + ROOT_URL + '"');

  if (fs.existsSync(DIST_DIR)) fs.rmSync(DIST_DIR, { recursive: true });
  ensureDir(DIST_DIR);

  siteTemplate = fs.readFileSync(path.join(SRC_DIR, 'template.html'), 'utf8');

  const tree = collectTree(DOCS_DIR);
  walkDocs(DOCS_DIR, tree);

  copyDir(path.join(SRC_DIR, 'assets'), path.join(DIST_DIR, 'assets'));
  copyDir(IMAGES_DIR, path.join(DIST_DIR, 'images'));

  fs.writeFileSync(path.join(DIST_DIR, 'search-docs.json'), JSON.stringify(searchDocuments), 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, '.nojekyll'), '', 'utf8');

  console.log('\nDone! Built ' + searchDocuments.length + ' page(s).');
}

build();
