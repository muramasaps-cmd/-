"""
スロット店舗 粗利・売上分析システム (Streamlit版)
======================================================
スロレポHTMLデータから、ホールの粗利推移・売上・出玉率（機械割）・特日/曜日/末尾別傾向を
高度に可視化・分析するStreamlitアプリケーションです。

【実行方法】
1. 必要なライブラリをインストール:
   pip install streamlit pandas plotly beautifulsoup4

2. アプリを起動:
   streamlit run streamlit_app.py
"""

import re
import math
import datetime
from typing import Dict, List, Optional, Tuple, Any
import html

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

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
# サンプルデータ (プラザ515)
# --------------------------------------------------------------------------
SAMPLE_PLAZA_515_HTML = """<!DOCTYPE html>
<html lang="ja">
  <head>
  <meta charset="utf-8">
  <title>プラザ５１５ - スロレポ</title>
  </head>
  <body>
  <h4 class="title" align="center"><strong>プラザ５１５</strong></h4>
  <figure class="wp-block-table aligncenter"><table><tbody>
  <tr><th>住所</th><td>東京都大田区池上6-2-3</td></tr>
  <tr><th>旧イベント日</th><td>5のつく日</td></tr>
  <tr><th>換金率</th><td>50枚貸/56枚交換</td></tr>
  <tr><th>グランドオープン日</th><td>2021年1月25日</td></tr>
  </tbody></table></figure>

  <table class="date" style="min-width: 600px;"><tbody>
  <tr align="center"><th>日付</th><th>平均差枚</th><th>平均G数</th><th>勝率</th><th>優秀機種・末尾</th></tr>
  <tr><td><a href="20260909">9/9(水)</a></td><td align="right"><strong><font color="red">-57</font></strong></td><td align="right">1,299</td><td align="right">30%<br>(48/162)</td><td></td></tr>
  <tr><td><a href="20260908">9/8(火)</a></td><td align="right"><strong><font color="blue">+61</font></strong></td><td align="right">1,754</td><td align="right">33%<br>(53/162)</td><td></td></tr>
  <tr><td><a href="20260907">9/7(月)</a></td><td align="right"><strong><font color="blue">+5</font></strong></td><td align="right">1,317</td><td align="right">28%<br>(46/162)</td><td></td></tr>
  <tr><td><a href="20260906">9/6(日)</a></td><td align="right"><strong><font color="red">-173</font></strong></td><td align="right">1,634</td><td align="right">31%<br>(51/162)</td><td></td></tr>
  <tr><td><a href="20260905">9/5(土)</a></td><td align="right"><strong><font color="blue">+134</font></strong></td><td align="right">3,261</td><td align="right">44%<br>(72/162)</td><td>L戦国乙女5</td></tr>
  <tr><td><a href="20260904">9/4(金)</a></td><td align="right"><strong><font color="blue">+41</font></strong></td><td align="right">1,220</td><td align="right">30%<br>(49/162)</td><td></td></tr>
  <tr><td><a href="20260903">9/3(木)</a></td><td align="right"><strong><font color="red">-135</font></strong></td><td align="right">1,449</td><td align="right">30%<br>(49/162)</td><td></td></tr>
  <tr><td><a href="20260902">9/2(水)</a></td><td align="right"><strong><font color="red">-33</font></strong></td><td align="right">1,362</td><td align="right">28%<br>(46/162)</td><td></td></tr>
  <tr><td><a href="20260901">9/1(火)</a></td><td align="right"><strong><font color="blue">+172</font></strong></td><td align="right">1,519</td><td align="right">36%<br>(58/162)</td><td>スロット ソードアート・オンラインⅡ</td></tr>
  <tr><td><a href="20260831">8/31(月)</a></td><td align="right"><strong><font color="red">-128</font></strong></td><td align="right">1,298</td><td align="right">30%<br>(49/162)</td><td></td></tr>
  <tr><td><a href="20260830">8/30(日)</a></td><td align="right"><strong><font color="red">-109</font></strong></td><td align="right">2,178</td><td align="right">33%<br>(53/162)</td><td></td></tr>
  <tr><td><a href="20260829">8/29(土)</a></td><td align="right"><strong><font color="red">-92</font></strong></td><td align="right">2,283</td><td align="right">37%<br>(60/162)</td><td></td></tr>
  <tr><td><a href="20260828">8/28(金)</a></td><td align="right"><strong><font color="red">-53</font></strong></td><td align="right">1,630</td><td align="right">26%<br>(42/162)</td><td></td></tr>
  <tr><td><a href="20260827">8/27(木)</a></td><td align="right"><strong><font color="red">-76</font></strong></td><td align="right">1,446</td><td align="right">27%<br>(44/162)</td><td></td></tr>
  <tr><td><a href="20260826">8/26(水)</a></td><td align="right"><strong><font color="red">-109</font></strong></td><td align="right">1,383</td><td align="right">28%<br>(46/162)</td><td></td></tr>
  <tr><td><a href="20260825">8/25(火)</a></td><td align="right"><strong><font color="blue">+11</font></strong></td><td align="right">2,440</td><td align="right">42%<br>(68/162)</td><td></td></tr>
  <tr><td><a href="20260824">8/24(月)</a></td><td align="right"><strong><font color="blue">+113</font></strong></td><td align="right">1,523</td><td align="right">35%<br>(56/162)</td><td></td></tr>
  <tr><td><a href="20260823">8/23(日)</a></td><td align="right"><strong><font color="red">-188</font></strong></td><td align="right">2,195</td><td align="right">31%<br>(50/162)</td><td></td></tr>
  <tr><td><a href="20260822">8/22(土)</a></td><td align="right"><strong><font color="red">-124</font></strong></td><td align="right">1,993</td><td align="right">33%<br>(54/162)</td><td></td></tr>
  <tr><td><a href="20260821">8/21(金)</a></td><td align="right"><strong><font color="red">-21</font></strong></td><td align="right">1,386</td><td align="right">31%<br>(51/162)</td><td></td></tr>
  <tr><td><a href="20260820">8/20(木)</a></td><td align="right"><strong><font color="red">-148</font></strong></td><td align="right">1,438</td><td align="right">28%<br>(46/162)</td><td></td></tr>
  <tr><td><a href="20260819">8/19(水)</a></td><td align="right"><strong><font color="red">-153</font></strong></td><td align="right">1,418</td><td align="right">30%<br>(48/162)</td><td></td></tr>
  <tr><td><a href="20260818">8/18(火)</a></td><td align="right"><strong><font color="red">-108</font></strong></td><td align="right">1,460</td><td align="right">29%<br>(47/162)</td><td></td></tr>
  <tr><td><a href="20260817">8/17(月)</a></td><td align="right"><strong><font color="red">-107</font></strong></td><td align="right">1,357</td><td align="right">30%<br>(48/162)</td><td></td></tr>
  <tr><td><a href="20260816">8/16(日)</a></td><td align="right"><strong><font color="red">-134</font></strong></td><td align="right">2,159</td><td align="right">30%<br>(48/162)</td><td></td></tr>
  <tr><td><a href="20260815">8/15(土)</a></td><td align="right"><strong><font color="blue">+121</font></strong></td><td align="right">2,923</td><td align="right">40%<br>(64/162)</td><td></td></tr>
  <tr><td><a href="20260814">8/14(金)</a></td><td align="right"><strong><font color="red">-18</font></strong></td><td align="right">2,028</td><td align="right">33%<br>(54/162)</td><td></td></tr>
  <tr><td><a href="20260813">8/13(木)</a></td><td align="right"><strong><font color="red">-119</font></strong></td><td align="right">1,999</td><td align="right">28%<br>(45/162)</td><td></td></tr>
  <tr><td><a href="20260812">8/12(水)</a></td><td align="right"><strong><font color="red">-94</font></strong></td><td align="right">1,947</td><td align="right">30%<br>(48/162)</td><td></td></tr>
  <tr><td><a href="20260811">8/11(火)</a></td><td align="right"><strong><font color="red">-160</font></strong></td><td align="right">2,168</td><td align="right">31%<br>(51/162)</td><td></td></tr>
  <tr><td><a href="20260810">8/10(月)</a></td><td align="right"><strong><font color="red">-134</font></strong></td><td align="right">2,442</td><td align="right">31%<br>(50/162)</td><td></td></tr>
  <tr><td><a href="20260809">8/9(日)</a></td><td align="right"><strong><font color="red">-124</font></strong></td><td align="right">2,434</td><td align="right">32%<br>(52/162)</td><td></td></tr>
  <tr><td><a href="20260808">8/8(土)</a></td><td align="right"><strong><font color="red">-169</font></strong></td><td align="right">2,357</td><td align="right">31%<br>(51/162)</td><td></td></tr>
  <tr><td><a href="20260807">8/7(金)</a></td><td align="right"><strong><font color="red">-121</font></strong></td><td align="right">1,821</td><td align="right">30%<br>(48/162)</td><td></td></tr>
  <tr><td><a href="20260806">8/6(木)</a></td><td align="right"><strong><font color="red">-71</font></strong></td><td align="right">1,489</td><td align="right">31%<br>(51/162)</td><td></td></tr>
  <tr><td><a href="20260805">8/5(水)</a></td><td align="right"><strong><font color="blue">+138</font></strong></td><td align="right">2,886</td><td align="right">43%<br>(70/162)</td><td>スマスロ ゲゲゲの鬼太郎 覚醒</td></tr>
  <tr><td><a href="20260804">8/4(火)</a></td><td align="right"><strong><font color="red">-138</font></strong></td><td align="right">1,617</td><td align="right">31%<br>(50/162)</td><td></td></tr>
  <tr><td><a href="20260803">8/3(月)</a></td><td align="right"><strong><font color="red">-77</font></strong></td><td align="right">1,509</td><td align="right">35%<br>(56/162)</td><td></td></tr>
  <tr><td><a href="20260802">8/2(日)</a></td><td align="right"><strong><font color="red">-124</font></strong></td><td align="right">1,960</td><td align="right">33%<br>(53/162)</td><td></td></tr>
  <tr><td><a href="20260801">8/1(土)</a></td><td align="right"><strong><font color="blue">+80</font></strong></td><td align="right">2,504</td><td align="right">39%<br>(63/162)</td><td></td></tr>
  <tr><td><a href="20260731">7/31(金)</a></td><td align="right"><strong><font color="red">-65</font></strong></td><td align="right">1,514</td><td align="right">31%<br>(50/162)</td><td></td></tr>
  <tr><td><a href="20260730">7/30(木)</a></td><td align="right"><strong><font color="red">-68</font></strong></td><td align="right">1,402</td><td align="right">32%<br>(52/162)</td><td></td></tr>
  <tr><td><a href="20260729">7/29(水)</a></td><td align="right"><strong><font color="red">-78</font></strong></td><td align="right">1,544</td><td align="right">32%<br>(52/162)</td><td></td></tr>
  <tr><td><a href="20260728">7/28(火)</a></td><td align="right"><strong><font color="red">-119</font></strong></td><td align="right">1,489</td><td align="right">32%<br>(52/162)</td><td></td></tr>
  <tr><td><a href="20260727">7/27(月)</a></td><td align="right"><strong><font color="red">-153</font></strong></td><td align="right">1,486</td><td align="right">29%<br>(47/162)</td><td></td></tr>
  <tr><td><a href="20260726">7/26(日)</a></td><td align="right"><strong><font color="red">-124</font></strong></td><td align="right">2,168</td><td align="right">31%<br>(51/162)</td><td></td></tr>
  <tr><td><a href="20260725">7/25(土)</a></td><td align="right"><strong><font color="blue">+169</font></strong></td><td align="right">2,925</td><td align="right">43%<br>(69/162)</td><td></td></tr>
  <tr><td><a href="20260724">7/24(金)</a></td><td align="right"><strong><font color="red">-65</font></strong></td><td align="right">1,617</td><td align="right">32%<br>(52/162)</td><td></td></tr>
  <tr><td><a href="20260723">7/23(木)</a></td><td align="right"><strong><font color="red">-128</font></strong></td><td align="right">1,588</td><td align="right">31%<br>(51/162)</td><td></td></tr>
  <tr><td><a href="20260722">7/22(水)</a></td><td align="right"><strong><font color="red">-134</font></strong></td><td align="right">1,438</td><td align="right">31%<br>(50/162)</td><td></td></tr>
  <tr><td><a href="20260721">7/21(火)</a></td><td align="right"><strong><font color="red">-148</font></strong></td><td align="right">1,514</td><td align="right">29%<br>(47/162)</td><td></td></tr>
  <tr><td><a href="20260720">7/20(月)</a></td><td align="right"><strong><font color="red">-77</font></strong></td><td align="right">1,586</td><td align="right">33%<br>(53/162)</td><td></td></tr>
  <tr><td><a href="20260719">7/19(日)</a></td><td align="right"><strong><font color="red">-138</font></strong></td><td align="right">2,118</td><td align="right">30%<br>(48/162)</td><td></td></tr>
  <tr><td><a href="20260718">7/18(土)</a></td><td align="right"><strong><font color="red">-124</font></strong></td><td align="right">2,028</td><td align="right">31%<br>(51/162)</td><td></td></tr>
  <tr><td><a href="20260717">7/17(金)</a></td><td align="right"><strong><font color="red">-119</font></strong></td><td align="right">1,617</td><td align="right">30%<br>(48/162)</td><td></td></tr>
  <tr><td><a href="20260716">7/16(木)</a></td><td align="right"><strong><font color="red">-65</font></strong></td><td align="right">1,418</td><td align="right">32%<br>(52/162)</td><td></td></tr>
  <tr><td><a href="20260715">7/15(水)</a></td><td align="right"><strong><font color="blue">+138</font></strong></td><td align="right">2,968</td><td align="right">42%<br>(68/162)</td><td>パチスロ 革命機ヴァルヴレイヴ</td></tr>
  <tr><td><a href="20260714">7/14(火)</a></td><td align="right"><strong><font color="red">-109</font></strong></td><td align="right">1,544</td><td align="right">31%<br>(50/162)</td><td></td></tr>
  <tr><td><a href="20260713">7/13(月)</a></td><td align="right"><strong><font color="red">-153</font></strong></td><td align="right">1,438</td><td align="right">30%<br>(48/162)</td><td></td></tr>
  <tr><td><a href="20260712">7/12(日)</a></td><td align="right"><strong><font color="red">-119</font></strong></td><td align="right">2,283</td><td align="right">32%<br>(52/162)</td><td></td></tr>
  <tr><td><a href="20260711">7/11(土)</a></td><td align="right"><strong><font color="red">-134</font></strong></td><td align="right">2,159</td><td align="right">31%<br>(51/162)</td><td></td></tr>
  <tr><td><a href="20260710">7/10(金)</a></td><td align="right"><strong><font color="red">-68</font></strong></td><td align="right">1,630</td><td align="right">31%<br>(50/162)</td><td></td></tr>
  <tr><td><a href="20260709">7/9(木)</a></td><td align="right"><strong><font color="red">-148</font></strong></td><td align="right">1,489</td><td align="right">28%<br>(46/162)</td><td></td></tr>
  <tr><td><a href="20260708">7/8(水)</a></td><td align="right"><strong><font color="red">-92</font></strong></td><td align="right">1,586</td><td align="right">32%<br>(52/162)</td><td></td></tr>
  <tr><td><a href="20260707">7/7(火)</a></td><td align="right"><strong><font color="blue">+188</font></strong></td><td align="right">3,540</td><td align="right">47%<br>(76/162)</td><td>スマスロ北斗の拳</td></tr>
  <tr><td><a href="20260706">7/6(月)</a></td><td align="right"><strong><font color="red">-108</font></strong></td><td align="right">1,486</td><td align="right">31%<br>(51/162)</td><td></td></tr>
  <tr><td><a href="20260705">7/5(日)</a></td><td align="right"><strong><font color="blue">+172</font></strong></td><td align="right">3,120</td><td align="right">45%<br>(73/162)</td><td>パチスロ からくりサーカス</td></tr>
  <tr><td><a href="20260704">7/4(土)</a></td><td align="right"><strong><font color="red">-119</font></strong></td><td align="right">2,195</td><td align="right">32%<br>(52/162)</td><td></td></tr>
  <tr><td><a href="20260703">7/3(金)</a></td><td align="right"><strong><font color="red">-68</font></strong></td><td align="right">1,509</td><td align="right">33%<br>(53/162)</td><td></td></tr>
  <tr><td><a href="20260702">7/2(木)</a></td><td align="right"><strong><font color="red">-124</font></strong></td><td align="right">1,446</td><td align="right">30%<br>(48/162)</td><td></td></tr>
  <tr><td><a href="20260701">7/1(水)</a></td><td align="right"><strong><font color="blue">+45</font></strong></td><td align="right">1,821</td><td align="right">35%<br>(57/162)</td><td></td></tr>
  </tbody></table>
  </body>
</html>
"""

