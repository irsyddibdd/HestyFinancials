// !!! VERSI DENGAN SEMUA FITUR TERBARU !!!
console.log("Menjalankan script.js versi final...");

/**
 * ======================================================
 * !!! KODE BARU UNTUK ANIMASI INTRO / SPLASH SCREEN !!!
 * ======================================================
 */
window.addEventListener('load', function() {
    const splashScreen = document.getElementById('splash-screen');
    const appLayout = document.querySelector('.app-layout');

    if (splashScreen) {
        const introDuration = 3000;
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            if (appLayout) {
                appLayout.classList.add('visible');
            }
        }, introDuration);
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, introDuration + 500); 
    }
});


const apsiUrl = 'https://script.google.com/macros/s/AKfycbzcP5dPaNbDFqNC5z105AjU-VvibeOjJpqMykxf3N-tm-DwIRfgfCwyrHiXmLBhX4CO4g/exec'; // <-- PASTIKAN URL ANDA SUDAH BENAR DI SINI

let allTransactions = [], budgetData = {}, goalsData = [], rekeningData = [];
let pieChart, monthlyBarChart;
let isDataLoading = false;
let categoryMemory = {};

function showLoading() {
    document.getElementById('loading-overlay').classList.add('visible');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('visible');
}

/**
 * 
 * 
 * ======================================================
 * !!! FUNGSI BARU UNTUK KOMPRES GAMBAR SEBELUM UPLOAD !!!
 * ======================================================
 */
function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Mengambil data URL dari canvas dengan format dan kualitas yang ditentukan
                const compressedDataUrl = ctx.canvas.toDataURL(file.type, quality);
                resolve(compressedDataUrl);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

/**
 * ======================================================
 * DEFINISI UNTUK SEMUA LENCANA PENCAPAIAN
 * ======================================================
 */
const badgeDefinitions = [
    {
        id: 'transaksi-pertama',
        title: 'Langkah Pertama',
        description: 'Anda berhasil mencatat transaksi pertama Anda.',
        icon: 'fa-shoe-prints',
        check: (transactions, budgets, goals) => transactions.length > 0
    },
    {
        id: 'rajin-mencatat',
        title: 'Rajin Mencatat',
        description: 'Berhasil mencatat transaksi selama 7 hari berturut-turut.',
        icon: 'fa-calendar-check',
        check: (transactions) => {
            if (transactions.length < 7) return false;
            const uniqueDates = [...new Set(transactions.map(t => new Date(t.tanggal).setHours(0,0,0,0)))];
            uniqueDates.sort((a, b) => a - b);
            if (uniqueDates.length < 7) return false;
            let consecutiveDays = 1;
            for (let i = 1; i < uniqueDates.length; i++) {
                const dayInMillis = 24 * 60 * 60 * 1000;
                if (uniqueDates[i] - uniqueDates[i - 1] === dayInMillis) {
                    consecutiveDays++;
                    if (consecutiveDays >= 7) return true;
                } else {
                    consecutiveDays = 1;
                }
            }
            return false;
        }
    },
    {
        id: 'master-hemat',
        title: 'Master Hemat',
        description: 'Berhasil tetap di bawah semua anggaran selama sebulan penuh.',
        icon: 'fa-shield-alt',
        check: (transactions, budgets) => {
            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const month = lastMonth.getMonth();
            const year = lastMonth.getFullYear();
            const spendingLastMonth = {};
            transactions.filter(t => {
                const d = new Date(t.tanggal);
                return d.getMonth() === month && d.getFullYear() === year && t.tipe === 'Pengeluaran';
            }).forEach(t => {
                spendingLastMonth[t.kategori] = (spendingLastMonth[t.kategori] || 0) + Number(t.jumlah);
            });
            if (Object.keys(budgets).length === 0) return false;
            for (const kategori in budgets) {
                const spent = spendingLastMonth[kategori] || 0;
                if (spent > Number(budgets[kategori])) {
                    return false;
                }
            }
            return true;
        }
    },
    {
        id: 'goal-achiever',
        title: 'Goal Achiever',
        description: 'Selamat! Anda berhasil mencapai salah satu tujuan tabungan Anda.',
        icon: 'fa-bullseye',
        check: (transactions, budgets, goals) => {
            return goals.some(g => Number(g.terkumpul) >= Number(g.target));
        }
    }
];


document.addEventListener('DOMContentLoaded', () => { initialize_app(); });

function initialize_app() {
        // !!! LOGIKA BARU UNTUK MENERAPKAN TEMA SAAT AWAL BUKA !!!
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            if (darkModeToggle) darkModeToggle.checked = true;
        }
        // !!! AKHIR BLOK BARU !!!
        // !!! TAMBAHKAN BLOK INI DI DALAM initialize_app !!!
        const savedMemory = localStorage.getItem('categoryMemory');
        if (savedMemory) {
            categoryMemory = JSON.parse(savedMemory);
        }
        // !!! AKHIR BLOK BARU !!!
    setupEventListeners();
    loadDashboardData();
    const syncInterval = 10000;
    setInterval(() => {
        console.log(`Sinkronisasi otomatis dimulai...`);
        loadDashboardData();
    }, syncInterval);
}

