document.addEventListener('DOMContentLoaded', () => {
    const dataContainer = document.getElementById('data-container');
    const statusElement = document.getElementById('loading-status');

    // フィルター用要素の取得
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const machineSelect = document.getElementById('machine-filter');
    const filterBtn = document.getElementById('filter-btn');
    const clearBtn = document.getElementById('clear-btn');
    const periodSummary = document.getElementById('period-summary');
    const periodTotalSpan = document.getElementById('period-total');
    const periodDetailSpan = document.getElementById('period-detail');

    let allRecords = []; // すべてのデータを保持する変数
    let diaryDates = new Set(); // 日記がある日付

    // ----------------------------------------------------
    // 【メイン処理】CSVデータと日記データの取得と処理
    // ----------------------------------------------------
    // 日記の読み込みに失敗しても表は表示できるようにする
    const diariesPromise = fetchDiaries().catch(e => {
        console.error('日記データの読み込み中にエラーが発生しました:', e);
        return [];
    });

    Promise.all([fetchDayRecords(), diariesPromise])
        .then(([records, diaries]) => {
            statusElement.textContent = ''; // 読み込みメッセージをクリア

            if (records.length === 0) {
                statusElement.textContent = 'データがありません。';
                return;
            }

            diaryDates = new Set(diaries.map(entry => entry.date));
            allRecords = records;
            populateMachineSelect(allRecords);

            // 日記ページからのリンク (?date=YYYY-MM-DD) の場合はその日で絞り込む
            const linkedDate = new URLSearchParams(location.search).get('date');
            if (linkedDate) {
                startDateInput.value = linkedDate;
                endDateInput.value = linkedDate;
                filterBtn.click();
            } else {
                renderData(allRecords);
            }
        })
        .catch(e => {
            console.error('CSVデータの読み込み中にエラーが発生しました:', e);
            statusElement.textContent = `データの読み込みに失敗しました (${e.message})`;
        });

    // 機種の選択肢を、打った回数の多い順に作成する
    function populateMachineSelect(records) {
        const counts = {};
        records.forEach(r => counts[r.machine_name] = (counts[r.machine_name] || 0) + 1);
        Object.keys(counts)
            .sort((a, b) => counts[b] - counts[a])
            .forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = `${name} (${counts[name]})`;
                machineSelect.appendChild(option);
            });
    }

    // データを画面に描画する関数
    function renderData(recordsToRender) {
        if (recordsToRender.length === 0) {
            dataContainer.innerHTML = '<p class="no-data">指定された条件のデータはありません。</p>';
            updatePeriodSummary(recordsToRender);
            return;
        }

        // 日付でソート (新しい日付が上に来るように降順ソート)
        recordsToRender.sort((a, b) => new Date(b.date) - new Date(a.date));

        // データを年月でグループ化し、表を生成
        const groupedData = groupAndRenderTables(recordsToRender, diaryDates);
        dataContainer.innerHTML = groupedData;

        // 縞模様のスタイルを適用
        applyZebraStriping();

        // 期間合計の計算と表示
        updatePeriodSummary(recordsToRender);
    }

    // 期間合計を計算して表示する関数
    function updatePeriodSummary(recordsToRender) {
        // フィルターが指定されている場合のみ合計を表示する
        if (!startDateInput.value && !endDateInput.value && !machineSelect.value) {
            periodSummary.style.display = 'none';
            return;
        }

        periodSummary.style.display = 'block';
        let totalProfit = 0;
        let wins = 0;
        recordsToRender.forEach(record => {
            totalProfit += record.profit / 1000;
            if (record.profit > 0) wins++;
        });

        periodTotalSpan.textContent = totalProfit.toFixed(1);
        periodTotalSpan.style.color = profitColor(totalProfit);

        // 回数と勝率の表示
        const count = recordsToRender.length;
        const winRate = count > 0 ? `${(wins / count * 100).toFixed(1)}%` : '-';
        periodDetailSpan.textContent = `(${count}回 / 勝率 ${winRate})`;
    }

    // 開始日が入力されたら、終了日が空の場合は同じ日付を自動セットする（カレンダーを同じ月から開かせるためのUX向上）
    startDateInput.addEventListener('change', () => {
        if (startDateInput.value && !endDateInput.value) {
            endDateInput.value = startDateInput.value;
        }
    });

    // 「絞り込み」ボタンのイベント
    filterBtn.addEventListener('click', () => {
        const start = startDateInput.value;
        const end = endDateInput.value;
        const machine = machineSelect.value;

        let filtered = allRecords;

        if (start) {
            filtered = filtered.filter(r => r.date >= start);
        }
        if (end) {
            filtered = filtered.filter(r => r.date <= end);
        }
        if (machine) {
            filtered = filtered.filter(r => r.machine_name === machine);
        }

        renderData(filtered);
    });

    // 機種を選んだらすぐに絞り込む
    machineSelect.addEventListener('change', () => filterBtn.click());

    // 「クリア」ボタンのイベント
    clearBtn.addEventListener('click', () => {
        startDateInput.value = '';
        endDateInput.value = '';
        machineSelect.value = '';
        renderData(allRecords);
    });

});

