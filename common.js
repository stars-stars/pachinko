// 全ページ共通の処理 (ヘッダーの描画・データの取得・ヘルパー関数)

// ヘッダーのナビゲーション定義
const NAV_ITEMS = [
    { href: 'home.html', label: 'ホーム' },
    { href: 'sum.html', label: '全体収支' },
    { href: 'days.html', label: '日ごと収支' },
    { href: 'add_data.html', label: 'データ追加' },
    { href: 'diary.html', label: '日記' },
    { href: 'profile.html', label: 'プロフィール' },
];

// <header> 要素にナビゲーションを描画し、現在のページに aria-current を付ける
function renderHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    const currentPage = location.pathname.split('/').pop() || 'home.html';
    const ul = document.createElement('ul');
    NAV_ITEMS.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.label;
        if (item.href === currentPage) {
            a.setAttribute('aria-current', 'page');
        }
        li.appendChild(a);
        ul.appendChild(li);
    });
    header.replaceChildren(ul);
}

// HTMLとして解釈されないように特殊文字をエスケープするヘルパー関数
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 収支の正負に応じた表示色を返す
function profitColor(value) {
    return value > 0 ? 'blue' : (value < 0 ? 'red' : 'black');
}

// 日毎データのCSVテキストをオブジェクトの配列にパースする
function parseDayCsv(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) return [];

    // 最初の行（ヘッダー）を取得
    const headers = lines[0].split(',').map(h => h.trim());

    const records = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        // 列数が合わない行（空行など）はスキップ
        if (values.length < headers.length) continue;
        const record = {};
        headers.forEach((header, index) => {
            record[header] = values[index].trim();
        });
        // 収支を計算しておく
        record.profit = parseInt(record.return) - parseInt(record.investment);
        records.push(record);
    }
    return records;
}

// 日毎データを取得する (ブラウザのキャッシュで古いデータが表示されないようにする)
function fetchDayRecords() {
    return fetch('./data/day_datas.csv', { cache: 'no-cache' })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(parseDayCsv);
}

// 日記データを取得する
function fetchDiaries() {
    return fetch('./data/diaries.jsonl', { cache: 'no-cache' })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            // 壊れた行があっても他の日記は表示できるように、行ごとにパースする
            return text.split('\n').filter(Boolean).map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    console.error('日記データの行をパースできませんでした:', line, e);
                    return null;
                }
            }).filter(entry => entry && entry.date && entry.text); // 無効なエントリーを除外
        });
}

// 円を千円単位 (例: -12.3k) の文字列に変換する
function formatK(yen) {
    return `${(yen / 1000).toFixed(1)}k`;
}

document.addEventListener('DOMContentLoaded', renderHeader);