function formatInputRupiah(event) {
    let input = event.target;
    let cursorPosition = input.selectionStart;
    let originalLength = input.value.length;
    let cleanValue = input.value.replace(/\D/g, '');
    if (!cleanValue) {
        input.value = '';
        return;
    }
    const number = BigInt(cleanValue);
    const formattedValue = new Intl.NumberFormat('id-ID').format(number);
    input.value = formattedValue;
    let newLength = input.value.length;
    let newCursorPosition = cursorPosition + (newLength - originalLength);
    input.setSelectionRange(newCursorPosition, newCursorPosition);
}

function formatCurrency(amount) {
    const numberAmount = Number(String(amount).replace(/[^0-9]/g, '')) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(numberAmount);
}

// GANTI SELURUH FUNGSI LAMA ANDA DENGAN VERSI LENGKAP INI
function setupEventListeners() {
    // !!! BLOK UNTUK EDIT & HAPUS DIMULAI DI SINI !!!

    // Event listener untuk tombol aksi di tabel riwayat (INI YANG MEMBUAT TOMBOL PENSIL BERFUNGSI)
    const fullHistoryBodyForActions = document.getElementById('full-history-body');
    if (fullHistoryBodyForActions) {
        fullHistoryBodyForActions.addEventListener('click', function(e) {
            const editButton = e.target.closest('.edit-btn');
            const deleteButton = e.target.closest('.delete-btn');

            if (editButton) {
                const transaction = JSON.parse(editButton.dataset.transaction);
                openEditModal(transaction);
            }

            if (deleteButton) {
                const timestamp = deleteButton.dataset.timestamp;
                handleDeleteTransaction(timestamp);
            }
        });
    }

    // Event listener untuk form edit
    const editForm = document.getElementById('editTransactionForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditFormSubmit);
    }

        // --- Form Penambahan ---
        const addRekeningForm = document.getElementById('addRekeningForm');
        if (addRekeningForm) addRekeningForm.addEventListener('submit', handleAddRekening);
    
        // --- Form Edit ---
        const editBudgetForm = document.getElementById('editBudgetForm');
        if (editBudgetForm) editBudgetForm.addEventListener('submit', handleEditBudgetSubmit);
        
        const editGoalForm = document.getElementById('editGoalForm');
        if (editGoalForm) editGoalForm.addEventListener('submit', handleEditGoalSubmit);
    
        const editRekeningForm = document.getElementById('editRekeningForm');
        if (editRekeningForm) editRekeningForm.addEventListener('submit', handleEditRekeningSubmit);
    
        // --- Klik pada Daftar (Delegasi Event) ---
        const budgetList = document.getElementById('budgetList');
        if (budgetList) {
            budgetList.addEventListener('click', e => {
                const editBtn = e.target.closest('.edit-budget-btn');
                if (editBtn) openEditBudgetModal(editBtn.dataset.kategori, editBtn.dataset.amount);
                
                const deleteBtn = e.target.closest('.delete-budget-btn');
                if (deleteBtn) handleDeleteBudget(deleteBtn.dataset.kategori);
            });
        }
    
        const goalList = document.getElementById('goalList');
        if (goalList) {
            goalList.addEventListener('click', e => {
                const editBtn = e.target.closest('.edit-goal-btn');
                if (editBtn) openEditGoalModal(JSON.parse(editBtn.dataset.goal));
                
                const deleteBtn = e.target.closest('.delete-goal-btn');
                if (deleteBtn) handleDeleteGoal(deleteBtn.dataset.nama);
            });
        }
    
        const rekeningList = document.getElementById('rekeningList');
        if (rekeningList) {
            rekeningList.addEventListener('click', e => {
                const editBtn = e.target.closest('.edit-rekening-btn');
                if (editBtn) openEditRekeningModal(editBtn.dataset.nama);
    
                const deleteBtn = e.target.closest('.delete-rekening-btn');
                if (deleteBtn) handleDeleteRekening(deleteBtn.dataset.nama);
            });
        }
    
        // --- Penutup Modal Edit ---
        document.querySelectorAll('#edit-budget-modal, #edit-goal-modal, #edit-rekening-modal').forEach(modal => {
            const closeBtn = modal.querySelector('.close-modal-btn');
            if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('is-open'));
            modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('is-open'); });
        });

    // Event listener untuk menutup modal edit
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const editModal = document.getElementById('edit-transaction-modal');
    if(closeEditModalBtn && editModal) {
        closeEditModalBtn.addEventListener('click', () => editModal.classList.remove('is-open'));
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) editModal.classList.remove('is-open');
        });
    }
    
    // Event listener untuk format rupiah di input jumlah modal edit
    const editJumlahInput = document.getElementById('edit-jumlah');
    if(editJumlahInput) {
        editJumlahInput.addEventListener('input', formatInputRupiah);
    }

    // !!! BLOK UNTUK EDIT & HAPUS SELESAI DI SINI !!!


    // --- Kode event listener lain yang sudah Anda miliki sebelumnya ---

    const receiptModal = document.getElementById('receipt-modal');
    const closeReceiptModalBtn = document.getElementById('close-receipt-modal');
    const receiptModalImg = document.getElementById('receipt-modal-img');
    const fullHistoryBody = document.getElementById('full-history-body');

    const deskripsiInput = document.getElementById('deskripsi');
    if (deskripsiInput) {
        deskripsiInput.addEventListener('input', handleDescriptionInput);
    }
    const reportFilter = document.getElementById('reportDateFilter');
    if (reportFilter) {
        reportFilter.addEventListener('change', updateReportView);
    }

    if (receiptModal && fullHistoryBody) {
        fullHistoryBody.addEventListener('click', function(e) {
            const button = e.target.closest('.view-receipt-btn');
            if (button) {
                e.preventDefault();
                const imgUrl = button.dataset.imgUrl;
                console.log("Mencoba menampilkan URL:", imgUrl);
                receiptModalImg.src = imgUrl;
                receiptModal.classList.add('is-open');
            }
        });

        closeReceiptModalBtn.addEventListener('click', () => {
            receiptModal.classList.remove('is-open');
        });

        receiptModal.addEventListener('click', (e) => {
            if (e.target === receiptModal) {
                receiptModal.classList.remove('is-open');
            }
        });
    }

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
    if (viewAllLink) {
        viewAllLink.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('page-riwayat');
            document.querySelector('.sidebar-nav li.active').classList.remove('active');
            document.querySelector('.sidebar-nav a[data-page="page-riwayat"]').parentElement.classList.add('active');
        });
    }

    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    if (searchInput) searchInput.addEventListener('input', applyFiltersAndRender);
    if (typeFilter) typeFilter.addEventListener('change', applyFiltersAndRender);

    const addBudgetForm = document.getElementById('addBudgetForm');
    if (addBudgetForm) {
        addBudgetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const kategori = document.getElementById('budgetKategori').value;
            const budget = document.getElementById('budgetAmount').value.replace(/\D/g, '');
            const data = {
                type: 'add_budget',
                payload: {
                    kategori,
                    budget
                }
            };
            sendData(data, submitBtn).then(res => handleServerResponse(res)).finally(() => addBudgetForm.reset());
        });
    }

    const addGoalForm = document.getElementById('addGoalForm');
    if (addGoalForm) {
        addGoalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const nama = document.getElementById('goalName').value;
            const target = document.getElementById('goalTarget').value.replace(/\D/g, '');
            const data = {
                type: 'add_goal',
                payload: {
                    nama,
                    target,
                    terkumpul: 0
                }
            };
            sendData(data, submitBtn).then(res => handleServerResponse(res)).finally(() => addGoalForm.reset());
        });
    }

    const currencyInputs = document.querySelectorAll('#jumlah, #budgetAmount, #goalTarget');
    currencyInputs.forEach(input => {
        if (input) input.addEventListener('input', formatInputRupiah);
    });
}

// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
function handleFormSubmit(e) {
    e.preventDefault();
    showLoading(); // Tampilkan loading
    const submitButton = document.getElementById('submitButton');
    const modal = document.getElementById('transaction-modal');

    const payload = {
        tanggal: document.getElementById('tanggal').value,
        jumlah: document.getElementById('jumlah').value.replace(/\D/g, ''),
        tipe: document.getElementById('tipe').value,
        rekening: document.getElementById('rekening').value,
        kategori: document.getElementById('kategori').value,
        deskripsi: document.getElementById('deskripsi').value,
    };

    const data = { type: 'add_transaction', payload };

    // Modifikasi blok ini
    sendData(data, submitButton).then(res => {
         if (res.result === 'success') {
            modal.classList.remove('is-open');
            // "Titipkan" pesan sukses ke loadDashboardData
            loadDashboardData('✅ Transaksi berhasil dicatat!');
            e.target.reset(); // Reset form setelah berhasil
        } else {
            showNotification(`❌ Gagal: ${res.error || 'Terjadi kesalahan'}`, 'error');
            hideLoading();
        }
    });
}

// Ganti fungsi handleServerResponse Anda dengan ini
function handleServerResponse(response, modalToClose = null, transactionPayload = null) {
    console.log("Menerima respons dari server:", response);
    if (response.result === 'success') {
        if (modalToClose) modalToClose.classList.remove('is-open');
        showNotification('✅ Transaksi berhasil dicatat!');

        // !!! BLOK "BELAJAR" BARU !!!
        if (transactionPayload && transactionPayload.deskripsi) {
            const keywords = transactionPayload.deskripsi.toLowerCase().split(' ');
            keywords.forEach(keyword => {
                // Hanya simpan kata kunci yang cukup panjang (menghindari kata seperti 'di', 'ke')
                if (keyword.length > 2) {
                    categoryMemory[keyword] = transactionPayload.kategori;
                }
            });
            // Simpan memori baru ke localStorage
            localStorage.setItem('categoryMemory', JSON.stringify(categoryMemory));
            console.log("Memori kategori diperbarui:", categoryMemory);
        }
        // !!! AKHIR BLOK BARU !!!

        loadDashboardData();
    } else {
        showNotification(`❌ Gagal: ${response.error || 'Terjadi kesalahan'}`, 'error');
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
            submitButton.innerText = 'Simpan Catatan';
        }
    });
}

// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
async function loadDashboardData(successMessage = null) { // Tambahkan parameter di sini
    if (isDataLoading) {
        console.log("Pembatalan: Proses pemuatan data lain sedang berjalan.");
        return;
    }
    console.log("Mencoba mengambil data...");
    isDataLoading = true;
    try {
        const response = await fetch(apsiUrl);
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        const data = await response.json();
        
        const { transactions, budgets, goals, rekening } = data;
        const validTransactions = (transactions || []).filter(trx => trx && trx.tanggal);
        validTransactions.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        
        allTransactions = [...validTransactions];
        budgetData = budgets || {};
        goalsData = goals || [];
        rekeningData = rekening || [];
        
        populateRekeningDropdown();
        processSummary(allTransactions, rekeningData);
        displayRecentTransactions(allTransactions);
        applyFiltersAndRender();
        renderCharts(allTransactions);
        renderReportCharts(allTransactions);
        displayBudgets();
        displayGoals();
        displaySettingsLists();
        displayAndCheckAchievements();
        updateReportView();

    } catch (error) {
        console.error('Gagal memuat data:', error);
    } finally {
        isDataLoading = false;
        hideLoading(); // Sembunyikan loading
        
        // !!! BAGIAN BARU: Tampilkan notifikasi setelah semua selesai !!!
        if (successMessage) {
            showNotification(successMessage);
        }
        console.log("Proses pemuatan data selesai.");
    }
}

