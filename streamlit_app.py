"""
スロット店舗 粗利・売上分析システム (Streamlit版)
======================================================
スロレポHTMLデータから、ホールの粗利推移・売上・出玉率（機械割）・特日/曜日/末尾別傾向を
Web版ダッシュボードと100%同一のパース＆計算ロジックで忠実に可視化・分析します。

【実行方法】
1. 必要なライブラリをインストール:
   pip install streamlit pandas plotly beautifulsoup4

2. アプリを起動:
   streamlit run streamlit_app.py
"""

import re
import math
import datetime
from typing import Dict, List, Optional, Tuple, Any, Set

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from bs4 import BeautifulSoup

# --------------------------------------------------------------------------
# ページ基本設定
# --------------------------------------------------------------------------
st.set_page_config(
    page_title="スロット店舗 粗利・売上分析システム",
    page_icon="🎰",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --------------------------------------------------------------------------
# UIカスタムスタイル (Web版ダッシュボードデザイン再現)
# --------------------------------------------------------------------------
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    .stApp {
        background-color: #f8fafc;
    }
    
    [data-testid="stSidebar"] {
        background-color: #ffffff;
        border-right: 1px solid #e2e8f0;
    }
    
    .hero-card {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: #ffffff;
        padding: 24px 28px;
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15);
        margin-bottom: 24px;
        border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .hero-title {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin: 0 0 8px 0;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .hero-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
    }
    .hero-tag {
        font-size: 12px;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.12);
        color: #f1f5f9;
        border: 1px solid rgba(255, 255, 255, 0.18);
    }

    .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 14px;
        margin-bottom: 24px;
    }
    .kpi-box {
        background: #ffffff;
        padding: 18px 20px;
        border-radius: 14px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.04);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .kpi-box:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.08);
    }
    .kpi-tit {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
    }
    .kpi-num {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1.1;
        margin-bottom: 4px;
    }
    .kpi-desc {
        font-size: 12px;
        font-weight: 500;
        color: #94a3b8;
    }

    .stTabs [data-baseweb="tab-list"] {
        gap: 6px;
        background-color: #f1f5f9;
        padding: 5px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        margin-bottom: 20px;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 8px;
        font-weight: 700;
        font-size: 13px;
        padding: 8px 18px;
        color: #64748b;
        border: none;
        background: transparent;
    }
    .stTabs [aria-selected="true"] {
        background-color: #ffffff !important;
        color: #0f172a !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08) !important;
    }

    .welcome-box {
        background: #ffffff;
        border: 2px dashed #cbd5e1;
        border-radius: 16px;
        padding: 48px 32px;
        text-align: center;
        margin: 32px auto;
        max-width: 680px;
    }
