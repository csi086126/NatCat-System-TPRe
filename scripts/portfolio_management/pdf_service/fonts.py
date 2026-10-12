"""
思源黑体 / 中文字体注册到 ReportLab。

字体来源优先级(系统已有优先,避免打包大字体):
  1) Windows: C:/Windows/Fonts/NotoSansSC-VF.ttf 或 msyh.ttc
  2) Linux: /usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc
  3) 本地 fonts/ 目录(SourceHanSansSC-Regular.ttf,开发可选)

对一段持续显示的看板字体,推荐注册成 family:

    pdfmetrics.registerFontFamily(
        'SourceHanSC',
        normal='SourceHanSC-Regular',
        bold='SourceHanSC-Bold',
        italic='SourceHanSC-Regular',
        boldItalic='SourceHanSC-Bold',
    )

后续 pdf.setFont('SourceHanSC', 12) 即可。
"""
from pathlib import Path

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONTS_DIR = Path(__file__).resolve().parent / 'fonts'

_REGULAR_NAME = 'SourceHanSC-Regular'
_BOLD_NAME = 'SourceHanSC-Bold'
_FAMILY_NAME = 'SourceHanSC'

_registered = False


def _find_system_chinese_font() -> tuple[str | None, str | None, int]:
    """
    探测系统中可用的中文字体(TTF 优先,TTC 用 subfontIndex=0)。
    返回 (regular_path_or_none, bold_path_or_none, subfont_index)。
    """
    candidates_regular = [
        # Windows Noto Sans SC Variable Font
        r'C:\Windows\Fonts\NotoSansSC-VF.ttf',
        # Windows 微软雅黑 TTC
        r'C:\Windows\Fonts\msyh.ttc',
        # Linux Noto CJK
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
        # macOS
        '/System/Library/Fonts/PingFang.ttc',
        '/Library/Fonts/Songti.ttc',
    ]
    candidates_bold = [
        r'C:\Windows\Fonts\NotoSansSC-VF.ttf',  # VF 字体,regular 和 bold 用同一文件
        r'C:\Windows\Fonts\msyhbd.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc',
        '/System/Library/Fonts/PingFang.ttc',
        '/Library/Fonts/Songti.ttc',
    ]
    from pathlib import Path
    regular = next((p for p in candidates_regular if Path(p).exists()), None)
    bold = next((p for p in candidates_bold if Path(p).exists()), None)
    return regular, bold


def ensure_fonts_registered() -> str:
    """幂等注册:进程内只执行一次。返回 family 名称('SourceHanSC')。"""
    global _registered
    if _registered:
        return _FAMILY_NAME

    # 1) 优先:系统字体
    system_regular, system_bold = _find_system_chinese_font()

    # 2) 回退:本地 fonts/ 目录(开发/部署时手动放置)
    local_regular = FONTS_DIR / 'SourceHanSansSC-Regular.ttf'
    local_bold = FONTS_DIR / 'SourceHanSansSC-Bold.ttf'

    regular_path = system_regular or (str(local_regular) if local_regular.exists() else None)
    bold_path = system_bold or (str(local_bold) if local_bold.exists() else None)

    if not regular_path or not bold_path:
        raise FileNotFoundError(
            f'未找到中文字体。请确认:系统有 NotoSansSC / msyh.ttc,或将 TTF 放到 {FONTS_DIR}。'
        )

    # TTC 文件用 subfontIndex=0
    def _is_ttc(p: str) -> bool:
        return p.lower().endswith('.ttc')

    pdfmetrics.registerFont(TTFont(
        _REGULAR_NAME,
        str(regular_path),
        subfontIndex=0 if _is_ttc(regular_path) else 0,
    ))
    pdfmetrics.registerFont(TTFont(
        _BOLD_NAME,
        str(bold_path),
        subfontIndex=0 if _is_ttc(bold_path) else 0,
    ))
    pdfmetrics.registerFontFamily(
        _FAMILY_NAME,
        normal=_REGULAR_NAME,
        bold=_BOLD_NAME,
        italic=_REGULAR_NAME,
        boldItalic=_BOLD_NAME,
    )

    _registered = True
    return _FAMILY_NAME


def font_family_name() -> str:
    """返回 family 名称,不强制注册(供 opts / 调试用)。"""
    return _FAMILY_NAME