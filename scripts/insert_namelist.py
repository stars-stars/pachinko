import os

NAME_LIST_PATH = "data/machine_name_list.txt"
TEMPLATE_FILE_PATH = ".github/ISSUE_TEMPLATE/add_day_data.yml"

# 自動生成部分を識別するための目印（マーカー）
MARKER = "# --- AUTO GENERATED MACHINE LIST ---"

def main():
    # 機種名リストの読み込み
    try:
        with open(NAME_LIST_PATH, "r", encoding="utf-8") as f:
            machines = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"エラー: {NAME_LIST_PATH}が見つかりません")
        return
    
    # テンプレートファイルの読み込み
    try:
        with open(TEMPLATE_FILE_PATH, "r", encoding="utf-8") as f:
            yaml_content = f.read()
    except FileNotFoundError:
        print(f"エラー: {TEMPLATE_FILE_PATH}が見つかりません")
        return
    
    # マーカーを目印に分離
    if MARKER in yaml_content:
        base_content = yaml_content.split(MARKER)[0].rstrip()
    else:
        base_content = yaml_content.rstrip()

    # 追記するMarkdownブロックの作成
    # GitHubのIssue作成画面で見やすくするため、Markdownのコードブロックとしてリストを表示させます
    added_section = f"\n\n{MARKER}\n"
    added_section += "- type: markdown\n"
    added_section += "  attributes:\n"
    added_section += "    value: |\n"
    added_section += "      ### 機種名一覧\n"
    added_section += "      ```text\n"
    
    # 機種名をインデントを合わせて追加
    for machine in machines:
        added_section += f"      {machine}\n"
    
    added_section += "      ```\n"

    # 5. 結合してファイルに書き込み
    new_content = base_content + added_section

    with open(TEMPLATE_FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"機種名リスト ({len(machines)}件) をYAMLテンプレートに追記・更新しました。")
    
if __name__ == "__main__":
    main()