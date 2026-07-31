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
    # データの部分のみを使用
    lines = body.split('\n')[2:]

    parsed_requests = []
    validation_errors = []
    
    for i, line in enumerate(lines, 1):
        line = line.strip()
        if not line:
            continue
            
        parts = [p.strip() for p in line.split(',')]
        
        if len(parts) < 4: # 必須項目（日付, 機種名, 投資額, 回収額）が4つあることを確認
            validation_errors.append(f"行 {i}: 必須項目（日付, 機種名, 投資額, 回収額）が不足しています。")
            continue

        date = parts[0]
        name = parts[1]
        investment = parts[2]
        returned = parts[3]

        # --- 簡易的な検証 ---
        # 日付の検証 (YYYY-MM-DD 形式)
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
            validation_errors.append(f"行 {i} ({date}): 日付のフォーマットが 'YYYY-MM-DD' ではありません。")
        else:
            try:
                datetime.strptime(date, '%Y-%m-%d')
            except ValueError:
                validation_errors.append(f"行 {i} ({date}): 無効な日付です。")

        # 投資額の検証
        if not re.search(r'^\d', investment):
            validation_errors.append(f"行 {i} ({investment}): 投資額のフォーマットが数値形式ではありません。")
        # 回収額の検証
        if not re.search(r'^\d', returned):
            validation_errors.append(f"行 {i} ({returned}): 回収額のフォーマットが数値形式ではありません。")

        # 検証を通過した場合、データに追加
        if not validation_errors:
            parsed_requests.append({
                'date': date.replace(',', ' '), # CSVのためにカンマを置換
                'name': name.replace(',', ''), # CSVのためにカンマを削除
                'investment': investment,
                'returned': returned,
                'issue_number': ISSUE_NUMBER
            })
            
    if validation_errors:
        return None, validation_errors
    
    return parsed_requests, None

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
        g = Github(GITHUB_TOKEN)
        repo = g.get_repo(f"{REPO_OWNER}/{REPO_NAME}")
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