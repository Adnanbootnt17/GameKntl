// --- DEPENDENSI ---
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const ethers = require('ethers'); // Ethers masih dibutuhkan untuk wallet di Bot
const { SiweMessage } = require('siwe'); // SIWE tidak lagi dibutuhkan langsung di sini

// IMPORT FUNGSI GENERATOR TOKEN DARI FILE TERPISAH
const { generateAuthTokens } = require('./token'); // <--- PENTING: PASTIKAN tokenGenerator.js ADA

// --- KONFIGURASI & LOGGER ---
const colors = { reset: "\x1b[0m", cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", white: "\x1b[37m", bold: "\x1b[1m" };
const logger = { info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`), warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`), error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`), success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`), loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`), step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`), banner: () => { console.log(`${colors.cyan}${colors.bold}`); console.log(`---------------------------------------------`); console.log(`   Craft World Auto Bot - Final Version `); console.log(`---------------------------------------------${colors.reset}`); console.log(); } };

const USER_AGENTS = [
    { "sec-ch-ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"', "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": '"Windows"' },
    { "sec-ch-ua": '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24"', "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": '"Windows"' },
    { "sec-ch-ua": '"Brave";v="137", "Chromium";v="137", "Not/A)Brand";v="24"', "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": '"Windows"' }
];

// --- FUNGSI HELPER ---
async function readConfig() { try { const data = await fs.readFile('config.json', 'utf8'); return JSON.parse(data.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*)/g, (m, g) => g ? "" : m)); } catch (error) { logger.error('Error reading config.json: ' + error.message); return {}; } }
async function readPrivateKeys() { try { const data = await fs.readFile('pk.txt', 'utf8'); return data.split(/[\r\n]+/).map(pk => pk.trim()).filter(pk => pk.length > 0 && pk.startsWith('0x')); } catch (error) { logger.error('Error reading pk.txt: ' + error.message); return []; } }
function parseHumanTime(timeInput) { if (typeof timeInput === 'number') return timeInput; if (typeof timeInput !== 'string' || !timeInput) return 0; let totalMilliseconds = 0; const s = timeInput.toLowerCase(); const hourMatch = s.match(/(\d+)\s*jam/); if (hourMatch) totalMilliseconds += parseInt(hourMatch[1], 10) * 3600000; const minuteMatch = s.match(/(\d+)\s*menit/); if (minuteMatch) totalMilliseconds += parseInt(minuteMatch[1], 10) * 60000; const secondMatch = s.match(/(\d+)\s*detik/); if (secondMatch) totalMilliseconds += parseInt(secondMatch[1], 10) * 1000; return totalMilliseconds; }
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }


// --- BAGIAN GENERATOR TOKEN INTERNAL (Diambil dari tokenGenerator.js) ---
async function _internalGenerateToken(privateKey, accId) {
    logger.loading(`[Acc ${accId}] Menjalankan generator token internal...`);
    // Memanggil fungsi generateAuthTokens dari modul tokenGenerator.js
    const token = await generateAuthTokens(privateKey);
    if (token) {
        logger.success(`[Acc ${accId}] Token baru berhasil dibuat.`);
        return token;
    } else {
        logger.error(`[Acc ${accId}] Gagal membuat token baru secara internal.`);
        return null;
    }
}
// --- AKHIR BAGIAN GENERATOR TOKEN ---


// --- KELAS UTAMA BOT ---
class CraftWorldBot {
    constructor(accountIndex, privateKey) {
        this.accountIndex = accountIndex;
        this.privateKey = privateKey;
        this.authToken = null;
        this.isRunning = false;
        this.baseApiUrl = 'https://preview.craft-world.gg/api/1/user-actions/ingest';
        this.graphqlUrl = 'https://preview.craft-world.gg/graphql';
        this.pendingAreaClaims = {};
        this.claimScheduler = [];
        this.accountState = null;
        this.mineClaimFailures = 0;
        this.pendingStartQueue = [];
        const randomUa = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        this.baseHeaders = {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.7",
            "content-type": "application/json",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "sec-gpc": "1",
            "x-app-version": "0.33.9",
            "Referer": "https://preview.craft-world.gg/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            ...randomUa
        };
        // Perhatikan: Header spesifik UnitySDK/Firebase App Check dari tokenGenerator.js
        // mungkin juga perlu ditambahkan ke baseHeaders ini jika endpoint API game lainnya membutuhkannya.
        // Untuk saat ini, kita mengasumsikan makeApiRequest di sini akan menanganinya
        // berdasarkan kebutuhan endpoint. Jika ada masalah 401/403 di API selain login,
        // pertimbangkan untuk menyinkronkan header lebih lanjut.
    }
    
