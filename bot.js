/* --- File: bot.js (Versi Final yang Benar & Modular) --- */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const { spawn } = require('child_process');

const colors = { reset: "\x1b[0m", cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", white: "\x1b[37m", bold: "\x1b[1m" };
const logger = { info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`), warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`), error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`), success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`), loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`), step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`), banner: () => { console.log(`${colors.cyan}${colors.bold}`); console.log(`---------------------------------------------`); console.log(`      Craft World Auto Bot - Modular `); console.log(`---------------------------------------------${colors.reset}`); console.log(); } };

async function readConfig() {
    try {
        const data = await fs.readFile('config.json', 'utf8');
        return JSON.parse(data.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*)/g, (m, g) => g ? "" : m));
    } catch (error) { logger.error('Error reading config.json: ' + error.message); return {}; }
}
async function readPrivateKeys() {
    try {
        const data = await fs.readFile('pk.txt', 'utf8');
        return data.split(/[\r\n]+/).map(pk => pk.trim()).filter(pk => pk.length > 0 && pk.startsWith('0x'));
    } catch (error) { logger.error('Error reading pk.txt: ' + error.message); return []; }
}

class CraftWorldBot {
    constructor(accountIndex, privateKey) {
        this.accountIndex = accountIndex;
        this.privateKey = privateKey;
        this.authToken = null;
        this.isRunning = false;
        this.baseURL = 'https://preview.craft-world.gg/api/1/user-actions/ingest';
        this.headers = {
            "accept": "*/*", "accept-language": "en-US,en;q=0.7", "content-type": "application/json",
            "sec-ch-ua": '"Brave";v="137", "Chromium";v="137", "Not/A)Brand";v="24"', "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"', "sec-fetch-dest": "empty", "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin", "sec-gpc": "1", "x-app-version": "0.33.7",
            "Referer": "https://preview.craft-world.gg/", "Referrer-Policy": "strict-origin-when-cross-origin"
        };
    }

