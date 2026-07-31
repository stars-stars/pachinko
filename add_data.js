document.addEventListener("DOMContentLoaded", () => {
    const rowsContainer = document.getElementById('rows-container');
    const addRowBtn = document.getElementById('add-row-btn');
    const dataForm = document.getElementById('data-form');
    const tokenInput = document.getElementById('gh-token');
    const saveTokenBtn = document.getElementById('save-token-btn');
    const statusMessage = document.getElementById('status-message');
    const datalistContainer = document.getElementById('datalist-container');

    let machineOptions = [];

    // Load machine list
    fetch('data/machine_name_list.txt')
        .then(response => response.text())
        .then(text => {
            machineOptions = text.split('\n')
                .map(m => m.trim())
                .filter(m => m && !m.startsWith('<') && !m.startsWith('=') && !m.startsWith('>'));

            // Create datalist for autocomplete
            const datalist = document.createElement('datalist');
            datalist.id = 'machine-list';
            datalist.innerHTML = machineOptions.map(m => `<option value="${m}">`).join('');
            datalistContainer.appendChild(datalist);

            addRow(); // add initial row after loading machines
        })
        .catch(err => {
            console.error("Failed to load machine list", err);
            // fallback empty datalist
            datalistContainer.innerHTML = `<datalist id="machine-list"></datalist>`;
            addRow(); // add initial row anyway
        });

    // Load saved token
    const savedToken = localStorage.getItem('gh_token');
    if (savedToken) {
        tokenInput.value = savedToken;
    }

    saveTokenBtn.addEventListener('click', () => {
        const tokenVal = tokenInput.value.trim();
        if (tokenVal) {
            localStorage.setItem('gh_token', tokenVal);
            showStatus('トークンをブラウザに保存しました！', 'success');
        } else {
            showStatus('トークンが入力されていません。', 'error');
        }
    });

    addRowBtn.addEventListener('click', addRow);

    function addRow() {
        const row = document.createElement('div');
        row.className = 'data-row';

        // Get today's date adjusted for local timezone
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        row.innerHTML = `
            <div class="field">
                <label>日付</label>
                <input type="date" class="input-date" value="${todayStr}" required>
            </div>
            <div class="field">
                <label>機種名</label>
                <input type="text" list="machine-list" class="input-machine" placeholder="機種を選択または入力" required>
            </div>
            <div class="field">
                <label>投資額</label>
                <input type="number" class="input-investment" placeholder="例: 1000" min="0" required>
            </div>
            <div class="field">
                <label>回収額</label>
                <input type="number" class="input-return" placeholder="例: 1000" min="0" required>
            </div>
            <button type="button" class="btn-remove" title="この行を削除">✕</button>
        `;

        row.querySelector('.btn-remove').addEventListener('click', () => {
            if (rowsContainer.children.length > 1) {
                row.style.opacity = '0';
                row.style.transform = 'translateY(10px)';
                setTimeout(() => row.remove(), 300);
            } else {
                showStatus('最低1行は必要です。', 'error');
            }
        });

        rowsContainer.appendChild(row);

        // Trigger CSS animation
        requestAnimationFrame(() => {
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        });

        // Focus the first input (machine name) of the new row, except for the first row load
        if (rowsContainer.children.length > 1) {
            row.querySelector('.input-machine').focus();
        }
    }

    dataForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('gh_token');
        if (!token) {
            showStatus('GitHub トークンを設定し、「保存」を押してください。', 'error');
            return;
        }

        const rows = document.querySelectorAll('.data-row');
        let issueBody = "### 追加データリスト\n\n";
        let hasError = false;

        rows.forEach(row => {
            const date = row.querySelector('.input-date').value.trim();
            let machine = row.querySelector('.input-machine').value.trim();
            const investment = row.querySelector('.input-investment').value.trim();
            const returned = row.querySelector('.input-return').value.trim();

            if (!date || !machine || investment === '' || returned === '') {
                hasError = true;
            }

            // CSVのパースエラーを防ぐため、機種名に含まれるカンマを全角に変換
            machine = machine.replace(/,/g, '，');
            issueBody += `${date},${machine},${investment},${returned}\n`;
        });

        if (hasError) {
            showStatus('すべての項目を正しく入力してください。', 'error');
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '送信中...';

        try {
            const response = await fetch('https://api.github.com/repos/stars-stars/pachinko/issues', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Add day-data',
                    body: issueBody,
                    labels: ['AddDayData']
                })
            });

            if (response.ok) {
                const data = await response.json();
                showStatus(`Issueが正常に作成されました！ <a href="${data.html_url}" target="_blank" style="color:var(--accent)">リンクを開く</a>`, 'success');
                // Reset form
                rowsContainer.innerHTML = '';
                addRow();
            } else {
                const errData = await response.json();
                showStatus(`エラーが発生しました: ${errData.message}`, 'error');
            }
        } catch (error) {
            showStatus(`ネットワークエラー: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Issueを作成して送信';
        }
    });

    function showStatus(message, type) {
        statusMessage.innerHTML = message;
        statusMessage.className = type;
        statusMessage.style.display = 'block';
        if (type === 'success') {
            // Keep success message visible until dismissed or after 10s
            setTimeout(() => {
                if (statusMessage.className === 'success') {
                    statusMessage.style.display = 'none';
                }
            }, 10000);
        } else {
            setTimeout(() => {
                if (statusMessage.className === 'error') {
                    statusMessage.style.display = 'none';
                }
            }, 5000);
        }
    }
});
