import pandas as pd
from bs4 import BeautifulSoup
import re
import os

def extract_data_from_html(html_file_path):
    """
    HTMLファイルからパチンコ収支データを抽出する関数。
    """
    # 1. HTMLファイルを読み込む
    with open(html_file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 2. 全ての収支テーブルを取得
    # days.htmlでは、収支データはすべてtableタグで囲まれています
    tables = soup.select('.days table')

    all_records = []
    
    # 年と月を管理するための変数
    current_year = 2024 # HTMLに年情報がないため、一旦2024年を初期値とする (※後述の補足を参照)
    
    for table in tables:
        # 3. <caption>タグから年月情報を取得
        caption = table.find('caption')
        if caption:
            # "2024年7月の収支"のようなテキストから年月を抽出
            match = re.search(r'(\d{4})年(\d{1,2})月', caption.text)
            if match:
                current_year = int(match.group(1))
                current_month = int(match.group(2))
            else:
                # <caption>がない、または形式が異なる場合は、現在の年月をそのまま使用
                pass 

         # 4. 各<tbody>（日ごとのデータブロック）を処理
        # HTMLの構造に基づき、日ごとの収支は各<tbody>に格納されていると仮定
        for tbody in table.find_all('tbody'):
            rows = tbody.find_all('tr')
            if not rows:
                continue
            
            for i, row in enumerate(rows):
                row_cells = row.find_all('td')
                if i == 0:
                    # 最初の<td>には必ず日付とrowspan情報が含まれる
                    day_cell = row_cells[0]
                    
                    # 日付の取得 (例: "8/8" の "8")
                    day = day_cell.text.strip()
                    
                    # 日付文字列を 'YYYY/MM/DD' 形式に整形
                    if '/' in day:
                        # '8/8'のような形式から日を取得
                        day_only = day.split('/')[-1]
                    else:
                        # 予期せぬ形式の場合はスキップ（ここでは単純に日と仮定）
                        day_only = day
                    
                    date_str = f"{current_year}/{current_month}/{day_only}"
                    machine = row_cells[1].text.strip()
                    invest_return = row_cells[2].text.strip()
                else:
                    machine = row_cells[0].text.strip()
                    invest_return = row_cells[1].text.strip()
                
                
                # 5. 投資額/回収額を分離
                if '/' in invest_return:
                    invest_str, return_str = invest_return.split('/')
                    # 'k'を除去し、整数に変換
                    investment = int(float(invest_str.replace('k', '')) * 1000)
                    return_val = int(float(return_str.replace('k', '')) * 1000)
                    
                    # 6. レコードに追加
                    all_records.append({
                        'date': date_str,
                        'machine_name': machine,
                        'investment': investment,
                        'return': return_val,
                    })

    return pd.DataFrame(all_records)

# 実行部分
if __name__ == "__main__":
    # このスクリプトと同じディレクトリにある days.html を指定
    html_file = 'days.html'
    output_csv = 'data/day_datas.csv'
    
    if os.path.exists(html_file):
        df = extract_data_from_html(html_file)
        
        # 'date'列をYYYY-MM-DD形式に統一
        df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')
        
        # CSVに出力
        df.to_csv(output_csv, index=False, encoding='utf-8')
        
        print(f"データを {output_csv} に正常に出力しました。")
        print("\n--- 出力結果の最初の5行 ---\n")
        print(df.head())
    else:
        print(f"エラー: {html_file} が見つかりません。スクリプトと同じ場所に配置してください。")