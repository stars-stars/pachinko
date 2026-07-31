import pandas as pd
import json
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
import japanize_matplotlib

# データの読み込み
df = pd.read_csv('data/day_datas.csv')
# 日付型へ変換
df['date'] = pd.to_datetime(df['date'])

# 収支の計算
df['profit'] = df['return'] - df['investment']

# 年間合計収支の計算
total_profit = df['profit'].sum()

# 機種ごと収支の計算
machine_summary = df.groupby('machine_name')[['investment', 'return', 'profit']].sum()

# 月ごと収支の計算
df['year_month'] = df['date'].dt.to_period('M')
monthly_summary = df.groupby('year_month')[['investment', 'return', 'profit']].sum()

# JSON出力用のデータを作成
# 月別サマリーをJSONフレンドリーなリスト形式に変換
monthly_data_list = []
for month, row in monthly_summary.iterrows():
    monthly_data_list.append({
        'month': str(month),
        'investment': int(row['investment']),
        'return': int(row['return']),
        'profit': int(row['profit'])
    })
    
# 機種別サマリーをJSONフレンドリーなリスト形式に変換
machine_data_list = []
for machine, row in machine_summary.iterrows():
    machine_data_list.append({
        'machine': machine,
        'investment': int(row['investment']),
        'return': int(row['return']),
        'profit': int(row['profit'])
    })

# 集計結果をJSONファイルとして出力
summary_data = {
    'total_profit': int(total_profit),
    'num_of_sessions': len(df),
    'machine_profits': machine_data_list,
    'monthly_profits': monthly_data_list
}

with open('data/summary.json', 'w', encoding='utf-8') as f:
    json.dump(summary_data, f, ensure_ascii=False, indent=4)

# date列を日付型に変換し、ソートする
df = df.sort_values(by='date')

# 日付ごとに収支を合計
daily_profit = df.groupby(df['date'].dt.date)['profit'].sum().reset_index()
daily_profit['date'] = pd.to_datetime(daily_profit['date'])
daily_profit = daily_profit.set_index('date')

# 累積和を計算
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

# グラフを生成し、画像ファイルとして保存
plt.figure(figsize=(12, 7)) # グラフのサイズを少し大きくして見やすく調整
daily_profit['cumulative_profit'].plot(
    kind='line', 
    linestyle='-', 
    title='Cumulative Profit Trend (Daily)'
)

# グラフのX軸（日付）の表示を自動的に調整
# Y軸にカスタムフォーマッターを適用
plt.gca().yaxis.set_major_formatter(FuncFormatter(k_formatter))
plt.gcf().autofmt_xdate() # 日付が重ならないようにX軸のラベルを斜めにする

# 利益が0の基準線を追加
plt.axhline(0, color='red', linestyle='--')

plt.xlabel('Date')
plt.ylabel('Cumulative Profit (Yen)')
plt.grid(True)
plt.tight_layout() # レイアウトの調整
plt.savefig('data/daily_cumulative_graph.png')
plt.close()

# 機種ごとの収支の棒グラフを生成
# 収支の大きい順にソート
machine_summary = machine_summary.reset_index()
machine_profits_df = machine_summary.sort_values(by='profit', ascending=False)
# 2つに分割
mid_idx = (len(machine_profits_df) + 1) // 2
dfs = [machine_profits_df.iloc[:mid_idx], machine_profits_df.iloc[mid_idx:]]

for i, df_part in enumerate(dfs, 1):
    fig_bar, ax_bar = plt.subplots(figsize=(12, 7))
    # 収益がプラスかマイナスかで色分け
    colors = ['green' if p >= 0 else 'red' for p in df_part['profit']]
    bars = ax_bar.bar(df_part['machine_name'], df_part['profit'], color=colors)

    # Y軸のフォーマッターを設定
    ax_bar.yaxis.set_major_formatter(FuncFormatter(k_formatter))

    ax_bar.set_title(f'Total Profit per Machine ({i}/2)', fontsize=16)
    ax_bar.set_xlabel('Machine Name', fontsize=12)
    ax_bar.set_ylabel('Total Profit (k)', fontsize=12)
    plt.xticks(rotation=45, ha='right')
    plt.grid(axis='y')

    # バーの上に値を表示
    for bar in bars:
        yval = bar.get_height()
        # 収支が0の場合はラベルを表示しない
        if yval != 0:
            ax_bar.text(bar.get_x() + bar.get_width()/2, yval, 
                        k_formatter(yval, None), 
                        va='bottom' if yval > 0 else 'top', 
                        ha='center', 
                        fontsize=9, 
                        color='black')
    plt.tight_layout()
    plt.savefig(f'data/machine_profit_bar_{i}.png')
    plt.close()


# 月別収支の棒グラフを生成
plt.figure(figsize=(12, 7))

# 月別収支データを棒グラフとしてプロット
monthly_summary['profit'].plot(
    kind='bar',
    color=[ 'green' if p >= 0 else 'red' for p in monthly_summary['profit'].values ], # 収益がプラスかマイナスかで色分け
    title='Total Profit per Month'
)

# Y軸の表示を「k」（千円）に設定
plt.gca().yaxis.set_major_formatter(FuncFormatter(k_formatter))

plt.xlabel('Month')
plt.ylabel('Profit (Thousands of Yen)')
plt.grid(axis='y') # 横線のみ表示
plt.xticks(rotation=45, ha='right') # 月名が重ならないように傾ける
plt.tight_layout()
plt.savefig('data/monthly_bar_graph.png')
plt.close()

print("Data processing complete.")