JAPANESE_DAYS = ['月', '火', '水', '木', '金', '土', '日']

# --------------------------------------------------------------------------
# スロレポHTMLパーサー
# --------------------------------------------------------------------------
def parse_slorepo_html(html_text: str) -> Dict[str, Any]:
    """スロレポHTMLから店舗情報および日別レポート行を抽出"""
    store_name = "スロレポ店舗"
    address = "住所未登録"
    old_event_days = "5のつく日"
    exchange_rate_str = "50枚貸/56枚交換"
    grand_open = ""

    # 1. 店舗名
    h4_match = re.search(r'<h4[^>]*class=["\'][^"\']*title[^"\']*["\'][^>]*>(.*?)</h4>', html_text, re.IGNORECASE | re.DOTALL)
    if h4_match:
        store_name = re.sub(r'<[^>]+>', '', h4_match.group(1)).strip()
    else:
        title_match = re.search(r'<title>(.*?)</title>', html_text, re.IGNORECASE)
        if title_match:
            raw_title = re.sub(r'\s*[-–|]\s*スロレポ.*$', '', title_match.group(1)).strip()
            if raw_title:
                store_name = raw_title

    # 2. 住所・旧イベント日・換金率
    addr_m = re.search(r'<th>\s*住所\s*</th>\s*<td>(.*?)</td>', html_text, re.DOTALL)
    if addr_m:
        address = re.sub(r'<[^>]+>', '', addr_m.group(1)).strip()

    event_m = re.search(r'<th>\s*旧イベント日\s*</th>\s*<td>(.*?)</td>', html_text, re.DOTALL)
    if event_m:
        old_event_days = re.sub(r'<[^>]+>', '', event_m.group(1)).strip()

    exch_m = re.search(r'<th>\s*換金率\s*</th>\s*<td>(.*?)</td>', html_text, re.DOTALL)
    if exch_m:
        exchange_rate_str = re.sub(r'<[^>]+>', '', exch_m.group(1)).strip()

    go_m = re.search(r'<th>\s*グランドオープン(?:日)?\s*</th>\s*<td>(.*?)</td>', html_text, re.DOTALL)
    if go_m:
        grand_open = re.sub(r'<[^>]+>', '', go_m.group(1)).strip()

    # レート数値パース
    rate_lend, rate_exchange = parse_rates(exchange_rate_str)

    # 3. 日別テーブル抽出
    rows = []
    machine_counts = []
    current_year = datetime.date.today().year
    previous_month = None

    # table.date または 各 <tr> の行
    tr_matches = re.findall(r'<tr[^>]*>(.*?)</tr>', html_text, re.DOTALL | re.IGNORECASE)
    for tr in tr_matches:
        if '<th' in tr:
            continue
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL | re.IGNORECASE)
        if len(tds) < 3:
            continue

        # td[0]: 日付
        d_cell = tds[0]
        row_year, row_month, row_day = None, None, None

        # href チェック (20260909)
        href_m = re.search(r'href=["\'][^"\']*(202\d)[-_/]?(\d{2})[-_/]?(\d{2})', d_cell)
        if href_m:
            row_year = int(href_m.group(1))
            row_month = int(href_m.group(2))
            row_day = int(href_m.group(3))
        else:
            # cell テキスト: 2026/09/09 or 9/9(水)
            clean_d = re.sub(r'<[^>]+>', '', d_cell).strip()
            full_m = re.search(r'(202\d)[年/-](\d{1,2})[月/-](\d{1,2})', clean_d)
            if full_m:
                row_year = int(full_m.group(1))
                row_month = int(full_m.group(2))
                row_day = int(full_m.group(3))
            else:
                md_m = re.search(r'(\d{1,2})[\/月](\d{1,2})', clean_d)
                if md_m:
                    row_month = int(md_m.group(1))
                    row_day = int(md_m.group(2))

        if not row_month or not row_day:
            continue

        if row_year:
            current_year = row_year
            previous_month = row_month
        else:
            if previous_month is not None and previous_month <= 2 and row_month >= 11:
                current_year -= 1
            row_year = current_year
            previous_month = row_month

        date_str = f"{row_year:04d}-{row_month:02d}-{row_day:02d}"

        # td[1]: 平均差枚 (+61, -57)
        diff_text = re.sub(r'<[^>]+>', '', tds[1]).replace(',', '').strip()
        diff_m = re.search(r'([+-]?\d+)', diff_text)
        avg_diff = int(diff_m.group(1)) if diff_m else 0

        # td[2]: 平均G数 (1,299)
        g_text = re.sub(r'<[^>]+>', '', tds[2]).replace(',', '').strip()
        g_m = re.search(r'(\d+)', g_text)
        avg_games = int(g_m.group(1)) if g_m else 0

        # td[3]: 勝率 (30% (48/162))
        win_rate = None
        win_machines = None
        total_machines = None
        if len(tds) >= 4:
            rate_text = re.sub(r'<[^>]+>', ' ', tds[3])
            pct_m = re.search(r'(\d+(?:\.\d+)?)\s*%', rate_text)
            if pct_m:
                win_rate = float(pct_m.group(1))
            mach_m = re.search(r'[\(（]?\s*(\d+)\s*[\/／]\s*(\d+)\s*(?:台)?[\)）]?', rate_text)
            if mach_m:
                win_machines = int(mach_m.group(1))
                total_machines = int(mach_m.group(2))
                machine_counts.append(total_machines)

        # td[4]: 優秀機種
        top_models = ""
        if len(tds) >= 5:
            top_models = re.sub(r'<[^>]+>', '', tds[4]).strip()

        rows.append({
            "date": date_str,
            "year": row_year,
            "month": row_month,
            "day": row_day,
            "avg_diff": avg_diff,
            "avg_games": avg_games,
            "win_rate": win_rate,
            "win_machines": win_machines,
            "total_machines": total_machines,
            "top_models": top_models
        })

    # 最頻台数で補完
    mode_machines = 162
    if machine_counts:
        s = pd.Series(machine_counts)
        mode_machines = int(s.mode().iloc[0])

    for r in rows:
        if not r["total_machines"] or r["total_machines"] <= 0:
            r["total_machines"] = mode_machines
        if r["win_rate"] is not None and (r["win_machines"] is None or r["win_machines"] <= 0):
            r["win_machines"] = round(r["total_machines"] * (r["win_rate"] / 100))

    return {
        "name": store_name,
        "address": address,
        "old_event_days": old_event_days,
        "exchange_rate_str": exchange_rate_str,
        "rate_lend": rate_lend,
        "rate_exchange": rate_exchange,
        "grand_open": grand_open,
        "mode_machines": mode_machines,
        "raw_records": rows,
    }