function populateRekeningDropdown() {
    const rekeningSelect = document.getElementById('rekening');
    if (!rekeningSelect) return;

    rekeningSelect.innerHTML = '';

    if (rekeningData && rekeningData.length > 0) {
        rekeningData.forEach(rek => {
            const option = document.createElement('option');
            option.value = rek.Nama.trim(); // .trim() untuk hapus spasi
            option.textContent = `${rek.Nama.trim()} (${formatCurrency(rek.Saldo)})`;
            rekeningSelect.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Tidak ada rekening";
        rekeningSelect.appendChild(option);
    }
}

function processSummary(transactions, rekening) {
    const totalSaldoUtamaEl = document.getElementById('total-saldo-utama');
    const rekeningBreakdownEl = document.getElementById('rekening-breakdown');
    
    let totalSaldo = 0;
    if (rekening && rekening.length > 0) {
        rekening.forEach(rek => {
            totalSaldo += Number(rek.Saldo) || 0;
        });

        rekeningBreakdownEl.innerHTML = rekening.map(rek => `
            <div class="rekening-item">
                <span class="name">${rek.Nama}</span>
                <span class="amount">${formatCurrency(rek.Saldo)}</span>
            </div>
        `).join('');
    }
    totalSaldoUtamaEl.innerText = formatCurrency(totalSaldo);

    const cashflowPemasukanEl = document.getElementById('cashflow-pemasukan');
    const cashflowPengeluaranEl = document.getElementById('cashflow-pengeluaran');
    const barPemasukanEl = document.getElementById('cashflow-bar-pemasukan');
    const barPengeluaranEl = document.getElementById('cashflow-bar-pengeluaran');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let pemasukanBulanIni = 0, pengeluaranBulanIni = 0;

    transactions.forEach(trx => {
        const jumlah = Number(trx.jumlah) || 0;
        const trxDate = new Date(trx.tanggal);
        if (isNaN(trxDate)) return;

        if (trxDate.getMonth() === currentMonth && trxDate.getFullYear() === currentYear) {
            if (trx.tipe === 'Pemasukan') {
                pemasukanBulanIni += jumlah;
            } else {
                pengeluaranBulanIni += jumlah;
            }
        }
    });

    cashflowPemasukanEl.innerText = formatCurrency(pemasukanBulanIni);
    cashflowPengeluaranEl.innerText = formatCurrency(pengeluaranBulanIni);

    const totalCashflow = pemasukanBulanIni + pengeluaranBulanIni;
    if (totalCashflow > 0) {
        barPemasukanEl.style.width = `${(pemasukanBulanIni / totalCashflow) * 100}%`;
        barPengeluaranEl.style.width = `${(pengeluaranBulanIni / totalCashflow) * 100}%`;
    } else {
        barPemasukanEl.style.width = '0%';
        barPengeluaranEl.style.width = '0%';
    }

    renderFinancialCalendar(transactions, now);
}


function displayAndCheckAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    grid.innerHTML = '';

    badgeDefinitions.forEach(badge => {
        const isUnlocked = badge.check(allTransactions, budgetData, goalsData);
        const card = document.createElement('div');
        card.className = 'badge-card';
        if (!isUnlocked) {
            card.classList.add('locked');
        }
        card.innerHTML = `
            <div class="badge-icon"><i class="fas ${badge.icon}"></i></div>
            <h3 class="badge-title">${badge.title}</h3>
            <p class="badge-description">${badge.description}</p>
        `;
        grid.appendChild(card);
    });
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ... Sisa fungsi-fungsi lain yang sudah ada ...
// (Saya salin dari file asli Anda agar tidak ada yang terlewat)

// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
function displaySettingsLists() {
    const budgetList = document.getElementById('budgetList');
    const goalList = document.getElementById('goalList');
    const rekeningList = document.getElementById('rekeningList');

    // Tampilkan Daftar Anggaran
    if (budgetList) {
        budgetList.innerHTML = '';
        if (Object.keys(budgetData).length > 0) {
            for (const kategori in budgetData) {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${kategori}</span>
                    <div class="list-item-details">
                        <strong>${formatCurrency(budgetData[kategori].amount)}</strong>
                        <div class="list-item-actions">
                            <button class="action-btn edit-budget-btn" data-kategori="${kategori}" data-amount="${budgetData[kategori].amount}"><i class="fas fa-pencil-alt"></i></button>
                            <button class="action-btn delete-budget-btn" data-kategori="${kategori}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                `;
                budgetList.appendChild(li);
            }
        } else {
            budgetList.innerHTML = '<li>Belum ada budget dibuat.</li>';
        }
    }

    // Tampilkan Daftar Tujuan
    if (goalList) {
        goalList.innerHTML = '';
        if (goalsData.length > 0) {
            goalsData.forEach(goal => {
                const li = document.createElement('li');
                // Simpan seluruh objek goal sebagai string JSON di data attribute
                li.innerHTML = `
                    <span>${goal.nama}</span>
                    <div class="list-item-details">
                        <strong>${formatCurrency(goal.target)}</strong>
                        <div class="list-item-actions">
                            <button class="action-btn edit-goal-btn" data-goal='${JSON.stringify(goal)}'><i class="fas fa-pencil-alt"></i></button>
                            <button class="action-btn delete-goal-btn" data-nama="${goal.nama}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                `;
                goalList.appendChild(li);
            });
        } else {
            goalList.innerHTML = '<li>Belum ada tujuan dibuat.</li>';
        }
    }
    
    // Tampilkan Daftar Rekening
    if (rekeningList) {
        rekeningList.innerHTML = '';
        if (rekeningData.length > 0) {
            rekeningData.forEach(rekening => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${rekening.Nama}</span>
                    <div class="list-item-details">
                         <strong>${formatCurrency(rekening.Saldo)}</strong>
                        <div class="list-item-actions">
                            <button class="action-btn edit-rekening-btn" data-nama="${rekening.Nama}"><i class="fas fa-pencil-alt"></i></button>
                            <button class="action-btn delete-rekening-btn" data-nama="${rekening.Nama}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                `;
                rekeningList.appendChild(li);
            });
        } else {
            rekeningList.innerHTML = '<li>Belum ada rekening dibuat.</li>';
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
        page.style.display = (page.id === pageId) ? 'block' : 'none';
    });
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

// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
// GANTI FUNGSI ANDA DENGAN VERSI BERSIH INI
function displayFullHistory(transactions) {
    const fullHistoryBody = document.getElementById('full-history-body');
    if (!fullHistoryBody) return;

    fullHistoryBody.innerHTML = '';

    if (transactions.length === 0) {
        fullHistoryBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Tidak ada transaksi yang cocok.</td></tr>';
        return;
    }

    transactions.forEach(trx => {
        const row = document.createElement('tr');
        const isIncome = trx.tipe === 'Pemasukan';
        
        const receiptIcon = trx.link_bukti 
            ? `<a href="${trx.link_bukti}" target="_blank" class="view-receipt-btn" title="Lihat Bukti"><i class="fas fa-paperclip"></i></a>` 
            : '';
        
        const transactionData = JSON.stringify(trx);

        row.innerHTML = `
            <td data-label="Tanggal">${new Date(trx.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</td>
            <td data-label="Kategori">${trx.kategori}</td>
            <td data-label="Deskripsi">${trx.deskripsi || '-'}</td>
            <td data-label="Jumlah" class="${isIncome ? 'jumlah-pemasukan' : 'jumlah-pengeluaran'}">
                ${formatCurrency(trx.jumlah)}
            </td>
            <td data-label="Aksi" class="actions-cell">
                ${receiptIcon}
                <button class="action-btn edit-btn" data-transaction='${transactionData}' title="Edit Transaksi">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="action-btn delete-btn" data-timestamp="${trx.timestamp}" title="Hapus Transaksi">
                    <i class="fas fa-trash-alt"></i>
                </button>
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

function renderFinancialCalendar(transactions, date) {
    const grid = document.getElementById('financial-calendar-grid');
    const monthYearEl = document.getElementById('calendar-month-year');
    if (!grid || !monthYearEl) return;

    grid.innerHTML = '';
    const month = date.getMonth();
    const year = date.getFullYear();

    monthYearEl.textContent = new Date(year, month).toLocaleDateString('id-ID', {
        month: 'long', year: 'numeric'
    });

    const monthlyTransactions = {};
    transactions.forEach(trx => {
        const trxDate = new Date(trx.tanggal);
        if(trxDate.getMonth() === month && trxDate.getFullYear() === year) {
            const day = trxDate.getDate();
            if(!monthlyTransactions[day]) {
                monthlyTransactions[day] = { income: false, expense: false };
            }
            if (trx.tipe === 'Pemasukan') monthlyTransactions[day].income = true;
            if (trx.tipe === 'Pengeluaran') monthlyTransactions[day].expense = true;
        }
    });

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        grid.innerHTML += `<div class="calendar-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        let dotsHtml = '';
        if (monthlyTransactions[day]) {
            dotsHtml += '<div class="dots-wrapper">';
            if (monthlyTransactions[day].income) {
                dotsHtml += '<div class="dot income"></div>';
            }
            if (monthlyTransactions[day].expense) {
                dotsHtml += '<div class="dot expense"></div>';
            }
            dotsHtml += '</div>';
        }
        grid.innerHTML += `<div class="calendar-day">${day}${dotsHtml}</div>`;
    }
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
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { callback: function(value) {
                if (value >= 1e9) return 'Rp ' + (value / 1e9).toLocaleString('id-ID') + ' M';
                if (value >= 1e6) return 'Rp ' + (value / 1e6).toLocaleString('id-ID') + ' Jt';
                if (value >= 1e3) return 'Rp ' + (value / 1e3).toLocaleString('id-ID') + ' Rb';
                return 'Rp ' + value;
            }}}},
            plugins: {
                tooltip: { callbacks: { label: context => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}` } },
                legend: { position: isMobile ? 'bottom' : 'top' }
            }
        }
    });
}

// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
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

    const budgetEntries = Object.entries(budgetData);

    budgetEntries.forEach(([kategori, budgetAmountValue], index) => {
        const budgetAmount = Number(budgetAmountValue) || 0;
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
            <div class="progress-bar-container"><div class="progress-bar ${pClass}" style="width: 0%;"></div></div>
        `;
        budgetContainer.appendChild(card);

        const progressBar = card.querySelector('.progress-bar');
        setTimeout(() => {
            progressBar.style.width = `${Math.min(percentage, 100)}%`;
        }, 100 * (index + 1));
    });
}

// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
function displayGoals() {
    const goalsContainer = document.getElementById('goals-container');
    if (!goalsContainer) return;
    goalsContainer.innerHTML = '';
    if (goalsData.length === 0) {
        goalsContainer.innerHTML = '<div class="card"><p>Belum ada tujuan yang dibuat. Buat di halaman Pengaturan.</p></div>';
        return;
    }
    goalsData.forEach((goal, index) => {
        const targetAmount = Number(goal.target) || 0;
        const savedAmount = Number(goal.terkumpul) || 0;
        const percentage = targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0;
        
        const card = document.createElement('div');
        card.className = 'card goal-card';
        card.innerHTML = `
            <h3>${goal.nama}</h3>
            <div class="goal-card-amount"><strong>${formatCurrency(savedAmount)}</strong> / ${formatCurrency(targetAmount)}</div>
            <div class="progress-bar-container"><div class="progress-bar" style="width: 0%;"></div></div>
            <p>${Math.round(percentage)}% tercapai</p>
        `;
        goalsContainer.appendChild(card);

        const progressBar = card.querySelector('.progress-bar');
        setTimeout(() => {
            progressBar.style.width = `${Math.min(percentage, 100)}%`;
        }, 100 * (index + 1));
    });
}
/**
 * ======================================================
 * !!! FUNGSI BARU UNTUK MEMBERI SARAN KATEGORI OTOMATIS !!!
 * ======================================================
 */
function handleDescriptionInput(e) {
    const deskripsi = e.target.value.toLowerCase();
    const kategoriInput = document.getElementById('kategori');
    const keywords = deskripsi.split(' ');

    // Cari dari kata terakhir untuk saran yang lebih relevan
    for (let i = keywords.length - 1; i >= 0; i--) {
        const keyword = keywords[i];
        if (categoryMemory[keyword]) {
            kategoriInput.value = categoryMemory[keyword];
            // Beri sedikit efek visual bahwa ini adalah saran
            kategoriInput.style.backgroundColor = '#f0eaf7'; 
            setTimeout(() => {
                kategoriInput.style.backgroundColor = '';
            }, 1000);
            return; // Hentikan setelah menemukan saran pertama
        }
    }
}

// Tambahkan fungsi baru ini di mana saja di script.js
/**
 * ======================================================
 * !!! FUNGSI BARU UNTUK MEMFILTER DAN MERENDER ULANG LAPORAN !!!
 * ======================================================
 */
function updateReportView() {
    const filterValue = document.getElementById('reportDateFilter').value;
    const now = new Date();
    let startDate = new Date();
    
    // Tentukan rentang tanggal berdasarkan pilihan filter
    switch (filterValue) {
        case 'last_month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            break;
        case 'last_3_months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            break;
        case 'all_time':
            // Gunakan tanggal yang sangat lampau untuk mencakup semua data
            startDate = new Date(1970, 0, 1); 
            break;
        case 'this_month':
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
    }

    // Filter transaksi berdasarkan rentang tanggal
    const filteredTransactions = allTransactions.filter(trx => {
        const trxDate = new Date(trx.tanggal);
        return trxDate >= startDate;
    });

    // Render ulang chart dengan data yang sudah difilter
    renderReportCharts(filteredTransactions);
}

// !!! KUMPULAN FUNGSI BARU UNTUK EDIT & HAPUS !!!

/**
 * Membuka modal edit dan mengisinya dengan data transaksi yang ada.
 */
function openEditModal(transaction) {
    // Isi form di modal edit dengan data yang ada
    document.getElementById('edit-timestamp').value = transaction.timestamp;
    document.getElementById('edit-tanggal').value = new Date(transaction.tanggal).toISOString().split('T')[0];
    document.getElementById('edit-jumlah').value = new Intl.NumberFormat('id-ID').format(transaction.jumlah);
    document.getElementById('edit-tipe').value = transaction.tipe;
    document.getElementById('edit-kategori').value = transaction.kategori;
    document.getElementById('edit-deskripsi').value = transaction.deskripsi;
    
    // Atur dropdown rekening
    const rekeningSelect = document.getElementById('edit-rekening');
    rekeningSelect.innerHTML = document.getElementById('rekening').innerHTML; // Salin opsi dari modal tambah
    rekeningSelect.value = transaction.rekening;

    // Tampilkan modal
    document.getElementById('edit-transaction-modal').classList.add('is-open');
}

/**
 * Menangani permintaan penghapusan transaksi.
 */
// VERSI BARU DARI handleDeleteTransaction DENGAN MODAL KUSTOM
// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
async function handleDeleteTransaction(timestamp) {
    const confirmed = await showCustomConfirm('Apakah Anda yakin ingin menghapus transaksi ini? Aksi ini tidak dapat dibatalkan.');
    if (!confirmed) return;
    
    showLoading();
    
    const data = { type: 'delete_transaction', payload: { timestamp: timestamp } };
    sendData(data).then(res => {
        if (res.result === 'success') {
            // "Titipkan" pesan sukses ke loadDashboardData
            loadDashboardData('✅ Transaksi berhasil dihapus!');
        } else {
            showNotification(`❌ Gagal menghapus: ${res.error}`, 'error');
            hideLoading();
        }
    });
}

// FUNGSI BARU UNTUK MENAMPILKAN DIALOG KONFIRMASI KUSTOM
// GANTI FUNGSI LAMA DENGAN VERSI BARU YANG LEBIH SINKRON INI
function showCustomConfirm(message) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirm-modal');
        const messageEl = document.getElementById('confirm-modal-text');
        const confirmBtn = document.getElementById('confirm-modal-confirm-btn');
        const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
        
        // Durasi animasi (harus sama dengan yang ada di CSS, yaitu 0.3s)
        const animationDuration = 300;

        messageEl.textContent = message;
        modal.classList.add('is-open');

        // Buat fungsi kecil untuk menangani penutupan modal
        // agar tidak mengulang kode yang sama
        const handleClose = (value) => {
            modal.classList.remove('is-open');
            // Tunggu animasi selesai, BARU resolve promise-nya
            setTimeout(() => {
                resolve(value);
            }, animationDuration);
        };

        // Gunakan { once: true } agar event listener otomatis dihapus setelah sekali klik
        // Ini praktik yang baik untuk mencegah kebocoran memori (memory leak)
        confirmBtn.addEventListener('click', () => handleClose(true), { once: true });
        cancelBtn.addEventListener('click', () => handleClose(false), { once: true });
    });
}