</style>
""", unsafe_allow_html=True)

JAPANESE_DAYS = ['月', '火', '水', '木', '金', '土', '日']


# --------------------------------------------------------------------------
# 換金率パース関数 (Web版 htmlParser.ts と完全一致)
# --------------------------------------------------------------------------
def parse_rates_from_exchange_rate(exchange_rate_str: str) -> Tuple[int, int]:
    """換金率文字列から貸出/交換レート（枚/1000円）を抽出"""
    rate_lend = 46
    rate_exchange = 52

    if not exchange_rate_str:
        return rate_lend, rate_exchange

    clean = exchange_rate_str.strip()
    slash_parts = re.split(r'[/／]', clean)

    if len(slash_parts) >= 2:
        lend_part = slash_parts[0]
        exch_part = slash_parts[1]

        lend_digits = re.search(r'(\d+)', lend_part)
        if lend_digits:
            rate_lend = int(lend_digits.group(1))

        exch_digits = re.search(r'(\d+)', exch_part)
        if exch_digits:
            rate_exchange = int(exch_digits.group(1))
        elif '等価' in exch_part:
            rate_exchange = rate_lend
        return rate_lend, rate_exchange

    lend_match = re.search(r'(\d+)\s*枚(?:貸|貸出)', clean) or re.search(r'(?:貸出|貸)\s*[:：]?\s*(\d+)', clean)
    if lend_match:
        rate_lend = int(lend_match.group(1))

    exch_match = re.search(r'(\d+)\s*枚\s*(?:交換|等価)', clean) or re.search(r'(?:交換|換金)\s*[:：]?\s*(\d+)', clean)
    if exch_match:
        rate_exchange = int(exch_match.group(1))
    elif '等価' in clean:
        rate_exchange = rate_lend

    return rate_lend, rate_exchange


# --------------------------------------------------------------------------
# 特日ルール自動解析 (Web版 specialDayRules.ts と完全一致)
# --------------------------------------------------------------------------
def parse_special_day_rules_from_text(raw_text: str) -> Dict[str, Any]:
    """旧イベント日等の自由記述テキストから特日判定ルールを自動抽出"""
    if not raw_text or not raw_text.strip():
        return {"tails": [], "double_digits": False, "month_day_zoro": False, "fixed_dates": [], "days_of_week": []}

    # 全角数字を半角に正規化
    text = raw_text.translate(str.maketrans('０１２３４５６７８９', '0123456789'))

    tails_set: Set[int] = set()

    # 1. つく日 / 末尾 (例: "5のつく日", "7のつく日", "末尾5")
    for m in re.finditer(r'([0-9])\s*のつく日', text):
        tails_set.add(int(m.group(1)))
    for m in re.finditer(r'末尾\s*([0-9])', text):
        tails_set.add(int(m.group(1)))

    # 2. ゾロ目 / 11日 / 22日
    double_digits = ('ゾロ目' in text or '11日' in text or '22日' in text)
    month_day_zoro = ('ゾロ目' in text)

    # 3. 曜日 (土日, 毎週土曜日など)
    dows: List[str] = []
    if '土曜' in text or '土日' in text or '土' in text:
        dows.append('土')
    if '日曜' in text or '土日' in text or '日' in text:
        dows.append('日')

    # 4. 日付指定 (例: "1日・15日", "5日, 15日, 25日")
    fixed_dates: List[int] = []
    day_matches = re.findall(r'([0-9]{1,2})\s*日', text)
    if day_matches and len(day_matches) >= 2:
        parsed_days = sorted(list({int(d) for d in day_matches if 1 <= int(d) <= 31}))
        if len(parsed_days) >= 2:
            first_tail = parsed_days[0] % 10
            if all(d % 10 == first_tail for d in parsed_days):
                tails_set.add(first_tail)
            else:
                fixed_dates = parsed_days
    elif day_matches and len(day_matches) == 1 and not tails_set:
        d = int(day_matches[0])
        if 1 <= d <= 31:
            fixed_dates = [d]

    return {
        "tails": sorted(list(tails_set)),
        "double_digits": double_digits,
        "month_day_zoro": month_day_zoro,
        "fixed_dates": fixed_dates,
        "days_of_week": dows
    }


# --------------------------------------------------------------------------
# スロレポHTMLパーサー (Web版 htmlParser.ts と完全同一ロジック)
# --------------------------------------------------------------------------
def parse_slorepo_html(html_text: str) -> Dict[str, Any]:
    """BeautifulSoupを用いてスロレポHTMLを堅牢・正確にパース"""
    soup = BeautifulSoup(html_text, 'html.parser')

    # 1. 店舗名抽出
    store_name = ""
    h4_title = soup.select_one('h4.title')
    if h4_title:
        store_name = h4_title.get_text(strip=True)
    if not store_name and soup.title:
        title_txt = soup.title.get_text(strip=True)
        store_name = re.sub(r'\s*[-–|]\s*スロレポ.*$', '', title_txt, flags=re.IGNORECASE).strip()
    if not store_name:
        store_name = "スロレポ店舗"

    # 2. メタデータ (住所、旧イベント日、換金率、グランドオープン)
    address = "住所未登録"
    old_event_days = "5のつく日"
    exchange_rate_str = "50枚貸/56枚交換"
    grand_open = ""

    info_tables = soup.select('figure.wp-block-table table, table')
    for tbl in info_tables:
        for tr in tbl.find_all('tr'):
            th = tr.find('th')
            td = tr.find('td')
            if not th or not td:
                continue
            th_text = th.get_text(strip=True)
            td_text = td.get_text(strip=True)
            if '住所' in th_text and td_text:
                address = td_text
            elif '旧イベント日' in th_text and td_text:
                old_event_days = td_text
            elif '換金率' in th_text and td_text:
                exchange_rate_str = td_text
            elif 'グランドオープン' in th_text and td_text:
                grand_open = td_text

    rate_lend, rate_exchange = parse_rates_from_exchange_rate(exchange_rate_str)
    parsed_rules = parse_special_day_rules_from_text(old_event_days)

    # 3. 日別出玉テーブルの特定
    date_tables = soup.find_all('table', class_='date')
    all_tables = soup.find_all('table')
    for tbl in all_tables:
        if tbl not in date_tables:
            txt = tbl.get_text()
            if '日付' in txt and ('差枚' in txt or '勝率' in txt or '平均G' in txt or 'G数' in txt or '優秀機種' in txt):
                date_tables.append(tbl)

    raw_rows = []
    machine_counts = []
    current_year = datetime.date.today().year
    previous_month = None

    for tbl in date_tables:
        # テーブル文脈の年 (caption や 直前要素)
        context_year = None
        cap = tbl.find('caption')
        cap_text = cap.get_text() if cap else ""
        prev_el = tbl.find_previous_sibling()
        prev_text = prev_el.get_text() if prev_el else ""
        ctx_m = re.search(r'(202\d)年', cap_text + " " + prev_text)
        if ctx_m:
            context_year = int(ctx_m.group(1))

        for tr in tbl.find_all('tr'):
            if tr.find('th'):
                continue
            tds = tr.find_all('td')
            if len(tds) < 3:
                continue

            # Cell 0: 日付
            date_cell = tds[0]
            date_link = date_cell.find('a')
            href = date_link.get('href', '') if date_link else ''
            cell_text = date_cell.get_text(strip=True)

            formatted_date = ""
            row_year = None
            row_month = None
            row_day = None

            # href チェック
            href_m = re.search(r'(202\d)[-_/]?(\d{2})[-_/]?(\d{2})', href)
            if href_m:
                row_year = int(href_m.group(1))
                row_month = int(href_m.group(2))
                row_day = int(href_m.group(3))
            else:
                # full match (2026/09/09 or 2026年9月9日)
                full_m = re.search(r'(202\d)[年/-](\d{1,2})[月/-](\d{1,2})', cell_text)
                if full_m:
                    row_year = int(full_m.group(1))
                    row_month = int(full_m.group(2))
                    row_day = int(full_m.group(3))
                else:
                    # md match (9/9 or 9月9日)
                    md_m = re.search(r'(\d{1,2})[\/月](\d{1,2})', cell_text)
                    if md_m:
                        row_month = int(md_m.group(1))
                        row_day = int(md_m.group(2))

            if row_month and row_day:
                if row_year:
                    current_year = row_year
                    previous_month = row_month
                else:
                    if context_year:
                        current_year = context_year
                    else:
                        if previous_month is not None and previous_month <= 2 and row_month >= 11:
                            current_year -= 1
                    row_year = current_year
                    previous_month = row_month
                formatted_date = f"{row_year:04d}-{row_month:02d}-{row_day:02d}"

            if not formatted_date:
                continue

            # Cell 1: 平均差枚
            diff_text = tds[1].get_text(strip=True).replace(',', '')
            diff_m = re.search(r'([+-]?\d+)', diff_text)
            avg_diff = int(diff_m.group(1)) if diff_m else 0

            # Cell 2: 平均G数
            games_text = tds[2].get_text(strip=True).replace(',', '')
            games_m = re.search(r'(\d+)', games_text)
            avg_games = int(games_m.group(1)) if games_m else 0

            # Cell 3: 勝率 & 台数
            win_rate = None
            win_machines = None
            row_total_machines = None
            if len(tds) >= 4:
                rate_cell_text = tds[3].get_text()
                pct_m = re.search(r'(\d+(?:\.\d+)?)\s*%', rate_cell_text)
                if pct_m:
                    win_rate = float(pct_m.group(1))

                mach_m = re.search(r'[\(（]?\s*(\d+)\s*[\/／]\s*(\d+)\s*(?:台)?[\)）]?', rate_cell_text)
                if mach_m:
                    win_machines = int(mach_m.group(1))
                    row_total_machines = int(mach_m.group(2))
                    machine_counts.append(row_total_machines)
                else:
                    total_only_m = re.search(r'(?:[\/／]|\(|\b)(\d{2,4})\s*台', rate_cell_text)
                    if total_only_m:
                        row_total_machines = int(total_only_m.group(1))
                        machine_counts.append(row_total_machines)

            # Cell 4: 優秀機種
            top_models = ""
            if len(tds) >= 5:
                top_models = re.sub(r'\s+', ' ', tds[4].get_text(strip=True))

            raw_rows.append({
                "date": formatted_date,
                "avg_diff": avg_diff,
                "avg_games": avg_games,
                "win_rate": win_rate,
                "win_machines": win_machines,
                "row_total_machines": row_total_machines,
                "top_models": top_models
            })

    # 最頻台数の計算
    approx_machines = 162
    if machine_counts:
        freq_map = {}
        for c in machine_counts:
            freq_map[c] = freq_map.get(c, 0) + 1
        approx_machines = max(freq_map, key=freq_map.get)

    # 日付重複除去 (最新の完全なものを優先)
    date_map = {}
    for r in raw_rows:
        d = r["date"]
        if d not in date_map or (r["row_total_machines"] and not date_map[d].get("row_total_machines")):
            date_map[d] = r

    # 昇順ソート
    sorted_rows = sorted(list(date_map.values()), key=lambda x: x["date"])

    # 台数補完 (Web版 htmlParser.ts / dataEngine.ts と完全一致: 直近最寄り日の台数を流用)
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

        # 勝台数と勝率の相互補完
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
    # 1. 末尾
    if tails and (d.day % 10 in tails):
        return True
    # 2. 月日ゾロ目
    if month_day_zoro and (d.month == d.day):
        return True
    # 3. 11日・22日
    if double_digits and (d.day == 11 or d.day == 22):
        return True
    # 4. 固定日
    if fixed_dates and (d.day in fixed_dates):
        return True
    # 5. 曜日
    dow_jp = JAPANESE_DAYS[d.weekday()]
    if target_dows and (dow_jp in target_dows):
        return True
    return False


# --------------------------------------------------------------------------
# 収支・粗利計算 (Web版 dataEngine.ts と完全同一ロジック)
# --------------------------------------------------------------------------
def calculate_financials(
    records: List[Dict[str, Any]],
    rate_lend: int,
    rate_exchange: int,
    cash_ratio: float,
    tails: List[int],
    double_digits: bool,
    month_day_zoro: bool,
    fixed_dates: List[int],
    target_dows: List[str],
) -> pd.DataFrame:
    """日別レコードに対して Model A / Model B の収支・粗利を計算"""
    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records)
    df["date_dt"] = pd.to_datetime(df["date"])
    df = df.sort_values("date_dt").reset_index(drop=True)

    lend_yen_per_coin = 1000.0 / rate_lend
    exch_yen_per_coin = 1000.0 / rate_exchange
    gap_per_coin = lend_yen_per_coin - exch_yen_per_coin

    # 曜日・年月
    df["dow_jp"] = df["date_dt"].apply(lambda d: JAPANESE_DAYS[d.weekday()])
    df["year_month"] = df["date_dt"].dt.strftime("%Y-%m")

    # 特日フラグ
    df["is_special"] = df["date_dt"].apply(
        lambda d: is_special_day(d.date(), tails, double_digits, month_day_zoro, fixed_dates, target_dows)
    )

    # 総差枚数
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

    # Model B: G数(IN枚数)・換金ギャップモデル
    df["in_coins"] = (df["avg_games"] * 3 * df["total_machines"]).round()
    df["out_coins"] = df["in_coins"] + df["total_diff_coins"]
    df["payout_rate"] = df.apply(
        lambda row: round((row["out_coins"] / row["in_coins"] * 100), 2) if row["in_coins"] > 0 else 100.0,
        axis=1
    )

    df["cash_coins_invested"] = df["in_coins"] * (cash_ratio / 100.0)
    df["estimated_revenue"] = (df["cash_coins_invested"] * lend_yen_per_coin).round()
    df["exchange_gap_profit"] = (df["cash_coins_invested"] * gap_per_coin).round()

    # G数連動ホール粗利 = 換金ギャップ利益 - (総差枚 * 交換単価)
    df["model_b_hall_yen"] = (
        df["exchange_gap_profit"] - (df["total_diff_coins"] * exch_yen_per_coin)
    ).round()
    df["model_b_player_yen"] = -df["model_b_hall_yen"]

    return df


# --------------------------------------------------------------------------
# サイドバー設定
# --------------------------------------------------------------------------
with st.sidebar:
    st.header("🎰 スロット分析設定")

    st.subheader("📂 スロレポHTMLファイル")
    uploaded_files = st.file_uploader(
        "スロレポHTMLファイルを選択 / ドロップ",
        type=["html", "htm"],
        accept_multiple_files=True,
        help="スロレポ店舗ページのHTMLファイル（複数ファイル可）をドラッグ＆ドロップしてください"
    )

    raw_store_data = None

    if uploaded_files:
        combined_records = []
        store_meta = None
        for f in uploaded_files:
            content = f.read().decode("utf-8", errors="ignore")
            parsed = parse_slorepo_html(content)
            if not store_meta:
                store_meta = parsed
            combined_records.extend(parsed["raw_records"])

        # 日付の重複除去 (昇順)
        date_dict = {}
        for r in combined_records:
            d = r["date"]
            if d not in date_dict or (r.get("row_total_machines") and not date_dict[d].get("row_total_machines")):
                date_dict[d] = r

        unique_records = sorted(list(date_dict.values()), key=lambda x: x["date"])

        if store_meta:
            store_meta["raw_records"] = unique_records
            raw_store_data = store_meta
            st.success(f"✅ {len(uploaded_files)}ファイルから{len(unique_records):,}営業日分のデータを読込完了")

    st.markdown("---")

    # 分析目線切り替え
    perspective = st.radio(
        "👁️ 分析目線",
        ["ホール目線 (粗利・回収)", "スロッター目線 (客収支・還元)"],
        index=0
    )
    is_hall = (perspective == "ホール目線 (粗利・回収)")

    # 粗利計算モデル
    profit_model = st.radio(
        "📐 粗利計算モデル",
        ["Model B: G数(IN枚数)・換金ギャップ連動 (推奨)", "Model A: 単純差枚数換算"],
        index=0
    )
    use_model_b = ("Model B" in profit_model)

    st.markdown("---")
    st.subheader("⚙️ レート・前提条件")

    default_lend = raw_store_data["rate_lend"] if raw_store_data else 46
    default_exch = raw_store_data["rate_exchange"] if raw_store_data else 52

    col_l, col_e = st.columns(2)
    with col_l:
        rate_lend = st.number_input("貸出レート (枚/1000円)", min_value=30, max_value=60, value=default_lend, step=1)
    with col_e:
        rate_exchange = st.number_input("交換レート (枚/1000円)", min_value=30, max_value=60, value=default_exch, step=1)

    cash_ratio = st.slider("現金投資比率 (%)", min_value=10, max_value=80, value=35, step=5,
                           help="総G数に対する現金サンド投入の割合（通常30%〜45%前後）")

    st.markdown("---")
    st.subheader("🎯 特日ルール設定")

    # 店舗HTMLから抽出したルールをデフォルト値として自動反映
    auto_rules = raw_store_data.get("parsed_rules", {}) if raw_store_data else {}
    init_tails = auto_rules.get("tails", [5])
    init_double = auto_rules.get("double_digits", False)
    init_zoro = auto_rules.get("month_day_zoro", False)
    init_dows = auto_rules.get("days_of_week", [])

    selected_tails = st.multiselect(
        "特定末尾 (つく日)",
        options=list(range(10)),
        default=init_tails,
        format_func=lambda x: f"{x}のつく日"
    )
    col_t1, col_t2 = st.columns(2)
    with col_t1:
        double_digits = st.checkbox("11日・22日", value=init_double)
    with col_t2:
        month_day_zoro = st.checkbox("月日ゾロ目", value=init_zoro)

    target_dows = st.multiselect("特定曜日", options=JAPANESE_DAYS, default=init_dows)


# --------------------------------------------------------------------------
# メイン画面処理
# --------------------------------------------------------------------------
if not raw_store_data or not raw_store_data.get("raw_records"):
    # アップロード待ちウェルカム画面
    st.markdown("""
    <div class="welcome-box">
        <div style="font-size: 48px; margin-bottom: 12px;">📥</div>
        <h2 style="font-weight: 800; color: #0f172a; margin-bottom: 8px;">スロレポHTMLファイルをアップロードしてください</h2>
        <p style="color: #64748b; font-size: 15px; margin-bottom: 24px; line-height: 1.6;">
            左サイドバーの「<strong>スロレポHTMLファイル</strong>」欄に、スロレポの店舗出玉ページ（.html）を<br>
            ドラッグ＆ドロップしてください。複数月・複数ファイルの一括集計にも完全対応しています。
        </p>
        <div style="display: inline-flex; gap: 16px; font-size: 13px; color: #475569; background: #f1f5f9; padding: 10px 18px; border-radius: 8px;">
            <span>✨ 換金率・旧イベント日を自動検出</span>
            <span>🪙 1円単位の粗利・売上・出玉率計算</span>
        </div>
    </div>
    """, unsafe_allow_html=True)
    st.stop()

# 計算実行
df_daily = calculate_financials(
    records=raw_store_data["raw_records"],
    rate_lend=rate_lend,
    rate_exchange=rate_exchange,
    cash_ratio=cash_ratio,
    tails=selected_tails,
    double_digits=double_digits,
    month_day_zoro=month_day_zoro,
    fixed_dates=auto_rules.get("fixed_dates", []),
    target_dows=target_dows
)

# 使用する粗利・収支列
active_profit_col = "model_b_hall_yen" if use_model_b else "model_a_hall_yen"
active_player_col = "model_b_player_yen" if use_model_b else "model_a_player_yen"
display_val_col = active_profit_col if is_hall else active_player_col

# --------------------------------------------------------------------------
# ヘッダーカード
# --------------------------------------------------------------------------
st.markdown(f"""
<div class="hero-card">
    <div class="hero-title">
        <span>🎰</span>
        <span>{raw_store_data['name']} 粗利・売上分析</span>
    </div>
    <div class="hero-tags">
        <span class="hero-tag">📍 {raw_store_data['address']}</span>
        <span class="hero-tag">🪙 {raw_store_data['exchange_rate_str']}</span>
        <span class="hero-tag">🎯 旧イベント: {raw_store_data['old_event_days']}</span>
        <span class="hero-tag">📅 集計日数: {len(df_daily):,} 営業日</span>
    </div>
