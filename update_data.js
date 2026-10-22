document.addEventListener('DOMContentLoaded', () => {
    const jsonPath = 'data/summary.json';

    const numberFormatter = new Intl.NumberFormat('ja-JP', {
        style: 'decimal',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });

    // ブラウザのキャッシュで古いデータが表示されないようにする
    fetch(jsonPath, { cache: 'no-cache' })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 総合収支の埋め込み
            embedOverallSummary(data, numberFormatter);
            // 統計カードの埋め込み
            embedStatsCards(data);
            // グラフの描画 (機種別・月別のグラフは並び替えに合わせて後でデータを入れる)
            const charts = renderCharts(data);
            // 機種別データの埋め込み (並び替え可能)
            setupSortableSection(data.machine_profits, '#machine-sort-key', '#machine-sort-order', sorted => {
                embedTableData(sorted, '#machine-summary-body', 'machine', numberFormatter);
                updateBarChart(charts.machine, sorted, m => m.machine);
            });
            // 月別データの埋め込み (並び替え可能)
            setupSortableSection(data.monthly_profits, '#monthly-sort-key', '#monthly-sort-order', sorted => {
                embedTableData(sorted, '#monthly-summary-body', 'monthly', numberFormatter);
                updateBarChart(charts.monthly, sorted, m => m.month.replace('-', '/'));
            });
            // 年別データの埋め込み
            embedTableData(
                data.yearly_profits || [],
                '#yearly-summary-body',
                'yearly',
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
    const profitStr = `${profitText}k!!!`;

    const profitSpan = document.getElementById('total-profit');

    // 実際の数値をデータ属性に保存し、初期表示は伏字にする
    profitSpan.dataset.realProfit = profitStr;
    profitSpan.textContent = '***k!!!';
    profitSpan.style.cursor = 'pointer';
    profitSpan.style.userSelect = 'none'; // テキスト選択を防ぐ

    // クリックイベントで伏字と実際の数値を切り替える
    // 既存のイベントリスナーが重複しないように一旦クローンするか、単純に追加（通常は1回しか呼ばれない）
    profitSpan.onclick = function() {
        if (this.textContent.includes('***')) {
            this.textContent = this.dataset.realProfit;
        } else {
            this.textContent = '***k!!!';
        }
    };

    // 最新データの日付の埋め込み (閲覧日ではなくデータの日付を表示する)
    if (document.getElementById('today') && data.last_updated) {
        const dateOnly = data.last_updated.replace(/-0?/g, '/');
        document.getElementById('today').textContent = `${dateOnly}更新`;
    }
}

// 勝率などの統計をカードとして表示する
function embedStatsCards(data) {
    const container = document.getElementById('stats-cards');
    const stats = data.stats;
    if (!container || !stats) return;

    const percent = rate => `${(rate * 100).toFixed(1)}%`;
    const shortDate = date => date.replace(/-/g, '/');
    const cards = [
        { label: '稼働', value: `${data.num_of_days}日 / ${data.num_of_sessions}回` },
        { label: '勝率 (日)', value: percent(stats.day_win_rate) },
        { label: '勝率 (回)', value: percent(stats.session_win_rate) },
        { label: '平均投資 (1回)', value: formatK(stats.avg_investment) },
        { label: '平均収支 (1日)', value: formatK(stats.avg_profit_per_day), profit: stats.avg_profit_per_day },
        { label: '最大勝ち (1日)', value: formatK(stats.max_day_win.profit), profit: stats.max_day_win.profit,
          note: shortDate(stats.max_day_win.date) },
        { label: '最大負け (1日)', value: formatK(stats.max_day_loss.profit), profit: stats.max_day_loss.profit,
          note: shortDate(stats.max_day_loss.date) },
    ];

    container.replaceChildren(...cards.map(card => {
        const div = document.createElement('div');
        div.className = 'stat-card';
        div.innerHTML = `<div class="stat-label">${escapeHtml(card.label)}</div>`
            + `<div class="stat-value">${escapeHtml(card.value)}</div>`
            + (card.note ? `<div class="stat-note">${escapeHtml(card.note)}</div>` : '');
        if (card.profit !== undefined) {
            div.querySelector('.stat-value').style.color = profitColor(card.profit);
        }
        return div;
    }));
}

// 項目 (key) と順序 (asc/desc) で並び替えた新しい配列を返す
// 値が同じ場合は元の並び順を保つ (Array.prototype.sort は安定ソート)
function sortItems(items, key, order) {
    const direction = order === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        const diff = typeof va === 'string' ? va.localeCompare(vb, 'ja') : va - vb;
        return diff * direction;
    });
}