    async refreshToken() {
        const accId = this.accountIndex + 1;
        logger.loading(`[Acc ${accId}] Menjalankan generator token internal...`);
        const token = await _internalGenerateToken(this.privateKey, accId);
        if (token) {
            logger.success(`[Acc ${accId}] Token baru berhasil dibuat.`);
            this.setAuthToken(token);
            return true;
        } else {
            logger.error(`[Acc ${accId}] Gagal membuat token baru secara internal.`);
            return false;
        }
    }

    setAuthToken(token) { this.authToken = `Bearer jwt_${token}`; }
    
    async makeApiRequest(method, url, data = null, customHeaders = {}) {
        if (!this.authToken) { return { error: true, message: "No auth token" }; }
        try {
            const headers = { ...this.baseHeaders, authorization: this.authToken, ...customHeaders };
            // Jika ada endpoint lain yang memerlukan X-firebase-appcheck,
            // Anda bisa menambahkannya di sini juga, misalnya:
            // headers['X-firebase-appcheck'] = require('./tokenGenerator').X_FIREBASE_APPCHECK_TOKEN;

            const requestConfig = { method, url, headers, data };
            const response = await axios(requestConfig);
            return response.data;
        } catch (error) {
            const status = error.response ? error.response.status : null;
            if ((status === 401 || status === 403)) {
                logger.warn(`[Acc ${this.accountIndex + 1}] Token tidak valid (Error ${status}). Mencoba refresh...`);
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    logger.info(`[Acc ${this.accountIndex + 1}] Token berhasil di-refresh, mencoba ulang permintaan...`);
                    return this.makeApiRequest(method, url, data, customHeaders);
                }
            }
            logger.error(`[Acc ${this.accountIndex + 1}] API Request Gagal: Status: ${status || 'N/A'}`);
            return { error: true, status: status, data: error.response?.data };
        }
    }
    generateActionId() { return uuidv4(); }
    formatNumber(num) { return (num === undefined || num === null) ? '0' : num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
    getResourceEmoji(symbol) { const emojiMap = {'EARTH':'🌍','WATER':'💧','FIRE':'🔥','MUD':'🟤','CLAY':'🧱','SAND':'🏖️','COPPER':'🟠','SEAWATER':'🌊','HEAT':'🌡️','ALGAE':'🌿','LAVA':'🌋','CERAMICS':'🏺','STEEL':'⚙️','OXYGEN':'💨','GLASS':'🪟','GAS':'💨','STONE':'🪨','STEAM':'♨️','SCREWS':'🔩','FUEL':'⛽','CEMENT':'🏗️','OIL':'🛢️','ACID':'🧪','SULFUR':'💛','PLASTICS':'♻️','FIBERGLASS':'🧵','ENERGY':'⚡','HYDROGEN':'💨','DYNAMITE':'💥','COIN':'🪙'}; return emojiMap[symbol] || '📦'; }
    _updateAccountState(accountData) { if (accountData) { this.accountState = accountData; } }
    _hasEnoughResources(cost) { if (!cost) return true; if (!this.accountState || !this.accountState.resources) { logger.warn(`[Acc ${this.accountIndex + 1}] Tidak bisa memeriksa sumber daya, saldo tidak diketahui. Mengasumsikan cukup.`); return true; } for (const resourceSymbol in cost) { const requiredAmount = cost[resourceSymbol]; const currentResource = this.accountState.resources.find(r => r.symbol === resourceSymbol); const currentAmount = currentResource ? currentResource.amount : 0; if (currentAmount < requiredAmount) { logger.warn(`[Acc ${this.accountIndex + 1}] Sumber daya kurang untuk ${resourceSymbol}. Butuh: ${this.formatNumber(requiredAmount)}, Punya: ${this.formatNumber(currentAmount)}`); return false; } } return true; }
    _spendResources(cost) { if (!cost || !this.accountState || !this.accountState.resources) return; for (const resourceSymbol in cost) { const spentAmount = cost[resourceSymbol]; const resourceIndex = this.accountState.resources.findIndex(r => r.symbol === resourceSymbol); if (resourceIndex !== -1) { this.accountState.resources[resourceIndex].amount -= spentAmount; } } }
    _logSpentResources(cost) { if (!cost || !this.accountState) return; for (const resourceSymbol in cost) { const currentResource = this.accountState.resources.find(r => r.symbol === resourceSymbol); const remainingAmount = currentResource ? currentResource.amount : 0; logger.info(`[Acc ${this.accountIndex + 1}] Sumber daya ${resourceSymbol} digunakan. Sisa: ${this.formatNumber(remainingAmount)}`); } }
    async _checkPendingStarts() { if (this.pendingStartQueue.length === 0) return; logger.info(`[Acc ${this.accountIndex + 1}] Memeriksa daftar tunggu pabrik (${this.pendingStartQueue.length} tertunda)...`); const stillPending = []; for (const task of this.pendingStartQueue) { if (this._hasEnoughResources(task.taskConfig.inputCost)) { logger.success(`[Acc ${this.accountIndex + 1}] Sumber daya cukup untuk "${task.taskConfig.name}"! Mencoba start...`); const started = await this.startFactory(task.taskConfig); if (started) { this._spendResources(task.taskConfig.inputCost); this._logSpentResources(task.taskConfig.inputCost); this.scheduleTask(task); } else { stillPending.push(task); } } else { stillPending.push(task); } } this.pendingStartQueue = stillPending; }
    displayResourceInfo(account) { this._updateAccountState(account); if (!account) { logger.warn(`Acc ${this.accountIndex + 1}: No account data to display info.`); return; } logger.step(`=== RESOURCE INFO (Acc ${this.accountIndex + 1}) ===`); logger.info(`⚡  Power: ${this.formatNumber(account.power)} (Refill: ${account.powerMillisecondsUntilRefill ? Math.ceil(account.powerMillisecondsUntilRefill / 60000) + 'm' : 'N/A'})`); logger.info(`🌟 XP: ${this.formatNumber(account.experiencePoints)}`); logger.info(`💰 Skill Points: ${this.formatNumber(account.skillPoints)}`); logger.info(`🏦 Wallet: ${account.walletAddress || 'N/A'}`); logger.step('Resources:'); if (account.resources && Array.isArray(account.resources)) { const availableResources = account.resources.filter(r => r.amount > 0); if (availableResources.length > 0) { availableResources.forEach(r => logger.info(`${this.getResourceEmoji(r.symbol)} ${r.symbol}: ${this.formatNumber(r.amount)}`)); } else { logger.info('No resources available.'); } } this._checkPendingStarts(); }
    async displayInitialBalance() { logger.loading(`[Acc ${this.accountIndex + 1}] Mengambil info saldo awal...`); const response = await this.makeApiRequest('POST', this.baseApiUrl, { data: [] }); if (response && !response.error && response.data.account) { this.displayResourceInfo(response.data.account); } else { logger.warn(`[Acc ${this.accountIndex + 1}] Gagal mendapatkan saldo awal.`); } }
    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    async startFactory(factoryConfig) { const { factoryId, recipeId, name } = factoryConfig; const actionPayload = { factoryId }; if (recipeId) actionPayload.recipeId = recipeId; logger.loading(`[Acc ${this.accountIndex + 1}] Memulai pabrik "${name}"...`); const actionId = this.generateActionId(); const payload = [{ id: actionId, actionType: "START_FACTORY", payload: actionPayload, time: Date.now() }]; const response = await this.makeApiRequest('POST', this.baseApiUrl, { data: payload }); if (response && !response.error && response.data?.processed?.includes(actionId)) { logger.success(`[Acc ${this.accountIndex + 1}] Aksi pabrik "${name}" berhasil.`); return true; } logger.error(`[Acc ${this.accountIndex + 1}] Aksi pabrik "${name}" gagal.`); return false; }
    async startMine(mineConfig) { const { mineId, name } = mineConfig; logger.loading(`[Acc ${this.accountIndex + 1}] Memulai ${name}...`); const actionId = this.generateActionId(); const payload = [{ id: actionId, actionType: "START_MINE", payload: { mineId }, time: Date.now() }]; const response = await this.makeApiRequest('POST', this.baseApiUrl, { data: payload }); if (response && !response.error) { this._updateAccountState(response.data.account); logger.success(`[Acc ${this.accountIndex + 1}] ${name} berhasil dimulai.`); return true; } else if (response.error && response.status === 500) { logger.warn(`[Acc ${this.accountIndex + 1}] Gagal memulai ${name} (Error 500), menganggap sudah berjalan.`); return true; } logger.error(`[Acc ${this.accountIndex + 1}] Gagal total memulai ${name}.`); return false; }
    async claimMine(mineConfig) { const { mineId, name } = mineConfig; logger.loading(`[Acc ${this.accountIndex + 1}] Mencoba klaim dari ${name}...`); const actionId = this.generateActionId(); const payload = [{ id: actionId, actionType: "CLAIM_MINE", payload: { mineId }, time: Date.now() }]; const response = await this.makeApiRequest('POST', this.baseApiUrl, { data: payload }); if (response && !response.error) { logger.success(`[Acc ${this.accountIndex + 1}] Berhasil klaim dari ${name}.`); this.displayResourceInfo(response.data.account); return true; } logger.error(`[Acc ${this.accountIndex + 1}] Gagal klaim dari ${name}.`); return false; }
    async _emergencyClaim(resourceSymbol) { if (!this.accountConfig.resourceSources) { logger.warn(`[Acc ${this.accountIndex + 1}] Peta 'resourceSources' tidak ditemukan di config.`); return false; } const source = this.accountConfig.resourceSources[resourceSymbol]; if (!source) { logger.warn(`[Acc ${this.accountIndex + 1}] Tidak ditemukan sumber untuk ${resourceSymbol} di 'resourceSources'.`); return false; } logger.info(`[Acc ${this.accountIndex + 1}] Mencoba klaim darurat untuk ${resourceSymbol} dari sumber: ${source}`); if (source === 'TAMBANG_UTAMA') { return await this.claimMine(this.mineConfig); } else { const actionId = this.generateActionId(); const payload = [{ id: actionId, actionType: "CLAIM_AREA", payload: { areaId: source, amountToClaim: 1 }, time: Date.now() }]; const response = await this.makeApiRequest('POST', this.baseApiUrl, { data: payload }); if (response && !response.error) { logger.success(`[Acc ${this.accountIndex + 1}] Klaim darurat area ${source} berhasil.`); this.displayResourceInfo(response.data.account); return true; } logger.error(`[Acc ${this.accountIndex + 1}] Klaim darurat area ${source} gagal.`); return false; } }
    async _executeTrade(rule) { const { sell, buy, leaveAmount, sellAbove } = rule; const resource = this.accountState.resources.find(r => r.symbol === sell); const balance = resource ? resource.amount : 0; if (balance <= sellAbove) return; let amountToSell = balance - leaveAmount; if (amountToSell <= 0) return; logger.info(`[Acc ${this.accountIndex + 1}] Aturan trading terpenuhi: Jual ${this.formatNumber(amountToSell)} ${sell} untuk ${buy}`); const query = "mutation ExecuteTrade($quote: QuoteInput!) { executeTrade(quote: $quote) { tradeExecution { id errorReason } } }"; const variables = { quote: { type: "EXACT_INPUT", input: { symbol: sell, amount: amountToSell }, output: { symbol: buy } } }; const response = await this.makeApiRequest('POST', this.graphqlUrl, { query, variables }); if (response && !response.error && response.data?.executeTrade?.tradeExecution) { const exec = response.data.executeTrade.tradeExecution; if (exec.errorReason) { logger.error(`[Acc ${this.accountIndex + 1}] Gagal trade: ${exec.errorReason}`); return; } logger.success(`[Acc ${this.accountIndex + 1}] Trade berhasil dimulai. ID Transaksi: ${exec.id}`); await this._checkTradeStatus(exec.id); } else { logger.error(`[Acc ${this.accountIndex + 1}] Gagal mengirim permintaan trade.`); } }
    async _checkTradeStatus(tradeId) { const waitDuration = this.tradingConfig.tradeCheckWait || "2 menit"; const waitMilliseconds = parseHumanTime(waitDuration); if (waitMilliseconds <= 0) { logger.warn(`[Acc ${this.accountIndex + 1}] tradeCheckWait tidak valid, pengecekan dibatalkan.`); return; } logger.loading(`[Acc ${this.accountIndex + 1}] Transaksi dikirim. Akan memeriksa status setelah ${waitDuration}...`); await this.sleep(waitMilliseconds); logger.loading(`[Acc ${this.accountIndex + 1}] Memeriksa status transaksi ${tradeId}...`); const query = `query tradeExecutionById($id: ID!) { account { tradeExecutionById(id: $id) { trade { transaction { hash } output { symbol amount } } } } }`; const variables = { id: tradeId }; const url = `${this.graphqlUrl}?query=${encodeURIComponent(query)}&variables=${encodeURIComponent(JSON.stringify(variables))}`; const response = await this.makeApiRequest('GET', url); if (response && !response.error && response.data?.account?.tradeExecutionById?.trade) { const trade = response.data.account.tradeExecutionById.trade; logger.success(`[Acc ${this.accountIndex + 1}] Transaksi ${tradeId} Selesai! Mendapatkan ${this.formatNumber(trade.output.amount)} ${trade.output.symbol}`); await this.displayInitialBalance(); } else { logger.error(`[Acc ${this.accountIndex + 1}] Gagal memverifikasi status transaksi ${tradeId} setelah menunggu. Silakan cek manual.`); } }
    async _handleTrading() { if (!this.tradingConfig || !this.tradingConfig.enabled || !this.accountState) { this.scheduleTask({ taskConfig: { name: "Pengecekan Trading", type: 'trading_check', cooldown: this.tradingConfig?.checkInterval || '15 menit' } }); return; } logger.step(`[Acc ${this.accountIndex + 1}] Memeriksa aturan trading...`); for (const rule of this.tradingConfig.rules) { await this._executeTrade(rule); } this.scheduleTask({ taskConfig: { name: "Pengecekan Trading", type: 'trading_check', cooldown: this.tradingConfig.checkInterval } }); }
    
    scheduleTask(task) {
        const { taskConfig } = task;
        let cooldown;
        if (taskConfig.type === 'periodic_claim') cooldown = this.mineConfig.claimInterval;
        else if (taskConfig.type === 'mine_restart') cooldown = this.mineConfig.fullDuration;
        else cooldown = taskConfig.cooldown;

        let sleepTime;
        if (Array.isArray(cooldown)) {
            const min = parseHumanTime(cooldown[0]);
            const max = parseHumanTime(cooldown[1]);
            sleepTime = max > min ? getRandomInt(min, max) : min;
        } else {
            sleepTime = parseHumanTime(cooldown);
        }

        if (sleepTime > 0) {
            task.dueTime = Date.now() + sleepTime;
            this.claimScheduler.push(task);
            const d = new Date(task.dueTime);
            const timeString = d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            logger.info(`[Acc ${this.accountIndex + 1}] Tugas "${taskConfig.name}" (${taskConfig.type}) dijadwalkan pada ${timeString} (WIB)`);
        }
    }

    async executeTask(task) {
        const { taskConfig } = task;
        const { type, name: taskName } = taskConfig;
        logger.step(`[Acc ${this.accountIndex + 1}] MENJALANKAN TUGAS: ${type} untuk "${taskName}"`);

        if (type === 'periodic_claim') {
            const claimSuccess = await this.claimMine(this.mineConfig);
            if (claimSuccess) { this.mineClaimFailures = 0; } else { this.mineClaimFailures++; logger.warn(`[Acc ${this.accountIndex + 1}] Klaim tambang gagal. Kegagalan beruntun: ${this.mineClaimFailures} dari 3.`); }
            if (this.mineClaimFailures >= 3) { logger.error(`[Acc ${this.accountIndex + 1}] Klaim tambang telah gagal 3 kali. Mencoba paksa start ulang...`); this.mineClaimFailures = 0; this.claimScheduler = this.claimScheduler.filter(t => t.taskConfig.type !== 'mine_restart' && t.taskConfig.type !== 'periodic_claim'); const started = await this.startMine(this.mineConfig); if (started) { logger.success(`[Acc ${this.accountIndex + 1}] Paksa start ulang berhasil.`); this.scheduleTask({ taskConfig: { ...this.mineConfig, type: 'periodic_claim' } }); this.scheduleTask({ taskConfig: { ...this.mineConfig, type: 'mine_restart' } }); } else { logger.error(`[Acc ${this.accountIndex + 1}] Paksa start ulang gagal.`); this.scheduleTask({ taskConfig: { ...this.mineConfig, type: 'mine_restart' } }, "5 menit"); }
            } else { this.scheduleTask(task); }
        } else if (type === 'mine_restart') {
            const started = await this.startMine(this.mineConfig);
            if (started) { this.scheduleTask({ taskConfig: { ...this.mineConfig, type: 'periodic_claim' } }); this.scheduleTask(task); } else { logger.error(`[Acc ${this.accountIndex + 1}] Gagal memulai ulang ${taskName}.`); this.scheduleTask(task, "5 menit"); }
        } else if (type === 'factory') {
            const { areaId, amountToClaim, paksaClaim, inputCost, name } = taskConfig;
            logger.loading(`[Acc ${this.accountIndex + 1}] Mencoba klaim area untuk "${name}"...`);
            const pendingAmount = this.pendingAreaClaims[areaId] || 0;
            const totalAmountToClaim = (amountToClaim || 1) + pendingAmount;
            const actionId = this.generateActionId();
            const payload = [{ id: actionId, actionType: "CLAIM_AREA", payload: { areaId, amountToClaim: totalAmountToClaim }, time: Date.now() }];
            const response = await this.makeApiRequest('POST', this.baseApiUrl, { data: payload });
            if (response && !response.error) {
                logger.success(`[Acc ${this.accountIndex + 1}] Berhasil claim untuk "${name}".`); this.pendingAreaClaims[areaId] = 0; if (response.data.account) this.displayResourceInfo(response.data.account);
                if (this._hasEnoughResources(inputCost)) {
                    const started = await this.startFactory(taskConfig);
                    if (started) { this._spendResources(inputCost); this._logSpentResources(inputCost); this.scheduleTask({ taskConfig, type: 'factory' }); } else { logger.error(`[Acc ${this.accountIndex + 1}] Gagal memulai pabrik "${name}".`); this.scheduleTask({ taskConfig, type: 'factory' }); }
                } else { logger.error(`[Acc ${this.accountIndex + 1}] Sumber daya tidak cukup untuk "${name}".`); this.pendingStartQueue.push(task); }
            } else {
                logger.error(`[Acc ${this.accountIndex + 1}] Gagal claim untuk "${name}".`);
                if (paksaClaim === true) { this.pendingAreaClaims[areaId] = totalAmountToClaim; logger.warn(`[Acc ${this.accountIndex + 1}] Paksa Claim aktif. Menyimpan ${this.formatNumber(totalAmountToClaim)}.`); } else { this.pendingAreaClaims[areaId] = 0; }
                this.scheduleTask({ taskConfig, type: 'factory' });
            }
        } else if (type === 'trading_check') {
            await this._handleTrading();
        }
    }
    
    async start(config) {
        const index = this.accountIndex + 1;
        this.accountConfig = config.accounts ? config.accounts[index] : null;
        if (!this.accountConfig) { logger.error(`[Acc ${index}] Konfigurasi tidak ditemukan.`); return; }
        
        this.isRunning = true;
        this.mineConfig = this.accountConfig.mine;
        this.tradingConfig = this.accountConfig.trading;
        
        logger.step(`[Acc ${index}] === MEMULAI INISIALISASI & PENJADWALAN AWAL ===`);

        if (this.mineConfig && this.mineConfig.enabled !== false) {
            const started = await this.startMine(this.mineConfig);
            if (started) { this.scheduleTask({ taskConfig: { ...this.mineConfig, type: 'periodic_claim' } }); this.scheduleTask({ taskConfig: { ...this.mineConfig, type: 'mine_restart' } }); }
        }
        
        if (this.accountConfig.factories) {
            for (const category in this.accountConfig.factories) {
                for (const factoryConfig of this.accountConfig.factories[category]) {
                    if (factoryConfig.enabled === false) { logger.warn(`[Acc ${index}] Tugas "${factoryConfig.name}" dilewati.`); continue; }
                    const factoryTask = { taskConfig: { ...factoryConfig, type: 'factory' } };
                    if (this._hasEnoughResources(factoryTask.taskConfig.inputCost)) {
                        const started = await this.startFactory(factoryTask.taskConfig);
                        if (started) { this._spendResources(factoryTask.taskConfig.inputCost); this._logSpentResources(factoryTask.taskConfig.inputCost); this.scheduleTask(factoryTask); }
                    } else { logger.warn(`[Acc ${index}] Tugas "${factoryTask.taskConfig.name}" dimasukkan ke daftar tunggu.`); this.pendingStartQueue.push(factoryTask); }
                    await this.sleep(1500);
                }
            }
        }

        if (this.tradingConfig && this.tradingConfig.enabled) {
            this.scheduleTask({ taskConfig: { name: "Pengecekan Trading", type: 'trading_check', cooldown: this.tradingConfig.checkInterval || '15 menit' } });
        }
        
        logger.success(`[Acc ${index}] Inisialisasi selesai. Bot berjalan dalam mode scheduler.`);

        while (this.isRunning) {
            try {
                if (this.claimScheduler.length > 0) {
                    const dueTasks = this.claimScheduler.filter(t => Date.now() >= t.dueTime);
                    if (dueTasks.length > 0) {
                        this.claimScheduler = this.claimScheduler.filter(t => Date.now() < t.dueTime);
                        for (const task of dueTasks) { await this.executeTask(task); }
                    }
                }
                await this.sleep(5000);
            } catch (error) {
                logger.error(`[Acc ${index}] Error di loop utama scheduler: ${error.message}`);
                await this.sleep(30000);
            }
        }
    }
}