// YYYY/MM/DD形式から YYYY/MM を抽出し、月の情報を取得するヘルパー関数
function getYearMonth(dateString) {
    // 例: '2024-07-07' から '2024-07' を取得
    return dateString.substring(0, 7);
}

// ----------------------------------------------------
// 【関数 1】データ処理とHTML生成
// ----------------------------------------------------
function groupAndRenderTables(records, diaryDates) {
    let htmlOutput = '';
    let recordsByMonth = {};

    // 1. レコードを年月でグループ化 (例: {'2024-07': [record1, record2, ...], ...})
    records.forEach(record => {
        const yearMonth = getYearMonth(record.date);
        if (!recordsByMonth[yearMonth]) {
            recordsByMonth[yearMonth] = [];
        }
        recordsByMonth[yearMonth].push(record);
    });

    // 2. 年月（キー）でソートし、テーブルを構築
    const sortedMonths = Object.keys(recordsByMonth).sort().reverse(); // 降順ソート

    sortedMonths.forEach(yearMonth => {
        const monthRecords = recordsByMonth[yearMonth];

        // 年月タイトルとテーブルの開始
        htmlOutput += `<div class="${yearMonth.replace('-', '/')}">`;
        htmlOutput += `<h2 class="month-title">${yearMonth.replace('-', '年')}月</h2>`;
        htmlOutput += `<div class="table-responsive"><table class="data-table" border="3">`;
        htmlOutput += `<thead><tr><th>日付</th><th>機種</th><th>投資額</th><th>回収額</th><th>収支</th><th>日別合計</th></tr></thead>`;
        htmlOutput += `<tbody>`;

        // 3. 行を構築し、rowspanを計算
        const recordsByDay = monthRecords.reduce((acc, record) => {
            const day = record.date.substring(8); // 日付部分 (例: '07')
            if (!acc[day]) acc[day] = [];
            acc[day].push(record);
            return acc;
        }, {});

        const sortedDays = Object.keys(recordsByDay).sort((a, b) => parseInt(a) - parseInt(b)); // 日付の昇順ソート

        sortedDays.forEach(day => {
            const dayRecords = recordsByDay[day];
            const rowSpanCount = dayRecords.length;

            // 日別合計収支を事前に計算
            let dailyTotalProfit = 0;
            dayRecords.forEach(record => {
                dailyTotalProfit += record.profit / 1000;
            })

            dayRecords.forEach((record, index) => {
                const isFirstRow = index === 0;
                const profit = record.profit / 1000;

                // 行の開始
                const rowClasses = isFirstRow ? 'day day-group-start' : 'day';
                htmlOutput += `<tr class="${rowClasses}">`;

                if (isFirstRow) {
                    // 最初の行のみ日付セルを挿入 (日記がある日は日記へのリンクを付ける)
                    const dateDisplay = yearMonth.substring(5) + '/' + day; // 例: 07/07
                    const diaryLink = diaryDates.has(record.date)
                        ? ` <a class="diary-link" href="diary.html#d-${record.date}" title="この日の日記を見る">📖</a>`
                        : '';
                    htmlOutput += `<td rowspan="${rowSpanCount}">${dateDisplay}${diaryLink}</td>`;
                }

                // データの挿入（千円単位に変換）
                htmlOutput += `<td>${escapeHtml(record.machine_name)}</td>`;
                htmlOutput += `<td class="amount">${formatK(parseInt(record.investment))}</td>`;
                htmlOutput += `<td class="amount">${formatK(parseInt(record.return))}</td>`;

                // 収支セル (色付け対応)
                htmlOutput += `<td class="amount profit"><span style="color: ${profitColor(profit)};">${profit.toFixed(1)}k</span></td>`;

                // 日別合計収支セル
                if (isFirstRow) {
                    htmlOutput += `<td rowspan="${rowSpanCount}" class="profit daily-total"><span style="color: ${profitColor(dailyTotalProfit)};">${dailyTotalProfit.toFixed(1)}k</span></td>`;
                }

                htmlOutput += `</tr>`;
            });
        });

        htmlOutput += `</tbody></table></div></div>`;
    });

    return htmlOutput;
}

// ----------------------------------------------------
// 【関数 2】縞模様の適用
// ----------------------------------------------------
function applyZebraStriping() {
    // .days コンテナ内のすべての <tbody> 要素を取得
    const tbodies = document.querySelectorAll('#data-container table tbody');

    tbodies.forEach(tbody => {
        let groupIndex = 0; // 日付グループのカウンター

        const allRows = tbody.querySelectorAll('tr');

        allRows.forEach(row => {
            // 'day-group-start' クラスが付与されている行（日付グループの最初の行）でのみ、グループインデックスをインクリメント
            if (row.classList.contains('day-group-start')) {
                groupIndex++;
            }

            // グループインデックスに基づいて偶数/奇数クラスを適用
            const isOddGroup = (groupIndex) % 2 !== 0; // 1番目, 3番目...のグループを奇数とする
            row.classList.add(isOddGroup ? 'odd-row' : 'even-row');
        });
    });
}
