document.addEventListener('DOMContentLoaded', () => {
    const csvPath = './data/day_datas.csv';
    const dataContainer = document.getElementById('data-container');
    const statusElement = document.getElementById('loading-status');

    // フィルター用要素の取得
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const filterBtn = document.getElementById('filter-btn');
    const clearBtn = document.getElementById('clear-btn');
    const periodSummary = document.getElementById('period-summary');
    const periodTotalSpan = document.getElementById('period-total');

    let allRecords = []; // すべてのデータを保持する変数

    // ----------------------------------------------------
    // 【メイン処理】CSVデータの取得と処理
    // ----------------------------------------------------
    fetch(csvPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            statusElement.textContent = ''; // 読み込みメッセージをクリア

            // CSVテキストを行と列にパース (手動パース)
            const lines = csvText.trim().split('\n');
            if (lines.length <= 1) {
                statusElement.textContent = 'データがありません。';
                return;
            }

            // 最初の行（ヘッダー）を取得
            const headers = lines[0].split(',').map(h => h.trim());

            // データ行をオブジェクトの配列に変換
            const records = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                let record = {};
                headers.forEach((header, index) => {
                    record[header] = values[index].trim();
                });
                records.push(record);
            }

            allRecords = records;
            renderData(allRecords);
        })
        .catch(e => {
            console.error('CSVデータの読み込み中にエラーが発生しました:', e);
            statusElement.textContent = `データの読み込みに失敗しました (${e.message})`;
        });

    // データを画面に描画する関数
    function renderData(recordsToRender) {
        if (recordsToRender.length === 0) {
            dataContainer.innerHTML = '<p style="text-align:center;">指定された期間のデータはありません。</p>';
            updatePeriodSummary(recordsToRender);
            return;
        }

        // 日付でソート (新しい日付が上に来るように降順ソート)
        recordsToRender.sort((a, b) => new Date(b.date) - new Date(a.date));

        // データを年月でグループ化し、表を生成
        const groupedData = groupAndRenderTables(recordsToRender);
        dataContainer.innerHTML = groupedData;

        // 縞模様のスタイルを適用
        applyZebraStriping();

        // 期間合計の計算と表示
        updatePeriodSummary(recordsToRender);
    }

    // 期間合計を計算して表示する関数
    function updatePeriodSummary(recordsToRender) {
        // フィルターが指定されている場合のみ合計を表示する
        if (!startDateInput.value && !endDateInput.value) {
            periodSummary.style.display = 'none';
            return;
        }

        periodSummary.style.display = 'block';
        let totalProfit = 0;
        recordsToRender.forEach(record => {
            const profit = (parseInt(record.return) - parseInt(record.investment)) / 1000;
            totalProfit += profit;
        });

        const color = totalProfit < 0 ? 'red' : (totalProfit > 0 ? 'blue' : 'black');
        periodTotalSpan.textContent = totalProfit.toFixed(1);
        periodTotalSpan.style.color = color;
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

        let filtered = allRecords;

        if (start) {
            filtered = filtered.filter(r => r.date >= start);
        }
        if (end) {
            filtered = filtered.filter(r => r.date <= end);
        }

        renderData(filtered);
    });

    // 「クリア」ボタンのイベント
    clearBtn.addEventListener('click', () => {
        startDateInput.value = '';
        endDateInput.value = '';
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
function groupAndRenderTables(records) {
    let htmlOutput = '';
    let currentMonth = null;
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
        htmlOutput += `<h2 style="text-align: center">${yearMonth.replace('-', '年')}月</h2>`;
        htmlOutput += `<div class="table-responsive"><table style="width: 100%; max-width: 1200px; margin: 0 auto;" border="3">`;
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
                const profit = (parseInt(record.return) - parseInt(record.investment)) / 1000;
                dailyTotalProfit += profit;
            })

            dayRecords.forEach((record, index) => {
                const isFirstRow = index === 0;
                const profit = (parseInt(record.return) - parseInt(record.investment)) / 1000;

                // 行の開始
                const rowClasses = isFirstRow ? 'day day-group-start' : 'day';
                htmlOutput += `<tr class="${rowClasses}">`;

                if (isFirstRow) {
                    // 最初の行のみ日付セルを挿入
                    const dateDisplay = yearMonth.substring(5) + '/' + day; // 例: 07/07
                    htmlOutput += `<td rowspan="${rowSpanCount}">${dateDisplay}</td>`;
                }

                // データの挿入（千円単位に変換）
                htmlOutput += `<td>${record.machine_name}</td>`;
                htmlOutput += `<td style="text-align: right">${(parseInt(record.investment) / 1000).toFixed(1)}k</td>`;
                htmlOutput += `<td style="text-align: right">${(parseInt(record.return) / 1000).toFixed(1)}k</td>`;

                // 収支セル (色付け対応)
                const profitColor = profit < 0 ? 'red' : (profit > 0 ? 'blue' : 'black');
                htmlOutput += `<td style="font-weight: bold; text-align: right"><span style="color: ${profitColor};">${profit.toFixed(1)}k</span></td>`;

                // 日別合計収支セル
                if (isFirstRow) {
                    const dailyTotalColor = dailyTotalProfit < 0 ? 'red' : (dailyTotalProfit > 0 ? 'blue' : 'black');
                    htmlOutput += `<td rowspan="${rowSpanCount}" style="font-weight: bold; text-align: center; vertical-align: middle;"><span style="color: ${dailyTotalColor};">${dailyTotalProfit.toFixed(1)}k</span></td>`;
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