// --- FUNGSI MAIN() ---
async function main() {
    logger.banner();
    const privateKeys = await readPrivateKeys();
    const config = await readConfig();
    if (!config.accounts) { logger.error("Struktur 'config.json' salah!"); return; }
    if (privateKeys.length === 0) { logger.error('Tidak ada private key di pk.txt. Bot berhenti.'); return; }
    logger.info(`Ditemukan ${privateKeys.length} private key untuk dijalankan.`);
    const delay = config.delayBetweenAccounts || 5000;
    logger.info(`Memulai akun dengan jeda ${delay / 1000} detik...`);
    for (let i = 0; i < privateKeys.length; i++) {
        const pk = privateKeys[i];
        const bot = new CraftWorldBot(i, pk);
        logger.info(`[Acc ${i+1}] Menggunakan UA: ${bot.baseHeaders['sec-ch-ua']}`);
        const initialTokenSuccess = await bot.refreshToken();
        if (initialTokenSuccess) {
            await bot.displayInitialBalance();
            bot.start(config);
            if (i < privateKeys.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        } else {
            logger.error(`Gagal mendapatkan token awal untuk akun ${i + 1}. Akun dilewati.`);
        }
    }
    logger.success('Semua proses bot telah dimulai.');
}

main().catch(error => {
    logger.error(`Error Kritis di Main: ${error.message}`);
});
