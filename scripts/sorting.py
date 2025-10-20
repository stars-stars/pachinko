import pandas as pd
import json
from datetime import datetime
from collections import OrderedDict

day_data_path = 'data/day_datas.csv'
diary_data_path = 'data/diaries.json'
# CSVファイルを読み込みます
df = pd.read_csv(day_data_path)

# 日毎データのソート
# 'date' 列を日付型に変換します (ソートを正確に行うため)
df['date'] = pd.to_datetime(df['date'])
# 重複する行を削除
df = df.drop_duplicates()
# 'date' 列を基準に昇順 (古い日付から新しい日付へ) に並び替える
df_sorted = df.sort_values(by=['date', 'machine_name'], ascending=[True, True])
# 並び替えたデータを上書き保存
df_sorted.to_csv(day_data_path, index=False)

# 日記データのソート
with open(diary_data_path, 'r', encoding='utf-8') as f:
    data = json.load(f)
# キーをソートする
sorted_keys = sorted(data.keys(), key=lambda x: datetime.strptime(x, "%Y-%m-%d"))
# ソートされたキー順に新しい辞書を作成
sorted_data = OrderedDict()
for key in sorted_keys:
    sorted_data[key] = data[key]
# 並び替えたデータを上書き保存
with open(diary_data_path, 'w', encoding='utf-8') as f:
    json.dump(sorted_data, f, ensure_ascii=False, indent=4)