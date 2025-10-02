import pandas as pd
import json
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

# 1. データの読み込み
df = pd.read_csv('data/day_datas.csv')

# 2. 収支の計算
df['profit'] = df['return'] - df['investment']

# 3. 年間合計収支の計算
total_profit = df['profit'].sum()

# 4. 集計結果をJSONファイルとして出力 (Webページで読み込む用)
summary_data = {
    'total_profit': int(total_profit),
    'num_of_sessions': len(df)
}

with open('dist/summary.json', 'w', encoding='utf-8') as f:
    json.dump(summary_data, f, ensure_ascii=False, indent=4)

# 5-1. 'date'列を日付型に変換し、ソートする (累積計算には順序が重要)
df['date'] = pd.to_datetime(df['date'])
df = df.sort_values(by='date')

# 5-2. 日付ごとに収支を合計
# 同じ日付で複数回プレイしている場合を考慮し、日ごとの合計を計算します
daily_profit = df.groupby(df['date'].dt.date)['profit'].sum().reset_index()
daily_profit['date'] = pd.to_datetime(daily_profit['date'])
daily_profit = daily_profit.set_index('date')

# 5-3. 累積和を計算
# これが「累計収支の推移」になります
daily_profit['cumulative_profit'] = daily_profit['profit'].cumsum()

# --- Y軸のカスタムフォーマッターを定義 ---
def k_formatter(x, pos):
    """Y軸の値を千円単位（k）で表示するカスタムフォーマッター"""
    value_in_k = x / 1000
    
    # 1000で割り、小数点以下が必要かどうかで表示を切り替える
    if value_in_k.is_integer():
        return f'{int(value_in_k)}k'
    else:
        # 小数点以下1桁まで表示
        return f'{value_in_k:.1f}k'

# 5-4. グラフを生成し、画像ファイルとして保存
plt.figure(figsize=(12, 7)) # グラフのサイズを少し大きくして見やすく調整
daily_profit['cumulative_profit'].plot(
    kind='line', 
    marker='o', 
    linestyle='-', 
    title='Cumulative Profit Trend (Daily)'
)

# グラフのX軸（日付）の表示を自動的に調整
# レコード数に応じて最適な表示幅となるよう、pandas/matplotlibが自動で処理します。
# Y軸にカスタムフォーマッターを適用
plt.gca().yaxis.set_major_formatter(FuncFormatter(k_formatter))
plt.gcf().autofmt_xdate() # 日付が重ならないようにX軸のラベルを斜めにする

# 利益が0の基準線を追加
plt.axhline(0, color='red', linestyle='--')

plt.xlabel('Date')
plt.ylabel('Cumulative Profit (Yen)')
plt.grid(True)
plt.tight_layout() # レイアウトの調整
plt.savefig('dist/daily_cumulative_graph.png')

print("Data processing complete. Files saved to dist/.")