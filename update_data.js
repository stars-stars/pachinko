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
            const totalProfit = data.total_profit / 1000;
            // 収支をカンマ区切りにし、[+]または[-]を付けて表示
            const profitText = new Intl.NumberFormat('ja-JP', {style: 'decimal', minimumFractionDigits: 1, maximumFractionDigits: 1}).format(totalProfit);
            document.getElementById('total-profit').textContent = `${profitText}k!!!`;

            // 日付の埋め込み
            const today = new Date();
            const dateOnly = today.toLocaleDateString('ja-JP');
            document.getElementById('today').textContent = `${dateOnly}更新`;


            // 機種別データの埋め込み
            const machineProfits = data.machine_profits;
            const machineTableBody= document.querySelector('#machine-summary tbody');
            // JSONデータをループ処理
            for (const machine in machineProfits) {
                const name = machineProfits['machine'];
                const investment = machineProfits['investment'];
                const returned = machineProfits['return'];
                const profit = machineProfits['profit'] / 1000;
                const row = machineTableBody.insertRow();

                // 機種名セル
                let cellMonth = row.insertCell();
                cellMonth.textContent = name;
                // 収支セル
                let cellInvestment = row.insertCell();
                const machineInvestmentText = new Intl.NumberFormat('ja-JP', { style: 'decimal', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(investment);
                cellInvestment.textContent = `${machineInvestmentText}k`;
                // 収支セル
                let cellReturn = row.insertCell();
                const machineReturnText = new Intl.NumberFormat('ja-JP', { style: 'decimal', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(returned);
                cellReturn.textContent = `${machineReturnText}k`;
                // 収支セル
                let cellProfit = row.insertCell();
                const machineProfitText = new Intl.NumberFormat('ja-JP', { style: 'decimal', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(profit);
                cellProfit.textContent = `${machineProfitText}k`;
            }

            // 月別データの埋め込み
            const monthlyProfits = data.monthly_profits;
            const monthlyTableBody = document.querySelector('#monthly-summary tbody');
            // JSONデータをループ処理
            for(const month in monthlyProfits){
                const month = monthlyProfits['month'];
                const investment = monthlyProfits['investment'];
                const returned = monthlyProfits['return'];
                const profit = monthlyProfits['profit'] / 1000;
                const row = monthlyTableBody.insertRow();

                // 年月セル
                let cellMonth = row.insertCell();
                cellMonth.textContent = month.replace('-', '年') + '月';
                // 収支セル
                let cellInvestment = row.insertCell();
                const monthlyInvestmentText = new Intl.NumberFormat('ja-JP', { style: 'decimal', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(investment);
                cellInvestment.textContent = `${monthlyInvestmentText}k`;
                // 収支セル
                let cellReturn = row.insertCell();
                const monthlyReturnText = new Intl.NumberFormat('ja-JP', { style: 'decimal', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(returned);
                cellReturn.textContent = `${monthlyReturnText}k`;
                // 収支セル
                let cellProfit = row.insertCell();
                const monthlyProfitText = new Intl.NumberFormat('ja-JP', { style: 'decimal', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(profit);
                cellProfit.textContent = `${monthlyProfitText}k`;
            }
        })
        .catch(e => {
            console.error('データの読み込みまたは処理中にエラーが発生しました: ', e);
            // エラー時の代替テキスト
            document.getElementById('total-profit').textContent = 'データなし';
        })
})