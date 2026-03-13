document.addEventListener('DOMContentLoaded', () => {
    const jsonPath = 'data/summary.json';

    const numberFormatter = new Intl.NumberFormat('ja-JP', {
        style: 'decimal',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });

    fetch(jsonPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 総合収支の埋め込み
            embedOverallSummary(data, numberFormatter);
            // 機種別データの埋め込み
            embedTableData(
                data.machine_profits,
                '#machine-summary-body',
                'machine',
                numberFormatter
            );
            // 月別データの埋め込み
            embedTableData(
                data.monthly_profits,
                '#monthly-summary-body',
                'monthly',
                numberFormatter
            );
        })
        .catch(e => {
            console.error('データの読み込みまたは処理中にエラーが発生しました: ', e);
            // エラー時の代替テキスト
            document.getElementById('total-profit').textContent = 'データなし';
        });
});

function embedOverallSummary(data, numberFormatter) {
    // 合計収支の埋め込み
    const totalProfit = data.total_profit / 1000;
    // 収支をカンマ区切りにし、[+]または[-]を付けて表示
    const profitText = numberFormatter.format(totalProfit);
    document.getElementById('total-profit').textContent = `${profitText}k!!!`;

    // 日付の埋め込み
    const today = new Date();
    const dateOnly = today.toLocaleDateString('ja-JP');
    if (document.getElementById('today')) {
        document.getElementById('today').textContent = `${dateOnly}更新`;
    }
}

function embedTableData(summaryArray, tableSelector, type, formatter) {
    const tableBody = document.querySelector(tableSelector);
    if (!tableBody) return;

    // 既存の行をクリア
    tableBody.innerHTML = '';

    summaryArray.forEach((item, index) => {
        const row = tableBody.insertRow();

        // 奇数、偶数のグループに分ける
        const isOddGroup = (index + 1) % 2 !== 0;
        row.classList.add(isOddGroup ? 'odd-row' : 'even-row');

        // 機種名・年月のどちらかを埋め込み
        let primaryCell = row.insertCell();
        if (type == 'machine') {
            primaryCell.textContent = item.machine;
        } else if (type == 'monthly') {
            primaryCell.textContent = item.month.replace('-', '年') + '月';
        }

        // 収支の計算と色の判定
        const profitWithK = item.profit / 1000;
        const profitColor = profitWithK > 0 ? 'blue' : (profitWithK < 0 ? 'red' : 'black');

        // 収支の埋め込み
        let cellProfit = row.insertCell();
        cellProfit.style.color = profitColor;
        cellProfit.style.fontWeight = 'bold';
        cellProfit.textContent = `${formatter.format(profitWithK)}k`;
    });
}