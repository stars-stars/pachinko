import json
from bs4 import BeautifulSoup
import re

# HTMLファイルから日記データを抽出し、JSONファイルとして出力する関数。
def extract_diary_to_json(html_file_path, json_file_path):
    # 1. HTMLファイルを読み込む
    try:
        with open(html_file_path, "r", encoding="utf-8") as f:
            html_content = f.read()
    except FileNotFoundError:
        print(f"エラー: {html_file_path} が見つかりません。")
        return

    soup = BeautifulSoup(html_content, "html.parser")
    
    # 日記データを格納する辞書
    diaries = {}

    # 2. すべての日記セクション (<div class="section">) を取得
    diary_sections = soup.select(".diary .section")

    for section in diary_sections:
        # 3. 日付の取得 (例: <h3>7/7</h3> から "7/7" を取得)
        date_tag = section.find("h3")
        if not date_tag:
            continue
            
        day_month = date_tag.text.strip() # "7/7" や "6/20"

        # 4. 親要素から年月の情報を取得
        # <div class="2024/7"> の <h2>2024/7</h2> タグから年を取得
        # sectionの親の親（月別 div）を探す
        month_div = section.find_parent("div", class_=re.compile("^\d{4}/"))
        
        if month_div:
            # <h2>2024/7</h2> から "2024/7" を取得
            year_month_tag = month_div.find("h2")
            if year_month_tag:
                year_month = year_month_tag.text.strip() # "2024/7"
                
                # 年月と日付を結合 (例: "2024/7/7")
                full_date = f"{year_month}/{day_month.split('/')[-1]}"
            else:
                continue
        else:
             # 親の月別divが見つからない場合はスキップ
             continue

        # 5. 本文の取得とクリーンアップ
        # <p>タグ内のテキストを取得し、不要な改行や空白を削除
        paragraph_tag = section.find("p")
        if paragraph_tag:
            # .get_text() でタグ（<br>など）を除去し、テキストを取得
            text_content = paragraph_tag.get_text("\n", strip=True)
        else:
            text_content = ""

        # 6. JSONキーの整形 (YYYY-MM-DD形式)
        # re.matchで "2024/7/7" -> "2024-07-07" に変換
        match = re.match(r"(\d{4})/(\d{1,2})/(\d{1,2})", full_date)
        if match:
            year, month, day = match.groups()
            # 辞書キーとして使用する日付
            json_date_key = f"{year}-{int(month):02d}-{int(day):02d}"
        else:
            continue # 日付の整形に失敗した場合はスキップ

        # 7. 辞書に追加
        diaries[json_date_key] = {
            "text": re.sub(r"\s", "", text_content)
        }
            

    # 2. JSONファイルとして出力
    try:
        with open(json_file_path, "w", encoding="utf-8") as f:
            json.dump(diaries, f, ensure_ascii=False, indent=4)
        print(f"日記データを {json_file_path} に正常に出力しました。")
    except Exception as e:
        print(f"エラー: JSONファイルの書き込み中に問題が発生しました: {e}")

# 実行部分
if __name__ == "__main__":
    html_file = "diary.html"
    output_json = "data/diaries.json"
    
    # 実行
    extract_diary_to_json(html_file, output_json)