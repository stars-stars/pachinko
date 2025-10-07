document.addEventListener('DOMContentLoaded', () => {
    const jsonPath = './data/diaries.json';
    const container = document.getElementById('diary-container');
    const statusElement = document.getElementById('loading-status');

    fetch(jsonPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            statusElement.textContent = ''; // 読み込みメッセージをクリア

            // 1. JSONオブジェクトを配列に変換 (日付キーもデータとして含める)
            const diaryEntries = Object.keys(data).map(date => ({
                date: date, // 'YYYY-MM-DD'
                text: data[date].text // 日記本文
            }));

            if (diaryEntries.length === 0) {
                container.innerHTML = '<p>まだ日記がありません。</p>';
                return;
            }

            // 2. 日付で降順ソート (新しい日付が上に来るように)
            diaryEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

            // 3. データを年月でグループ化し、HTMLを生成
            const groupedHtml = groupAndRenderDiaries(diaryEntries);
            container.innerHTML = groupedHtml;
        })
        .catch(e => {
            console.error('日記データの読み込み中にエラーが発生しました:', e);
            statusElement.textContent = `データの読み込みに失敗しました (${e.message})`;
        });
});

/**
 * 日記エントリーを年月でグループ化し、HTML文字列を生成する
 * @param {Array<Object>} entries - 整形済みの日記エントリー配列
 * @returns {string} 生成されたHTML文字列
 */
function groupAndRenderDiaries(entries) {
    const grouped = {};

    // 1. 年月でグループ化
    entries.forEach(entry => {
        // 'YYYY-MM-DD' から 'YYYY-MM' を抽出
        const yearMonthKey = entry.date.substring(0, 7);
        if (!grouped[yearMonthKey]) {
            grouped[yearMonthKey] = [];
        }
        grouped[yearMonthKey].push(entry);
    });

    let htmlOutput = '';

    // 2. 年月（キー）で降順にソート (新しい月が上)
    const sortedMonths = Object.keys(grouped).sort().reverse();

    sortedMonths.forEach(yearMonthKey => {
        const monthEntries = grouped[yearMonthKey];

        // 年月タイトルとグループDIVの開始
        const yearMonthDisplay = yearMonthKey.replace('-', '/'); // 例: '2024/07'
        const headingText = yearMonthKey.replace('-', '年') + '月'; // 例: '2024年07月'

        // 月のグループ化コンテナ
        htmlOutput += `<div class="${yearMonthDisplay}">`;
        htmlOutput += `<h2>${headingText}</h2>`;

        // 3. 月内のエントリーを処理
        monthEntries.forEach(entry => {
            // 日付から日だけを抽出 ('07' -> '7')
            const monthDisplay = yearMonthDisplay.substring(5).replace(/^0/, '')
            const dayDisplay = entry.date.substring(8).replace(/^0/, '');

            // 日記セクション
            htmlOutput += `<div class="section">`;
            htmlOutput += `<h3>${monthDisplay}/${dayDisplay}</h3>`; // 例: '7'

            // 日記本文
            // JSON内の改行文字をHTMLの <br> タグに変換したい場合は、
            // entry.text.replace(/\n/g, '<br>') を使用してください。
            htmlOutput += `<p>${entry.text}</p>`;

            htmlOutput += `</div>`; // .section 終了
        });

        htmlOutput += `</div>`; // 月グループ終了
    });

    return htmlOutput;
}