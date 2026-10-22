# スターのパチンコ収支報告用のリポジトリです！！
定期的にデータを追加していくよ～

サイト: https://stars-stars.github.io/pachinko/

## ページ構成
| ページ | 内容 |
| --- | --- |
| `home.html` | ホーム |
| `sum.html` | 全体収支 (統計・累積収支/機種別/月別/曜日別グラフ・機種別/月別/年別の表) |
| `days.html` | 日ごと収支 (期間・機種での絞り込み、日記へのリンク) |
| `add_data.html` | データ追加フォーム (日別データ・日記) |
| `diary.html` | 日記 (その日の収支つき) |
| `profile.html` | プロフィール |

全ページ共通のヘッダーやデータ取得処理は `common.js` にまとめています。グラフは [Chart.js](https://www.chartjs.org/) でブラウザ上に描画しています。

## データ追加の流れ
1. `add_data.html` のフォーム (または GitHub の Issue テンプレート) から、`Add day-data` / `Add diary-data` という Issue を作成する
2. GitHub Actions (`.github/workflows/ci.yml`) が起動し、以下を順に実行する
   1. `scripts/process_request.py`: Issue の内容を検証してデータファイルに追記 (不備があれば Issue にコメント)
   2. `scripts/create_namelist.py`: 機種名リスト (`data/machine_name_list.txt`) を作成
   3. `scripts/sorting.py`: データを日付順に並び替え、重複を削除
   4. `scripts/summary_data.py`: 集計結果 (`data/summary.json`) を作成
3. 変更をコミットして Issue を閉じ、GitHub Pages にデプロイする

Issue はリポジトリオーナーが作成したものだけが処理されます。

### フォームで使う GitHub トークン
`add_data.html` からの送信には GitHub のトークンが必要です。このリポジトリの **Issues: Read and write** 権限だけを持つ Fine-grained personal access token の利用を推奨します。トークンはブラウザの localStorage にのみ保存されます。

## データファイル
- `data/day_datas.csv`: 日別データ (`date,machine_name,investment,return`)
  ```
  2023-12-14,リゼロ強欲,75000,0
  ```
- `data/diaries.jsonl`: 日記データ (1行1件の JSON)
  ```
  {"date": "2023-12-23", "text": "日記の内容"}
  ```

## ローカルで動かす
```sh
pip install -r requirements.txt
python scripts/create_namelist.py
python scripts/sorting.py
python scripts/summary_data.py
python -m http.server
```
ブラウザで http://localhost:8000/home.html を開いてください。
