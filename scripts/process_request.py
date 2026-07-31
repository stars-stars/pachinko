import os
import re
from datetime import datetime
from github import Github

# 環境変数から必要な情報を取得
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')
ISSUE_TITLE = os.environ.get('ISSUE_TITLE')
ISSUE_BODY = os.environ.get('ISSUE_BODY')
ISSUE_NUMBER = os.environ.get('ISSUE_NUMBER')
REPO_OWNER = os.environ.get('REPO_OWNER')
REPO_NAME = os.environ.get('REPO_NAME')
CSV_PATH = 'data/day_datas.csv'
JSON_PATH = 'data/diaries.jsonl'

# Issueの本文から機材リストのセクションを抽出し、パースする
def parse_and_validate_issue_day_data(body):
    parsed_requests = []
    validation_errors = []
    
    # 新しい複数フィールドのフォーム形式をパース
    # 形式例:
    # ### [1行目] 日付
    # 2026-01-01
    # ### [1行目] 機種名
    # ジャグラー
    
    current_row = {}
    row_idx = 0
    current_key = None
    
    lines = body.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # ヘッダーを検出
        match = re.match(r'^###\s*\[(\d+)行目\]\s*(.*)$', line)
        if match:
            new_row_idx = int(match.group(1))
            key_name = match.group(2)
            
            # 行が変わった場合、前の行を保存
            if new_row_idx != row_idx and row_idx != 0:
                _process_row(row_idx, current_row, parsed_requests, validation_errors)
                current_row = {}
                
            row_idx = new_row_idx
            
            if '日付' in key_name:
                current_key = 'date'
            elif '機種名' in key_name:
                current_key = 'name'
            elif '投資額' in key_name:
                current_key = 'investment'
            elif '回収額' in key_name:
                current_key = 'returned'
            else:
                current_key = None
        elif current_key:
            # ヘッダーの下の値
            if line != '_No response_':
                current_row[current_key] = line
            current_key = None
            
    # 最後の行を処理
    if row_idx != 0:
        _process_row(row_idx, current_row, parsed_requests, validation_errors)
            
    if validation_errors:
        return None, validation_errors
    
    return parsed_requests, None

def _process_row(row_idx, row_data, parsed_requests, validation_errors):
    date = row_data.get('date', '').strip()
    name = row_data.get('name', '').strip()
    investment = row_data.get('investment', '').strip()
    returned = row_data.get('returned', '').strip()
    
    # 全て空なら無視
    if not date and not name and not investment and not returned:
        return
        
    # 一部だけ入力されている場合はエラー
    if not date or not name or not investment or not returned:
        validation_errors.append(f"行 {row_idx}: 入力されていない項目があります。")
        return

    # --- 簡易的な検証 ---
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
        validation_errors.append(f"行 {row_idx} ({date}): 日付のフォーマットが 'YYYY-MM-DD' ではありません。")
    else:
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            validation_errors.append(f"行 {row_idx} ({date}): 無効な日付です。")

    if not re.search(r'^\d', investment):
        validation_errors.append(f"行 {row_idx} ({investment}): 投資額のフォーマットが数値形式ではありません。")
        
    if not re.search(r'^\d', returned):
        validation_errors.append(f"行 {row_idx} ({returned}): 回収額のフォーマットが数値形式ではありません。")

    # エラーがなければ追加
    parsed_requests.append({
        'date': date.replace(',', ' '),
        'name': name.replace(',', ''),
        'investment': investment,
        'returned': returned,
        'issue_number': ISSUE_NUMBER
    })

def parse_and_validate_issue_diary(body):
    # データの部分のみを使用
    lines = body.split('\n')[2:]

    date = lines[0].strip()
    text = ''.join(lines[4:])

    validation_errors = []

    # 日付の検証 (YYYY-MM-DD 形式)
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
            validation_errors.append(f"({date}): 日付のフォーマットが 'YYYY-MM-DD' ではありません。")
    else:
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            validation_errors.append(f"({date}): 無効な日付です。")
    
    # 検証を通過した場合、データに追加
    if not validation_errors:
        parsed_requests = {
            'date': date,
            'text': text
        }
            
    if validation_errors:
        return None, validation_errors
    
    return parsed_requests, None


# 検証失敗時のIssueコメント処理
def comment_on_issue(errors):
    if not GITHUB_TOKEN:
        print("GitHubトークンが設定されていません。Issueへのコメントをスキップします。")
        return

    try:
        g = Github(auth=GITHUB_TOKEN)
        repo = g.get_user(REPO_OWNER).get_repo(REPO_NAME)
        issue = repo.get_issue(number=int(ISSUE_NUMBER))
        
        error_message = "### 機材リクエストの検証エラー\n"
        error_message += "GitHub Actionsによる自動検証に失敗しました。\n\n"
        
        for error in errors:
            error_message += f"- {error}\n"
            
        error_message += "\nセクションの各行が以下のフォーマットに従っているか確認してください。\n"
        
        issue.create_comment(error_message)
        print("検証エラーをIssueにコメントしました。")
        
    except Exception as e:
        print(f"Issueへのコメント中にエラーが発生しました: {e}")

# メイン処理
def main():
    if ISSUE_TITLE == 'Add day-data':
        requests, errors = parse_and_validate_issue_day_data(ISSUE_BODY)
        
        if errors:
            # 検証失敗時の処理: Issueにコメント
            comment_on_issue(errors)
            print("is_valid=false >> $GITHUB_OUTPUT")
            print("Issueの検証に失敗しました。")
            exit(1) # ワークフローの続行を禁止する

        # 検証成功時の処理: CSVファイルへの追記
        with open(CSV_PATH, 'a', encoding='utf-8') as f:
            for req in requests:
                f.write(f"{req['date']},{req['name']},{req['investment']},{req['returned']}\n")

        # 成功
        print(f"is_valid=true >> $GITHUB_OUTPUT")
        print("Issue情報をCSVに追加し、コミットを準備します。")
    elif ISSUE_TITLE == 'Add diary-data':
        requests, errors = parse_and_validate_issue_diary(ISSUE_BODY)

        if errors:
            # 検証失敗時の処理: Issueにコメント
            comment_on_issue(errors)
            # GitHub Actionsの出力変数 is-valid に 'false' を設定
            print("::set-output name=is-valid::false")
            print("Issueの検証に失敗しました。")
            exit(1) # ワークフローの続行を禁止する
        
        # 検証成功時の処理: jsonlファイルへの追記
        with open(JSON_PATH, 'a', encoding='utf-8') as f:
            f.write('{"date": "')
            f.write(f"{requests['date']}")
            f.write('", "text": "')
            f.write(f"{requests['text']}")
            f.write('"}\n')


if __name__ == "__main__":
    main()