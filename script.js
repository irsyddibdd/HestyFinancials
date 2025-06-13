// !!! VERSI DENGAN ANIMASI INTRO PROFESIONAL !!!
console.log("Menjalankan script.js versi animasi intro profesional...");

/**
 * ======================================================
 * !!! KODE BARU UNTUK ANIMASI INTRO / SPLASH SCREEN !!!
 * ======================================================
 */
window.addEventListener('load', function() {
    const splashScreen = document.getElementById('splash-screen');
    const appLayout = document.querySelector('.app-layout');

    if (splashScreen) {
        // Durasi total splash screen sebelum mulai menghilang
        const introDuration = 3000; // 3 detik

        // Sembunyikan splash screen dan tampilkan aplikasi
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            
            if (appLayout) {
                appLayout.classList.add('visible');
            }

        }, introDuration);

        // Hapus elemen splash screen dari DOM setelah transisi selesai
        // Durasi intro + durasi transisi fade-out (0.5s)
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, introDuration + 500); 
    }
});


const apsiUrl = 'https://script.google.com/macros/s/AKfycbyt5VsXRt3bouIFwdlgVwk2YAzWvEMdKNjsNgrsYhMBC2V0r-Ty6pTlhPswFFpyFZjDtQ/exec';

let allTransactions = [], budgetData = {}, goalsData = [];
let pieChart, monthlyBarChart;
let isDataLoading = false; // Penanda untuk mencegah request data tumpang tindih

document.addEventListener('DOMContentLoaded', () => { initialize_app(); });

function initialize_app() {
    setupEventListeners();
    loadDashboardData();

    // BARU: Sinkronisasi data otomatis setiap 10 detik
    const syncInterval = 10000; // 10 detik
    setInterval(() => {
        console.log(`Sinkronisasi otomatis dimulai... (Interval: ${syncInterval / 1000} detik)`);
        loadDashboardData();
    }, syncInterval);
}

/**
 * ======================================================
 * !!! FUNGSI BARU UNTUK FORMAT RUPIAH OTOMATIS !!!
 * Fungsi ini dipanggil setiap kali pengguna mengetik di kolom uang.
 * ======================================================
 */
function formatInputRupiah(event) {
    let input = event.target;
    
    // 1. Simpan posisi kursor saat ini
    let cursorPosition = input.selectionStart;
    let originalLength = input.value.length;

    // 2. Bersihkan nilai dari karakter non-digit (seperti titik yang sudah ada)
    let cleanValue = input.value.replace(/\D/g, '');

    // 3. Jika nilainya kosong, biarkan input kosong
    if (!cleanValue) {
        input.value = '';
        return;
    }

    // 4. Format angka dengan pemisah ribuan (titik)
    // Menggunakan BigInt untuk menangani angka yang sangat besar tanpa masalah presisi
    const number = BigInt(cleanValue);
    const formattedValue = new Intl.NumberFormat('id-ID').format(number);

    // 5. Setel kembali nilai input dengan yang sudah diformat
    input.value = formattedValue;
    
    // 6. Sesuaikan kembali posisi kursor agar tidak loncat ke akhir
    let newLength = input.value.length;
    let newCursorPosition = cursorPosition + (newLength - originalLength);
    input.setSelectionRange(newCursorPosition, newCursorPosition);
}

function formatCurrency(amount) {
    // Pastikan amount adalah angka sebelum diformat
    const numberAmount = Number(String(amount).replace(/[^0-9]/g, '')) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(numberAmount);
}