/**
 * Menangani submit dari form edit.
 */
// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
function handleEditFormSubmit(e) {
    e.preventDefault();
    showLoading();
    const submitButton = document.getElementById('submitEditButton');

    const dataBaru = {
        tanggal: document.getElementById('edit-tanggal').value,
        jumlah: document.getElementById('edit-jumlah').value.replace(/\D/g, ''),
        tipe: document.getElementById('edit-tipe').value,
        rekening: document.getElementById('edit-rekening').value,
        kategori: document.getElementById('edit-kategori').value,
        deskripsi: document.getElementById('edit-deskripsi').value,
    };
    
    const timestamp = document.getElementById('edit-timestamp').value;
    const data = { type: 'edit_transaction', payload: { timestamp: timestamp, dataBaru: dataBaru } };
    
    sendData(data, submitButton).then(res => {
        if (res.result === 'success') {
            document.getElementById('edit-transaction-modal').classList.remove('is-open');
            // "Titipkan" pesan sukses ke loadDashboardData
            loadDashboardData('✅ Perubahan berhasil disimpan!');
        } else {
            showNotification(`❌ Gagal menyimpan: ${res.error}`, 'error');
            hideLoading();
        }
    });
}

// !!! KUMPULAN FUNGSI BARU UNTUK KELOLA ANGGARAN, TUJUAN, REKENING !!!

