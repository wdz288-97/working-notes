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
  'ai-learn.html': 'Start here if you are new to AI: what chat apps are, trying them on small tasks, how AI got here, keeping up, and choosing tools that suit you.',
  'ai-brief.html': 'How to brief and steer AI: your role in the task, a brief that names the outcome, context as a working folder, sources, examples, and a worked example.',
  'ai-check.html': 'How to check work done with AI: tests and loops with a way out, borrowed checks, second opinions, and the evidence behind an interpretation.',
  'ai-delegate.html': 'Which steps to hand to AI, how to pass work between AIs, when a method is worth making reusable, and what access an agent should have.',
  'ai-value.html': 'Whether AI is worth it: the whole effort including checking, testing tools against their claims, build or adapt, and a worked example.',
  'ai-analytics.html': 'AI in data analysis: a workflow with two checkpoints, organising context for reuse, the foundations analysts need, and starting a team on real requests.',
  'reading.html': 'Books that shape how I work and think, grouped by theme, with what each one taught me.'
};
// The Chinese pages live in zh/ with the same file names, and link one folder up for styles, script, icons and covers
const ZH_DESCRIPTIONS = {
  'index.html': '一位商业智能分析师的工作笔记：分析工作怎样形成一个循环，怎样用好 AI，以及背后读过的书。',
  'playbook.html': '商业分析工作手册：用一家虚构连锁咖啡店一个月的订单，走一遍计划、执行、检查、改进的循环。',
  'ai.html': '用好 AI 的实用指南，共六章：了解 AI 能做什么、交代任务、检查成果、拆分与委派、判断值不值，以及数据分析中的 AI。',
  'ai-learn.html': '刚接触 AI 可以从这里开始：AI 对话应用是什么，先用小任务试，AI 的发展脉络，怎样跟进新进展、挑选合适的工具。',
  'ai-brief.html': '怎样给 AI 交代任务、把握方向：你在任务里的角色，写清结果的任务说明，把背景整理成工作文件夹，资料来源和示例。',
  'ai-check.html': '怎样检查 AI 参与完成的工作：测试和有出口的循环，借用现成的检查方法，第二意见，以及解读背后的证据。',
  'ai-delegate.html': '哪些步骤交给 AI，AI 之间怎样交接，什么时候值得把方法做成可复用的，以及智能体该有哪些权限。',
  'ai-value.html': 'AI 值不值得用：把检查也算进总投入，用实际效果检验工具的宣传，自己搭还是改现成的，附一个实例。',
  'ai-analytics.html': '数据分析中的 AI：有两个检查点的工作流程，整理可复用的背景资料，分析师需要的基础，以及团队怎样从真实需求起步。',
  'reading.html': '影响我工作和思考方式的书，按主题分组，附上每本书带给我的收获。'
};
const PAGE_NAMES = PAGES.map(page => page.replace(/\.html$/, ''));

function headExtras(page, lang) {
  const zh = lang === 'zh';
  return [
    '<meta name="description" content="' + (zh ? ZH_DESCRIPTIONS : DESCRIPTIONS)[page] + '">',
    '<link rel="icon" href="' + (zh ? '../' : '') + 'favicon.svg" type="image/svg+xml">'
  ].join('\n');
}

// Web hosts serve /playbook from playbook.html and / from index.html, so the public site links to clean addresses.
// The source keeps the .html links because clean ones don't resolve when the files are opened from disk.
// edgeone.json redirects the old .html addresses here, so shared links keep working.
// Links between the languages carry a folder: zh/ from an English page, ../ from a Chinese one
function cleanPageLinks(html) {
  const pageLink = new RegExp('href="((?:\\.\\./|zh/)?)(' + PAGE_NAMES.join('|') + ')\\.html(#[^"]*)?"', 'g');
  return html
    .replace(/href="((?:\.\.\/|zh\/)?)index\.html(#[^"]*)?"/g, (match, folder, hash) => 'href="' + (folder || './') + (hash || '') + '"')
    .replace(pageLink, (match, folder, name, hash) => 'href="' + folder + name + (hash || '') + '"');
}

// The home page is written as an artifact page (no doctype or head); give it a full document here
function buildHome(folder, lang) {
  const source = fs.readFileSync(path.join(SOURCE, folder, 'data-analytics-playbook.html'), 'utf8');
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
    '<html lang="' + (lang === 'zh' ? 'zh-CN' : 'en') + '">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    head,
    headExtras('index.html', lang),
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

function buildPage(folder, page, lang) {
  const source = fs.readFileSync(path.join(SOURCE, folder, page), 'utf8');
  if (!source.includes('</head>')) throw new Error(folder + page + ': no </head> found');
  return source.replace('</head>', headExtras(page, lang) + '\n</head>');
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
  // The Chinese web font: binary, fingerprinted like the rest, and site.css points to its new name
  const fontFile = 'fonts/noto-sans-sc.woff2';
  let css = read('site.css');
  if (fs.existsSync(path.join(SOURCE, fontFile))) {
    const font = fs.readFileSync(path.join(SOURCE, fontFile));
    const fontName = fingerprint(fontFile, font);
    fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
    fs.writeFileSync(path.join(OUT, fontName), font);
    fs.copyFileSync(path.join(SOURCE, 'fonts', 'OFL.txt'), path.join(OUT, 'fonts', 'OFL.txt'));
    if (!css.includes('url("' + fontFile + '")')) throw new Error('site.css: could not find the Chinese font to fingerprint');
    css = css.replace('url("' + fontFile + '")', 'url("' + fontName + '")');
  }
  write('site.css', css);
  return renamed;
}

function linkFingerprintedAssets(html, renamed) {
  return html
    .replace(/href="((?:\.\.\/)?)site\.css"/g, (m, up) => 'href="' + up + renamed['site.css'] + '"')
    .replace(/src="((?:\.\.\/)?)site\.js"/g, (m, up) => 'src="' + up + renamed['site.js'] + '"')
    .replace(/href="((?:\.\.\/)?)icons\.svg#/g, (m, up) => 'href="' + up + renamed['icons.svg'] + '#');
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const renamed = writeFingerprintedAssets();
const finish = html => linkFingerprintedAssets(cleanPageLinks(html), renamed);
fs.writeFileSync(path.join(OUT, 'index.html'), finish(buildHome('', 'en')));
PAGES.forEach(page => fs.writeFileSync(path.join(OUT, page), finish(buildPage('', page, 'en'))));
if (fs.existsSync(path.join(SOURCE, 'zh'))) {
  fs.mkdirSync(path.join(OUT, 'zh'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'zh', 'index.html'), finish(buildHome('zh', 'zh')));
  PAGES.forEach(page => fs.writeFileSync(path.join(OUT, 'zh', page), finish(buildPage('zh', page, 'zh'))));
}
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
