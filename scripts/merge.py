import json
from gen_2026 import data_2026
from gen_2025 import data_2025
from gen_2024 import data_2024
from datetime import datetime

all_raw = data_2026 + data_2025 + data_2024

DOW_MAP = ["月", "火", "水", "木", "金", "土", "日"]

daily_records = []
for row in all_raw:
    dt_str = row[0]
    diff = row[1]
    games = row[2]
    win_pct = row[3]
    win_mach = row[4]
    tot_mach = row[5] or 587
    notable = row[6]

    dt = datetime.strptime(dt_str, "%Y-%m-%d")
    dow = DOW_MAP[dt.weekday()]
    month = dt.month
    day = dt.day
    year = dt.year

    total_diff_coins = diff * tot_mach
    hall_coin_profit = -total_diff_coins
    player_coin_profit = total_diff_coins

    # Exchange rates: 46枚貸 (21.73913円/枚), 52枚交換 (19.23077円/枚)
    rate_lend = 1000.0 / 46.0
    rate_exchange = 1000.0 / 52.0

    if hall_coin_profit >= 0:
        hall_yen = int(round(hall_coin_profit * rate_lend))
    else:
        hall_yen = int(round(hall_coin_profit * rate_exchange))

    if player_coin_profit >= 0:
        player_yen = int(round(player_coin_profit * rate_exchange))
    else:
        player_yen = int(round(player_coin_profit * rate_lend))

    # Event day: 11th, 22nd, or zorome (month == day)
    is_zorome = (month == day)
    is_11 = (day == 11)
    is_22 = (day == 22)
    is_old_event = is_11 or is_22 or is_zorome
    is_7 = (day in (7, 17, 27))

    daily_records.append({
        "date": dt_str,
        "yearMonth": f"{year}-{month:02d}",
        "year": year,
        "month": month,
        "day": day,
        "dayOfWeek": dow,
        "avgDiffCoins": diff,
        "avgGames": games,
        "winRate": win_pct,
        "winMachines": win_mach,
        "totalMachines": tot_mach,
        "totalDiffCoins": total_diff_coins,
        "hallCoinProfit": hall_coin_profit,
        "playerCoinProfit": player_coin_profit,
        "hallYenProfit": hall_yen,
        "playerYenProfit": player_yen,
        "isOldEventDay": is_old_event,
        "is7Day": is_7,
        "notable": notable
    })

# Group by year-month
from collections import defaultdict
grouped = defaultdict(list)
for r in daily_records:
    grouped[r["yearMonth"]].append(r)

monthly_stats = []
# Sort yearMonth chronologically ascending for trends
sorted_ym = sorted(grouped.keys())

cum_hall_coins = 0
cum_hall_yen = 0
cum_player_coins = 0
cum_player_yen = 0

for ym in sorted_ym:
    recs = grouped[ym]
    days_count = len(recs)
    tot_hall_coins = sum(r["hallCoinProfit"] for r in recs)
    tot_hall_yen = sum(r["hallYenProfit"] for r in recs)
    tot_player_coins = sum(r["playerCoinProfit"] for r in recs)
    tot_player_yen = sum(r["playerYenProfit"] for r in recs)
    tot_diff = sum(r["totalDiffCoins"] for r in recs)
    avg_diff = round(sum(r["avgDiffCoins"] for r in recs) / days_count, 1)
    avg_games = int(round(sum(r["avgGames"] for r in recs) / days_count))
    avg_mach = int(round(sum(r["totalMachines"] for r in recs) / days_count))

    wr_list = [r["winRate"] for r in recs if r["winRate"] is not None]
    avg_wr = round(sum(wr_list) / len(wr_list), 1) if wr_list else None

    hall_win_days = sum(1 for r in recs if r["avgDiffCoins"] <= 0)
    player_win_days = sum(1 for r in recs if r["avgDiffCoins"] > 0)

    # Event days vs Normal days in this month
    event_recs = [r for r in recs if r["isOldEventDay"]]
    normal_recs = [r for r in recs if not r["isOldEventDay"]]

    event_diff = round(sum(r["avgDiffCoins"] for r in event_recs) / len(event_recs), 1) if event_recs else 0
    normal_diff = round(sum(r["avgDiffCoins"] for r in normal_recs) / len(normal_recs), 1) if normal_recs else 0

    event_hall_yen = sum(r["hallYenProfit"] for r in event_recs)
    normal_hall_yen = sum(r["hallYenProfit"] for r in normal_recs)

    cum_hall_coins += tot_hall_coins
    cum_hall_yen += tot_hall_yen
    cum_player_coins += tot_player_coins
    cum_player_yen += tot_player_yen

    y, m = ym.split("-")
    monthly_stats.append({
        "yearMonth": ym,
        "year": int(y),
        "month": int(m),
        "label": f"{int(y)}年{int(m)}月",
        "daysCount": days_count,
        "avgMachines": avg_mach,
        "avgDiffCoins": avg_diff,
        "totalDiffCoins": tot_diff,
        "hallCoinProfit": tot_hall_coins,
        "hallYenProfit": tot_hall_yen,
        "playerCoinProfit": tot_player_coins,
        "playerYenProfit": tot_player_yen,
        "cumHallCoinProfit": cum_hall_coins,
        "cumHallYenProfit": cum_hall_yen,
        "cumPlayerCoinProfit": cum_player_coins,
        "cumPlayerYenProfit": cum_player_yen,
        "avgGames": avg_games,
        "avgWinRate": avg_wr,
        "hallWinDays": hall_win_days,
        "playerWinDays": player_win_days,
        "eventDaysCount": len(event_recs),
        "eventAvgDiff": event_diff,
        "eventHallYen": event_hall_yen,
        "normalDaysCount": len(normal_recs),
        "normalAvgDiff": normal_diff,
        "normalHallYen": normal_hall_yen
    })

# Store information
store_info = {
    "name": "楽園蒲田店",
    "address": "東京都大田区西蒲田7-46-8",
    "oldEventDays": "毎月11日・22日/月と日がゾロ目の日",
    "exchangeRate": "46枚貸/52枚交換",
    "rateLend": 21.73913,
    "rateExchange": 19.23077,
    "grandOpen": "本館 2002年5月22日/新館 2014年3月21日",
    "totalMachinesApprox": 587,
    "dataRange": f"{sorted_ym[0]} ～ {sorted_ym[-1]} ({len(daily_records)}日分)"
}

out_data = {
    "storeInfo": store_info,
    "monthlyStats": monthly_stats,
    "dailyRecords": daily_records
}

import os

out_dir = os.path.join(os.path.dirname(__file__), "../src/data")
os.makedirs(out_dir, exist_ok=True)
out_file = os.path.join(out_dir, "slotData.json")

with open(out_file, "w", encoding="utf-8") as f:
    json.dump(out_data, f, ensure_ascii=False, indent=2)

print(f"Successfully exported {len(daily_records)} days across {len(monthly_stats)} months to {out_file}")
