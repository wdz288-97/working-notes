// Builds public/, a folder any static host can serve as it is (GitHub Pages, Netlify, Cloudflare Pages).
// The claude.ai artifact keeps using the source files; this only turns them into a standalone site.
// Run from this folder: node build-public.cjs
'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE = __dirname;
const OUT = path.join(SOURCE, 'public');
const PAGES = ['playbook.html', 'ai.html', 'reading.html'];
const ASSETS = ['site.css', 'site.js', 'icons.svg', 'favicon.svg'];
const DESCRIPTIONS = {
  'index.html': 'Working notes from a business intelligence analyst: how analysis runs as a loop, how AI fits in, and the books behind it.',
  'playbook.html': 'A business analysis playbook: one loop of plan, do, check and act, followed through one month of a made-up café chain.',
  'ai.html': 'How AI tools fit into analysis, and the two places their work gets checked.',
  'reading.html': 'The books and references behind this practice.'
};

function headExtras(page) {
  return [
    '<meta name="description" content="' + DESCRIPTIONS[page] + '">',
    '<link rel="icon" href="favicon.svg" type="image/svg+xml">'
  ].join('\n');
}

// On a web host the folder address serves index.html, so link home as "./" to keep "/index.html" out of the address bar.
// The source keeps "index.html" because "./" opens a folder listing when the files are opened from disk.
function cleanHomeLinks(html) {
  return html.replace(/href="index\.html"/g, 'href="./"');
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

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), cleanHomeLinks(buildHome()));
PAGES.forEach(page => fs.writeFileSync(path.join(OUT, page), cleanHomeLinks(buildPage(page))));
ASSETS.forEach(file => fs.copyFileSync(path.join(SOURCE, file), path.join(OUT, file)));
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