// 並び替え用のプルダウンを設定し、選択が変わるたびに並び替えた配列で render を呼ぶ
function setupSortableSection(items, keySelector, orderSelector, render) {
    const keySelect = document.querySelector(keySelector);
    const orderSelect = document.querySelector(orderSelector);

    const apply = () => render(sortItems(items, keySelect.value, orderSelect.value));
    keySelect.addEventListener('change', apply);
    orderSelect.addEventListener('change', apply);
    apply();
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

        // 機種名・年月・年のどれかを埋め込み
        let primaryCell = row.insertCell();
        if (type == 'machine') {
            primaryCell.textContent = item.machine;
            // 打った回数と勝率の埋め込み
            row.insertCell().textContent = item.sessions !== undefined ? `${item.sessions}回` : '-';
            row.insertCell().textContent = item.win_rate !== undefined ? `${(item.win_rate * 100).toFixed(0)}%` : '-';
        } else if (type == 'monthly') {
            primaryCell.textContent = item.month.replace('-', '年') + '月';
        } else if (type == 'yearly') {
            primaryCell.textContent = `${item.year}年`;
        }

        // 収支の計算と色の判定
        const profitWithK = item.profit / 1000;

        // 収支の埋め込み
        let cellProfit = row.insertCell();
        cellProfit.style.color = profitColor(profitWithK);
        cellProfit.style.fontWeight = 'bold';
        cellProfit.textContent = `${formatter.format(profitWithK)}k`;
    });
}

// ----------------------------------------------------
// グラフの描画 (Chart.js)
// ----------------------------------------------------
const POSITIVE_COLOR = 'rgba(0, 90, 220, 0.75)';
const NEGATIVE_COLOR = 'rgba(220, 30, 30, 0.75)';

// 累積収支グラフで「空白期間」とみなす日数と、グラフ上で空ける幅 (データ点の個数分)
const GAP_DAYS = 180;
const GAP_SLOTS = 10;

// 描画したグラフを返す (機種別・月別は並び替え時にデータを差し替えるため)
function renderCharts(data) {
    // CDNの読み込みに失敗した場合はグラフを表示しない
    if (typeof Chart === 'undefined') {
        console.error('Chart.js を読み込めませんでした。');
        document.querySelectorAll('.chart-box').forEach(box => box.style.display = 'none');
        return {};
    }

    Chart.defaults.font.size = 14;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.display = false;

    renderCumulativeChart(data.daily_cumulative || []);
    return {
        machine: createBarChart('machine-chart', '機種別収支', data.machine_profits.length, {
            indexAxis: 'y',
            tooltip: m => {
                const sessions = m.sessions !== undefined ? ` / ${m.sessions}回` : '';
                const winRate = m.win_rate !== undefined ? ` / 勝率 ${(m.win_rate * 100).toFixed(0)}%` : '';
                return `${formatK(m.profit)}${sessions}${winRate}`;
            }
        }),
        monthly: createBarChart('monthly-chart', '月別収支', data.monthly_profits.length, {
            tooltip: m => formatK(m.profit)
        })
    };
}

// 金額の軸を千円単位 (k) で表示するための共通設定
function yenScale(extra = {}) {
    return {
        ticks: { callback: value => `${value / 1000}k` },
        // 収支0の基準線を赤くする
        grid: { color: ctx => ctx.tick && ctx.tick.value === 0 ? 'red' : 'rgba(0, 0, 0, 0.1)' },
        ...extra
    };
}

function barColors(values) {
    return values.map(v => v >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR);
}

// 空白期間 (GAP_DAYS 以上データがない期間) に空のデータ点を挟み、グラフ上で間を空ける
// points: 日ごとのデータ (空白部分は null)、gaps: 空白部分の範囲と日数
function buildCumulativePoints(dailyCumulative) {
    const points = [];
    const gaps = [];
    dailyCumulative.forEach((day, i) => {
        if (i > 0) {
            const days = (Date.parse(day.date) - Date.parse(dailyCumulative[i - 1].date)) / 86400000;
            if (days >= GAP_DAYS) {
                const start = points.length;
                for (let k = 0; k < GAP_SLOTS; k++) points.push(null);
                gaps.push({ start, end: points.length - 1, days });
            }
        }
        points.push(day);
    });
    return { points, gaps };
}

// 空白期間の長さを「約1年」「約8ヶ月」のような文字列にする
function gapLabel(days) {
    return days >= 330 ? `約${Math.round(days / 365)}年 空白` : `約${Math.round(days / 30)}ヶ月 空白`;
}

