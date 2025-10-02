document.addEventListener('DOMContentLoaded', () => {
    const jsonPath = 'data/summary.json';

    fetch(jsonPath)
        .then(response => {
            if (!response.ok){
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 合計収支の埋め込み
            const totalProfit = data.total_profit;
            // 収支をカンマ区切りにし、[+]または[-]を付けて表示
            const profitText = new Intl.NumberFormat('ja-JP', {style: 'currency', currency: 'JPY', minimumFractionDigits: 0}).format(totalProfit);
            document.getElementById('total-profit').textContent = profitText;

            // 日付の埋め込み
            const today = new Date();
            document.getElementById('today').textContent = `${today}更新`;


            // 機種別データの埋め込み
            const machineProfit = data.machine_profits;
            const machineTableBody= document.querySelector('#machine-summary tbody');
            // JSONデータをループ処理
            for (const machine in machineProfit) {
                const profit = machineProfit[machine];
                const row = machineTableBody.insertRow();

                // 年月セル
                let cellMonth = row.insertCell();
                cellMonth.textContent = machine;

                // 収支セル
                let cellProfit = row.insertCell();
                const machineProfitText = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 0 }).format(profit);
                cellProfit.textContent = machineProfitText;
            }

            // 月別データの埋め込み
            const monthlyProfit = data.monthly_profits;
            const monthlyTableBody = document.querySelector('#monthly-summary tbody');
            // JSONデータをループ処理
            for(const month in monthlyProfit){
                const profit = monthlyProfit[month];
                const row = monthlyTableBody.insertRow();

                // 年月セル
                let cellMonth = row.insertCell();
                cellMonth.textContent = month.replace('-', '年') + '月';

                // 収支セル
                let cellProfit = row.insertCell();
                const monthlyProfitText = new Intl.NumberFormat('ja-JP', {style: 'currency', currency: 'JPY', minimumFractionDigits: 0}).format(profit);
                cellProfit.textContent = monthlyProfitText;
            }
        })
        .catch(e => {
            console.error('データの読み込みまたは処理中にエラーが発生しました: ', e);
            // エラー時の代替テキスト
            document.getElementById('total-profit').textContent = 'データなし';
        })
})