import pandas as pd
import json

# データの読み込み
df = pd.read_csv('data/day_datas.csv')
# 日付型へ変換
df['date'] = pd.to_datetime(df['date'])
df = df.sort_values(by='date')

# 収支の計算
df['profit'] = df['return'] - df['investment']

# 年間合計収支の計算
total_profit = df['profit'].sum()

# 日ごとの収支 (同じ日に複数機種打った場合は合算)
daily_profit = df.groupby('date')['profit'].sum()


# 集計結果の DataFrame を JSON フレンドリーなリスト形式に変換
def summary_to_list(summary, key, key_format=str):
    data_list = []
    for index, row in summary.iterrows():
        data_list.append({
            key: key_format(index),
            'investment': int(row['investment']),
            'return': int(row['return']),
            'profit': int(row['profit'])
        })
    return data_list


# 全体の統計
max_win_date = daily_profit.idxmax()
max_loss_date = daily_profit.idxmin()
stats = {
    'session_win_rate': round(float((df['profit'] > 0).mean()), 4),
    'day_win_rate': round(float((daily_profit > 0).mean()), 4),
    'avg_investment': int(round(df['investment'].mean())),
    'avg_profit_per_day': int(round(daily_profit.mean())),
    'max_day_win': {'date': max_win_date.strftime('%Y-%m-%d'), 'profit': int(daily_profit[max_win_date])},
    'max_day_loss': {'date': max_loss_date.strftime('%Y-%m-%d'), 'profit': int(daily_profit[max_loss_date])},
}

# 機種ごと収支の計算 (打った回数と勝率も含める)
machine_summary = df.groupby('machine_name').agg(
    investment=('investment', 'sum'),
    sessions=('profit', 'size'),
    wins=('profit', lambda p: int((p > 0).sum())),
    **{'return': ('return', 'sum')},
    profit=('profit', 'sum'),
)
machine_data_list = summary_to_list(machine_summary, 'machine')
for item, (_, row) in zip(machine_data_list, machine_summary.iterrows()):
    item['sessions'] = int(row['sessions'])
    item['win_rate'] = round(row['wins'] / row['sessions'], 4)
# 収支(profit)の大きい順（降順）にソート
machine_data_list.sort(key=lambda x: x['profit'], reverse=True)

# 月ごと・年ごと収支の計算
amount_columns = ['investment', 'return', 'profit']
monthly_summary = df.groupby(df['date'].dt.to_period('M'))[amount_columns].sum()
yearly_summary = df.groupby(df['date'].dt.year)[amount_columns].sum()

# 日ごとの収支と累積収支 (累積収支グラフ用)
cumulative = daily_profit.cumsum()
daily_cumulative_list = [
    {'date': date.strftime('%Y-%m-%d'), 'profit': int(profit), 'cumulative': int(cumulative[date])}
    for date, profit in daily_profit.items()
]

# 集計結果をJSONファイルとして出力
summary_data = {
    'total_profit': int(total_profit),
    'last_updated': df['date'].max().strftime('%Y-%m-%d'), # 最新データの日付

    'num_of_sessions': len(df),
    'num_of_days': len(daily_profit),
    'stats': stats,
    'machine_profits': machine_data_list,
    'monthly_profits': summary_to_list(monthly_summary, 'month'),
    'yearly_profits': summary_to_list(yearly_summary, 'year', int),
    'daily_cumulative': daily_cumulative_list,
}

with open('data/summary.json', 'w', encoding='utf-8') as f:
    json.dump(summary_data, f, ensure_ascii=False, indent=4)

print("Data processing complete.")
