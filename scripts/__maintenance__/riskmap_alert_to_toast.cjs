#!/usr/bin/env node
/**
 * scripts/__maintenance__/riskmap_alert_to_toast.cjs
 *
 * 将 src/app/riskmap/page.tsx 中的 alert() 批量替换为 toast.push()。
 *
 * 模式:
 *   1. alert('xxx') / alert("xxx") / alert(`xxx`)
 *        → toast.push({ variant, title: 'xxx' })
 *   2. alert(error.message || 'xxx')
 *        → toast.push({ variant: 'error', title: 'xxx', description: error.message })
 *   3. alert(error instanceof Error ? error.message : 'xxx')
 *        → toast.push({ variant: 'error', title: 'xxx', description: <ternary> })
 *
 * 复杂 alert(`多行${var}`) / alert('a' + var + 'b') 保留原样,人工 review。
 * 备份到 page.tsx.bak。
 */
const fs = require('fs');
const path = require('path');

const TARGET = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'app',
  'riskmap',
  'page.tsx',
);
const BACKUP = TARGET + '.bak';

// 单行 / 多行字符串字面量作为 alert 唯一参数
// 捕获组 1: 引号; 捕获组 2: 引号内文本
const RE_SIMPLE = /alert\(\s*(['"`])((?:(?!\1)[\s\S])*?)\1\s*\)/g;
// alert(error.message || 'xxx') — 仅��获 fallback 字符串
const RE_ERR_FALLBACK =
  /alert\(\s*error\.message\s*\|\|\s*(['"`])((?:(?!\1)[\s\S])*?)\1\s*\)/g;
// alert(error instanceof Error ? error.message : 'xxx') — 仅捕获 fallback
const RE_ERR_TERNARY =
  /alert\(\s*error\s+instanceof\s+Error\s*\?\s*error\.message\s*:\s*(['"`])((?:(?!\1)[\s\S])*?)\1\s*\)/g;

function mapVariant(title) {
  const t = title.toLowerCase();
  if (/failed|失败|error|cannot|unable|invalid|错误|异常|不能/.test(t)) return 'error';
  if (/saved|success|成功|complete|loaded|完成|下载/.test(t)) return 'success';
  if (/please|warning|注意|警告|必须/.test(t)) return 'warning';
  return 'info';
}

function replaceSimple(match, quote, body) {
  const variant = mapVariant(String(body));
  return `toast.push({ variant: '${variant}', title: ${quote}${body}${quote} })`;
}

function replaceErrFallback(match, quote, body) {
  return `toast.push({ variant: 'error', title: ${quote}${body}${quote}, description: error.message })`;
}

function replaceErrTernary(match, quote, body) {
  return `toast.push({ variant: 'error', title: ${quote}${body}${quote}, description: error instanceof Error ? error.message : 'Unknown error' })`;
}

function main() {
  if (!fs.existsSync(TARGET)) {
    console.error(`❌ File not found: ${TARGET}`);
    process.exit(1);
  }
  const original = fs.readFileSync(TARGET, 'utf-8');

  if (!fs.existsSync(BACKUP)) {
    fs.writeFileSync(BACKUP, original, 'utf-8');
    console.log(`✓ Backup created: ${BACKUP}`);
  }

  const counts = { simple: 0, err_fallback: 0, err_ternary: 0 };

  let text = original;
  text = text.replace(RE_ERR_TERNARY, (...args) => {
    counts.err_ternary += 1;
    return replaceErrTernary(...args);
  });
  text = text.replace(RE_ERR_FALLBACK, (...args) => {
    counts.err_fallback += 1;
    return replaceErrFallback(...args);
  });
  text = text.replace(RE_SIMPLE, (...args) => {
    counts.simple += 1;
    return replaceSimple(...args);
  });

  fs.writeFileSync(TARGET, text, 'utf-8');

  const remaining = (text.match(/\balert\(/g) || []).length;

  console.log('='.repeat(60));
  console.log('替换完成');
  console.log('='.repeat(60));
  console.log(`  simple string:           ${counts.simple}`);
  console.log(`  error.message || 'x':    ${counts.err_fallback}`);
  console.log(`  error instanceof Error : ${counts.err_ternary}`);
  console.log(`  剩余 alert(...):         ${remaining}`);
  console.log();
  console.log(`✓ Updated: ${TARGET}`);
  if (remaining > 0) {
    console.log(`⚠️ 仍有 ${remaining} 处 alert 未替换(通常是 alert(\`多行${'$'}{var}\`) 或 alert('a' + var + 'b') 等模式)`);
    console.log('  人工 review 后用 Edit 手工替换');
  }
}

main();