def parse_rates(exch_str: str) -> Tuple[int, int]:
    """換金率文字列から貸出/交換レートを抽出"""
    lend, exch = 50, 56
    clean = exch_str.strip()
    if "/" in clean or "／" in clean:
        parts = re.split(r'[\/／]', clean)
        m_lend = re.search(r'(\d+)', parts[0])
        if m_lend:
            lend = int(m_lend.group(1))
        if len(parts) > 1:
            m_exch = re.search(r'(\d+)', parts[1])
            if m_exch:
                exch = int(m_exch.group(1))
            elif "等価" in parts[1]:
                exch = lend
    else:
        m_lend = re.search(r'(\d+)\s*枚(?:貸|貸出)', clean)
        if m_lend:
            lend = int(m_lend.group(1))
        m_exch = re.search(r'(\d+)\s*枚\s*(?:交換|等価)', clean)
        if m_exch:
            exch = int(m_exch.group(1))
        elif "等価" in clean:
            exch = lend
    return lend, exch


# --------------------------------------------------------------------------
# 特日判定ロジック
# --------------------------------------------------------------------------
def is_special_day(
    d: datetime.date,
    tails: List[int],
    double_digits: bool,
    month_day_zoro: bool,
    fixed_dates: List[int],
    target_dows: List[str]
) -> bool:
    day = d.day
    # 末尾
    if (day % 10) in tails:
        return True
    # ゾロ目
    if double_digits and (day == 11 or day == 22):
        return True
    # 月日ゾロ目
    if month_day_zoro and (d.month == d.day):
        return True
    # 特定日
    if day in fixed_dates:
        return True
    # 曜日
    dow_jp = JAPANESE_DAYS[d.weekday()]
    if dow_jp in target_dows:
        return True
    return False


