"""
スロット店舗 粗利・売上分析システム (Streamlit版)
======================================================
スロレポHTMLデータを取り込み、ホールの粗利推移・売上・出玉率（機械割）・特日/曜日/末尾別傾向を
Web版ダッシュボードと100%同一のパース＆計算ロジック、完全同一のフィルター・表示設定、
およびダークモダンデザインで可視化・分析します。
"""

import os
import re
import datetime
from typing import Dict, List, Optional, Tuple, Any, Set
from collections import Counter

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from bs4 import BeautifulSoup

# --------------------------------------------------------------------------
# ページ基本設定
# --------------------------------------------------------------------------
st.set_page_config(
    page_title="スロレポ出玉集計 利益月別推移",
    page_icon="🎰",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --------------------------------------------------------------------------
# UIカスタムスタイル (Web版ダッシュボードデザイン再現)
# --------------------------------------------------------------------------
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;600;700;800&display=swap');
    
    html, body, [class*="css"], .stMarkdown, .stText {
        font-family: 'Plus Jakarta Sans', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    
    .stApp {
        background-color: #0f172a;
        color: #f8fafc;
    }
    
    [data-testid="stSidebar"] {
        background-color: #0b1120 !important;
        border-right: 1px solid #1e293b !important;
    }
    [data-testid="stSidebar"] * {
        color: #e2e8f0;
    }
    [data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3, [data-testid="stSidebar"] h4 {
        color: #f8fafc !important;
        font-weight: 800 !important;
    }
    
    /* ヘッダーカード */
    .header-banner {
        background: #0f172a;
        border: 1px solid #1e293b;
        padding: 22px 26px;
        border-radius: 16px;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
        margin-bottom: 20px;
    }
    .header-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background-color: #f59e0b;
        color: #020617;
        font-size: 11px;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 4px;
        letter-spacing: 0.05em;
    }
    .header-range {
        font-size: 12px;
        color: #94a3b8;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-left: 8px;
    }
    .header-title-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 8px;
    }
    .header-title {
        font-size: 26px;
        font-weight: 900;
        letter-spacing: -0.02em;
        color: #ffffff;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .header-subtitle {
        color: #fbbf24;
        font-weight: 700;
        font-size: 22px;
    }
    .header-meta-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin-top: 12px;
        font-size: 12px;
    }
    .header-meta-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: #1e293b;
        border: 1px solid #334155;
        padding: 3px 10px;
        border-radius: 6px;
        color: #e2e8f0;
    }
    .header-meta-pill.special {
        border-color: rgba(245, 158, 11, 0.5);
        background: rgba(30, 41, 59, 0.9);
    }
    .header-meta-pill.rate {
        border-color: rgba(56, 189, 248, 0.4);
    }

    /* KPIカード グリッド */
    .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
    }
    .kpi-card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 14px;
        padding: 18px 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    .kpi-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 700;
        color: #94a3b8;
        margin-bottom: 8px;
    }
    .kpi-card-icon {
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 13px;
    }
    .kpi-card-value {
        font-size: 26px;
        font-weight: 900;
        letter-spacing: -0.02em;
        line-height: 1.1;
    }
    .kpi-card-sub {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: #94a3b8;
        margin-top: 6px;
    }
    .kpi-card-foot {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid #334155;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
    }

    /* Streamlit タブの外観 */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background-color: #1e293b;
        padding: 6px;
        border-radius: 12px;
        border: 1px solid #334155;
        margin-bottom: 20px;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 8px;
        font-weight: 700;
        font-size: 13px;
        padding: 6px 14px;
        color: #94a3b8;
        border: none;
        background: transparent;
    }
    .stTabs [aria-selected="true"] {
        background-color: #f59e0b !important;
        color: #020617 !important;
        box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3) !important;
    }

    /* 情報バナー */
    .model-b-banner {
        background: linear-gradient(90deg, rgba(30, 27, 75, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
        border: 1px solid rgba(99, 102, 241, 0.4);
        padding: 12px 16px;
        border-radius: 10px;
        color: #e0e7ff;
        font-size: 12px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 12px;
    }
</style>
""", unsafe_allow_html=True)

JAPANESE_DAYS = ['月', '火', '水', '木', '金', '土', '日']


# --------------------------------------------------------------------------
# 日本の祝日判定 (Web版 holidayUtils.ts と完全一致)
# --------------------------------------------------------------------------
def get_vernal_equinox_day(year: int) -> int:
    if 1980 <= year <= 2099:
        return int(20.8431 + 0.242194 * (year - 1980) - int((year - 1980) / 4))
    return 20


def get_autumnal_equinox_day(year: int) -> int:
    if 1980 <= year <= 2099:
        return int(23.2488 + 0.242194 * (year - 1980) - int((year - 1980) / 4))
    return 23


def get_nth_monday(year: int, month: int, n: int) -> int:
    first_day = datetime.date(year, month, 1).weekday()
    first_monday = 1 + (0 - first_day) if first_day == 0 else 1 + (7 - first_day)
    return first_monday + (n - 1) * 7


def get_japanese_holidays(year: int) -> Dict[str, str]:
    holidays: Dict[str, str] = {}

    def f_date(m: int, d: int) -> str:
        return f"{year}-{m:02d}-{d:02d}"

    holidays[f_date(1, 1)] = '元日'
    holidays[f_date(1, get_nth_monday(year, 1, 2))] = '成人の日'
    holidays[f_date(2, 11)] = '建国記念の日'
    if year >= 2020:
        holidays[f_date(2, 23)] = '天皇誕生日'

    holidays[f_date(3, get_vernal_equinox_day(year))] = '春分の日'
    holidays[f_date(4, 29)] = '昭和の日'
    holidays[f_date(5, 3)] = '憲法記念日'
    holidays[f_date(5, 4)] = 'みどりの日'
    holidays[f_date(5, 5)] = 'こどもの日'

    if year == 2020:
        holidays[f_date(7, 23)] = '海の日'
        holidays[f_date(7, 24)] = 'スポーツの日'
    elif year == 2021:
        holidays[f_date(7, 22)] = '海の日'
        holidays[f_date(7, 23)] = 'スポーツの日'
    else:
        holidays[f_date(7, get_nth_monday(year, 7, 3))] = '海の日'

    if year == 2020:
        holidays[f_date(8, 10)] = '山の日'
    elif year == 2021:
        holidays[f_date(8, 8)] = '山の日'
    elif year >= 2016:
        holidays[f_date(8, 11)] = '山の日'

    autumn = get_autumnal_equinox_day(year)
    respect_day = get_nth_monday(year, 9, 3)
    holidays[f_date(9, respect_day)] = '敬老の日'
    holidays[f_date(9, autumn)] = '秋分の日'
    if autumn - respect_day == 2:
        holidays[f_date(9, respect_day + 1)] = '国民の休日'

    if year not in [2020, 2021]:
        holidays[f_date(10, get_nth_monday(year, 10, 2))] = 'スポーツの日'

    holidays[f_date(11, 3)] = '文化の日'
    holidays[f_date(11, 23)] = '勤労感謝の日'

    # 振替休日
    substitutes: Dict[str, str] = {}
    for d_str, name in list(holidays.items()):
        dt = datetime.datetime.strptime(d_str, "%Y-%m-%d").date()
        if dt.weekday() == 6:
            sub_dt = dt + datetime.timedelta(days=1)
            while sub_dt.strftime("%Y-%m-%d") in holidays:
                sub_dt += datetime.timedelta(days=1)
            substitutes[sub_dt.strftime("%Y-%m-%d")] = f"振替休日 ({name})"

    holidays.update(substitutes)
    return holidays


# --------------------------------------------------------------------------
# 換金率パース関数 (Web版 htmlParser.ts と完全一致)
# --------------------------------------------------------------------------
def parse_rates_from_exchange_rate(exchange_rate_str: str) -> Tuple[int, int]:
    rate_lend = 46
    rate_exchange = 52
    if not exchange_rate_str:
        return rate_lend, rate_exchange

    clean = exchange_rate_str.strip()
    slash_parts = re.split(r'[/／]', clean)
    if len(slash_parts) == 2:
        part1 = re.sub(r'[^0-9.]', '', slash_parts[0])
        part2 = re.sub(r'[^0-9.]', '', slash_parts[1])
        if part1 and part2:
            try:
                v1, v2 = float(part1), float(part2)
                if 20 <= v1 <= 100 and 20 <= v2 <= 100:
                    return round(v1), round(v2)
                if 10 <= v1 <= 25 and 10 <= v2 <= 25:
                    return round(1000.0 / v1), round(1000.0 / v2)
            except Exception:
                pass

    nums = [float(n) for n in re.findall(r'[0-9]+(?:\.[0-9]+)?', clean)]
    if len(nums) >= 2:
        v1, v2 = nums[0], nums[1]
        if 20 <= v1 <= 100 and 20 <= v2 <= 100:
            return round(v1), round(v2)

    return rate_lend, rate_exchange


# --------------------------------------------------------------------------
# 旧イベント日パース (Web版 specialDayRules.ts と完全一致)
# --------------------------------------------------------------------------
def parse_special_day_rules(old_event_days_text: str) -> Dict[str, Any]:
    if not old_event_days_text:
        return {
            "tails": [5],
            "double_digits": False,
            "month_day_zoro": False,
            "fixed_dates": [],
            "days_of_week": []
        }

    text = old_event_days_text.translate(str.maketrans('０１２３４５６７８９', '0123456789'))
    tails_set: Set[int] = set()

    for m in re.finditer(r'([0-9])\s*のつく日', text):
        tails_set.add(int(m.group(1)))
    for m in re.finditer(r'末尾\s*([0-9])', text):
        tails_set.add(int(m.group(1)))

    double_digits = bool("ゾロ目" in text or "11日" in text or "22日" in text)
    month_day_zoro = bool("ゾロ目" in text or "月日ゾロ目" in text)

    dow_list: List[str] = []
    if "土曜" in text or "土日" in text:
        dow_list.append("土")
    if "日曜" in text or "土日" in text:
        dow_list.append("日")

    day_matches = re.findall(r'([0-9]{1,2})\s*日', text)
    fixed_dates: List[int] = []
    if day_matches and len(day_matches) >= 2 and not tails_set:
        parsed_days = [int(d) for d in day_matches if 1 <= int(d) <= 31]
        all_tails = set(d % 10 for d in parsed_days)
        if len(all_tails) == 1 and len(parsed_days) >= 3:
            tails_set.add(list(all_tails)[0])
        else:
            fixed_dates = sorted(list(set(parsed_days)))

    if not tails_set and not double_digits and not fixed_dates and not dow_list:
        for single_digit in range(10):
            if f"{single_digit}" in text:
                tails_set.add(single_digit)

    if not tails_set and not double_digits and not fixed_dates and not dow_list:
        tails_set.add(5)

    return {
        "tails": sorted(list(tails_set)),
        "double_digits": double_digits,
        "month_day_zoro": month_day_zoro,
        "fixed_dates": fixed_dates,
        "days_of_week": dow_list,
    }


# --------------------------------------------------------------------------
# 日付セル抽出ヘルパー (スロレポの多様なHTML構造に対応)
# --------------------------------------------------------------------------
def extract_date_from_cell(
    cell_text: str,
    href: str = "",
    default_year: int = 2026,
    prev_month: Optional[int] = None
) -> Tuple[Optional[str], Optional[int], Optional[int], Optional[int]]:
    """
    セルテキストおよびリンク属性から日付 (YYYY-MM-DD) と (year, month, day) を抽出
    """
    # 1. href属性から8桁または区切り日時の抽出 (例: 20260909, /2026/09/09, 2026-09-09)
    if href:
        m_href = re.search(r'(20[12]\d)[-_/]?(\d{2})[-_/]?(\d{2})', href)
        if m_href:
            y, m, d = int(m_href.group(1)), int(m_href.group(2)), int(m_href.group(3))
            return f"{y:04d}-{m:02d}-{d:02d}", y, m, d

    clean_text = cell_text.strip().replace("\n", "").replace(" ", "")

    # 2. フル日付テキスト (例: 2026/9/9, 2026年9月9日, 2026-09-09)
    m_full = re.search(r'(20[12]\d)[年/-](\d{1,2})[月/-](\d{1,2})', clean_text)
    if m_full:
        y, m, d = int(m_full.group(1)), int(m_full.group(2)), int(m_full.group(3))
        return f"{y:04d}-{m:02d}-{d:02d}", y, m, d

    # 3. 月日のみのテキスト (例: "9/9(水)", "9/9", "9月9日(水)")
    m_md = re.search(r'(\d{1,2})[\/月](\d{1,2})', clean_text)
    if m_md:
        m, d = int(m_md.group(1)), int(m_md.group(2))
        y = default_year
        # 降順パース時の年越し対応 (1〜2月 から 11〜12月へ移行した場合は前年と判定)
        if prev_month is not None and prev_month <= 2 and m >= 11:
            y -= 1
        return f"{y:04d}-{m:02d}-{d:02d}", y, m, d

    return None, None, None, None


# --------------------------------------------------------------------------
# スロレポHTMLパース (Web版 htmlParser.ts と完全一致)
# --------------------------------------------------------------------------
def parse_slorepo_html(html_text: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html_text, "html.parser")

    # 1. 店舗名
    store_name = "スロレポ店舗"
    h4 = soup.find("h4", class_="title")
    if h4 and h4.text.strip():
        store_name = h4.text.strip()
    elif soup.find("h1"):
        store_name = soup.find("h1").text.strip().replace("のスロット出玉情報", "").strip()
    elif soup.find("title"):
        title_text = soup.find("title").text.strip()
        store_name = re.sub(r'\s*[-–|]\s*スロレポ.*$', '', title_text).strip()

    # 2. 店舗基本情報 (住所, 旧イベント日, 換金率, グランドオープン)
    address = "住所未登録"
    old_event_days = "5のつく日"
    exchange_rate_str = "50枚貸/56枚交換"
    grand_open = ""

    for tr in soup.find_all("tr"):
        th = tr.find("th")
        td = tr.find("td")
        if not th or not td:
            continue
        label = th.text.strip()
        val = td.text.strip()
        if "住所" in label and val:
            address = val
        elif ("旧イベント日" in label or "旧イベ" in label or "特定日" in label) and val:
            old_event_days = val
        elif "換金率" in label and val:
            exchange_rate_str = val
        elif "グランドオープン" in label and val:
            grand_open = val

    rate_lend, rate_exchange = parse_rates_from_exchange_rate(exchange_rate_str)
    parsed_rules = parse_special_day_rules(old_event_days)

    # 3. 日付別テーブル検出
    date_tables = []
    for tbl in soup.find_all("table"):
        classes = tbl.get("class", [])
        if isinstance(classes, str):
            classes = [classes]
        if "date" in classes:
            date_tables.append(tbl)
        else:
            text = tbl.text or ""
            if "日付" in text and any(w in text for w in ["差枚", "勝率", "平均G", "G数", "優秀機種"]):
                date_tables.append(tbl)

    if not date_tables:
        date_tables = soup.find_all("table")

    raw_rows = []
    machine_counts = []
    current_year = datetime.datetime.now().year
    prev_month = None

    for tbl in date_tables:
        # コンテキスト年の検出
        tbl_text = (tbl.caption.text if tbl.caption else "") + " " + (tbl.find_previous_sibling().text if tbl.find_previous_sibling() else "")
        m_yr = re.search(r'(20[12]\d)年', tbl_text)
        context_year = int(m_yr.group(1)) if m_yr else None

        rows = tbl.find_all("tr")
        if not rows:
            continue

        header_idx = {"date": 0, "diff": 1, "games": 2, "win": 3, "models": 4, "machines": -1}
        first_ths = rows[0].find_all(["th", "td"])
        th_texts = [th.text.strip() for th in first_ths]
        has_header = any("日付" in t for t in th_texts)

        if has_header:
            for idx, t in enumerate(th_texts):
                if "日付" in t:
                    header_idx["date"] = idx
                elif "差枚" in t:
                    header_idx["diff"] = idx
                elif "平均G" in t or "G数" in t or "回転" in t:
                    header_idx["games"] = idx
                elif "勝率" in t or "勝台" in t:
                    header_idx["win"] = idx
                elif "機種" in t or "末尾" in t:
                    header_idx["models"] = idx
                elif "総台数" in t or "台数" in t:
                    header_idx["machines"] = idx

        content_rows = rows[1:] if has_header else rows
        for tr in content_rows:
            if tr.find("th"):
                continue
            tds = tr.find_all("td")
            if len(tds) < 3:
                continue

            d_col = min(header_idx["date"], len(tds) - 1)
            date_cell = tds[d_col]
            cell_text = date_cell.text.strip()
            a_tag = date_cell.find("a")
            href = a_tag["href"].strip() if a_tag and a_tag.has_attr("href") else ""

            formatted_date, row_y, row_m, row_d = extract_date_from_cell(
                cell_text=cell_text,
                href=href,
                default_year=context_year or current_year,
                prev_month=prev_month
            )
            if not formatted_date or row_y is None or row_m is None or row_d is None:
                continue

            current_year = row_y
            prev_month = row_m

            # 差枚
            diff_col = header_idx["diff"]
            diff_val = 0.0
            if diff_col < len(tds):
                d_txt = tds[diff_col].text.strip().replace(",", "").replace("枚", "").replace("+", "")
                m_diff = re.search(r'([+-]?\d+)', d_txt)
                if m_diff:
                    try:
                        diff_val = float(m_diff.group(1))
                    except Exception:
                        pass

            # 平均G数
            games_col = header_idx["games"]
            games_val = 0.0
            if games_col < len(tds):
                g_txt = tds[games_col].text.strip().replace(",", "").replace("G", "")
                m_g = re.search(r'(\d+)', g_txt)
                if m_g:
                    try:
                        games_val = float(m_g.group(1))
                    except Exception:
                        pass

            # 勝率・台数
            win_col = header_idx["win"]
            win_rate = None
            win_machines = None
            row_total_machines = None
            if win_col < len(tds):
                w_txt = tds[win_col].text.strip()
                m_pct = re.search(r'(\d+(?:\.\d+)?)\s*%', w_txt)
                if m_pct:
                    try:
                        win_rate = float(m_pct.group(1))
                    except Exception:
                        pass
                m_slash = re.search(r'[\(（]?\s*(\d+)\s*[\/／]\s*(\d+)\s*(?:台)?[\)）]?', w_txt)
                if m_slash:
                    try:
                        win_machines = int(m_slash.group(1))
                        row_total_machines = int(m_slash.group(2))
                        machine_counts.append(row_total_machines)
                    except Exception:
                        pass
                else:
                    m_tot = re.search(r'(?:[\/／]|\(|\b)(\d{2,4})\s*台', w_txt)
                    if m_tot:
                        try:
                            row_total_machines = int(m_tot.group(1))
                            machine_counts.append(row_total_machines)
                        except Exception:
                            pass

            machines_col = header_idx["machines"]
            if machines_col != -1 and machines_col < len(tds):
                m_txt = re.sub(r'[^0-9]', '', tds[machines_col].text.strip())
                if m_txt:
                    try:
                        row_total_machines = int(m_txt)
                        machine_counts.append(row_total_machines)
                    except Exception:
                        pass

            mod_col = header_idx["models"]
            top_models = tds[mod_col].text.strip() if mod_col < len(tds) else ""

            raw_rows.append({
                "date": formatted_date,
                "year": row_y,
                "month": row_m,
                "day": row_d,
                "avg_diff": diff_val,
                "avg_games": games_val,
                "win_rate": win_rate,
                "win_machines": win_machines,
                "row_total_machines": row_total_machines,
                "top_models": top_models
            })

    if not raw_rows:
        return {
            "name": store_name,
            "address": address,
            "old_event_days": old_event_days,
            "exchange_rate_str": exchange_rate_str,
            "rate_lend": rate_lend,
            "rate_exchange": rate_exchange,
            "grand_open": grand_open,
            "mode_machines": 162,
            "parsed_rules": parsed_rules,
            "raw_records": [],
        }

    approx_machines = 162
    if machine_counts:
        counts = Counter(machine_counts)
        approx_machines = counts.most_common(1)[0][0]

    date_map = {}
    for r in raw_rows:
        d = r["date"]
        if d not in date_map or (r.get("row_total_machines") and not date_map[d].get("row_total_machines")):
            date_map[d] = r

    sorted_rows = sorted(list(date_map.values()), key=lambda x: x["date"])

    # 台数欠損補完 (最近傍補完)
    for i, r in enumerate(sorted_rows):
        m = r["row_total_machines"]
        if not m or m <= 0:
            nearest_dist = float('inf')
            nearest_m = None
            for j, other in enumerate(sorted_rows):
                om = other.get("row_total_machines")
                if om and om > 0:
                    dist = abs(i - j)
                    if dist < nearest_dist:
                        nearest_dist = dist
                        nearest_m = om
            m = nearest_m or approx_machines or 162
        r["total_machines"] = m

        w_m = r["win_machines"]
        w_r = r["win_rate"]
        if w_m is None and w_r is not None and m > 0:
            r["win_machines"] = round(m * (w_r / 100.0))
        elif w_r is None and w_m is not None and m > 0:
            r["win_rate"] = round((w_m / m) * 1000.0) / 10.0

    return {
        "name": store_name,
        "address": address,
        "old_event_days": old_event_days,
        "exchange_rate_str": exchange_rate_str,
        "rate_lend": rate_lend,
        "rate_exchange": rate_exchange,
        "grand_open": grand_open,
        "mode_machines": approx_machines,
        "parsed_rules": parsed_rules,
        "raw_records": sorted_rows,
    }


# --------------------------------------------------------------------------
# 特日判定 (Web版 dataEngine.ts と完全一致)
# --------------------------------------------------------------------------
def is_special_day(
    d: datetime.date,
    tails: List[int],
    double_digits: bool,
    month_day_zoro: bool,
    fixed_dates: List[int],
    target_dows: List[str]
) -> bool:
    if tails and (d.day % 10 in tails):
        return True
    if month_day_zoro and (d.month == d.day):
        return True
    if double_digits and (d.day in [11, 22]):
        return True
    if fixed_dates and (d.day in fixed_dates):
        return True
    dow_jp = JAPANESE_DAYS[d.weekday()]
    if target_dows and (dow_jp in target_dows):
        return True
    return False


# --------------------------------------------------------------------------
# 収支・粗利計算 (Web版 dataEngine.ts と完全一致)
# --------------------------------------------------------------------------
def calculate_financials(
    records: List[Dict[str, Any]],
    rate_lend: float,
    rate_exchange: float,
    cash_ratio: float,
    tails: List[int],
    double_digits: bool,
    month_day_zoro: bool,
    fixed_dates: List[int],
    target_dows: List[str],
) -> pd.DataFrame:
    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records)
    df["date_dt"] = pd.to_datetime(df["date"])
    df = df.sort_values("date_dt").reset_index(drop=True)

    # 年・月・日・末尾・曜日
    df["year"] = df["date_dt"].dt.year
    df["month"] = df["date_dt"].dt.month
    df["day"] = df["date_dt"].dt.day
    df["tail_digit"] = df["day"] % 10
    df["dow_jp"] = df["date_dt"].apply(lambda d: JAPANESE_DAYS[d.weekday()])
    df["year_str"] = df["year"].astype(str)
    df["year_month"] = df["date_dt"].dt.strftime("%Y-%m")

    lend_yen_per_coin = 1000.0 / rate_lend
    exch_yen_per_coin = 1000.0 / rate_exchange
    gap_per_coin = lend_yen_per_coin - exch_yen_per_coin

    # 祝日判定
    years_in_df = df["year"].unique()
    holidays_map: Dict[str, str] = {}
    for y in years_in_df:
        holidays_map.update(get_japanese_holidays(int(y)))

    df["holiday_name"] = df["date"].map(holidays_map)
    df["is_holiday"] = df["holiday_name"].notna()

    # 特日判定
    df["is_special"] = df["date_dt"].apply(
        lambda d: is_special_day(d.date(), tails, double_digits, month_day_zoro, fixed_dates, target_dows)
    )

    # 差枚数・コイン収支
    df["total_diff_coins"] = df["avg_diff"] * df["total_machines"]
    df["hall_coin_profit"] = -df["total_diff_coins"]
    df["player_coin_profit"] = df["total_diff_coins"]

    # Model A: 単純差枚換算
    df["model_a_hall_yen"] = df["hall_coin_profit"].apply(
        lambda c: round(c * lend_yen_per_coin) if c >= 0 else round(c * exch_yen_per_coin)
    )
    df["model_a_player_yen"] = df["player_coin_profit"].apply(
        lambda c: round(c * exch_yen_per_coin) if c >= 0 else round(c * lend_yen_per_coin)
    )

    # Model B: G数(IN枚数)・換金ギャップ連動
    df["in_coins"] = (df["avg_games"] * 3 * df["total_machines"]).round()
    df["out_coins"] = df["in_coins"] + df["total_diff_coins"]
    df["payout_rate"] = df.apply(
        lambda row: round((row["out_coins"] / row["in_coins"] * 100), 2) if row["in_coins"] > 0 else 100.0,
        axis=1
    )

    df["cash_coins_invested"] = df["in_coins"] * (cash_ratio / 100.0)
    df["estimated_revenue"] = (df["cash_coins_invested"] * lend_yen_per_coin).round()
    df["exchange_gap_profit"] = (df["cash_coins_invested"] * gap_per_coin).round()

    df["model_b_hall_yen"] = (
        df["exchange_gap_profit"] - (df["total_diff_coins"] * exch_yen_per_coin)
    ).round()
    df["model_b_player_yen"] = -df["model_b_hall_yen"]

    return df


# --------------------------------------------------------------------------
# 数値フォーマットヘルパー
# --------------------------------------------------------------------------
def format_yen(val: float) -> str:
    sign = "+" if val > 0 else "-" if val < 0 else ""
    abs_v = abs(val)
    if abs_v >= 100_000_000:
        return f"{sign}{abs_v / 100_000_000:.2f}億円"
    if abs_v >= 10_000:
        return f"{sign}{abs_v / 10_000:,.1f}万円"
    return f"{sign}¥{abs_v:,.0f}"


def format_coins(val: float) -> str:
    sign = "+" if val > 0 else "-" if val < 0 else ""
    abs_v = abs(val)
    if abs_v >= 10_000:
        return f"{sign}{abs_v / 10_000:,.1f}万枚"
    return f"{sign}{abs_v:,.0f}枚"


# --------------------------------------------------------------------------
# サンプルデータ読み込み (プラザ515)
# --------------------------------------------------------------------------
def load_builtin_sample_html() -> str:
    sample_paths = [
        "src/data/samplePlaza515Html.ts",
        "scripts/input1.html",
        "../src/data/samplePlaza515Html.ts"
    ]
    for p in sample_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as f:
                    txt = f.read()
                m = re.search(r'SAMPLE_PLAZA_515_HTML\s*=\s*`([^`]+)`', txt, re.DOTALL)
                if m:
                    return m.group(1)
                return txt
            except Exception:
                pass
    return ""


# --------------------------------------------------------------------------
# サイドバーフィルター・設定
# --------------------------------------------------------------------------
with st.sidebar:
    st.markdown("### 🎰 スロレポ分析フィルター設定")

    # データソース選択
    data_source_mode = st.radio(
        "データソース選択",
        ["🌟 サンプル店舗 (プラザ５１５)", "📁 自分のHTMLファイルをアップロード"],
        index=0
    )

    uploaded_files = st.file_uploader(
        "スロレポHTMLファイルを選択 / ドロップ",
        type=["html", "htm"],
        accept_multiple_files=True,
        help="スロレポの店舗出玉ページ（.html）をアップロード。複数月・複数ファイル一括取込可能"
    )

    # パース実行
    raw_store_data = None
    is_using_sample = False

    if uploaded_files and (data_source_mode == "📁 自分のHTMLファイルをアップロード" or len(uploaded_files) > 0):
        combined_records = []
        store_meta = None
        for f in uploaded_files:
            content = f.read().decode("utf-8", errors="ignore")
            parsed = parse_slorepo_html(content)
            if not store_meta or store_meta["name"] == "スロレポ店舗":
                store_meta = parsed
            combined_records.extend(parsed["raw_records"])

        date_dict = {}
        for r in combined_records:
            d = r["date"]
            if d not in date_dict or (r.get("row_total_machines") and not date_dict[d].get("row_total_machines")):
                date_dict[d] = r

        unique_records = sorted(list(date_dict.values()), key=lambda x: x["date"])
        if store_meta and unique_records:
            store_meta["raw_records"] = unique_records
            raw_store_data = store_meta
            st.success(f"✅ {len(uploaded_files)}ファイル / {len(unique_records):,}営業日 読込完了")
        else:
            st.warning("⚠️ アップロードされたHTMLから出玉行を検出できませんでした。サンプルを表示します。")

    if not raw_store_data:
        sample_html = load_builtin_sample_html()
        if sample_html:
            raw_store_data = parse_slorepo_html(sample_html)
            is_using_sample = True

    st.markdown("---")

    # 1. 分析目線
    st.markdown("#### 👁️ 分析目線 (Perspective)")
    perspective_label = st.radio(
        "目線を選択",
        ["ホール目線 (粗利・回収)", "スロッター目線 (客収支・還元)"],
        index=0,
        label_visibility="collapsed"
    )
    is_hall = (perspective_label == "ホール目線 (粗利・回収)")

    # 2. 表示単位
    st.markdown("#### 🪙 表示単位 (Unit)")
    unit_choice = st.radio(
        "表示単位を選択",
        ["円表記 (¥)", "枚数表記 (枚)", "台平均 (枚/台)"],
        index=0,
        label_visibility="collapsed"
    )
    unit = "yen" if "円" in unit_choice else ("coins" if "枚数" in unit_choice else "avgDiff")

    # 3. 粗利算出方式
    st.markdown("#### 📐 利益算出方式 (Model)")
    profit_model = st.radio(
        "粗利計算モデル",
        ["G数(IN枚数)・換金ギャップ連動 (ホール実務粗利)", "単純差枚数換算モデル"],
        index=0,
        label_visibility="collapsed"
    )
    use_model_b = ("G数" in profit_model)

    st.markdown("---")
    st.markdown("#### ⚙️ レート・前提条件調整")

    default_lend = float(raw_store_data["rate_lend"]) if raw_store_data else 46.0
    default_exch = float(raw_store_data["rate_exchange"]) if raw_store_data else 52.0

    col_l, col_e = st.columns(2)
    with col_l:
        rate_lend = st.number_input(
            "貸出 (枚/千円)",
            min_value=30.0,
            max_value=60.0,
            value=default_lend,
            step=1.0,
            help="例: 46枚貸(21.74円), 50枚貸(20.00円)"
        )
    with col_e:
        rate_exchange = st.number_input(
            "交換 (枚/千円)",
            min_value=30.0,
            max_value=60.0,
            value=default_exch,
            step=0.5,
            help="例: 50枚等価(20.00円), 51.5枚(19.42円), 52枚(19.23円)"
        )

    cash_ratio = st.slider(
        "現金投資比率 (%)",
        min_value=15,
        max_value=75,
        value=35,
        step=5,
        help="総G数に対する現金サンド投入比率（業界標準: 30%〜40%）"
    )

    st.markdown("---")
    st.markdown("#### 🎯 特日ルール詳細設定")

    auto_rules = raw_store_data.get("parsed_rules", {}) if raw_store_data else {}
    init_tails = auto_rules.get("tails", [5])
    init_double = auto_rules.get("double_digits", False)
    init_zoro = auto_rules.get("month_day_zoro", False)
    init_dows = auto_rules.get("days_of_week", [])
    init_fixed = auto_rules.get("fixed_dates", [])

    selected_tails = st.multiselect(
        "特定末尾 (つく日)",
        options=list(range(10)),
        default=init_tails,
        format_func=lambda x: f"{x}のつく日"
    )

    col_z1, col_z2 = st.columns(2)
    with col_z1:
        double_digits = st.checkbox("11日・22日", value=init_double)
    with col_z2:
        month_day_zoro = st.checkbox("月日ゾロ目", value=init_zoro)

    target_dows = st.multiselect(
        "特定曜日 (毎週)",
        options=JAPANESE_DAYS,
        default=init_dows,
        help="土曜・日曜など曜日特日がある場合に指定"
    )

    fixed_day_input = st.text_input(
        "特定固定日 (カンマ区切り)",
        value=",".join(map(str, init_fixed)) if init_fixed else "",
        help="例: 1,15 (毎月1日と15日など)"
    )
    fixed_dates = []
    if fixed_day_input.strip():
        try:
            fixed_dates = [int(x.strip()) for x in fixed_day_input.split(",") if x.strip().isdigit()]
        except Exception:
            pass


# --------------------------------------------------------------------------
# メイン画面処理
# --------------------------------------------------------------------------
if not raw_store_data or not raw_store_data.get("raw_records"):
    st.markdown("""
    <div style="background: #1e293b; border: 2px dashed #475569; border-radius: 16px; padding: 48px; text-align: center; max-width: 680px; margin: 40px auto;">
        <div style="font-size: 48px; margin-bottom: 12px;">📥</div>
        <h3 style="color: #ffffff; font-weight: 800; margin-bottom: 8px;">スロレポHTMLファイルをアップロードしてください</h3>
        <p style="color: #94a3b8; font-size: 14px;">左サイドバーからスロレポの店舗出玉ページ（.html）を選択すると、自動で全出玉・粗利推移が集計されます。</p>
    </div>
    """, unsafe_allow_html=True)
    st.stop()

# 全体計算実行
df_all = calculate_financials(
    records=raw_store_data["raw_records"],
    rate_lend=rate_lend,
    rate_exchange=rate_exchange,
    cash_ratio=cash_ratio,
    tails=selected_tails,
    double_digits=double_digits,
    month_day_zoro=month_day_zoro,
    fixed_dates=fixed_dates,
    target_dows=target_dows
)

if df_all.empty:
    st.warning("集計データが存在しません。")
    st.stop()

# サンプルデータ使用時の告知バナー
if is_using_sample:
    st.info("🌟 **現在サンプルデータ（プラザ５１５）を表示中**: 左サイドバーの「📁 自分のHTMLファイルをアップロード」からお手元のスロレポHTMLを選択すると、自動で実店舗データに切り替わります。")

# 年別フィルター (Web版: selectedYear)
available_years = sorted(list(df_all["year_str"].unique()), reverse=True)
year_options = ["全期間"] + [f"{y}年" for y in available_years]

selected_year_label = st.radio(
    "集計対象期間 (年別絞り込み)",
    year_options,
    horizontal=True,
    index=0
)

if selected_year_label == "全期間":
    df_daily = df_all.copy()
else:
    target_year = selected_year_label.replace("年", "")
    df_daily = df_all[df_all["year_str"] == target_year].copy().reset_index(drop=True)

# 粗利・収支表示列
active_profit_col = "model_b_hall_yen" if use_model_b else "model_a_hall_yen"
active_player_col = "model_b_player_yen" if use_model_b else "model_a_player_yen"
display_val_col = active_profit_col if is_hall else active_player_col

# --------------------------------------------------------------------------
# ヘッダーバナー
# --------------------------------------------------------------------------
lend_yen_str = f"{1000.0 / rate_lend:.2f}"
exch_yen_str = f"{1000.0 / rate_exchange:.2f}"
data_range_str = f"{df_daily['date'].min()} 〜 {df_daily['date'].max()}"
total_days = len(df_daily)
total_months = df_daily["year_month"].nunique()

st.markdown(f"""
<div class="header-banner">
    <div>
        <span class="header-badge">スロレポ出玉集計</span>
        <span class="header-range">📅 {data_range_str} ({total_days}日分集計 / {total_months}ヶ月)</span>
    </div>
    <div class="header-title-row">
        <h1 class="header-title">
            🏢 {raw_store_data['name']}
            <span class="header-subtitle">利益月別推移</span>
        </h1>
    </div>
    <div class="header-meta-row">
        <span class="header-meta-pill">
            <strong style="color: #94a3b8;">所在地:</strong> {raw_store_data['address']}
        </span>
        <span class="header-meta-pill special">
            <strong style="color: #f59e0b;">特日設定:</strong> {raw_store_data['old_event_days'] or 'カスタム設定中'}
        </span>
        <span class="header-meta-pill rate">
            <strong style="color: #38bdf8;">換金率:</strong> {rate_lend:.0f}枚貸 / {rate_exchange:.1f}枚交換 
            <span style="color: #94a3b8; font-size: 11px;">(1枚 {lend_yen_str}円 / {exch_yen_str}円)</span>
        </span>
        <span class="header-meta-pill">
            <strong style="color: #94a3b8;">平均台数:</strong> {df_daily['total_machines'].mean():.0f}台
        </span>
        <span class="header-meta-pill" style="border-color: #6366f1;">
            <strong style="color: #818cf8;">方式:</strong> {'G数連動実務粗利 (Model B)' if use_model_b else '差枚数換算 (Model A)'}
        </span>
    </div>
</div>
""", unsafe_allow_html=True)

# --------------------------------------------------------------------------
# KPIカード 4枚 (Web版 KpiCards.tsx と完全一致)
# --------------------------------------------------------------------------
total_profit = float(df_daily[display_val_col].sum())
days_count = len(df_daily)
avg_machines = float(df_daily["total_machines"].mean()) if days_count > 0 else 1.0

total_hall_coins = float(df_daily["hall_coin_profit"].sum())
total_player_coins = float(df_daily["player_coin_profit"].sum())
total_primary_coins = total_hall_coins if is_hall else total_player_coins

if unit == "yen":
    primary_total_str = format_yen(total_profit)
    sub_total_str = format_coins(total_primary_coins)
    per_m_tot_str = f"{format_yen(total_profit / avg_machines)} / 台" if avg_machines > 0 else "-"
elif unit == "coins":
    primary_total_str = format_coins(total_primary_coins)
    sub_total_str = format_yen(total_profit)
    per_m_tot_str = f"{format_coins(total_primary_coins / avg_machines)} / 台" if avg_machines > 0 else "-"
else:
    avg_diff_val = round(total_primary_coins / (days_count * avg_machines)) if (days_count * avg_machines) > 0 else 0
    primary_total_str = f"{'+' if avg_diff_val > 0 else ''}{avg_diff_val}枚/台"
    sub_total_str = format_yen(total_profit)
    per_m_tot_str = f"{format_coins(total_primary_coins / avg_machines)} / 台" if avg_machines > 0 else "-"

avg_monthly_profit = total_profit / total_months if total_months > 0 else 0.0
daily_avg = total_profit / days_count if days_count > 0 else 0.0
per_machine_daily = total_profit / (avg_machines * days_count) if (avg_machines * days_count) > 0 else 0.0
per_machine_monthly = avg_monthly_profit / avg_machines if avg_machines > 0 else 0.0
avg_games_weighted = float(df_daily["avg_games"].mean()) if days_count > 0 else 0.0

if unit == "yen":
    monthly_avg_str = format_yen(avg_monthly_profit)
    pm_monthly_str = f"{format_yen(per_machine_monthly)}/台"
    pm_daily_str = f"{format_yen(per_machine_daily)} / 台・日"
elif unit == "coins":
    monthly_coins = total_primary_coins / total_months if total_months > 0 else 0.0
    monthly_avg_str = format_coins(monthly_coins)
    pm_monthly_str = f"{format_coins(monthly_coins / avg_machines)}/台"
    pm_daily_str = f"{format_coins(total_primary_coins / (avg_machines * days_count))} / 台・日"
else:
    monthly_avg_str = f"{'+' if avg_diff_val > 0 else ''}{avg_diff_val}枚/台"
    pm_monthly_str = f"{format_coins(per_machine_monthly)}/台"
    pm_daily_str = f"{format_yen(per_machine_daily)} / 台・日"

monthly_group = df_daily.groupby("year_month").agg({
    display_val_col: "sum",
    "total_diff_coins": "sum",
    "total_machines": "mean",
    "date": "count",
    "avg_diff": "mean"
}).reset_index()

sorted_by_profit = monthly_group.sort_values(display_val_col, ascending=False)
best_m = sorted_by_profit.iloc[0] if not sorted_by_profit.empty else None
worst_m = sorted_by_profit.iloc[-1] if not sorted_by_profit.empty else None

def get_month_stat_str(row):
    if row is None:
        return "-", "-", "-", "-"
    ym = row["year_month"]
    p = float(row[display_val_col])
    m_cnt = float(row["total_machines"])
    d_cnt = float(row["date"])
    diff = float(row["avg_diff"])
    p_str = format_yen(p) if unit == "yen" else format_coins(-row["total_diff_coins"] if is_hall else row["total_diff_coins"])
    pm_m_str = f"{format_yen(p / m_cnt)} / 台" if m_cnt > 0 else "-"
    pm_d_str = f"(日: {format_yen(p / (m_cnt * d_cnt))})" if (m_cnt * d_cnt) > 0 else ""
    return ym, p_str, f"客平均 {diff:+.0f}枚/台", f"{pm_m_str} {pm_d_str}"

best_ym, best_val, best_diff, best_pm = get_month_stat_str(best_m)
worst_ym, worst_val, worst_diff, worst_pm = get_month_stat_str(worst_m)

kpi_color_1 = "#10b981" if total_profit > 0 else "#f43f5e"
kpi_color_2 = "#38bdf8" if avg_monthly_profit > 0 else "#f43f5e"

st.markdown(f"""
<div class="kpi-grid">
    <div class="kpi-card">
        <div class="kpi-card-head">
            <span>{'期間累計 ホール粗利 (G数連動)' if is_hall else '期間累計 ユーザー収支 (G数連動)'}</span>
            <span class="kpi-card-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">💰</span>
        </div>
        <div class="kpi-card-value" style="color: {kpi_color_1};">
            {primary_total_str}
        </div>
        <div class="kpi-card-sub">
            <span>{sub_total_str}</span>
            <span>{total_months}ヶ月 ({days_count}日)</span>
        </div>
        <div class="kpi-card-foot">
            <span style="color: #94a3b8;">1台あたり累計:</span>
            <strong style="color: #ffffff;">{per_m_tot_str}</strong>
        </div>
    </div>

    <div class="kpi-card">
        <div class="kpi-card-head">
            <span>{'月平均 ホール粗利' if is_hall else '月平均 ユーザー収支'}</span>
            <span class="kpi-card-icon" style="background: rgba(99, 102, 241, 0.15); color: #818cf8;">📈</span>
        </div>
        <div class="kpi-card-value" style="color: {kpi_color_2};">
            {monthly_avg_str}<span style="font-size: 13px; font-weight: 600; color: #94a3b8; margin-left: 4px;">/月</span>
        </div>
        <div class="kpi-card-sub">
            <span>1台・月平均: <strong style="color: #cbd5e1;">{pm_monthly_str}</strong></span>
            <span>稼働 {avg_games_weighted:,.0f}G</span>
        </div>
        <div class="kpi-card-foot">
            <span style="color: #94a3b8;">1台・1日平均:</span>
            <strong style="color: #818cf8;">{pm_daily_str}</strong>
        </div>
    </div>

    <div class="kpi-card">
        <div class="kpi-card-head">
            <span>{'最高利益月 (店黒字No.1)' if is_hall else '最高出玉月 (客勝ちNo.1)'}</span>
            <span class="kpi-card-icon" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24;">🏆</span>
        </div>
        <div class="kpi-card-value" style="color: #ffffff;">
            {best_ym}
        </div>
        <div class="kpi-card-sub">
            <span style="color: #10b981; font-weight: 700;">{best_val}</span>
            <span>{best_diff}</span>
        </div>
        <div class="kpi-card-foot">
            <span style="color: #94a3b8;">1台あたり月間:</span>
            <strong style="color: #ffffff;">{best_pm}</strong>
        </div>
    </div>

    <div class="kpi-card">
        <div class="kpi-card-head">
            <span>{'最大還元月 (店赤字No.1)' if is_hall else '最低収支月 (客負けNo.1)'}</span>
            <span class="kpi-card-icon" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e;">📉</span>
        </div>
        <div class="kpi-card-value" style="color: #ffffff;">
            {worst_ym}
        </div>
        <div class="kpi-card-sub">
            <span style="color: #f43f5e; font-weight: 700;">{worst_val}</span>
            <span>{worst_diff}</span>
        </div>
        <div class="kpi-card-foot">
            <span style="color: #94a3b8;">1台あたり月間:</span>
            <strong style="color: #ffffff;">{worst_pm}</strong>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

if use_model_b:
    gap_contrib = float(df_daily["exchange_gap_profit"].sum())
    st.markdown(f"""
    <div class="model-b-banner">
        <span style="font-size: 20px;">⚡</span>
        <div>
            <strong>G数(IN枚数)連動モデル (ホール実務粗利) 稼働中</strong>: 
            推定換金ギャップ利益は累計 <strong>{format_yen(gap_contrib)}</strong> です。
            （客側の再投資・サンド投入による換金ギャップ利益が加味され、店舗の真の純利益を正確に算定しています）
        </div>
    </div>
    """, unsafe_allow_html=True)

# --------------------------------------------------------------------------
# メインタブ構成
# --------------------------------------------------------------------------
tab_monthly, tab_daily, tab_patterns, tab_dow, tab_tail, tab_comp, tab_export = st.tabs([
    "📅 月別推移・回収ペース",
    "📋 日別詳細データ (全日)",
    "🎯 特日サイクル・パターン分析",
    "📆 曜日別分析",
    "🔢 末尾日分析 (0〜9)",
    "⚖️ 特日 vs 通常日比較",
    "💾 データエクスポート"
])

# --------------------------------------------------------------------------
# TAB 1: 月別推移・回収ペース分析
# --------------------------------------------------------------------------
with tab_monthly:
    st.markdown("#### 📊 月別粗利・収支推移グラフ")

    monthly_summary_list = []
    for ym, grp in df_daily.groupby("year_month"):
        days_c = len(grp)
        p_tot = float(grp[display_val_col].sum())
        d_avg_month = p_tot / days_c if days_c > 0 else 0
        diff_tot = float(grp["total_diff_coins"].sum())
        m_machines = float(grp["total_machines"].mean())
        per_m_d = d_avg_month / m_machines if m_machines > 0 else 0
        g_avg = float(grp["avg_games"].mean())
        payout = (float(grp["out_coins"].sum()) / float(grp["in_coins"].sum()) * 100) if float(grp["in_coins"].sum()) > 0 else 100.0

        sp_grp = grp[grp["is_special"]]
        no_grp = grp[~grp["is_special"]]
        sp_cnt = len(sp_grp)
        no_cnt = len(no_grp)
        sp_avg = float(sp_grp[display_val_col].sum() / sp_cnt) if sp_cnt > 0 else 0
        no_avg = float(no_grp[display_val_col].sum() / no_cnt) if no_cnt > 0 else 0

        monthly_summary_list.append({
            "year_month": ym,
            "営業日数": days_c,
            "平均台数": round(m_machines),
            "ホール粗利" if is_hall else "客収支": round(p_tot),
            "1日平均": round(d_avg_month),
            "全期間平均乖離": round(d_avg_month - daily_avg),
            "台日あたり": round(per_m_d),
            "総差枚数": round(diff_tot),
            "出玉率": round(payout, 2),
            "平均G数": round(g_avg),
            "特日日数": sp_cnt,
            "特日平均": round(sp_avg),
            "通常日平均": round(no_avg),
        })

    df_m_table = pd.DataFrame(monthly_summary_list).sort_values("year_month", ascending=True)

    val_col_name = "ホール粗利" if is_hall else "客収支"
    fig_bar = px.bar(
        df_m_table,
        x="year_month",
        y=val_col_name,
        color=val_col_name,
        color_continuous_scale=["#f43f5e", "#64748b", "#10b981"] if is_hall else ["#f43f5e", "#64748b", "#38bdf8"],
        title=f"月別{'ホール粗利' if is_hall else 'ユーザー収支'} 推移 (単位: 円)",
        text_auto=",.0f"
    )
    fig_bar.update_layout(
        template="plotly_dark",
        plot_bgcolor="#0f172a",
        paper_bgcolor="#1e293b",
        height=360,
        margin=dict(l=20, r=20, t=40, b=20),
        coloraxis_showscale=False
    )
    st.plotly_chart(fig_bar, use_container_width=True)

    st.markdown("#### 📋 月別詳細集計表")
    df_m_disp = df_m_table.sort_values("year_month", ascending=False).copy()
    st.dataframe(
        df_m_disp.fillna(0).style.format({
            val_col_name: "{:+,}円",
            "1日平均": "{:+,}円/日",
            "全期間平均乖離": "{:+,}円/日",
            "台日あたり": "{:+,}円/台",
            "総差枚数": "{:+,}枚",
            "出玉率": "{:.2f}%",
            "平均G数": "{:,}G",
            "特日平均": "{:+,}円",
            "通常日平均": "{:+,}円",
        }),
        use_container_width=True,
        hide_index=True
    )

# --------------------------------------------------------------------------
# TAB 2: 日別詳細データ (全日)
# --------------------------------------------------------------------------
with tab_daily:
    st.markdown("#### 📋 日別営業データ一覧")

    col_d1, col_d2, col_d3 = st.columns(3)
    with col_d1:
        month_filter = st.selectbox(
            "対象月絞り込み",
            ["すべての月"] + sorted(list(df_daily["year_month"].unique()), reverse=True)
        )
    with col_d2:
        attr_filter = st.selectbox(
            "属性絞り込み (特日/通常日/祝日)",
            ["すべて", "特日のみ", "通常日のみ", "祝日のみ"]
        )
    with col_d3:
        win_filter = st.selectbox(
            "営業結果絞り込み",
            ["すべて", "店舗黒字 (客負け)", "出玉還元 (客勝ち)"]
        )

    df_d_show = df_daily.copy()
    if month_filter != "すべての月":
        df_d_show = df_d_show[df_d_show["year_month"] == month_filter]

    if attr_filter == "特日のみ":
        df_d_show = df_d_show[df_d_show["is_special"]]
    elif attr_filter == "通常日のみ":
        df_d_show = df_d_show[~df_d_show["is_special"]]
    elif attr_filter == "祝日のみ":
        df_d_show = df_d_show[df_d_show["is_holiday"]]

    if win_filter == "店舗黒字 (客負け)":
        df_d_show = df_d_show[df_d_show["hall_coin_profit"] > 0]
    elif win_filter == "出玉還元 (客勝ち)":
        df_d_show = df_d_show[df_d_show["hall_coin_profit"] < 0]

    cols_export = [
        "date", "dow_jp", "is_special", "holiday_name", "total_machines",
        "avg_games", "avg_diff", "total_diff_coins", "win_rate", "payout_rate", display_val_col
    ]
    renames = {
        "date": "日付",
        "dow_jp": "曜日",
        "is_special": "特日",
        "holiday_name": "祝日",
        "total_machines": "台数",
        "avg_games": "平均G数",
        "avg_diff": "台平均差枚",
        "total_diff_coins": "総差枚数",
        "win_rate": "勝率(%)",
        "payout_rate": "出玉率(%)",
        display_val_col: "粗利 (円)" if is_hall else "客収支 (円)"
    }
    df_d_res = df_d_show[cols_export].rename(columns=renames).sort_values("日付", ascending=False)

    st.dataframe(
        df_d_res.fillna(0).style.format({
            "台数": "{:,}台",
            "平均G数": "{:,}G",
            "台平均差枚": "{:+,}枚",
            "総差枚数": "{:+,}枚",
            "勝率(%)": "{:.1f}%",
            "出玉率(%)": "{:.2f}%",
            "粗利 (円)" if is_hall else "客収支 (円)": "{:+,}円"
        }),
        use_container_width=True,
        hide_index=True
    )

# --------------------------------------------------------------------------
# TAB 3: 特日サイクル・パターン分析
# --------------------------------------------------------------------------
with tab_patterns:
    st.markdown("#### 🎯 月内特日サイクル分析（出す・回収するパターン）")
    st.caption("設定された特日ルールにおける『月内の特定日（例: 5日, 15日, 25日）ごとの放出・回収実績』を全期間データから自動解析")

    df_sp_days = df_daily[df_daily["is_special"]].copy()

    if df_sp_days.empty:
        st.info("指定された特日ルールに該当する営業日データがありません。サイドバーで特日ルールを調整してください。")
    else:
        sp_day_stats = []
        for d_num, grp in df_sp_days.groupby("day"):
            cnt = len(grp)
            if cnt == 0:
                continue
            wins = int((grp["player_coin_profit"] > 0).sum())
            losses = cnt - wins
            w_rate = (wins / cnt * 100) if cnt > 0 else 0
            avg_diff = float(grp["avg_diff"].mean())
            tot_yen = float(grp[display_val_col].sum())
            in_c = float(grp["in_coins"].sum())
            out_c = float(grp["out_coins"].sum())
            payout = (out_c / in_c * 100) if in_c > 0 else 100.0

            sp_day_stats.append({
                "特定日": f"{d_num}日",
                "分析回数": cnt,
                "放出回数 (客勝ち)": wins,
                "回収回数 (店黒字)": losses,
                "出す確率 (放出率)": round(w_rate, 1),
                "台平均差枚": round(avg_diff, 1),
                "出玉率": round(payout, 2),
                "1日平均利益" if is_hall else "1日平均収支": round(tot_yen / cnt),
            })

        df_sp_rank = pd.DataFrame(sp_day_stats).sort_values("出す確率 (放出率)", ascending=False)

        col_p1, col_p2 = st.columns([1, 1])
        with col_p1:
            st.markdown("##### 🏆 特定日別 出す確率ランキング")
            st.dataframe(
                df_sp_rank.fillna(0).style.format({
                    "出す確率 (放出率)": "{:.1f}%",
                    "台平均差枚": "{:+,}枚",
                    "出玉率": "{:.2f}%",
                    "1日平均利益" if is_hall else "1日平均収支": "{:+,}円"
                }),
                use_container_width=True,
                hide_index=True
            )

        with col_p2:
            fig_p = px.bar(
                df_sp_rank,
                x="特定日",
                y="台平均差枚",
                color="台平均差枚",
                color_continuous_scale=["#f43f5e", "#cbd5e1", "#38bdf8"],
                title="特定日別 台平均差枚 (客目線+は還元)",
                text_auto=",.1f"
            )
            fig_p.update_layout(template="plotly_dark", height=320, plot_bgcolor="#0f172a", paper_bgcolor="#1e293b")
            st.plotly_chart(fig_p, use_container_width=True)

# --------------------------------------------------------------------------
# TAB 4: 曜日別分析
# --------------------------------------------------------------------------
with tab_dow:
    st.markdown("#### 📆 曜日別パフォーマンス分析 (祝日含む)")

    dow_rows = []
    for dow in JAPANESE_DAYS:
        sub = df_daily[(df_daily["dow_jp"] == dow) & (~df_daily["is_holiday"])]
        cnt = len(sub)
        if cnt == 0:
            continue
        tot_prof = float(sub[display_val_col].sum())
        d_avg = tot_prof / cnt
        diff_avg = float(sub["total_diff_coins"].sum() / cnt)
        m_mach = float(sub["total_machines"].mean())
        per_m_d = d_avg / m_mach if m_mach > 0 else 0
        g_avg = float(sub["avg_games"].mean())
        w_rate = float(sub["win_rate"].mean())
        p_wins = int((sub["player_coin_profit"] > 0).sum())

        dow_rows.append({
            "区分": f"{dow}曜日",
            "日数": cnt,
            "1日平均粗利" if is_hall else "1日平均収支": round(d_avg),
            "台日粗利" if is_hall else "台日収支": round(per_m_d),
            "平均総差枚": round(diff_avg),
            "平均G数": round(g_avg),
            "平均勝率": round(w_rate, 1),
            "放出確率 (客勝率)": round(p_wins / cnt * 100, 1),
        })

    sub_hol = df_daily[df_daily["is_holiday"]]
    if not sub_hol.empty:
        cnt = len(sub_hol)
        tot_prof = float(sub_hol[display_val_col].sum())
        d_avg = tot_prof / cnt
        diff_avg = float(sub_hol["total_diff_coins"].sum() / cnt)
        m_mach = float(sub_hol["total_machines"].mean())
        per_m_d = d_avg / m_mach if m_mach > 0 else 0
        g_avg = float(sub_hol["avg_games"].mean())
        w_rate = float(sub_hol["win_rate"].mean())
        p_wins = int((sub_hol["player_coin_profit"] > 0).sum())

        dow_rows.append({
            "区分": "祝祭日 (振替含む)",
            "日数": cnt,
            "1日平均粗利" if is_hall else "1日平均収支": round(d_avg),
            "台日粗利" if is_hall else "台日収支": round(per_m_d),
            "平均総差枚": round(diff_avg),
            "平均G数": round(g_avg),
            "平均勝率": round(w_rate, 1),
            "放出確率 (客勝率)": round(p_wins / cnt * 100, 1),
        })

    df_dow_res = pd.DataFrame(dow_rows)

    col_w1, col_w2 = st.columns(2)
    with col_w1:
        fig_dow1 = px.bar(
            df_dow_res,
            x="区分",
            y="1日平均粗利" if is_hall else "1日平均収支",
            title="曜日・祝日別 1日平均粗利 / 収支",
            color="1日平均粗利" if is_hall else "1日平均収支",
            color_continuous_scale=["#f43f5e", "#64748b", "#10b981"] if is_hall else ["#f43f5e", "#64748b", "#38bdf8"],
            text_auto=",.0f"
        )
        fig_dow1.update_layout(template="plotly_dark", height=320, plot_bgcolor="#0f172a", paper_bgcolor="#1e293b", coloraxis_showscale=False)
        st.plotly_chart(fig_dow1, use_container_width=True)

    with col_w2:
        fig_dow2 = px.bar(
            df_dow_res,
            x="区分",
            y="平均G数",
            title="曜日・祝日別 平均稼働ゲーム数 (G)",
            text_auto=",.0f"
        )
        fig_dow2.update_layout(template="plotly_dark", height=320, plot_bgcolor="#0f172a", paper_bgcolor="#1e293b")
        st.plotly_chart(fig_dow2, use_container_width=True)

    st.dataframe(
        df_dow_res.fillna(0).style.format({
            "1日平均粗利" if is_hall else "1日平均収支": "{:+,}円",
            "台日粗利" if is_hall else "台日収支": "{:+,}円/台",
            "平均総差枚": "{:+,}枚",
            "平均G数": "{:,}G",
            "平均勝率": "{:.1f}%",
            "放出確率 (客勝率)": "{:.1f}%"
        }),
        use_container_width=True,
        hide_index=True
    )

# --------------------------------------------------------------------------
# TAB 5: 末尾日分析
# --------------------------------------------------------------------------
with tab_tail:
    st.markdown("#### 🔢 日付末尾（0〜9）およびゾロ目別パフォーマンス分析")

    tail_stats_list = []
    for t in range(10):
        sub = df_daily[df_daily["tail_digit"] == t]
        cnt = len(sub)
        if cnt == 0:
            continue
        tot_prof = float(sub[display_val_col].sum())
        d_avg = tot_prof / cnt
        diff_avg = float(sub["total_diff_coins"].sum() / cnt)
        m_mach = float(sub["total_machines"].mean())
        per_m_d = d_avg / m_mach if m_mach > 0 else 0
        g_avg = float(sub["avg_games"].mean())
        w_rate = float(sub["win_rate"].mean())
        p_wins = int((sub["player_coin_profit"] > 0).sum())

        tail_stats_list.append({
            "末尾区分": f"{t}のつく日",
            "日数": cnt,
            "1日平均粗利" if is_hall else "1日平均収支": round(d_avg),
            "台日粗利" if is_hall else "台日収支": round(per_m_d),
            "平均総差枚": round(diff_avg),
            "平均G数": round(g_avg),
            "平均勝率": round(w_rate, 1),
            "放出率 (客勝率)": round(p_wins / cnt * 100, 1),
        })

    # ゾロ目
    sub_zoro = df_daily[(df_daily["day"].isin([11, 22])) | (df_daily["month"] == df_daily["day"])]
    if not sub_zoro.empty:
        cnt = len(sub_zoro)
        tot_prof = float(sub_zoro[display_val_col].sum())
        d_avg = tot_prof / cnt
        diff_avg = float(sub_zoro["total_diff_coins"].sum() / cnt)
        m_mach = float(sub_zoro["total_machines"].mean())
        per_m_d = d_avg / m_mach if m_mach > 0 else 0
        g_avg = float(sub_zoro["avg_games"].mean())
        w_rate = float(sub_zoro["win_rate"].mean())
        p_wins = int((sub_zoro["player_coin_profit"] > 0).sum())

        tail_stats_list.append({
            "末尾区分": "ゾロ目の日",
            "日数": cnt,
            "1日平均粗利" if is_hall else "1日平均収支": round(d_avg),
            "台日粗利" if is_hall else "台日収支": round(per_m_d),
            "平均総差枚": round(diff_avg),
            "平均G数": round(g_avg),
            "平均勝率": round(w_rate, 1),
            "放出率 (客勝率)": round(p_wins / cnt * 100, 1),
        })

    df_tail_res = pd.DataFrame(tail_stats_list)

    fig_tail = px.bar(
        df_tail_res,
        x="末尾区分",
        y="1日平均粗利" if is_hall else "1日平均収支",
        title="日付末尾別 1日平均粗利 / 収支",
        color="1日平均粗利" if is_hall else "1日平均収支",
        color_continuous_scale=["#f43f5e", "#64748b", "#10b981"] if is_hall else ["#f43f5e", "#64748b", "#38bdf8"],
        text_auto=",.0f"
    )
    fig_tail.update_layout(template="plotly_dark", height=320, plot_bgcolor="#0f172a", paper_bgcolor="#1e293b", coloraxis_showscale=False)
    st.plotly_chart(fig_tail, use_container_width=True)

    st.dataframe(
        df_tail_res.fillna(0).style.format({
            "1日平均粗利" if is_hall else "1日平均収支": "{:+,}円",
            "台日粗利" if is_hall else "台日収支": "{:+,}円/台",
            "平均総差枚": "{:+,}枚",
            "平均G数": "{:,}G",
            "平均勝率": "{:.1f}%",
            "放出率 (客勝率)": "{:.1f}%"
        }),
        use_container_width=True,
        hide_index=True
    )

# --------------------------------------------------------------------------
# TAB 6: 特日 vs 通常営業日 比較
# --------------------------------------------------------------------------
with tab_comp:
    st.markdown("#### ⚖️ 特定日 vs 通常営業日 総合比較")

    df_sp = df_daily[df_daily["is_special"]]
    df_no = df_daily[~df_daily["is_special"]]

    sp_in = float(df_sp["in_coins"].sum()) if not df_sp.empty else 0.0
    sp_out = float(df_sp["out_coins"].sum()) if not df_sp.empty else 0.0
    no_in = float(df_no["in_coins"].sum()) if not df_no.empty else 0.0
    no_out = float(df_no["out_coins"].sum()) if not df_no.empty else 0.0

    comp_list = [
        {
            "区分": "特定日 (旧イベント日・特日)",
            "営業日数": len(df_sp),
            "台平均差枚": round(df_sp["avg_diff"].mean(), 1) if not df_sp.empty else 0,
            "平均G数": round(df_sp["avg_games"].mean()) if not df_sp.empty else 0,
            "勝率": round(df_sp["win_rate"].mean(), 1) if not df_sp.empty else 0,
            "1日平均粗利" if is_hall else "1日平均収支": round(df_sp[display_val_col].mean()) if not df_sp.empty else 0,
            "出玉率 (機械割)": round((sp_out / sp_in * 100), 2) if sp_in > 0 else 0
        },
        {
            "区分": "通常営業日",
            "営業日数": len(df_no),
            "台平均差枚": round(df_no["avg_diff"].mean(), 1) if not df_no.empty else 0,
            "平均G数": round(df_no["avg_games"].mean()) if not df_no.empty else 0,
            "勝率": round(df_no["win_rate"].mean(), 1) if not df_no.empty else 0,
            "1日平均粗利" if is_hall else "1日平均収支": round(df_no[display_val_col].mean()) if not df_no.empty else 0,
            "出玉率 (機械割)": round((no_out / no_in * 100), 2) if no_in > 0 else 0
        }
    ]
    df_comp_res = pd.DataFrame(comp_list)
    st.dataframe(
        df_comp_res.fillna(0).style.format({
            "台平均差枚": "{:+,}枚",
            "平均G数": "{:,}G",
            "勝率": "{:.1f}%",
            "1日平均粗利" if is_hall else "1日平均収支": "{:+,}円",
            "出玉率 (機械割)": "{:.2f}%"
        }),
        use_container_width=True,
        hide_index=True
    )

# --------------------------------------------------------------------------
# TAB 7: データエクスポート
# --------------------------------------------------------------------------
with tab_export:
    st.markdown("#### 💾 計算済みデータのCSVダウンロード")
    csv_bytes = df_daily.to_csv(index=False, encoding="utf-8-sig").encode("utf-8-sig")
    st.download_button(
        label="📥 全営業日計算済みCSVをダウンロード (UTF-8 BOM)",
        data=csv_bytes,
        file_name=f"{raw_store_data.get('name', 'slot_store')}_financial_analysis.csv",
        mime="text/csv"
    )
    st.caption("※Model A / Model B の粗利、売上、機械割、換金ギャップ利益、祝日、特日判定などの全カラムが含まれます。")