</div>
""", unsafe_allow_html=True)

# --------------------------------------------------------------------------
# TOP KPI カード (Web版 KpiCards.tsx と100%同一の計算式)
# --------------------------------------------------------------------------
total_profit = float(df_daily[display_val_col].sum())
days_count = len(df_daily)
avg_total_machines = float(df_daily["total_machines"].mean()) if days_count > 0 else 1.0

# 営業日平均
daily_avg = total_profit / days_count if days_count > 0 else 0.0

# 台日あたり (Web版: totalPrimary / (avgTotalMachines * totalDays))
per_machine_daily = total_profit / (avg_total_machines * days_count) if (avg_total_machines * days_count) > 0 else 0.0

# 差枚数
total_diff_coins = float(df_daily["total_diff_coins"].sum())
avg_diff_coins = total_diff_coins / (avg_total_machines * days_count) if (avg_total_machines * days_count) > 0 else 0.0

# 売上・機械割
total_revenue = float(df_daily["estimated_revenue"].sum())
total_gap_profit = float(df_daily["exchange_gap_profit"].sum())
sum_in = float(df_daily["in_coins"].sum())
sum_out = float(df_daily["out_coins"].sum())
avg_payout_rate = (sum_out / sum_in * 100.0) if sum_in > 0 else 100.0

# 勝敗カウント
hall_wins = int((df_daily["hall_coin_profit"] > 0).sum())
player_wins = int((df_daily["player_coin_profit"] > 0).sum())

label_total = "累計ホール粗利" if is_hall else "累計ユーザー収支"
label_daily = "1日平均粗利" if is_hall else "1日平均収支"
label_unit = "台日粗利" if is_hall else "台日収支"
win_label = "店舗黒字 / 出玉還元" if is_hall else "客側勝ち / 店側回収"
w1 = hall_wins if is_hall else player_wins
w2 = player_wins if is_hall else hall_wins

color_total = "#059669" if total_profit >= 0 else "#e11d48"
color_diff = "#2563eb" if total_diff_coins >= 0 else "#dc2626"

st.markdown(f"""
<div class="kpi-grid">
    <div class="kpi-box">
        <div class="kpi-tit">{label_total}</div>
        <div class="kpi-num" style="color: {color_total};">{total_profit:+,.0f}<span style="font-size: 14px; font-weight:600; margin-left: 2px;">円</span></div>
        <div class="kpi-desc">期間累計推定値</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-tit">{label_daily}</div>
        <div class="kpi-num" style="color: {color_total};">{daily_avg:+,.0f}<span style="font-size: 14px; font-weight:600; margin-left: 2px;">円/日</span></div>
        <div class="kpi-desc">営業日平均</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-tit">{label_unit}</div>
        <div class="kpi-num" style="color: #0f172a;">{per_machine_daily:+,.0f}<span style="font-size: 14px; font-weight:600; margin-left: 2px;">円</span></div>
        <div class="kpi-desc">1日・1台あたり</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-tit">総差枚数</div>
        <div class="kpi-num" style="color: {color_diff};">{total_diff_coins:+,.0f}<span style="font-size: 14px; font-weight:600; margin-left: 2px;">枚</span></div>
        <div class="kpi-desc">平均: {avg_diff_coins:+.1f} 枚/台</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-tit">出玉率 (機械割)</div>
        <div class="kpi-num" style="color: #4f46e5;">{avg_payout_rate:.2f}<span style="font-size: 14px; font-weight:600; margin-left: 2px;">%</span></div>
        <div class="kpi-desc">推定売上: {total_revenue/10000:,.0f}万円</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-tit">{win_label}</div>
        <div class="kpi-num" style="color: #0f172a;">{w1}<span style="font-size: 13px; color:#64748b; font-weight:600;">勝</span> {w2}<span style="font-size: 13px; color:#64748b; font-weight:600;">敗</span></div>
        <div class="kpi-desc">勝率: {(w1/days_count*100):.1f}%</div>
    </div>
