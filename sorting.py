import pandas as pd

# CSVファイルを読み込みます
df = pd.read_csv('data/day_datas.csv')

# 'date' 列を日付型に変換します (ソートを正確に行うため)
df['date'] = pd.to_datetime(df['date'])

# 'date' 列を基準に昇順 (古い日付から新しい日付へ) に並び替えます
df_sorted = df.sort_values(by='date', ascending=True)

# 並び替えたデータを新しいCSVファイルに保存します
output_file = 'data/day_datas.csv'
df_sorted.to_csv(output_file, index=False)