// utils.js

/**
 * Mengubah string waktu yang dapat dibaca manusia (misal: "1 jam 30 menit") menjadi milidetik.
 * @param {string|number} timeInput - Input waktu dalam format string (e.g., "2 jam 5 menit") atau angka (milidetik).
 * @returns {number} Waktu total dalam milidetik. Mengembalikan 0 jika input tidak valid.
 */
function parseHumanTime(timeInput) {
    if (typeof timeInput === 'number') {
        return timeInput;
    }
    if (typeof timeInput !== 'string' || !timeInput) {
        return 0;
    }

    let totalMilliseconds = 0;
    const s = timeInput.toLowerCase();

    const hourMatch = s.match(/(\d+)\s*jam/);
    if (hourMatch) {
        totalMilliseconds += parseInt(hourMatch[1], 10) * 3600000;
    }

    const minuteMatch = s.match(/(\d+)\s*menit/);
    if (minuteMatch) {
        totalMilliseconds += parseInt(minuteMatch[1], 10) * 60000;
    }

    const secondMatch = s.match(/(\d+)\s*detik/);
    if (secondMatch) {
        totalMilliseconds += parseInt(secondMatch[1], 10) * 1000;
    }

    return totalMilliseconds;
}

/**
 * Mendapatkan integer acak antara nilai min dan max (inklusif).
 * @param {number} min - Batas bawah rentang (inklusif).
 * @param {number} max - Batas atas rentang (inklusif).
 * @returns {number} Integer acak yang dihasilkan.
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Menjeda eksekusi (tidur) selama durasi tertentu dalam milidetik.
 * @param {number} ms - Jumlah milidetik untuk jeda.
 * @returns {Promise<void>} Sebuah Promise yang selesai setelah jeda waktu.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Memformat angka menjadi string yang mudah dibaca dengan pemisah ribuan.
 * @param {number|string|undefined|null} num - Angka yang akan diformat.
 * @returns {string} String angka yang telah diformat. Mengembalikan '0' jika input tidak valid.
 */
function formatNumber(num) {
    if (num === undefined || num === null) {
        return '0';
    }

    const numericValue = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;

    if (isNaN(numericValue)) {
        return '0';
    }
    
    return numericValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 18 // Memberikan presisi tinggi untuk angka desimal
    });
}

// Mengekspor semua fungsi agar bisa digunakan di file lain
module.exports = {
    parseHumanTime,
    getRandomInt,
    sleep,
    formatNumber
};