function setupEventListeners() {
    const sidebar = document.querySelector('.sidebar');
    document.querySelectorAll('.menu-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('is-open');
        });
    });
    document.addEventListener('click', function(event) {
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle && sidebar.classList.contains('is-open') && !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
            sidebar.classList.remove('is-open');
        }
    });

    const form = document.getElementById('transactionForm');
    if (form) {
        document.getElementById('tanggal').valueAsDate = new Date();
        form.addEventListener('submit', handleFormSubmit);
    }

    const modal = document.getElementById('transaction-modal');
    const openModalBtn = document.getElementById('open-modal-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    if (modal && openModalBtn && closeModalBtn) {
        openModalBtn.addEventListener('click', () => modal.classList.add('is-open'));
        closeModalBtn.addEventListener('click', () => modal.classList.remove('is-open'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('is-open');
        });

        const fabOpenModalBtn = document.getElementById('fab-open-modal-btn');
        if (fabOpenModalBtn) {
            fabOpenModalBtn.addEventListener('click', () => modal.classList.add('is-open'));
        }
    }

    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.currentTarget.dataset.page;
            if (!pageId) return;
            navigateTo(pageId);
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            e.currentTarget.parentElement.classList.add('active');
            if (sidebar.classList.contains('is-open')) {
                sidebar.classList.remove('is-open');
            }
        });
    });

    const viewAllLink = document.querySelector('.view-all');
    if(viewAllLink) {
        viewAllLink.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('page-riwayat');
            document.querySelector('.sidebar-nav li.active').classList.remove('active');
            document.querySelector('.sidebar-nav a[data-page="page-riwayat"]').parentElement.classList.add('active');
        });
    }

    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    if(searchInput) {
        searchInput.addEventListener('input', applyFiltersAndRender);
    }
    if(typeFilter) {
        typeFilter.addEventListener('change', applyFiltersAndRender);
    }

    const addBudgetForm = document.getElementById('addBudgetForm');
    if(addBudgetForm) {
        addBudgetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const kategori = document.getElementById('budgetKategori').value;
            // Ambil nilai bersih dari input budget
            const budget = document.getElementById('budgetAmount').value.replace(/\D/g, '');
            const data = { type: 'add_budget', payload: { kategori, budget } };
            sendData(data, submitBtn)
                .then(res => handleServerResponse(res))
                .finally(() => addBudgetForm.reset());
        });
    }

    const addGoalForm = document.getElementById('addGoalForm');
    if(addGoalForm) {
        addGoalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const nama = document.getElementById('goalName').value;
            // Ambil nilai bersih dari input target
            const target = document.getElementById('goalTarget').value.replace(/\D/g, '');
            const data = { type: 'add_goal', payload: { nama, target, terkumpul: 0 } };
            sendData(data, submitBtn)
                .then(res => handleServerResponse(res))
                .finally(() => addGoalForm.reset());
        });
    }
    
    // ======================================================
    // !!! PENERAPAN FUNGSI FORMAT RUPIAH !!!
    // ======================================================
    const currencyInputs = document.querySelectorAll('#jumlah, #budgetAmount, #goalTarget');
    currencyInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', formatInputRupiah);
        }
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    const submitButton = document.getElementById('submitButton');
    const modal = document.getElementById('transaction-modal');

    const payload = {
        tanggal: document.getElementById('tanggal').value,
        // Ambil nilai bersih dari input jumlah sebelum dikirim
        jumlah: document.getElementById('jumlah').value.replace(/\D/g, ''),
        tipe: document.getElementById('tipe').value,
        kategori: document.getElementById('kategori').value,
        deskripsi: document.getElementById('deskripsi').value,
    };
    
    const data = { type: 'add_transaction', payload };
    
    sendData(data, submitButton)
        .then(res => handleServerResponse(res, modal));
}

function handleServerResponse(response, modalToClose = null) {
    console.log("Menerima respons dari server:", response);
    if (response.result === 'success') {
        if(modalToClose) modalToClose.classList.remove('is-open');
        loadDashboardData();
    } else {
        alert(response.error || 'Terjadi kesalahan pada server.');
        console.error('Server Error:', response.error);
    }
}

function sendData(data, submitButton = null) {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    let originalButtonText = '';
    if (submitButton) {
        originalButtonText = submitButton.innerText;
        submitButton.disabled = true;
        submitButton.innerText = 'Menyimpan...';
    }
    return fetch(apsiUrl, {
        method: 'POST',
        body: formData,
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    })
    .catch(error => {
        console.error('Error saat mengirim data:', error);
        alert('Oops! Terjadi kesalahan saat mengirim data. Silakan coba lagi.');
        return { result: 'error', error: error.message };
    })
    .finally(() => {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerText = originalButtonText;
        }
    });
}

