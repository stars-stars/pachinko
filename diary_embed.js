document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('diary-container');
    const statusElement = document.getElementById('loading-status');

    // 収支データの読み込みに失敗しても日記は表示できるようにする
    const recordsPromise = fetchDayRecords().catch(e => {
        console.error('収支データの読み込み中にエラーが発生しました:', e);
        return [];
    });

    Promise.all([fetchDiaries(), recordsPromise])
        .then(([diaryEntries, records]) => {
            statusElement.textContent = ''; // 読み込みメッセージをクリア

            if (diaryEntries.length === 0) {
                container.innerHTML = '<p>まだ日記がありません。</p>';
                return;
            }

            // 日付で昇順ソート (月の中では古い日付が上、月は新しい順に並ぶ)
            diaryEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

            // 収支データを日付ごとにまとめる
            const recordsByDate = {};
            records.forEach(record => {
                if (!recordsByDate[record.date]) recordsByDate[record.date] = [];
                recordsByDate[record.date].push(record);
            });

            // データを年月でグループ化し、HTMLを生成
            const groupedHtml = groupAndRenderDiaries(diaryEntries, recordsByDate);
            container.innerHTML = groupedHtml;

            // 日記は非同期で描画されるため、URLの #d-YYYY-MM-DD への移動は描画後に行う
            if (location.hash) {
                const target = document.getElementById(decodeURIComponent(location.hash.substring(1)));
                if (target) target.scrollIntoView();
            }
        })
        .catch(e => {
            console.error('日記データの読み込み中にエラーが発生しました:', e);
            statusElement.textContent = `データの読み込みに失敗しました (${e.message})`;
        });
});

/**
 * その日の収支をバッジのHTMLとして生成する
 * @param {Array<Object>} dayRecords - その日の収支データ
 * @returns {string} 生成されたHTML文字列 (データがなければ空文字)
 */
function renderProfitBadges(dayRecords) {
    if (!dayRecords || dayRecords.length === 0) return '';

    let total = 0;
    let html = '<div class="profit-badges">';
    dayRecords.forEach(record => {
        total += record.profit;
        html += `<span class="profit-badge">${escapeHtml(record.machine_name)} `
            + `<b style="color: ${profitColor(record.profit)};">${formatK(record.profit)}</b></span>`;
    });
    // 複数機種打った日は合計も表示する
    if (dayRecords.length > 1) {
        html += `<span class="profit-badge total">合計 <b style="color: ${profitColor(total)};">${formatK(total)}</b></span>`;
    }
    html += '</div>';
    return html;
}

/**
 * 日記エントリーを年月でグループ化し、HTML文字列を生成する
 * @param {Array<Object>} entries - 整形済みの日記エントリー配列
 * @param {Object} recordsByDate - 日付をキーにした収支データ
 * @returns {string} 生成されたHTML文字列
 */
function groupAndRenderDiaries(entries, recordsByDate) {
    const grouped = {};

    // 年月でグループ化
    entries.forEach(entry => {
        // 'YYYY-MM-DD' から 'YYYY-MM' を抽出
        const yearMonthKey = entry.date.substring(0, 7);
        if (!grouped[yearMonthKey]) {
            grouped[yearMonthKey] = [];
        }
        grouped[yearMonthKey].push(entry);
    });

    let htmlOutput = '';

    // 年月（キー）で降順にソート (新しい月が上)
    const sortedMonths = Object.keys(grouped).sort().reverse();

    sortedMonths.forEach(yearMonthKey => {
        const monthEntries = grouped[yearMonthKey];

        // 年月タイトルとグループDIVの開始
        const yearMonthDisplay = yearMonthKey.replace('-', '/'); // 例: '2024/07'
        const headingText = yearMonthKey.replace('-', '年') + '月'; // 例: '2024年07月'

        // 月のグループ化コンテナ
        htmlOutput += `<div class="${yearMonthDisplay}">`;
        htmlOutput += `<h2>${headingText}</h2>`;

        // 月内のエントリーを処理
        monthEntries.forEach(entry => {
            // 日付から日だけを抽出 ('07' -> '7')
            const monthDisplay = yearMonthDisplay.substring(5).replace(/^0/, '')
            const dayDisplay = entry.date.substring(8).replace(/^0/, '');

            // 日記セクション (日ごと収支ページからリンクできるようにIDを付ける)
            htmlOutput += `<div class="section" id="d-${escapeHtml(entry.date)}">`;
            // 収支データがある日は日ごと収支ページへのリンクにする
            const dateText = `${monthDisplay}/${dayDisplay}`;
            htmlOutput += recordsByDate[entry.date]
                ? `<h3><a href="days.html?date=${escapeHtml(entry.date)}" title="この日の収支を見る">${dateText}</a></h3>`
                : `<h3>${dateText}</h3>`;

            // その日の収支のバッジ
            htmlOutput += renderProfitBadges(recordsByDate[entry.date]);

            // 日記本文 (HTMLをエスケープし、改行を<br>に変換)
            htmlOutput += `<p>${escapeHtml(entry.text).replace(/\n/g, '<br>')}</p>`;

            htmlOutput += `</div>`; // .section 終了
        });

        htmlOutput += `</div>`; // 月グループ終了
    });

    return htmlOutput;
}