    refreshToken() {
        logger.loading(`[Acc ${this.accountIndex + 1}] Menjalankan token generator eksternal...`);
        return new Promise((resolve) => {
            const child = spawn('node', ['token-generator.js', this.privateKey]);
            let token = null;
            child.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('FINAL_TOKEN:')) {
                    token = output.split('FINAL_TOKEN:')[1].trim();
                    if (token === 'null' || token.length < 20) token = null;
                }
            });
            child.stderr.on('data', (data) => logger.error(`[Token Gen Error]: ${data.toString().trim()}`));
            child.on('close', (code) => {
                if (token) {
                    logger.success(`[Acc ${this.accountIndex + 1}] Token baru berhasil ditangkap.`);
                    this.setAuthToken(token);
                    resolve(true);
                } else {
                    logger.error(`[Acc ${this.accountIndex + 1}] Gagal menangkap token dari generator (exit code: ${code}).`);
                    resolve(false);
                }
            });
        });
    }

    setAuthToken(token) {
        this.authToken = `Bearer jwt_${token}`;
        this.headers.authorization = this.authToken;
        logger.success(`[Acc ${this.accountIndex + 1}] Auth token berhasil diatur.`);
    }

    async makeApiRequest(payload, retries = 1) {
        if (!this.authToken) { logger.error(`[Acc ${this.accountIndex + 1}] Tidak ada auth token, permintaan dibatalkan.`); return null; }
        try {
            const response = await axios.post(this.baseURL, { data: payload }, { headers: this.headers });
            return response.data;
        } catch (error) {
            const status = error.response ? error.response.status : 'N/A';
            if ((status === 401 || status === 403) && retries > 0) {
                logger.warn(`[Acc ${this.accountIndex + 1}] Token tidak valid (Error ${status}). Mencoba refresh...`);
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    logger.info(`[Acc ${this.accountIndex + 1}] Token berhasil di-refresh, mencoba ulang permintaan...`);
                    return this.makeApiRequest(payload, retries - 1);
                }
            }
            const errorMessage = error.response ? `Status: ${status}, Data: ${JSON.stringify(error.response.data)}` : error.message;
            logger.error(`[Acc ${this.accountIndex + 1}] API Request Gagal: ${errorMessage}`);
            return null;
        }
    }

    generateActionId() { return uuidv4(); }
    formatNumber(num) { return (num === undefined || num === null) ? '0' : num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
    getResourceEmoji(symbol) {
        const emojiMap = {'EARTH':'🌍','WATER':'💧','FIRE':'🔥','MUD':'🟤','CLAY':'🧱','SAND':'🏖️','COPPER':'🟠','SEAWATER':'🌊','HEAT':'🌡️','ALGAE':'🌿','LAVA':'🌋','CERAMICS':'🏺','STEEL':'⚙️','OXYGEN':'💨','GLASS':'🪟','GAS':'💨','STONE':'🪨','STEAM':'♨️','SCREWS':'🔩','FUEL':'⛽','CEMENT':'🏗️','OIL':'🛢️','ACID':'🧪','SULFUR':'💛','PLASTICS':'♻️','FIBERGLASS':'🧵','ENERGY':'⚡','HYDROGEN':'💨','DYNAMITE':'💥','COIN':'🪙'};
        return emojiMap[symbol] || '📦';
    }
    displayResourceInfo(account) {
        if (!account) { logger.warn(`Acc ${this.accountIndex + 1}: No account data to display info.`); return; }
        logger.step(`=== RESOURCE INFO (Acc ${this.accountIndex + 1}) ===`);
        logger.info(`⚡ Power: ${this.formatNumber(account.power)} (Refill: ${account.powerMillisecondsUntilRefill ? Math.ceil(account.powerMillisecondsUntilRefill/60000) + 'm' : 'N/A'})`);
        logger.info(`🌟 XP: ${this.formatNumber(account.experiencePoints)}`);
        logger.info(`💰 Skill Points: ${this.formatNumber(account.skillPoints)}`);
        logger.info(`🏦 Wallet: ${account.walletAddress || 'N/A'}`);
        logger.step('Resources:');
        if (account.resources && Array.isArray(account.resources)) {
            const availableResources = account.resources.filter(r => r.amount > 0);
            if (availableResources.length > 0) { availableResources.forEach(r => logger.info(`${this.getResourceEmoji(r.symbol)} ${r.symbol}: ${this.formatNumber(r.amount)}`));}
            else { logger.info('No resources available.'); }
        }
    }
    displayClaimSummary(account) {
        if (!account || !account.resources) return "No claim summary available.";
        const updates = account.resources.filter(r => r.amount > 0).map(r => `${this.getResourceEmoji(r.symbol)} ${this.formatNumber(r.amount)} ${r.symbol}`);
        if (account.experiencePoints > 0) updates.push(`🌟 ${this.formatNumber(account.experiencePoints)} XP`);
        return updates.join(' | ');
    }
    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    
    // --- FUNGSI AKSI YANG DIPERBARUI ---
    async startAllFactories() {
        if (!this.factoriesConfig || this.factoriesConfig.length === 0) return;
        logger.step(`[Acc ${this.accountIndex + 1}] Memulai semua pabrik...`);
        for (const factory of this.factoriesConfig) {
            const { factoryId, recipeId, resourceName } = factory;
            const actionPayload = { factoryId };
            let logMessage = `Memulai pabrik ${resourceName || factoryId.slice(0,10)}`;
            if (recipeId) {
                actionPayload.recipeId = recipeId;
                logMessage += ` dengan resep ${recipeId.slice(0,10)}`;
            }
            logger.loading(`[Acc ${this.accountIndex + 1}] ${logMessage}...`);
            const actionId = this.generateActionId();
            const payload = [{ id: actionId, actionType: "START_FACTORY", payload: actionPayload, time: Date.now() }];
            const response = await this.makeApiRequest(payload);
            if (response && response.data.processed.includes(actionId)) {
                logger.success(`[Acc ${this.accountIndex + 1}] Aksi pabrik ${resourceName || ''} berhasil.`);
            } else { logger.error(`[Acc ${this.accountIndex + 1}] Aksi pabrik ${resourceName || ''} gagal.`); }
            await this.sleep(3000);
        }
    }

    async claimAllAreas() {
        if (!this.areasConfig || this.areasConfig.length === 0) return;
        logger.step(`[Acc ${this.accountIndex + 1}] Meng-klaim semua area...`);
        for (const area of this.areasConfig) {
            const { areaId, amountToClaim, resourceName } = area;
            logger.loading(`[Acc ${this.accountIndex + 1}] Meng-klaim ${amountToClaim || 1} dari ${resourceName || areaId.slice(0,10)}...`);
            const actionId = this.generateActionId();
            const payload = [{ id: actionId, actionType: "CLAIM_AREA", payload: { areaId, amountToClaim: amountToClaim || 1 }, time: Date.now() }];
            const response = await this.makeApiRequest(payload);
            if (response && response.data.processed.includes(actionId)) {
                logger.success(`[Acc ${this.accountIndex + 1}] Berhasil claim ${resourceName || ''}.`);
            } else { logger.error(`[Acc ${this.accountIndex + 1}] Gagal claim ${resourceName || ''}.`); }
            await this.sleep(3000);
        }
    }

    async startMine() {
        const actionId = this.generateActionId();
        const payload = [{ id: actionId, actionType: "START_MINE", payload: { mineId: this.mineConfig.mineId }, time: Date.now() }];
        const response = await this.makeApiRequest(payload);
        if (response && response.data.processed.includes(actionId)) {
            logger.success(`[Acc ${this.accountIndex + 1}] Mine utama berhasil dimulai.`);
            this.displayResourceInfo(response.data.account);
        } else { logger.error(`[Acc ${this.accountIndex + 1}] Gagal memulai mine utama.`); }
    }

    async claimMine() {
        const actionId = this.generateActionId();
        const payload = [{ id: actionId, actionType: "CLAIM_MINE", payload: { mineId: this.mineConfig.mineId }, time: Date.now() }];
        const response = await this.makeApiRequest(payload);
        if (response && response.data.processed.includes(actionId)) {
            logger.success(`[Acc ${this.accountIndex + 1}] Claim mine utama berhasil: ${this.displayClaimSummary(response.data.account)}`);
        } else { logger.error(`[Acc ${this.accountIndex + 1}] Gagal claim mine utama.`); }
    }
    
    // --- FUNGSI UTAMA BOT YANG DIPERBARUI ---
    async start(config) {
        const index = this.accountIndex + 1;
        const accountConfig = config.accounts ? config.accounts[index] : null;
        if (!accountConfig) {
            logger.error(`[Acc ${index}] Konfigurasi untuk akun ${index} tidak ditemukan di 'config.json'. Akun dilewati.`);
            return;
        }
        this.mineConfig = accountConfig.mine;
        this.factoriesConfig = accountConfig.factories || []; 
        this.areasConfig = accountConfig.areas || [];
        const mineInterval = (this.mineConfig && this.mineConfig.mineInterval) ? this.mineConfig.mineInterval : (config.claimInterval_default || 60000);
        const claimInterval = config.claimInterval_default || 60000;

        this.isRunning = true;
        while (this.isRunning) {
            try {
                logger.step(`[Acc ${index}] === MEMULAI SIKLUS BARU ===`);
                await this.sleep(3000);
                if (this.mineConfig && this.mineConfig.mineId) await this.startMine();
                if (config.enableFactory && this.factoriesConfig.length > 0) {
                    await this.sleep(5000);
                    await this.startAllFactories();
                }
                logger.loading(`[Acc ${index}] Menunggu ${mineInterval / 1000} detik sebelum claim...`);
                await this.sleep(mineInterval);
                if (this.mineConfig && this.mineConfig.mineId) await this.claimMine();
                if (config.enableArea && this.areasConfig.length > 0) {
                    await this.sleep(5000);
                    await this.claimAllAreas();
                }
                logger.loading(`[Acc ${index}] Siklus selesai. Menunggu ${claimInterval / 1000} detik...`);
                await this.sleep(claimInterval);
            } catch (error) {
                logger.error(`[Acc ${index}] Error di loop utama: ${error.message}`);
                await this.sleep(30000);
            }
        }
    }
}

async function main() {
    logger.banner();
    const privateKeys = await readPrivateKeys();
    const config = await readConfig();
    if (!config.accounts) { logger.error("Struktur 'config.json' salah! Harap gunakan format dengan 'accounts': { ... }"); return; }
    if (privateKeys.length === 0) { logger.error('Tidak ada private key di pk.txt. Bot berhenti.'); return; }
    logger.info(`Ditemukan ${privateKeys.length} private key untuk dijalankan.`);
    
    for (let i = 0; i < privateKeys.length; i++) {
        const pk = privateKeys[i];
        const bot = new CraftWorldBot(i, pk);
        const initialTokenSuccess = await bot.refreshToken();
        if (initialTokenSuccess) {
            bot.start(config);
            const delay = parseInt(config.delayBetweenAccounts || 5000);
            if (i < privateKeys.length - 1) {
                logger.info(`Menunggu ${delay / 1000} detik sebelum memulai akun berikutnya...`);
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