// 空白期間に二重の縦波線とラベルを描くプラグイン
function gapMarkerPlugin(gaps) {
    const WAVE_AMPLITUDE = 3;
    const WAVE_PERIOD = 14;

    return {
        id: 'gapMarker',
        afterDatasetsDraw(chart) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            gaps.forEach(gap => {
                const center = (x.getPixelForValue(gap.start) + x.getPixelForValue(gap.end)) / 2;
                const halfWidth = Math.max(4, (x.getPixelForValue(gap.end) - x.getPixelForValue(gap.start)) / 6);
                const waveX = (offset, y) => center + offset + WAVE_AMPLITUDE * Math.sin(y / WAVE_PERIOD * 2 * Math.PI);

                ctx.save();
                // 2本の波線の間を塗りつぶし、グラフが途切れていることを示す
                ctx.beginPath();
                for (let y = top; y <= bottom; y += 2) ctx.lineTo(waveX(-halfWidth, y), y);
                for (let y = bottom; y >= top; y -= 2) ctx.lineTo(waveX(halfWidth, y), y);
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.fill();

                // 二重の縦波線
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 1.5;
                [-halfWidth, halfWidth].forEach(offset => {
                    ctx.beginPath();
                    for (let y = top; y <= bottom; y += 2) ctx.lineTo(waveX(offset, y), y);
                    ctx.stroke();
                });

                // 空白期間のラベル
                const text = gapLabel(gap.days);
                ctx.font = 'bold 13px sans-serif';
                const textWidth = ctx.measureText(text).width;
                const labelY = top + 18;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.fillRect(center - textWidth / 2 - 6, labelY - 11, textWidth + 12, 22);
                ctx.strokeRect(center - textWidth / 2 - 6, labelY - 11, textWidth + 12, 22);
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, center, labelY);
                ctx.restore();
            });
        }
    };
}

function renderCumulativeChart(dailyCumulative) {
    const { points, gaps } = buildCumulativePoints(dailyCumulative);

    new Chart(document.getElementById('cumulative-chart'), {
        type: 'line',
        data: {
            labels: points.map(d => d ? d.date : ''),
            datasets: [{
                label: '累積収支',
                data: points.map(d => d ? d.cumulative : null),
                borderColor: 'rgb(0, 90, 220)',
                backgroundColor: 'rgba(0, 90, 220, 0.1)',
                fill: 'origin',
                pointRadius: 0,
                pointHitRadius: 8,
                tension: 0.1,
                // 空白期間をまたぐ線は破線にする
                spanGaps: true,
                segment: {
                    borderDash: ctx => ctx.p1DataIndex - ctx.p0DataIndex > 1 ? [6, 4] : undefined
                }
            }]
        },
        options: {
            interaction: { mode: 'index', intersect: false },
            plugins: {
                title: { display: true, text: '累積収支の推移' },
                tooltip: {
                    // 空白期間 (データなし) ではツールチップを出さない
                    filter: item => points[item.dataIndex] !== null,
                    callbacks: {
                        label: ctx => {
                            const day = points[ctx.dataIndex];
                            return [`当日: ${formatK(day.profit)}`, `累積: ${formatK(day.cumulative)}`];
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { maxTicksLimit: 12 } },
                y: yenScale()
            }
        },
        plugins: [gapMarkerPlugin(gaps)]
    });
}

// 収支の棒グラフを作成する (データは updateBarChart で入れる)
// itemCount: 横棒グラフの場合、項目数に応じてグラフの高さを変える
function createBarChart(canvasId, title, itemCount, { indexAxis = 'x', tooltip }) {
    const canvas = document.getElementById(canvasId);
    const isHorizontal = indexAxis === 'y';
    if (isHorizontal) {
        canvas.parentElement.style.height = `${itemCount * 24 + 80}px`;
    }

    const valueScale = isHorizontal ? yenScale({ position: 'top' }) : yenScale();
    const categoryScale = isHorizontal ? { ticks: { autoSkip: false } } : {};

    return new Chart(canvas, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{ label: '収支', data: [], backgroundColor: [] }]
        },
        options: {
            indexAxis: indexAxis,
            plugins: {
                title: { display: true, text: title },
                tooltip: {
                    // 並び替え後の順番に対応するデータを表示する
                    callbacks: { label: ctx => tooltip(ctx.chart.sortedItems[ctx.dataIndex]) }
                }
            },
            scales: isHorizontal
                ? { x: valueScale, y: categoryScale }
                : { x: categoryScale, y: valueScale }
        }
    });
}

// 並び替えた順番で棒グラフのデータを入れ直す
function updateBarChart(chart, items, labelOf) {
    if (!chart) return;
    const profits = items.map(item => item.profit);
    chart.sortedItems = items;
    chart.data.labels = items.map(labelOf);
    chart.data.datasets[0].data = profits;
    chart.data.datasets[0].backgroundColor = barColors(profits);
    chart.update();
}
