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
CSV_PATH = os.environ.get('CSV_PATH')

# Issueの本文から機材リストのセクションを抽出し、パースする
def parse_and_validate_issue(body):
    # '【記入例】' の後から次のセクション（またはファイルの終わり）までの行を抽出する簡易的なロジック
    lines = body.split('\n')
    start_parsing = False
    raw_list_lines = []
    
    # 簡易的なパース処理: '【記入例】'の後の行をリストとして取得
    for line in lines:
        if '【記入例】' in line:
            start_parsing = False # 記入例そのものは無視
            continue
        if start_parsing and line.strip() and not line.startswith('---'):
             raw_list_lines.append(line.strip())
        if '[機材名] | [金額] | [日付] | [URL]' in line:
             start_parsing = True

    parsed_requests = []
    validation_errors = []
    
    for i, line in enumerate(raw_list_lines, 1):
        parts = [p.strip() for p in line.split(',')]
        
        if len(parts) < 3: # 必須項目（日付, 機種名, 投資額, 回収額）が4つあることを確認
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
            validation_errors.append(f"行 {i} ({returned}): 投資額のフォーマットが数値形式ではありません。")

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

# 検証失敗時のIssueコメント処理
def comment_on_issue(errors):
    if not GITHUB_TOKEN:
        print("GitHubトークンが設定されていません。Issueへのコメントをスキップします。")
        return

    try:
        g = Github(GITHUB_TOKEN)
        repo = g.get_user(REPO_OWNER).get_repo(REPO_NAME)
        issue = repo.get_issue(number=int(ISSUE_NUMBER))
        
        error_message = "### 機材リクエストの検証エラー\n"
        error_message += "GitHub Actionsによる自動検証に失敗しました。\n\n"
        
        for error in errors:
            error_message += f"- {error}\n"
            
        error_message += "\n[**データリスト**] セクションの各行が以下のフォーマットに従っているか確認してください。\n"
        error_message += "`[日付 YYYY-MM-DD] | [機種名] | [投資額（数値）] | [回収額(数値)]`"
        
        issue.create_comment(error_message)
        print("検証エラーをIssueにコメントしました。")
        
    except Exception as e:
        print(f"Issueへのコメント中にエラーが発生しました: {e}")

# メイン処理
def main():
    requests, errors = parse_and_validate_issue(ISSUE_BODY)
    
    if errors:
        # 3. 検証失敗時の処理: Issueにコメント
        comment_on_issue(errors)
        # GitHub Actionsの出力変数 is-valid に 'false' を設定
        print("::set-output name=is-valid::false")
        print("Issueの検証に失敗しました。")
        exit(0) # ワークフローの続行を許可する（後続のコミットステップをスキップさせるため）

    # 4. 検証成功時の処理: CSVファイルへの追記
    with open(CSV_PATH, 'a', encoding='utf-8') as f:
        for req in requests:
            f.write(f"{req['date']},{req['name']},{req['investment']},{req['returned']}\n")

    # 成功
    print(f"::set-output name=is-valid::true")
    print("Issue情報をCSVに追加し、コミットを準備します。")


if __name__ == "__main__":
    main()