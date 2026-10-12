"""
scripts/__maintenance__/riskmap_alert_to_toast.py

将 src/app/riskmap/page.tsx 中的 alert() 调用批量替换为 toast.push()。

支持的模式:
1. alert('xxx') / alert("xxx") / alert(`xxx`)           → toast.push({ variant, title: 'xxx' })
2. alert(error.message || 'xxx')                         → toast.push({ variant: 'error', title: 'xxx', description: error.message })
3. alert(error instanceof Error ? error.message : 'xxx') → toast.push({ variant: 'error', title: 'xxx', description: error instanceof Error ? error.message : 'Unknown error' })
4. alert(`xxx\n${var}yyy`)                               → toast.push({ variant, title: `xxx\n${var}yyy` })

无法识别的 alert() 会保持原样,人工处理。

默认会备份原文件到 page.tsx.bak。
"""
import re
import sys
from pathlib import Path

PATH = Path(r"d:\Nat Cat Platform\UI_system\src\app\riskmap\page.tsx")
BACKUP = PATH.with_suffix('.tsx.bak')

# 模式 1: alert(<simple_string>) — 单行字符串字面量
RE_SIMPLE_STR = re.compile(
    r"alert\(\s*((['\"\`])(?:(?!\2).)*?\2)\s*\)",
    re.DOTALL
)

# 模式 2: alert(error.message || <str>)
RE_ERR_FALLBACK = re.compile(
    r"alert\(\s*(error\.message\s*\|\|\s*((['\"\`])(?:(?!\3).)*?\3))\s*\)",
    re.DOTALL
)

# 模式 3: alert(error instanceof Error ? error.message : <str>)
RE_ERR_TERNARY = re.compile(
    r"alert\(\s*(error\s+instanceof\s+Error\s*\?\s*error\.message\s*:\s*((['\"\`])(?:(?!\4).)*?\4))\s*\)",
    re.DOTALL
)

def map_variant(title: str) -> str:
    """根据 title 文本启发式映射 toast variant。"""
    t = title.lower()
    if any(kw in t for kw in ('failed', '失败', 'error', 'cannot', 'unable', 'invalid')):
        return 'error'
    if any(kw in t for kw in ('saved', 'success', '成功', 'complete', 'loaded', '完成', '下载')):
        return 'success'
    if any(kw in t for kw in ('please', 'warning', '注意', '警告', '必须')):
        return 'warning'
    return 'info'

def replace_simple(m: re.Match) -> str:
    s = m.group(1)
    # 取出字符串字面量(去掉引号)
    raw = s[1:-1]
    # 反转义 \\n 等?  简单起见,JS 字符串原样保留
    variant = map_variant(raw)
    return f"toast.push({{ variant: '{variant}', title: {s} }})"

def replace_err_fallback(m: re.Match) -> str:
    full_expr = m.group(1)         # "error.message || 'xxx'"
    fallback_str = m.group(2)     # "'xxx'"
    title_raw = fallback_str[1:-1]
    return f"toast.push({{ variant: 'error', title: {fallback_str}, description: {full_expr.split('||', 1)[0].strip()} }})"

def replace_err_ternary(m: re.Match) -> str:
    full_expr = m.group(1)
    fallback_str = m.group(2)
    return (
        f"toast.push({{ variant: 'error', title: {fallback_str}, "
        f"description: {full_expr} }})"
    )

def main():
    if not PATH.exists():
        print(f"❌ File not found: {PATH}")
        sys.exit(1)

    original = PATH.read_text(encoding='utf-8')
    backup = BACKUP.read_text(encoding='utf-8') if BACKUP.exists() else original

    # 把备份写到 .bak(若尚未存在)
    if not BACKUP.exists():
        BACKUP.write_text(original, encoding='utf-8')
        print(f"✓ Backup created: {BACKUP}")

    text = original
    counts = {'simple': 0, 'err_fallback': 0, 'err_ternary': 0, 'unmatched': 0}

    # 优先匹配更具体的模式(从最具体到最不具体)
    def sub_simple(_m):
        counts['simple'] += 1
        return replace_simple(_m)
    def sub_fallback(_m):
        counts['err_fallback'] += 1
        return replace_err_fallback(_m)
    def sub_ternary(_m):
        counts['err_ternary'] += 1
        return replace_err_ternary(_m)

    # 先 ternary,然后 fallback,然后 simple(简单模式会匹配 error.message || 'x',所以要先匹配 ternary/fallback)
    text = RE_ERR_TERNARY.sub(sub_ternary, text)
    text = RE_ERR_FALLBACK.sub(sub_fallback, text)
    text = RE_SIMPLE_STR.sub(sub_simple, text)

    # 计算仍未替换的 alert(说明有复杂情况)
    remaining = re.findall(r'\balert\(', text)
    counts['unmatched'] = len(remaining)

    PATH.write_text(text, encoding='utf-8')

    print("=" * 60)
    print("替换完成")
    print("=" * 60)
    print(f"  simple string:       {counts['simple']}")
    print(f"  error.message || 'x':{counts['err_fallback']}")
    print(f"  error instanceof Error ? : {counts['err_ternary']}")
    print(f"  剩余 alert(...):      {counts['unmatched']}")
    print()
    print(f"✓ Updated: {PATH}")
    if counts['unmatched'] > 0:
        print(f"⚠️ 仍有 {counts['unmatched']} 处 alert 未处理(通常是 alert(`多行${var}`) 或 alert(`xxx` +\n  'yyy' + var))")
        print("  人工 review 后再用 Edit 手工替换")

if __name__ == '__main__':
    main()