async function loadDashboardData() {
    // Cek jika sedang dalam proses memuat data, batalkan request baru.
    if (isDataLoading) {
        console.log("Pembatalan: Proses pemuatan data lain sedang berjalan.");
        return;
    }
    
    console.log("Mencoba mengambil data...");
    isDataLoading = true; // Set penanda ke true

    try {
        const response = await fetch(apsiUrl);
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        const { transactions, budgets, goals } = await response.json();
        
        const validTransactions = (transactions || []).filter(trx => trx && trx.tanggal);
        validTransactions.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        
        allTransactions = [...validTransactions];
        budgetData = budgets || {};
        goalsData = goals || [];
        
        // Render semua komponen UI dengan data baru
        processSummary(allTransactions);
        displayRecentTransactions(allTransactions);
        applyFiltersAndRender();
        renderCharts(allTransactions);
        renderReportCharts(allTransactions);
        displayBudgets();
        displayGoals();
        displaySettingsLists();
        
    } catch (error) {
        console.error('Gagal memuat data:', error);
    } finally {
        isDataLoading = false; // Set penanda kembali ke false setelah selesai
        console.log("Proses pemuatan data selesai.");
    }
}

function displaySettingsLists() {
    const budgetList = document.getElementById('budgetList');
    const goalList = document.getElementById('goalList');
    if (budgetList) {
        budgetList.innerHTML = '';
        if (Object.keys(budgetData).length > 0) {
            for (const kategori in budgetData) {
                const li = document.createElement('li');
                li.innerHTML = `<span>${kategori}</span> <strong>${formatCurrency(budgetData[kategori])}</strong>`;
                budgetList.appendChild(li);
            }
        } else {
            budgetList.innerHTML = '<li>Belum ada budget dibuat.</li>';
        }
    }
    if (goalList) {
        goalList.innerHTML = '';
        if (goalsData.length > 0) {
            goalsData.forEach(goal => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${goal.nama}</span> <strong>${formatCurrency(goal.target)}</strong>`;
                goalList.appendChild(li);
            });
        } else {
            goalList.innerHTML = '<li>Belum ada tujuan dibuat.</li>';
        }
    }
}

function applyFiltersAndRender() {
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    if (!searchInput || !typeFilter) return;
    const searchTerm = searchInput.value.toLowerCase();
    const typeValue = typeFilter.value;
    let filteredTransactions = [...allTransactions];
    if (typeValue !== 'semua') {
        filteredTransactions = filteredTransactions.filter(trx => trx.tipe === typeValue);
    }
    if (searchTerm) {
        filteredTransactions = filteredTransactions.filter(trx =>
            trx.kategori.toLowerCase().includes(searchTerm) ||
            (trx.deskripsi && trx.deskripsi.toLowerCase().includes(searchTerm))
        );
    }
    displayFullHistory(filteredTransactions);
}

function navigateTo(pageId) {
    document.querySelectorAll('.main-content > div[id^="page-"]').forEach(page => {
        if (page.id === pageId) {
            page.classList.remove('page-hidden');
        } else {
            page.classList.add('page-hidden');
        }
    });
}

function processSummary(transactions) {
    const totalSaldoEl = document.getElementById('total-saldo');
    const totalPemasukanEl = document.getElementById('total-pemasukan');
    const totalPengeluaranEl = document.getElementById('total-pengeluaran');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let totalPemasukan = 0, totalPengeluaran = 0, pemasukanBulanIni = 0, pengeluaranBulanIni = 0;
    transactions.forEach(trx => {
        const jumlah = Number(trx.jumlah) || 0;
        const trxDate = new Date(trx.tanggal);
        if (isNaN(trxDate)) return;
        if (trx.tipe === 'Pemasukan') {
            totalPemasukan += jumlah;
            if (trxDate.getMonth() === currentMonth && trxDate.getFullYear() === currentYear) {
                pemasukanBulanIni += jumlah;
            }
        } else {
            totalPengeluaran += jumlah;
            if (trxDate.getMonth() === currentMonth && trxDate.getFullYear() === currentYear) {
                pengeluaranBulanIni += jumlah;
            }
        }
    });
    totalSaldoEl.innerText = formatCurrency(totalPemasukan - totalPengeluaran);
    totalPemasukanEl.innerText = formatCurrency(pemasukanBulanIni);
    totalPengeluaranEl.innerText = formatCurrency(pengeluaranBulanIni);
}

function displayRecentTransactions(transactions) {
    const transactionHistoryBody = document.getElementById('transactionHistoryBody');
    if(!transactionHistoryBody) return;
    transactionHistoryBody.innerHTML = '';
    const recentTransactions = transactions.slice(0, 5);
    if (recentTransactions.length === 0) {
        transactionHistoryBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Belum ada data</td></tr>';
        return;
    }
    recentTransactions.forEach(trx => {
        const row = document.createElement('tr');
        row.classList.add('recent-transaction-item');
        const isIncome = trx.tipe === 'Pemasukan';
        row.innerHTML = `
            <td>
                <div class="transaction-info">
                    <div class="transaction-icon ${isIncome ? 'icon-income' : 'icon-expense'}">
                        <i class="fas ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                    </div>
                    <div class="transaction-details">
                        <strong class="transaction-category">${trx.kategori}</strong>
                        <span class="transaction-date">${new Date(trx.tanggal).toLocaleDateString('id-ID')}</span>
                    </div>
                </div>
            </td>
            <td class="transaction-amount ${isIncome ? 'jumlah-pemasukan' : 'jumlah-pengeluaran'}">
                ${isIncome ? '+' : '-'} ${formatCurrency(trx.jumlah)}
            </td>
        `;
        transactionHistoryBody.appendChild(row);
    });
}

function displayFullHistory(transactions) {
    const fullHistoryBody = document.getElementById('full-history-body');
    if (!fullHistoryBody) return;
    fullHistoryBody.innerHTML = '';

    if (transactions.length === 0) {
        fullHistoryBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Tidak ada transaksi yang cocok.</td></tr>';
        return;
    }

    transactions.forEach(trx => {
        const row = document.createElement('tr');
        const isIncome = trx.tipe === 'Pemasukan';
        
        // Penambahan atribut data-label
        row.innerHTML = `
            <td data-label="Tanggal">${new Date(trx.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})}</td>
            <td data-label="Kategori">${trx.kategori}</td>
            <td data-label="Deskripsi">${trx.deskripsi || '-'}</td>
            <td data-label="Jumlah" class="${isIncome ? 'jumlah-pemasukan' : 'jumlah-pengeluaran'}">
                ${formatCurrency(trx.jumlah)}
            </td>
        `;
        fullHistoryBody.appendChild(row);
    });
}

function renderCharts(transactions) {
    const pieChartCanvas = document.getElementById('pieChart');
    if (pieChart) pieChart.destroy();
    if (!pieChartCanvas) return;
    const expenseData = {};
    transactions.filter(t => t.tipe === 'Pengeluaran').forEach(trx => {
        const jumlah = Number(trx.jumlah) || 0;
        if (expenseData[trx.kategori]) {
            expenseData[trx.kategori] += jumlah;
        } else {
            expenseData[trx.kategori] = jumlah;
        }
    });
    if (Object.keys(expenseData).length === 0) {
        const ctx = pieChartCanvas.getContext('2d');
        ctx.clearRect(0, 0, pieChartCanvas.width, pieChartCanvas.height);
        return;
    }
    pieChart = new Chart(pieChartCanvas, {
        type: 'doughnut',
        data: {
            labels: Object.keys(expenseData),
            datasets: [{
                label: 'Pengeluaran',
                data: Object.values(expenseData),
                backgroundColor: ['#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75', '#ec4899', '#db2777'],
                borderColor: '#ffffff',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: "'Poppins', sans-serif" } } }
            }
        }
    });
}

function renderReportCharts(transactions) {
    const reportChartCanvas = document.getElementById('monthlyBarChart');
    if (monthlyBarChart) monthlyBarChart.destroy();
    if (!reportChartCanvas || transactions.length === 0) return;

    const monthlyData = {};
    transactions.forEach(trx => {
        const date = new Date(trx.tanggal);
        if (isNaN(date.getTime())) return;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { pemasukan: 0, pengeluaran: 0 };
        }
        const jumlah = Number(trx.jumlah) || 0;
        if (trx.tipe === 'Pemasukan') {
            monthlyData[monthKey].pemasukan += jumlah;
        } else {
            monthlyData[monthKey].pengeluaran += jumlah;
        }
    });

    let sortedMonths = Object.keys(monthlyData).sort();

    if (sortedMonths.length === 0) return;

    if (sortedMonths.length === 1) {
        const singleMonthKey = sortedMonths[0];
        const [year, month] = singleMonthKey.split('-').map(Number);
        const prevMonthDate = new Date(year, month - 2, 1);
        const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[prevMonthKey]) {
            sortedMonths.unshift(prevMonthKey);
            monthlyData[prevMonthKey] = { pemasukan: 0, pengeluaran: 0 };
        }
    }
    
    const labels = sortedMonths.map(monthKey => {
        const [year, month] = monthKey.split('-');
        return new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    });
    const pemasukanData = sortedMonths.map(monthKey => monthlyData[monthKey].pemasukan);
    const pengeluaranData = sortedMonths.map(monthKey => monthlyData[monthKey].pengeluaran);
    
    const isMobile = window.innerWidth <= 768;

    monthlyBarChart = new Chart(reportChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pemasukan',
                data: pemasukanData,
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                fill: true,
                tension: 0.4
            }, {
                label: 'Pengeluaran',
                data: pengeluaranData,
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000000) return 'Rp ' + (value / 1000000000).toLocaleString('id-ID') + ' M';
                            if (value >= 1000000) return 'Rp ' + (value / 1000000).toLocaleString('id-ID') + ' Jt';
                            if (value >= 1000) return 'Rp ' + (value / 1000).toLocaleString('id-ID') + ' Rb';
                            return 'Rp ' + value;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                    }
                },
                legend: {
                    position: isMobile ? 'bottom' : 'top',
                }
            }
        }
    });
}

function displayBudgets() {
    const budgetContainer = document.getElementById('budget-container');
    if (!budgetContainer) return;
    budgetContainer.innerHTML = '';
    if (Object.keys(budgetData).length === 0) {
        budgetContainer.innerHTML = '<div class="card"><p>Belum ada anggaran yang dibuat. Buat di halaman Pengaturan.</p></div>';
        return;
    }
    const now = new Date();
    const spendingThisMonth = {};
    allTransactions.filter(trx => {
        const trxDate = new Date(trx.tanggal);
        return !isNaN(trxDate.getTime()) && trxDate.getMonth() === now.getMonth() && trxDate.getFullYear() === now.getFullYear() && trx.tipe === 'Pengeluaran';
    }).forEach(trx => {
        spendingThisMonth[trx.kategori] = (spendingThisMonth[trx.kategori] || 0) + Number(trx.jumlah);
    });
    for (const kategori in budgetData) {
        const budgetAmount = Number(budgetData[kategori]) || 0;
        const spentAmount = spendingThisMonth[kategori] || 0;
        const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
        let pClass = percentage > 90 ? 'danger' : percentage > 70 ? 'warning' : 'safe';
        const card = document.createElement('div');
        card.className = 'card budget-card';
        card.innerHTML = `
            <div class="budget-card-header">
                <h3>${kategori} ${percentage > 100 ? `<span class="budget-warning-icon"><i class="fas fa-exclamation-triangle"></i></span>` : ''}</h3>
                <span class="percent ${pClass}">${Math.round(percentage)}%</span>
            </div>
            <div class="budget-card-amount"><strong>${formatCurrency(spentAmount)}</strong> / ${formatCurrency(budgetAmount)}</div>
            <div class="progress-bar-container"><div class="progress-bar ${pClass}" style="width: ${Math.min(percentage, 100)}%;"></div></div>
        `;
        budgetContainer.appendChild(card);
    }
}

function displayGoals() {
    const goalsContainer = document.getElementById('goals-container');
    if (!goalsContainer) return;
    goalsContainer.innerHTML = '';
    if (goalsData.length === 0) {
        goalsContainer.innerHTML = '<div class="card"><p>Belum ada tujuan yang dibuat. Buat di halaman Pengaturan.</p></div>';
        return;
    }
    goalsData.forEach(goal => {
        const targetAmount = Number(goal.target) || 0;
        const savedAmount = Number(goal.terkumpul) || 0;
        const percentage = targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0;
        const card = document.createElement('div');
        card.className = 'card goal-card';
        card.innerHTML = `
            <h3>${goal.nama}</h3>
            <div class="goal-card-amount"><strong>${formatCurrency(savedAmount)}</strong> / ${formatCurrency(targetAmount)}</div>
            <div class="progress-bar-container"><div class="progress-bar" style="width: ${Math.min(percentage, 100)}%;"></div></div>
            <p>${Math.round(percentage)}% tercapai</p>
        `;
        goalsContainer.appendChild(card);
    });
}