// --- ANGGARAN ---
async function handleDeleteBudget(kategori) {
    const confirmed = await showCustomConfirm(`Yakin ingin menghapus anggaran untuk "${kategori}"?`);
    if (!confirmed) return;
    showLoading();
    const data = { type: 'delete_budget', payload: { kategori } };
    try {
        const res = await sendData(data);
        if (res.result === 'success') await loadDashboardData('✅ Anggaran berhasil dihapus!');
        else { showNotification(`❌ Gagal: ${res.error}`, 'error'); hideLoading(); }
    } catch (err) { showNotification(`❌ Error: ${err.message}`, 'error'); hideLoading(); }
}

function openEditBudgetModal(kategori, amount) {
    document.getElementById('edit-budget-old-kategori').value = kategori;
    document.getElementById('edit-budget-kategori').value = kategori;
    document.getElementById('edit-budget-amount').value = new Intl.NumberFormat('id-ID').format(amount);
    document.getElementById('edit-budget-modal').classList.add('is-open');
}

async function handleEditBudgetSubmit(e) {
    e.preventDefault();
    showLoading();
    const modal = document.getElementById('edit-budget-modal');
    const payload = {
        oldKategori: document.getElementById('edit-budget-old-kategori').value,
        newKategori: document.getElementById('edit-budget-kategori').value,
        newBudget: document.getElementById('edit-budget-amount').value.replace(/\D/g, '')
    };
    const data = { type: 'edit_budget', payload };
    try {
        const res = await sendData(data);
        if (res.result === 'success') {
            modal.classList.remove('is-open');
            await loadDashboardData('✅ Anggaran berhasil diperbarui!');
        } else { showNotification(`❌ Gagal: ${res.error}`, 'error'); hideLoading(); }
    } catch (err) { showNotification(`❌ Error: ${err.message}`, 'error'); hideLoading(); }
}

