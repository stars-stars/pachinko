import json
import sys

inputfile = "diaries.json"
outputfile = "diaries.jsonl"

with open(inputfile, "r", encoding="utf-8") as f:
    data = json.load(f)

target_list = []

for date in sorted(data.keys()):
    entry = data[date]
    target_list.append({"date": date, "text": entry["text"]})

with open(outputfile, "w", encoding="utf-8") as f:
    for item in target_list:
        json_line = json.dumps(item, ensure_ascii=False)
        f.write(json_line + "\n")