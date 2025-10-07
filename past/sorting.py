import json
from collections import OrderedDict

# JSONファイルを読み込みます
with open('diaries.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 辞書のキー（日付文字列）を基準に昇順にソートします
# key=lambda item: item[0] は、キーでソートすることを意味します
sorted_items = sorted(data.items(), key=lambda item: item[0], reverse=False)

# ソートされたアイテムをOrderedDict（順序を保持する辞書）に変換します
data_sorted = OrderedDict(sorted_items)

# 並び替えたデータを新しいJSONファイルに保存します
output_file = 'diaries_sorted.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data_sorted, f, ensure_ascii=False, indent=4)