# --------------------------------------------------------------------------
# メイン計算エンジン (Model A / Model B)
# --------------------------------------------------------------------------
def calculate_financials(
    df_raw: pd.DataFrame,
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
    if df_raw.empty:
        return df_raw

    df = df_raw.copy()
    df["date_dt"] = pd.to_datetime(df["date"])
    df = df.sort_values("date_dt").reset_index(drop=True)

    lend_yen_per_coin = 1000.0 / rate_lend
    exch_yen_per_coin = 1000.0 / rate_exchange
    gap_per_coin = lend_yen_per_coin - exch_yen_per_coin

    # 曜日
    df["dow_jp"] = df["date_dt"].apply(lambda d: JAPANESE_DAYS[d.weekday()])
    df["year_month"] = df["date_dt"].dt.strftime("%Y-%m")

    # 特日フラグ
    df["is_special"] = df["date_dt"].apply(
        lambda d: is_special_day(d.date(), tails, double_digits, month_day_zoro, fixed_dates, target_dows)
    )

    # 差枚数合計
    df["total_diff_coins"] = df["avg_diff"] * df["total_machines"]
    df["hall_coin_profit"] = -df["total_diff_coins"]
    df["player_coin_profit"] = df["total_diff_coins"]

    # Model A: 単純差枚換算
    # ホール粗利: プラスなら貸出単価、マイナスなら交換単価
    df["model_a_hall_yen"] = df["hall_coin_profit"].apply(
        lambda c: round(c * lend_yen_per_coin) if c >= 0 else round(c * exch_yen_per_coin)
    )
    df["model_a_player_yen"] = df["player_coin_profit"].apply(
        lambda c: round(c * exch_yen_per_coin) if c >= 0 else round(c * lend_yen_per_coin)
    )

    # Model B: G数(IN枚数)・換金ギャップモデル
    df["in_coins"] = (df["avg_games"] * 3 * df["total_machines"]).round()
    df["out_coins"] = df["in_coins"] + df["total_diff_coins"]
    df["payout_rate"] = (df["out_coins"] / df["in_coins"].replace(0, 1) * 100).round(2)

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
# サイドバー: 設定 & データソース
# --------------------------------------------------------------------------
with st.sidebar:
    st.header("🎰 スロット分析設定")

    # データソース選択
    data_source = st.radio(
        "📁 データソース",
        ["プリセット (プラザ515)", "スロレポHTMLアップロード", "HTMLテキスト直接貼付", "CSVアップロード"],
        index=0
    )

    raw_store_data = None

    if data_source == "プリセット (プラザ515)":
        raw_store_data = parse_slorepo_html(SAMPLE_PLAZA_515_HTML)
        st.success("✅ プラザ515サンプルデータを読み込み中")

    elif data_source == "スロレポHTMLアップロード":
        uploaded_files = st.file_uploader(
            "スロレポHTMLファイルを選択",
            type=["html", "htm"],
            accept_multiple_files=True
        )
        if uploaded_files:
            combined_records = []
            store_meta = None
            for f in uploaded_files:
                content = f.read().decode("utf-8", errors="ignore")
                parsed = parse_slorepo_html(content)
                if not store_meta:
                    store_meta = parsed
                combined_records.extend(parsed["raw_records"])
            
            # 日付の重複除去
            seen_dates = set()
            unique_records = []
            for r in combined_records:
                if r["date"] not in seen_dates:
                    seen_dates.add(r["date"])
                    unique_records.append(r)
            
            if store_meta:
                store_meta["raw_records"] = unique_records
                raw_store_data = store_meta
                st.success(f"✅ {len(uploaded_files)}ファイルから{len(unique_records)}営業日分のデータを読込完了")
        else:
            st.info("HTMLファイルをドラッグ＆ドロップしてください")

    elif data_source == "HTMLテキスト直接貼付":
        pasted = st.text_area("スロレポページのHTMLソースを貼付", height=150)
        if pasted.strip():
            raw_store_data = parse_slorepo_html(pasted)
            st.success(f"✅ {len(raw_store_data['raw_records'])}営業日分のデータを抽出")

    elif data_source == "CSVアップロード":
        csv_file = st.file_uploader("集計CSVを選択", type=["csv"])
        if csv_file:
            df_csv = pd.read_csv(csv_file)
            st.dataframe(df_csv.head(3))
            # 簡易変換
            records = []
            for _, row in df_csv.iterrows():
                d_str = str(row.get("date") or row.get("日付"))
                diff = int(row.get("avg_diff") or row.get("平均差枚") or 0)
                games = int(row.get("avg_games") or row.get("平均G数") or 0)
                machines = int(row.get("total_machines") or row.get("台数") or 162)
                records.append({
                    "date": d_str,
                    "avg_diff": diff,
                    "avg_games": games,
                    "win_rate": float(row.get("win_rate") or 30),
                    "win_machines": int(machines * 0.3),
                    "total_machines": machines,
                    "top_models": str(row.get("top_models") or "")
                })
            raw_store_data = {
                "name": "アップロードCSV店舗",
                "address": "CSV指定",
                "old_event_days": "5のつく日",
                "exchange_rate_str": "50枚貸/56枚交換",
                "rate_lend": 50,
                "rate_exchange": 56,
                "grand_open": "",
                "mode_machines": 162,
                "raw_records": records
            }

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

    default_lend = raw_store_data["rate_lend"] if raw_store_data else 50
    default_exch = raw_store_data["rate_exchange"] if raw_store_data else 56

    col_l, col_e = st.columns(2)
    with col_l:
        rate_lend = st.number_input("貸出レート (枚/1000円)", min_value=30, max_value=60, value=default_lend, step=1)
    with col_e:
        rate_exchange = st.number_input("交換レート (枚/1000円)", min_value=30, max_value=60, value=default_exch, step=1)

    cash_ratio = st.slider("現金投資比率 (%)", min_value=10, max_value=80, value=35, step=5,
                           help="総G数に対する現金サンド投入の割合（通常30%〜45%前後）")

    st.markdown("---")
    st.subheader("🎯 特日ルール設定")
    selected_tails = st.multiselect(
        "特定末尾 (つく日)",
        options=list(range(10)),
        default=[5],
        format_func=lambda x: f"{x}のつく日"
    )
    col_t1, col_t2 = st.columns(2)
    with col_t1:
        double_digits = st.checkbox("11日・22日", value=False)
    with col_t2:
        month_day_zoro = st.checkbox("月日ゾロ目", value=False)

    target_dows = st.multiselect("特定曜日", options=JAPANESE_DAYS, default=[])


# --------------------------------------------------------------------------
# メイン画面処理
# --------------------------------------------------------------------------
if not raw_store_data or not raw_store_data.get("raw_records"):
    st.warning("⚠️ データが読み込まれていません。サイドバーからデータソースを選択してください。")
    st.stop()

# 計算実行
df_raw = pd.DataFrame(raw_store_data["raw_records"])
df_daily = calculate_financials(
    df_raw=df_raw,
    rate_lend=rate_lend,
    rate_exchange=rate_exchange,
    cash_ratio=cash_ratio,
    tails=selected_tails,
    double_digits=double_digits,
    month_day_zoro=month_day_zoro,
    fixed_dates=[],
    target_dows=target_dows
)

# 使用する粗利・収支列
active_profit_col = "model_b_hall_yen" if use_model_b else "model_a_hall_yen"
active_player_col = "model_b_player_yen" if use_model_b else "model_a_player_yen"
display_val_col = active_profit_col if is_hall else active_player_col

# ヘッダー表示
st.title(f"🎰 {raw_store_data['name']} 粗利・売上分析")
st.caption(f"📍 所在地: {raw_store_data['address']} | 換金率: {raw_store_data['exchange_rate_str']} | 旧イベント: {raw_store_data['old_event_days']} | 集計日数: {len(df_daily)}営業日")

# --------------------------------------------------------------------------
# TOP KPI カード
# --------------------------------------------------------------------------
total_profit = df_daily[display_val_col].sum()
days_count = len(df_daily)
daily_avg = total_profit / days_count if days_count > 0 else 0
avg_machines = df_daily["total_machines"].mean()
per_machine_daily = daily_avg / avg_machines if avg_machines > 0 else 0

total_diff_coins = df_daily["total_diff_coins"].sum()
avg_diff_coins = df_daily["avg_diff"].mean()

total_revenue = df_daily["estimated_revenue"].sum()
total_gap_profit = df_daily["exchange_gap_profit"].sum()
avg_payout_rate = (df_daily["out_coins"].sum() / df_daily["in_coins"].sum().replace(0, 1) * 100) if df_daily["in_coins"].sum() > 0 else 100.0

hall_wins = (df_daily["hall_coin_profit"] > 0).sum()
player_wins = (df_daily["player_coin_profit"] > 0).sum()

kpi1, kpi2, kpi3, kpi4, kpi5, kpi6 = st.columns(6)

with kpi1:
    label = "累計ホール粗利" if is_hall else "累計ユーザー収支"
    st.metric(label, f"{total_profit:,.0f} 円")

with kpi2:
    label = "1日平均粗利" if is_hall else "1日平均収支"
    st.metric(label, f"{daily_avg:,.0f} 円/日")

with kpi3:
    label = "台日粗利 (日/台)" if is_hall else "台日収支 (日/台)"
    st.metric(label, f"{per_machine_daily:,.0f} 円")

with kpi4:
    st.metric("総差枚数", f"{total_diff_coins:+,.0f} 枚", f"平均: {avg_diff_coins:+.1f}枚/台")

with kpi5:
    st.metric("出玉率 (機械割)", f"{avg_payout_rate:.2f} %", f"推定売上: {total_revenue/10000:,.0f}万円")

with kpi6:
    win_label = "店舗黒字 / 出玉還元" if is_hall else "客側勝ち / 店側回収"
    w1 = hall_wins if is_hall else player_wins
    w2 = player_wins if is_hall else hall_wins
    st.metric(win_label, f"{w1}勝 {w2}敗", f"勝率: {(w1/days_count*100):.1f}%")


# --------------------------------------------------------------------------
# Model A vs Model B 比較インフォメーション
# --------------------------------------------------------------------------
if use_model_b:
    gap_contrib = total_gap_profit
    model_a_tot = df_daily["model_a_hall_yen" if is_hall else "model_a_player_yen"].sum()
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
# TAB 1: 月別サマリー & 累積推移
# --------------------------------------------------------------------------
with tab_monthly:
    st.subheader("月別集計推移")

    # 月別集計 DataFrame 作成
    monthly_rows = []
    for ym, group in df_daily.groupby("year_month"):
        m_days = len(group)
        m_profit = group[display_val_col].sum()
        m_daily_avg = m_profit / m_days if m_days > 0 else 0
        m_diff = group["total_diff_coins"].sum()
        m_games = group["avg_games"].mean()
        m_machines = group["total_machines"].mean()
        m_per_machine = m_daily_avg / m_machines if m_machines > 0 else 0

        # 特日と通常日
        m_event = group[group["is_special"]]
        m_normal = group[~group["is_special"]]

        e_days = len(m_event)
        e_avg = m_event[display_val_col].sum() / e_days if e_days > 0 else 0
        n_days = len(m_normal)
        n_avg = m_normal[display_val_col].sum() / n_days if n_days > 0 else 0

        h_win = (group["hall_coin_profit"] > 0).sum()
        p_win = (group["player_coin_profit"] > 0).sum()

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

    # 月別棒グラフ (Plotly)
    fig_monthly = px.bar(
        df_monthly.sort_values("year_month"),
        x="year_month",
        y="粗利合計" if is_hall else "収支合計",
        text_auto=",.0f",
        title="月別ホール粗利推移" if is_hall else "月別ユーザー収支推移",
        color="粗利合計" if is_hall else "収支合計",
        color_continuous_scale=["#f43f5e", "#cbd5e1", "#4f46e5"] if is_hall else ["#f43f5e", "#cbd5e1", "#10b981"],
    )
    fig_monthly.update_layout(height=380, margin=dict(l=20, r=20, t=40, b=20))
    st.plotly_chart(fig_monthly, use_container_width=True)

    # 月別テーブル表示
    st.dataframe(
        df_monthly.style.format({
            "粗利合計" if is_hall else "収支合計": "{:+,}円",
            "1日平均": "{:+,}円/日",
            "全期間平均乖離": "{:+,}円/日",
            "台日あたり": "{:+,}円/台",
            "総差枚数": "{:+,}枚",
            "平均G数": "{:,}G",
            "特日平均": "{:+,}円",
            "通常日平均": "{:+,}円",
        }),
        use_container_width=True,
        hide_index=True
    )

    # 選択月の日別累積乖離ペース
    st.markdown("---")
    st.subheader("📈 月間日別 累積乖離ペース推移")
    selected_ym = st.selectbox("分析対象月を選択", df_monthly["year_month"].tolist(), index=0)
    month_data = df_daily[df_daily["year_month"] == selected_ym].sort_values("date_dt").copy()

    if not month_data.empty:
        # 当月の日割り目標ペース (日当たり平均)
        m_daily_target = month_data[display_val_col].mean()
        month_data["daily_diff_from_target"] = month_data[display_val_col] - m_daily_target
        month_data["cumulative_pace"] = month_data["daily_diff_from_target"].cumsum()
        month_data["cumulative_profit"] = month_data[display_val_col].cumsum()

        fig_pace = go.Figure()
        fig_pace.add_trace(go.Scatter(
            x=month_data["date"],
            y=month_data["cumulative_pace"],
            mode="lines+markers+text",
            name="目標比 累積乖離ペース",
            line=dict(color="#4f46e5" if is_hall else "#059669", width=3),
            text=[f"{v/10000:+.1f}万" if abs(v) > 50000 else "" for v in month_data["cumulative_pace"]],
            textposition="top center"
        ))
        fig_pace.add_hline(y=0, line_dash="dash", line_color="gray", annotation_text="目標基準線 (±0)")
        fig_pace.update_layout(
            title=f"{selected_ym} 予定ペースに対する回収・放出の波（累積乖離推移）",
            xaxis_title="日付",
            yaxis_title="予定比 累積乖離額 (円)",
            height=360,
            margin=dict(l=20, r=20, t=40, b=20)
        )
        st.plotly_chart(fig_pace, use_container_width=True)

        st.caption(
            "💡 **累積乖離ペースの見方**: グラフが上方向に伸びている日は「予定平均より回収（店舗黒字）」、"
            "下方向に潜っている日は「予定平均より放出・還元（ユーザー勝ち）」が進んでいる状態を示します。"
        )


# --------------------------------------------------------------------------
# TAB 2: 日別詳細データ
# --------------------------------------------------------------------------
with tab_daily:
    st.subheader("📋 日別営業データ一覧")

    # フィルター
    f_col1, f_col2, f_col3 = st.columns(3)
    with f_col1:
        f_special = st.selectbox("営業区分", ["すべて", "特日のみ", "通常日のみ"])
    with f_col2:
        f_dow = st.multiselect("曜日フィルター", options=JAPANESE_DAYS, default=[])
    with f_col3:
        f_win = st.selectbox("営業結果", ["すべて", "店舗黒字 (還元不足)", "出玉還元 (客勝ち)"])

    df_filtered = df_daily.copy()
    if f_special == "特日のみ":
        df_filtered = df_filtered[df_filtered["is_special"]]
    elif f_special == "通常日のみ":
        df_filtered = df_filtered[~df_filtered["is_special"]]

    if f_dow:
        df_filtered = df_filtered[df_filtered["dow_jp"].isin(f_dow)]

    if f_win == "店舗黒字 (還元不足)":
        df_filtered = df_filtered[df_filtered["hall_coin_profit"] > 0]
    elif f_win == "出玉還元 (客勝ち)":
        df_filtered = df_filtered[df_filtered["hall_coin_profit"] < 0]

    cols_to_show = [
        "date", "dow_jp", "is_special", "avg_diff", "avg_games", "win_rate",
        "total_machines", "total_diff_coins", display_val_col, "payout_rate", "top_models"
    ]
    rename_dict = {
        "date": "日付",
        "dow_jp": "曜日",
        "is_special": "特日",
        "avg_diff": "台平均差枚",
        "avg_games": "平均G数",
        "win_rate": "勝率(%)",
        "total_machines": "台数",
        "total_diff_coins": "総差枚数",
        display_val_col: "ホール粗利" if is_hall else "客収支",
        "payout_rate": "機械割(%)",
        "top_models": "優秀機種"
    }

    display_df = df_filtered[cols_to_show].rename(columns=rename_dict).sort_values("日付", ascending=False)
    st.dataframe(
        display_df.style.format({
            "台平均差枚": "{:+,}枚",
            "平均G数": "{:,}G",
            "勝率(%)": "{:.1f}%",
            "台数": "{:,}台",
            "総差枚数": "{:+,}枚",
            "ホール粗利" if is_hall else "客収支": "{:+,}円",
            "機械割(%)": "{:.2f}%"
        }),
        use_container_width=True,
        hide_index=True
    )


# --------------------------------------------------------------------------
# TAB 3: 曜日別分析
# --------------------------------------------------------------------------
with tab_dow:
    st.subheader("📆 曜日別の傾向分析")

    dow_summary = []
    for dow in JAPANESE_DAYS:
        sub = df_daily[df_daily["dow_jp"] == dow]
        cnt = len(sub)
        if cnt == 0:
            continue
        dow_summary.append({
            "曜日": dow,
            "営業日数": cnt,
            "台平均差枚": round(sub["avg_diff"].mean(), 1),
            "平均G数": round(sub["avg_games"].mean()),
            "勝率": round(sub["win_rate"].mean(), 1) if "win_rate" in sub else 0,
            "1日平均粗利" if is_hall else "1日平均収支": round(sub[display_val_col].mean()),
            "台日粗利" if is_hall else "台日収支": round(sub[display_val_col].mean() / sub["total_machines"].mean()),
        })

    df_dow = pd.DataFrame(dow_summary)

    col_g1, col_g2 = st.columns(2)
    with col_g1:
        fig_dow1 = px.bar(
            df_dow,
            x="曜日",
            y="台平均差枚",
            text_auto="+.1f",
            title="曜日別 台平均差枚数",
            color="台平均差枚",
            color_continuous_scale="Blues" if not is_hall else "Reds_r"
        )
        st.plotly_chart(fig_dow1, use_container_width=True)

    with col_g2:
        fig_dow2 = px.bar(
            df_dow,
            x="曜日",
            y="1日平均粗利" if is_hall else "1日平均収支",
            text_auto=",.0f",
            title="曜日別 1日平均粗利" if is_hall else "曜日別 1日平均客収支",
            color="1日平均粗利" if is_hall else "1日平均収支",
            color_continuous_scale="Viridis"
        )
        st.plotly_chart(fig_dow2, use_container_width=True)

    st.dataframe(df_dow, use_container_width=True, hide_index=True)


# --------------------------------------------------------------------------
# TAB 4: 末尾日分析
# --------------------------------------------------------------------------
with tab_tail:
    st.subheader("🔢 日付末尾 (0〜9のつく日) 分析")

    df_daily["tail"] = df_daily["date_dt"].dt.day % 10
    tail_summary = []
    for t in range(10):
        sub = df_daily[df_daily["tail"] == t]
        cnt = len(sub)
        if cnt == 0:
            continue
        tail_summary.append({
            "末尾": f"{t}のつく日",
            "日数": cnt,
            "台平均差枚": round(sub["avg_diff"].mean(), 1),
            "平均G数": round(sub["avg_games"].mean()),
            "勝率": round(sub["win_rate"].mean(), 1),
            "1日平均粗利" if is_hall else "1日平均収支": round(sub[display_val_col].mean()),
            "特日該当日数": int(sub["is_special"].sum())
        })

    df_tail = pd.DataFrame(tail_summary).sort_values("台平均差枚", ascending=False)

    fig_tail = px.bar(
        df_tail,
        x="末尾",
        y="台平均差枚",
        text_auto="+.1f",
        title="日付末尾別 台平均差枚ランキング",
        color="台平均差枚",
        color_continuous_scale="RdBu_r" if is_hall else "RdBu"
    )
    st.plotly_chart(fig_tail, use_container_width=True)

    st.dataframe(df_tail, use_container_width=True, hide_index=True)


# --------------------------------------------------------------------------
# TAB 5: 特日 vs 通常日比較
# --------------------------------------------------------------------------
with tab_special:
    st.subheader("🎯 特日 vs 通常日 比較分析")

    df_sp = df_daily[df_daily["is_special"]]
    df_no = df_daily[~df_daily["is_special"]]

    comp_data = [
        {
            "区分": "特定日 (旧イベント日等)",
            "営業日数": len(df_sp),
            "台平均差枚": round(df_sp["avg_diff"].mean(), 1) if not df_sp.empty else 0,
            "平均G数": round(df_sp["avg_games"].mean()) if not df_sp.empty else 0,
            "勝率": round(df_sp["win_rate"].mean(), 1) if not df_sp.empty else 0,
            "1日平均粗利" if is_hall else "1日平均収支": round(df_sp[display_val_col].mean()) if not df_sp.empty else 0,
            "出玉率 (機械割)": round((df_sp["out_coins"].sum() / df_sp["in_coins"].sum().replace(0, 1)) * 100, 2) if not df_sp.empty else 0
        },
        {
            "区分": "通常営業日",
            "営業日数": len(df_no),
            "台平均差枚": round(df_no["avg_diff"].mean(), 1) if not df_no.empty else 0,
            "平均G数": round(df_no["avg_games"].mean()) if not df_no.empty else 0,
            "勝率": round(df_no["win_rate"].mean(), 1) if not df_no.empty else 0,
            "1日平均粗利" if is_hall else "1日平均収支": round(df_no[display_val_col].mean()) if not df_no.empty else 0,
            "出玉率 (機械割)": round((df_no["out_coins"].sum() / df_no["in_coins"].sum().replace(0, 1)) * 100, 2) if not df_no.empty else 0
        }
    ]
    df_comp = pd.DataFrame(comp_data)
    st.dataframe(df_comp, use_container_width=True, hide_index=True)


# --------------------------------------------------------------------------
# TAB 6: データエクスポート
# --------------------------------------------------------------------------
with tab_export:
    st.subheader("💾 分析データのCSVエクスポート")
    csv_bytes = df_daily.to_csv(index=False, encoding="utf-8-sig").encode("utf-8-sig")
    st.download_button(
        label="📥 計算済み日別データをCSVダウンロード",
        data=csv_bytes,
        file_name=f"{raw_store_data['name']}_financial_daily.csv",
        mime="text/csv"
    )
    st.caption("計算されたModel A/Model Bの粗利、売上、機械割、特日判定を含む全カラムが出力されます。")
