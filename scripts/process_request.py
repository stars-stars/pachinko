import os
import re
import sys
import json
from datetime import datetime
from github import Github

# 環境変数から必要な情報を取得
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')
ISSUE_TITLE = os.environ.get('ISSUE_TITLE')
ISSUE_BODY = os.environ.get('ISSUE_BODY') or ''
ISSUE_NUMBER = os.environ.get('ISSUE_NUMBER')
REPO_OWNER = os.environ.get('REPO_OWNER')
REPO_NAME = os.environ.get('REPO_NAME')
CSV_PATH = 'data/day_datas.csv'
JSON_PATH = 'data/diaries.jsonl'

# 日付の検証 (YYYY-MM-DD 形式かつ実在する日付か)
def validate_date(date):
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
        return f"({date}): 日付のフォーマットが 'YYYY-MM-DD' ではありません。"
    try:
        datetime.strptime(date, '%Y-%m-%d')
    except ValueError:
        return f"({date}): 無効な日付です。"
    return None

# Issueの本文から日毎データを抽出し、パースする
def parse_and_validate_issue_day_data(body):
    # 改行コードを統一し、データの部分のみを使用
    lines = body.replace('\r\n', '\n').split('\n')[2:]

    parsed_requests = []
    validation_errors = []

    for i, line in enumerate(lines, 1):
        line = line.strip()
        if not line:
            continue

        parts = [p.strip() for p in line.split(',')]

        if len(parts) != 4: # 項目（日付, 機種名, 投資額, 回収額）がちょうど4つあることを確認
            validation_errors.append(f"行 {i}: 項目（日付, 機種名, 投資額, 回収額）の数が正しくありません。")
            continue

        date, name, investment, returned = parts

        # --- 簡易的な検証 ---
        date_error = validate_date(date)
        if date_error:
            validation_errors.append(f"行 {i} {date_error}")
        # 機種名の検証
        if not name:
            validation_errors.append(f"行 {i}: 機種名が空です。")
        # 投資額の検証
        if not re.fullmatch(r'\d+', investment):
            validation_errors.append(f"行 {i} ({investment}): 投資額が0以上の整数ではありません。")
        # 回収額の検証
        if not re.fullmatch(r'\d+', returned):
            validation_errors.append(f"行 {i} ({returned}): 回収額が0以上の整数ではありません。")

        parsed_requests.append({
            'date': date,
            'name': name,
            'investment': investment,
            'returned': returned,
        })

    if not parsed_requests and not validation_errors:
        validation_errors.append("追加するデータが1行もありません。")

    if validation_errors:
        return None, validation_errors

    return parsed_requests, None

def parse_and_validate_issue_diary(body):
    # 改行コードを統一し、データの部分のみを使用
    # 本文の形式: "### 日付\n\n<日付>\n\n### 追加の日記データ\n\n<本文>"
    lines = body.replace('\r\n', '\n').split('\n')[2:]

    if len(lines) < 5:
        return None, ["本文の形式が正しくありません。"]

    date = lines[0].strip()
    text = '\n'.join(lines[4:]).strip()

    validation_errors = []

    date_error = validate_date(date)
    if date_error:
        validation_errors.append(date_error)
    if not text:
        validation_errors.append("日記の本文が空です。")

    if validation_errors:
        return None, validation_errors

    return {'date': date, 'text': text}, None


# 検証失敗時のIssueコメント処理
def comment_on_issue(errors):
    if not GITHUB_TOKEN:
        print("GitHubトークンが設定されていません。Issueへのコメントをスキップします。")
        return

    try:
        g = Github(GITHUB_TOKEN)
        repo = g.get_repo(f"{REPO_OWNER}/{REPO_NAME}")
        issue = repo.get_issue(number=int(ISSUE_NUMBER))

        error_message = "### データ追加リクエストの検証エラー\n"
        error_message += "GitHub Actionsによる自動検証に失敗しました。\n\n"

        for error in errors:
            error_message += f"- {error}\n"

        error_message += "\n入力内容を確認し、新しいIssueで再度送信してください。\n"

        issue.create_comment(error_message)
        print("検証エラーをIssueにコメントしました。")

    except Exception as e:
        print(f"Issueへのコメント中にエラーが発生しました: {e}")

def fail(errors):
    comment_on_issue(errors)
    print("Issueの検証に失敗しました。")
    for error in errors:
        print(f"- {error}")
    sys.exit(1) # ワークフローの続行を禁止する

# メイン処理
def main():
    if ISSUE_TITLE == 'Add day-data':
        requests, errors = parse_and_validate_issue_day_data(ISSUE_BODY)
        if errors:
            fail(errors)

        # 検証成功時の処理: CSVファイルへの追記
        with open(CSV_PATH, 'a', encoding='utf-8') as f:
            for req in requests:
                f.write(f"{req['date']},{req['name']},{req['investment']},{req['returned']}\n")

        print("Issue情報をCSVに追加し、コミットを準備します。")
    elif ISSUE_TITLE == 'Add diary-data':
        request, errors = parse_and_validate_issue_diary(ISSUE_BODY)
        if errors:
            fail(errors)

        # 検証成功時の処理: jsonlファイルへの追記 (引用符や改行を正しくエスケープする)
        with open(JSON_PATH, 'a', encoding='utf-8') as f:
            f.write(json.dumps(request, ensure_ascii=False) + "\n")

        print("Issue情報をJSONLに追加し、コミットを準備します。")
    else:
        print(f"処理対象外のIssueです: {ISSUE_TITLE}")


if __name__ == "__main__":
    main()
