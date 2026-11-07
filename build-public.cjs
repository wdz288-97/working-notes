// Builds public/, a folder any static host can serve as it is (GitHub Pages, Netlify, Cloudflare Pages).
// The claude.ai artifact keeps using the source files; this only turns them into a standalone site.
// Run from this folder: node build-public.cjs
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SOURCE = __dirname;
const OUT = path.join(SOURCE, 'public');
const PAGES = ['playbook.html', 'ai.html', 'ai-learn.html', 'ai-brief.html', 'ai-check.html', 'ai-delegate.html', 'ai-value.html', 'ai-analytics.html', 'reading.html'];
const ASSETS = ['site.css', 'site.js', 'icons.svg', 'favicon.svg'];
const DESCRIPTIONS = {
  'index.html': 'Working notes from a business intelligence analyst: how analysis runs as a loop, how to work with AI, and the books behind it.',
  'playbook.html': 'A business analysis playbook: one loop of plan, do, check and act, followed through one month of a made-up café chain.',
  'ai.html': 'A practical guide to working with AI, in six chapters: learning what it can do, briefing it, checking its work, delegating, judging value, and AI in analytics.',
  'ai-learn.html': 'What to learn about AI and where to keep up, how products are built around a model, how to read benchmarks, and how to run a small trial of your own.',
  'ai-brief.html': 'How to brief and steer AI: your role in the task, a brief that names the outcome, context as a working folder, sources, examples, and a worked example.',
  'ai-check.html': 'How to check work done with AI: tests and loops with a way out, borrowed checks, second opinions, and the evidence behind an interpretation.',
  'ai-delegate.html': 'Which steps to hand to AI, how to pass work between AIs, when a method is worth making reusable, and what access an agent should have.',
  'ai-value.html': 'Whether AI is worth it: the whole effort including checking, testing tools against their claims, build or adapt, and a worked example.',
  'ai-analytics.html': 'Where AI fits in data analysis, and the two checkpoints where its work gets checked.',
  'reading.html': 'The books and references behind this practice.'
};
const PAGE_NAMES = PAGES.map(page => page.replace(/\.html$/, ''));

function headExtras(page) {
  return [
    '<meta name="description" content="' + DESCRIPTIONS[page] + '">',
    '<link rel="icon" href="favicon.svg" type="image/svg+xml">'
  ].join('\n');
}

// Web hosts serve /playbook from playbook.html and / from index.html, so the public site links to clean addresses.
// The source keeps the .html links because clean ones don't resolve when the files are opened from disk.
// edgeone.json redirects the old .html addresses here, so shared links keep working.
function cleanPageLinks(html) {
  const pageLink = new RegExp('href="(' + PAGE_NAMES.join('|') + ')\\.html(#[^"]*)?"', 'g');
  return html
    .replace(/href="index\.html(#[^"]*)?"/g, (match, hash) => 'href="./' + (hash || '') + '"')
    .replace(pageLink, (match, name, hash) => 'href="' + name + (hash || '') + '"');
}

// The home page is written as an artifact page (no doctype or head); give it a full document here
function buildHome() {
  const source = fs.readFileSync(path.join(SOURCE, 'data-analytics-playbook.html'), 'utf8');
  const split = source.indexOf('<div class="wrap"');
  if (split < 0) throw new Error('Home page: could not find the start of the body');
  const head = source.slice(0, split)
    .split('\n')
    .filter(line => !line.includes('claude:viewport-fit-sides'))
    .join('\n')
    .trim();
  const body = source.slice(split).trim();
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    head,
    headExtras('index.html'),
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

function buildPage(page) {
  const source = fs.readFileSync(path.join(SOURCE, page), 'utf8');
  if (!source.includes('</head>')) throw new Error(page + ': no </head> found');
  return source.replace('</head>', headExtras(page) + '\n</head>');
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) fs.copyFileSync(path.join(from, name), path.join(to, name));
}

// Fingerprinted file names: site.css becomes site.<hash>.css, so a changed file always has a new address and
// no phone, browser or CDN can pair a new page with an old stylesheet. icons.svg goes first because site.js names it.
// The plain names are written too, so a page cached from before still finds its files.
function fingerprint(name, text) {
  const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 10);
  const dot = name.lastIndexOf('.');
  return name.slice(0, dot) + '.' + hash + name.slice(dot);
}

function writeFingerprintedAssets() {
  const renamed = {};
  const read = file => fs.readFileSync(path.join(SOURCE, file), 'utf8');
  const write = (file, text) => {
    renamed[file] = fingerprint(file, text);
    fs.writeFileSync(path.join(OUT, renamed[file]), text);
    fs.writeFileSync(path.join(OUT, file), text);
  };
  write('icons.svg', read('icons.svg'));
  const script = read('site.js');
  const spriteLine = "var SPRITE = 'icons.svg';";
  if (!script.includes(spriteLine)) throw new Error('site.js: could not find the icon sprite name to fingerprint');
  write('site.js', script.replace(spriteLine, "var SPRITE = '" + renamed['icons.svg'] + "';"));
  write('site.css', read('site.css'));
  return renamed;
}

function linkFingerprintedAssets(html, renamed) {
  return html
    .replace(/href="site\.css"/g, 'href="' + renamed['site.css'] + '"')
    .replace(/src="site\.js"/g, 'src="' + renamed['site.js'] + '"')
    .replace(/href="icons\.svg#/g, 'href="' + renamed['icons.svg'] + '#');
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const renamed = writeFingerprintedAssets();
const finish = html => linkFingerprintedAssets(cleanPageLinks(html), renamed);
fs.writeFileSync(path.join(OUT, 'index.html'), finish(buildHome()));
PAGES.forEach(page => fs.writeFileSync(path.join(OUT, page), finish(buildPage(page))));
ASSETS.filter(file => !renamed[file]).forEach(file => fs.copyFileSync(path.join(SOURCE, file), path.join(OUT, file)));
copyDir(path.join(SOURCE, 'covers'), path.join(OUT, 'covers'));

const files = [];
(function list(dir, prefix) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) list(full, prefix + name + '/');
    else files.push(prefix + name + '  ' + fs.statSync(full).size + ' bytes');
  }
})(OUT, '');
console.log('Built public/ with ' + files.length + ' files:\n  ' + files.join('\n  '));