// --- TUJUAN ---
async function handleDeleteGoal(nama) {
    const confirmed = await showCustomConfirm(`Yakin ingin menghapus tujuan "${nama}"?`);
    if (!confirmed) return;
    showLoading();
    const data = { type: 'delete_goal', payload: { nama } };
    try {
        const res = await sendData(data);
        if (res.result === 'success') await loadDashboardData('✅ Tujuan berhasil dihapus!');
        else { showNotification(`❌ Gagal: ${res.error}`, 'error'); hideLoading(); }
    } catch (err) { showNotification(`❌ Error: ${err.message}`, 'error'); hideLoading(); }
}

function openEditGoalModal(goal) {
    document.getElementById('edit-goal-old-name').value = goal.nama;
    document.getElementById('edit-goal-name').value = goal.nama;
    document.getElementById('edit-goal-target').value = new Intl.NumberFormat('id-ID').format(goal.target);
    document.getElementById('edit-goal-terkumpul').value = new Intl.NumberFormat('id-ID').format(goal.terkumpul);
    document.getElementById('edit-goal-modal').classList.add('is-open');
}

async function handleEditGoalSubmit(e) {
    e.preventDefault();
    showLoading();
    const modal = document.getElementById('edit-goal-modal');
    const payload = {
        oldName: document.getElementById('edit-goal-old-name').value,
        newName: document.getElementById('edit-goal-name').value,
        newTarget: document.getElementById('edit-goal-target').value.replace(/\D/g, ''),
        newTerkumpul: document.getElementById('edit-goal-terkumpul').value.replace(/\D/g, '')
    };
    const data = { type: 'edit_goal', payload };
    try {
        const res = await sendData(data);
        if (res.result === 'success') {
            modal.classList.remove('is-open');
            await loadDashboardData('✅ Tujuan berhasil diperbarui!');
        } else { showNotification(`❌ Gagal: ${res.error}`, 'error'); hideLoading(); }
    } catch (err) { showNotification(`❌ Error: ${err.message}`, 'error'); hideLoading(); }
}

// --- REKENING ---
async function handleAddRekening(e) {
    e.preventDefault();
    showLoading();
    const form = e.target;
    const payload = {
        nama: document.getElementById('rekeningName').value,
        saldoAwal: document.getElementById('rekeningInitialBalance').value.replace(/\D/g, '')
    };
    const data = { type: 'add_rekening', payload };
    try {
        const res = await sendData(data);
        if (res.result === 'success') {
            form.reset();
            await loadDashboardData('✅ Rekening berhasil ditambahkan!');
        } else { showNotification(`❌ Gagal: ${res.error}`, 'error'); hideLoading(); }
    } catch (err) { showNotification(`❌ Error: ${err.message}`, 'error'); hideLoading(); }
}

async function handleDeleteRekening(nama) {
    const confirmed = await showCustomConfirm(`Yakin ingin menghapus rekening "${nama}"? Pastikan tidak ada transaksi yang terkait.`);
    if (!confirmed) return;
    showLoading();
    const data = { type: 'delete_rekening', payload: { nama } };
    try {
        const res = await sendData(data);
        if (res.result === 'success') await loadDashboardData('✅ Rekening berhasil dihapus!');
        else { showNotification(`❌ Gagal: ${res.error}`, 'error'); hideLoading(); }
    } catch (err) { showNotification(`❌ Error: ${err.message}`, 'error'); hideLoading(); }
}

function openEditRekeningModal(nama) {
    document.getElementById('edit-rekening-old-name').value = nama;
    document.getElementById('edit-rekening-new-name').value = nama;
    document.getElementById('edit-rekening-modal').classList.add('is-open');
}

async function handleEditRekeningSubmit(e) {
    e.preventDefault();
    showLoading();
    const modal = document.getElementById('edit-rekening-modal');
    const payload = {
        oldName: document.getElementById('edit-rekening-old-name').value,
        newName: document.getElementById('edit-rekening-new-name').value
    };
    const data = { type: 'edit_rekening', payload };
    try {
        const res = await sendData(data);
        if (res.result === 'success') {
            modal.classList.remove('is-open');
            await loadDashboardData('✅ Nama rekening berhasil diperbarui!');
        } else { showNotification(`❌ Gagal: ${res.error}`, 'error'); hideLoading(); }
    } catch (err) { showNotification(`❌ Error: ${err.message}`, 'error'); hideLoading(); }
}