</div>
""", unsafe_allow_html=True)


# --------------------------------------------------------------------------
# Model B 説明バナー
# --------------------------------------------------------------------------
if use_model_b:
    gap_contrib = total_gap_profit
    model_a_tot = float(df_daily["model_a_hall_yen" if is_hall else "model_a_player_yen"].sum())
    diff_models = total_profit - model_a_tot
    st.info(
        f"💡 **Model B (換金ギャップ連動モデル) 稼働中**: "
        f"推定換金ギャップ利益は累計 **{gap_contrib:,.0f}円** です。"
        f"（差枚数のみのModel Aと比べ、客側の再投資・現金サンド投入によるギャップ寄与分 **{diff_models:+,.0f}円** が精度高く加味されています）"
    )

# --------------------------------------------------------------------------
# タブ切り替え
# --------------------------------------------------------------------------
tab_monthly, tab_daily, tab_dow, tab_tail, tab_special, tab_export = st.tabs([
    "📅 月別推移・累積ペース",
    "📋 日別詳細データ",
    "📆 曜日別分析",
    "🔢 末尾日分析",
    "🎯 特日 vs 通常日比較",
    "💾 データエクスポート"
])

# --------------------------------------------------------------------------
# TAB 1: 月別サマリー
# --------------------------------------------------------------------------
with tab_monthly:
    st.subheader("月別集計推移")

    monthly_rows = []
    for ym, group in df_daily.groupby("year_month"):
        m_days = len(group)
        m_profit = float(group[display_val_col].sum())
        m_daily_avg = m_profit / m_days if m_days > 0 else 0
        m_diff = float(group["total_diff_coins"].sum())
        m_games = float(group["avg_games"].mean())
        m_machines = float(group["total_machines"].mean())
        m_per_machine = m_daily_avg / m_machines if m_machines > 0 else 0

        m_event = group[group["is_special"]]
        m_normal = group[~group["is_special"]]

        e_days = len(m_event)
        e_avg = float(m_event[display_val_col].sum() / e_days) if e_days > 0 else 0
        n_days = len(m_normal)
        n_avg = float(m_normal[display_val_col].sum() / n_days) if n_days > 0 else 0

        h_win = int((group["hall_coin_profit"] > 0).sum())
        p_win = int((group["player_coin_profit"] > 0).sum())

        monthly_rows.append({
            "year_month": ym,
            "営業日数": m_days,
            "平均台数": round(m_machines),
            "粗利合計" if is_hall else "収支合計": round(m_profit),
            "1日平均": round(m_daily_avg),
            "全期間平均乖離": round(m_daily_avg - daily_avg),
            "台日あたり": round(m_per_machine),
            "総差枚数": round(m_diff),
            "平均G数": round(m_games),
            "特日平均": round(e_avg),
            "通常日平均": round(n_avg),
            "店勝" if is_hall else "客勝": h_win if is_hall else p_win,
            "店敗" if is_hall else "客敗": p_win if is_hall else h_win,
        })

    df_monthly = pd.DataFrame(monthly_rows).sort_values("year_month", ascending=False)

    fig_monthly = px.bar(
        df_monthly.sort_values("year_month"),
        x="year_month",
        y="粗利合計" if is_hall else "収支合計",
        text_auto=",.0f",
        title="月別ホール粗利推移" if is_hall else "月別ユーザー収支推移",
        color="粗利合計" if is_hall else "収支合計",
        color_continuous_scale=["#f43f5e", "#cbd5e1", "#059669"] if is_hall else ["#f43f5e", "#cbd5e1", "#2563eb"],
    )
    fig_monthly.update_layout(height=380, margin=dict(l=20, r=20, t=40, b=20))
    st.plotly_chart(fig_monthly, use_container_width=True)

    st.dataframe(
        df_monthly.style.format({
            "粗利合計" if is_hall else "収支合計": "{:+,}円",
            "1日平均": "{:+,}円/日",
            "全期間平均乖離": "{:+,}円",
            "台日あたり": "{:+,}円",
            "総差枚数": "{:+,}枚",
            "平均G数": "{:,}G",
            "特日平均": "{:+,}円",
            "通常日平均": "{:+,}円",
        }),
        use_container_width=True,
        hide_index=True
    )

# --------------------------------------------------------------------------
# TAB 2: 日別詳細データ
# --------------------------------------------------------------------------
with tab_daily:
    st.subheader("日別営業データ一覧")

    # フィルタ
    col_f1, col_f2 = st.columns(2)
    with col_f1:
        filter_type = st.selectbox("特日・通常日絞り込み", ["すべて", "特日のみ", "通常日のみ"])
    with col_f2:
        filter_result = st.selectbox("黒字・赤字絞り込み", ["すべて", "店舗黒字 (客負け)", "店舗赤字 (客勝ち)"])

    df_filtered = df_daily.copy()
    if filter_type == "特日のみ":
        df_filtered = df_filtered[df_filtered["is_special"]]
    elif filter_type == "通常日のみ":
        df_filtered = df_filtered[~df_filtered["is_special"]]

    if filter_result == "店舗黒字 (客負け)":
        df_filtered = df_filtered[df_filtered["hall_coin_profit"] > 0]
    elif filter_result == "店舗赤字 (客勝ち)":
        df_filtered = df_filtered[df_filtered["hall_coin_profit"] < 0]

    cols_show = [
        "date", "dow_jp", "is_special", "total_machines", "avg_games",
        "avg_diff", "total_diff_coins", "win_rate", "payout_rate", display_val_col
    ]
    rename_dict = {
        "date": "日付",
        "dow_jp": "曜日",
        "is_special": "特日",
        "total_machines": "台数",
        "avg_games": "平均G数",
        "avg_diff": "台平均差枚",
        "total_diff_coins": "総差枚数",
        "win_rate": "勝率(%)",
        "payout_rate": "出玉率(%)",
        display_val_col: "粗利 (円)" if is_hall else "客収支 (円)"
    }
    df_table = df_filtered[cols_show].rename(columns=rename_dict).sort_values("日付", ascending=False)

    st.dataframe(
        df_table.style.format({
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
# TAB 3: 曜日別分析
# --------------------------------------------------------------------------
with tab_dow:
    st.subheader("曜日別パフォーマンス分析")

    dow_rows = []
    for dow in JAPANESE_DAYS:
        sub = df_daily[df_daily["dow_jp"] == dow]
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
        h_w = int((sub["hall_coin_profit"] > 0).sum())

        dow_rows.append({
            "曜日": dow,
            "日数": cnt,
            "1日平均粗利" if is_hall else "1日平均収支": round(d_avg),
            "台日粗利" if is_hall else "台日収支": round(per_m_d),
            "平均総差枚": round(diff_avg),
            "平均G数": round(g_avg),
            "平均勝率": round(w_rate, 1),
            "黒字確率" if is_hall else "勝率": round((h_w / cnt * 100), 1)
        })

    df_dow = pd.DataFrame(dow_rows)

    col_g1, col_g2 = st.columns(2)
    with col_g1:
        fig_dow1 = px.bar(
            df_dow,
            x="曜日",
            y="1日平均粗利" if is_hall else "1日平均収支",
            title="曜日別 1日平均粗利" if is_hall else "曜日別 1日平均収支",
            color="1日平均粗利" if is_hall else "1日平均収支",
            color_continuous_scale=["#f43f5e", "#cbd5e1", "#059669"] if is_hall else ["#f43f5e", "#cbd5e1", "#2563eb"],
            text_auto=",.0f"
        )
        fig_dow1.update_layout(height=360)
        st.plotly_chart(fig_dow1, use_container_width=True)

    with col_g2:
        fig_dow2 = px.bar(
            df_dow,
            x="曜日",
            y="平均G数",
            title="曜日別 平均稼働ゲーム数 (G)",
            text_auto=",.0f"
        )
        fig_dow2.update_layout(height=360)
        st.plotly_chart(fig_dow2, use_container_width=True)

    st.dataframe(df_dow, use_container_width=True, hide_index=True)

# --------------------------------------------------------------------------
# TAB 4: 末尾日分析
# --------------------------------------------------------------------------
with tab_tail:
    st.subheader("日付末尾（0〜9）別パフォーマンス分析")

    df_daily["tail"] = df_daily["date_dt"].dt.day % 10

    tail_rows = []
    for t in range(10):
        sub = df_daily[df_daily["tail"] == t]
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
        h_w = int((sub["hall_coin_profit"] > 0).sum())

        tail_rows.append({
            "末尾": f"{t}のつく日",
            "日数": cnt,
            "1日平均粗利" if is_hall else "1日平均収支": round(d_avg),
            "台日粗利" if is_hall else "台日収支": round(per_m_d),
            "平均総差枚": round(diff_avg),
            "平均G数": round(g_avg),
            "平均勝率": round(w_rate, 1),
            "黒字確率" if is_hall else "勝率": round((h_w / cnt * 100), 1)
        })

    df_tail = pd.DataFrame(tail_rows)

    fig_tail = px.bar(
        df_tail,
        x="末尾",
        y="1日平均粗利" if is_hall else "1日平均収支",
        title="末尾別 1日平均粗利" if is_hall else "末尾別 1日平均収支",
        color="1日平均粗利" if is_hall else "1日平均収支",
        color_continuous_scale=["#f43f5e", "#cbd5e1", "#059669"] if is_hall else ["#f43f5e", "#cbd5e1", "#2563eb"],
        text_auto=",.0f"
    )
    fig_tail.update_layout(height=360)
    st.plotly_chart(fig_tail, use_container_width=True)

    st.dataframe(df_tail, use_container_width=True, hide_index=True)

# --------------------------------------------------------------------------
# TAB 5: 特日 vs 通常日
# --------------------------------------------------------------------------
with tab_special:
    st.subheader("🎯 特定日 vs 通常営業日 比較")

    df_sp = df_daily[df_daily["is_special"]]
    df_no = df_daily[~df_daily["is_special"]]

    sp_in = float(df_sp["in_coins"].sum())
    sp_out = float(df_sp["out_coins"].sum())
    no_in = float(df_no["in_coins"].sum())
    no_out = float(df_no["out_coins"].sum())

    comp_data = [
        {
            "区分": "特定日 (旧イベント日等)",
            "営業日数": len(df_sp),
            "平均G数": round(df_sp["avg_games"].mean()) if not df_sp.empty else 0,
            "勝率": round(df_sp["win_rate"].mean(), 1) if not df_sp.empty else 0,
            "1日平均粗利" if is_hall else "1日平均収支": round(df_sp[display_val_col].mean()) if not df_sp.empty else 0,
            "出玉率 (機械割)": round((sp_out / sp_in * 100), 2) if sp_in > 0 else 0
        },
        {
            "区分": "通常営業日",
            "営業日数": len(df_no),
            "平均G数": round(df_no["avg_games"].mean()) if not df_no.empty else 0,
            "勝率": round(df_no["win_rate"].mean(), 1) if not df_no.empty else 0,
            "1日平均粗利" if is_hall else "1日平均収支": round(df_no[display_val_col].mean()) if not df_no.empty else 0,
            "出玉率 (機械割)": round((no_out / no_in * 100), 2) if no_in > 0 else 0
        }
    ]
    df_comp = pd.DataFrame(comp_data)
    st.dataframe(df_comp, use_container_width=True, hide_index=True)

# --------------------------------------------------------------------------
# TAB 6: エクスポート
# --------------------------------------------------------------------------
with tab_export:
    st.subheader("データエクスポート")
    csv_bytes = df_daily.to_csv(index=False).encode('utf-8-sig')
    st.download_button(
        label="📥 計算済み日別データをCSVダウンロード",
        data=csv_bytes,
        file_name=f"{raw_store_data['name']}_分析データ.csv",
        mime="text/csv"
    )
