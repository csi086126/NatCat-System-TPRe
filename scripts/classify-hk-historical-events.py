r"""把 HK 425 场历史洪水事件按 family 重新组织并发布到 GeoServer。

源:
  - D:/Nat Cat Platform/FloodData/HK_FloodData/HK_FloodMap_2026-07/Historical_Event/events_classified.xlsx
  - C:/ProgramData/GeoServer/data/natcat_platform/HK_Flood_HistEvent_<时间戳>/HK_Flood_HistEvent_<时间戳>.geotiff

输出:
  - C:/ProgramData/GeoServer/data/natcat_platform/HK_Flood_HistRain_<时间戳>/HK_Flood_HistRain_<时间戳>.geotiff  (300 场)
  - C:/ProgramData/GeoServer/data/natcat_platform/HK_Flood_HistTC_<时间戳>/HK_Flood_HistTC_<时间戳>.geotiff    (125 场)

行为:
  1. 读 events_classified.xlsx → Map<时间戳, family>
     - family: 'rainfall' (非台风) / 'typhoon-compound' (台风)
  2. 对每个旧 HK_Flood_HistEvent_<时间戳> 目录:
       - 读 family
       - cp *.geotiff 到新目录(已带 EPSG:2326,不重�� raster)
  3. 删旧 HK_Flood_HistEvent_* 目录(425 个)
  4. 通过 GeoServer REST 重新发布新图层:
       delete_store → create_store → publish_coverage
  5. .env 提供 GEOSERVER_URL / GEOSERVER_USER / GEOSERVER_PASS

运行:
  C:\\Users\\sichen\\AppData\\Local\\anaconda3\\envs\\GeoMet\\python.exe scripts/classify-hk-historical-events.py
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import time
from pathlib import Path

import requests
import openpyxl

# Windows cp950 默认编码不能输出简体中文字符,强制 UTF-8。
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except (AttributeError, OSError):
        pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"

# GeoServer 安装/数据根目录。Windows 默认 C:\ProgramData\GeoServer;Linux/容器下指向挂载的 /opt/geoserver/data。
# 注意:不要读 shell 环境 GEOSERVER_HOME(其它工具可能误指 C:\Program Files\GeoServer,导致定位错误)。
GEOSERVER_HOME = Path(os.getenv("GEOSERVER_HOME_OVERRIDE") or r"C:\ProgramData\GeoServer")
DATA_DIR = GEOSERVER_HOME / "data" / "natcat_platform"

WORKSPACE = "natcat_platform"
OLD_PREFIX = "HK_Flood_HistEvent_"
RAIN_PREFIX = "HK_Flood_HistRain_"
TC_PREFIX = "HK_Flood_HistTC_"

CLASSIFY_XLSX = Path(
    r"D:\Nat Cat Platform\FloodData\HK_FloodData\HK_FloodMap_2026-07\Historical_Event\events_classified.xlsx"
)

REQUEST_TIMEOUT = 30
DELAY = 0.15  # 与 republish-hk-historical-layers.py 保持一致


# ── .env ──────────────���───────────────────────────────────────────

def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


# ── Excel → {时间戳: family} ───────────────────────────────────────

def load_classifications(xlsx: Path) -> dict[str, str]:
    """读取 events_classified.xlsx,返回 Map<时间戳, family>。

    时间戳是 19840417H00_19840417H23_H24 这种紧凑形式。
    Excel 第 1 行是中文总标题;第 4 行(索引 3)是表头("事件" | ... | "分类" | ...);
    第 5 行起是数据。
    列 0: 事件 ID (Case_1984-04-17-H00_1984-04-17-H23_H24)
    列 3: 分类 (台风事件 / 非台风事件)
    """
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    ws = wb["事件匹配"]
    rows = list(ws.iter_rows(values_only=True))

    # 精确匹配表头:列 0 == "事件"、列 3 == "分类"。避免误中第 1 行的中文总标题。
    header_idx = None
    for i, row in enumerate(rows):
        cells = [str(c) if c is not None else "" for c in row]
        if len(cells) < 4:
            continue
        if cells[0] == "事件" and cells[3] == "分类":
            header_idx = i
            break
    if header_idx is None:
        raise RuntimeError(f"找不到表头行(列 0='事件' 且列 3='分类')")

    result: dict[str, str] = {}
    for row in rows[header_idx + 1:]:
        cells = [c for c in row]
        event_id = cells[0] if len(cells) > 0 else None
        classification = cells[3] if len(cells) > 3 else None
        if not event_id or not classification:
            continue
        timestamp = case_id_to_timestamp(event_id)
        if timestamp is None:
            print(f"  ⚠️  无法解析事件 ID: {event_id}")
            continue
        # Excel 第 3 列分类值: "台风事件" 或 "非台风事件"。
        # "台风" 是 "非台风事件" 的子串,所以要按前缀/完全匹配判断。
        cls = str(classification).strip()
        family = "typhoon-compound" if cls == "台风事件" or cls.startswith("台风") else "rainfall"
        result[timestamp] = family
    return result


def case_id_to_timestamp(case_id: str) -> str | None:
    """Case_1984-04-17-H00_1984-04-17-H23_H24 → 19840417H00_19840417H23_H24"""
    s = str(case_id)
    if not s.startswith("Case_"):
        return None
    # 期望:Case_1984-04-17-H00_1984-04-17-H23_H24
    parts = s[len("Case_"):].split("_")
    if len(parts) != 3:
        return None
    start, end, hours = parts  # '1984-04-17-H00', '1984-04-17-H23', 'H24'
    try:
        sy, sm, sd, sh = start.split("-")  # 1984,04,17,H00
        ey, em, ed, eh = end.split("-")
        h = hours[1:]  # H24 → 24
        return f"{sy}{sm}{sd}{sh}_{ey}{em}{ed}{eh}_H{h}"
    except (ValueError, IndexError):
        return None


def timestamp_to_prefix(timestamp: str, family: str) -> str:
    return f"{TC_PREFIX}{timestamp}" if family == "typhoon-compound" else f"{RAIN_PREFIX}{timestamp}"


# ── 文件迁移 ──────────────────────────────────────────────────────

def find_existing_event_dirs() -> dict[str, Path]:
    """扫描 DATA_DIR 下所有 HK_Flood_HistEvent_<时间戳> 目录,返回 Map<时间戳, dir>。"""
    result: dict[str, Path] = {}
    for path in sorted(DATA_DIR.glob(f"{OLD_PREFIX}*")):
        if not path.is_dir():
            continue
        name = path.name
        if not name.startswith(OLD_PREFIX):
            continue
        timestamp = name[len(OLD_PREFIX):]
        geotiff = path / f"{name}.geotiff"
        if not geotiff.exists():
            print(f"  ⚠️  缺少 geotiff: {geotiff}")
            continue
        result[timestamp] = path
    return result


def copy_geotiff(src_dir: Path, new_dir: Path, new_layer: str) -> None:
    """把 src_dir/<old_name>.geotiff 拷到 new_dir/<new_layer>.geotiff。

    源 geotiff 已含 EPSG:2326(由 fix-hk-historical-crs.py 注入),直接 cp 即可,
    不必用 rasterio 重写。"""
    src = src_dir / f"{src_dir.name}.geotiff"
    new_dir.mkdir(parents=True, exist_ok=True)
    dst = new_dir / f"{new_layer}.geotiff"
    shutil.copy2(src, dst)


def remove_old_dirs(timestamps: list[str]) -> None:
    for ts in timestamps:
        old = DATA_DIR / f"{OLD_PREFIX}{ts}"
        if old.exists():
            shutil.rmtree(old)


# ── GeoServer REST ────────────────────────────────────────────────

class GeoServerClient:
    def __init__(self, base_url: str, user: str, password: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.auth = (user, password)
        self.headers = {"Content-Type": "application/json"}

    def rest(self, path: str) -> str:
        return f"{self.base_url}/rest{path}"

    def delete_store(self, store_name: str) -> None:
        url = self.rest(f"/workspaces/{WORKSPACE}/coveragestores/{store_name}?recurse=true")
        response = requests.delete(url, auth=self.auth, timeout=REQUEST_TIMEOUT)
        if response.status_code not in (200, 404):
            raise RuntimeError(
                f"delete {store_name}: HTTP {response.status_code} {response.text[:160]}"
            )

    def create_store(self, store_name: str) -> None:
        url = self.rest(f"/workspaces/{WORKSPACE}/coveragestores")
        data = {
            "coverageStore": {
                "name": store_name,
                "type": "GeoTIFF",
                "enabled": True,
                "workspace": {"name": WORKSPACE},
                "url": f"file:data/natcat_platform/{store_name}/{store_name}.geotiff",
            }
        }
        response = requests.post(url, auth=self.auth, json=data, headers=self.headers, timeout=REQUEST_TIMEOUT)
        if response.status_code not in (201, 409) and "already exists" not in response.text:
            raise RuntimeError(
                f"create store {store_name}: HTTP {response.status_code} {response.text[:160]}"
            )

    def publish_coverage(self, store_name: str) -> None:
        url = self.rest(
            f"/workspaces/{WORKSPACE}/coveragestores/{store_name}/coverages?configure=all"
        )
        data = {"coverage": {"name": store_name, "title": store_name, "enabled": True}}
        response = requests.post(url, auth=self.auth, json=data, headers=self.headers, timeout=REQUEST_TIMEOUT)
        if response.status_code not in (201,) and "already exists" not in response.text:
            raise RuntimeError(
                f"publish {store_name}: HTTP {response.status_code} {response.text[:160]}"
            )


def republish_one(client: GeoServerClient, store_name: str) -> bool:
    try:
        client.delete_store(store_name)
        time.sleep(DELAY)
        client.create_store(store_name)
        time.sleep(DELAY)
        client.publish_coverage(store_name)
        return True
    except Exception as error:  # noqa: BLE001
        print(f"    FAIL: {error}")
        return False


# ── Main ──────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="按 family 重新组织并发布 HK 历史洪水事件图层。"
    )
    parser.add_argument("--dry-run", action="store_true", help="只打印动作,不真拷贝/发布")
    parser.add_argument("--skip-publish", action="store_true", help="跳过 GeoServer REST 发布")
    parser.add_argument(
        "--keep-old",
        action="store_true",
        help="保留旧 HK_Flood_HistEvent_* 目录(用于回滚演练)",
    )
    args = parser.parse_args()

    env = load_env(ENV_FILE)
    base_url = env.get("GEOSERVER_URL") or env.get("GEOSERVER_INTERNAL_URL")
    user = env.get("GEOSERVER_USER")
    password = env.get("GEOSERVER_PASS")
    if not all([base_url, user, password]):
        print("[ERROR] .env 缺少 GEOSERVER_URL/USER/PASS", file=sys.stderr)
        return 1
    assert base_url and user and password

    print(f"GeoServer: {base_url}")
    print(f"Data dir:  {DATA_DIR}")
    print(f"XLSX:      {CLASSIFY_XLSX}")
    print()

    classifications = load_classifications(CLASSIFY_XLSX)
    print(f"从 xlsx 读到 {len(classifications)} 条分类。")

    rain_count = sum(1 for f in classifications.values() if f == "rainfall")
    tc_count = sum(1 for f in classifications.values() if f == "typhoon-compound")
    print(f"  rainfall: {rain_count}")
    print(f"  typhoon-compound: {tc_count}")
    print()

    old_dirs = find_existing_event_dirs()
    print(f"GeoServer 数据目录找到 {len(old_dirs)} 个 HK_Flood_HistEvent_* 目录。")
    print()

    # 缺失对齐检查
    missing_in_xlsx = [t for t in old_dirs if t not in classifications]
    missing_in_geo = [t for t in classifications if t not in old_dirs]
    if missing_in_xlsx:
        print(f"  ⚠️  xlsx 中没有这些时间戳(GeoServer 中有): {missing_in_xlsx[:5]}{'...' if len(missing_in_xlsx) > 5 else ''}")
    if missing_in_geo:
        print(f"  ⚠️  GeoServer 中没有这些时间戳(xlsx 中有): {missing_in_geo[:5]}{'...' if len(missing_in_geo) > 5 else ''}")
    if missing_in_xlsx or missing_in_geo:
        print("  → 这通常无害,缺失的会被 SKIP。")
    print()

    # 拷贝
    new_layers: list[str] = []
    fail: list[tuple[str, str]] = []
    for i, (timestamp, old_dir) in enumerate(old_dirs.items(), 1):
        family = classifications.get(timestamp)
        if family is None:
            print(f"  [{i}/{len(old_dirs)}] {timestamp}: SKIP(no classification)")
            continue
        new_layer = timestamp_to_prefix(timestamp, family)
        new_dir = DATA_DIR / new_layer
        if args.dry_run:
            print(f"  [{i}/{len(old_dirs)}] {timestamp} ({family}): DRY → {new_layer}/")
            new_layers.append(new_layer)
            continue
        try:
            copy_geotiff(old_dir, new_dir, new_layer)
            new_layers.append(new_layer)
        except Exception as error:  # noqa: BLE001
            print(f"  [{i}/{len(old_dirs)}] {timestamp}: COPY FAIL: {error}")
            fail.append((timestamp, str(error)))
            continue

    print(f"\n成功拷贝 {len(new_layers)} / {len(old_dirs)} 个新图层。")
    if fail:
        print(f"失败 {len(fail)} 个:")
        for ts, err in fail[:5]:
            print(f"  {ts}: {err}")

    if args.dry_run:
        print("\nDRY RUN 结束,未做实际修改。")
        return 0

    # 删除旧目录
    if not args.keep_old:
        print("\n删除旧 HK_Flood_HistEvent_* 目录...")
        remove_old_dirs(list(old_dirs.keys()))
        print(f"已删除 {len(old_dirs)} 个旧目��。")

    if args.skip_publish:
        print("\n--skip-publish,跳过 REST 发布。手动运行 republish-hk-historical-layers.py。")
        return 0

    # REST 重发布
    print(f"\n开始 REST 重发布 {len(new_layers)} 个图层(每 0.15s)...")
    client = GeoServerClient(base_url, user, password)
    ok = 0
    pub_fail: list[str] = []
    for i, layer in enumerate(new_layers, 1):
        success = republish_one(client, layer)
        if success:
            ok += 1
        else:
            pub_fail.append(layer)
        if i % 50 == 0 or i == len(new_layers):
            print(f"  [{i}/{len(new_layers)}] 进度: {ok} 成功, {len(pub_fail)} 失败")
    print(f"\nDone. {ok}/{len(new_layers)} republished.")
    if pub_fail:
        print(f"FAILED ({len(pub_fail)}):")
        for layer in pub_fail:
            print(f"  {layer}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())