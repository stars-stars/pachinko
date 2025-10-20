import pandas as pd
import json

day_data_path = 'data/day_datas.csv'
diary_data_path = 'data/diaries.jsonl'
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
datas = []
with open(diary_data_path, 'r', encoding='utf-8') as f:
    for line_number, line in enumerate(f):
        # 空行やホワイトスペースのみの行をスキップ
        stripped_line = line.strip()
        if not stripped_line:
            continue

        entry = json.loads(stripped_line)
        datas.append(entry)
# 日付でソートする
datas.sort(key=lambda x: x['date'])
# 並び替えたデータを上書き保存
with open(diary_data_path, 'w', encoding='utf-8') as f:
    for data in datas:
        json_line = json.dumps(data, ensure_ascii=False)
        f.write(json_line + "\n")