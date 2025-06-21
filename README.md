# 📌 BOT RAWAN BANNED
#  🛠️ Auto Claim & Factory Bot Configurator

Skript otomatis untuk klaim area dan jalankan pabrik di platform mining berbasis API. Dikustomisasi penuh melalui `config.json`.

---

## 📁Konfigurasi `config.json`

Semua pengaturan bot diatur melalui file `config.json`. Berikut struktur dasarnya:

```jsonc
{
  "enableTasks": true,               // Aktifkan auto-task
  "delayBetweenAccounts": 10000,    // Delay antar akun (ms)

  "accounts": {
    "1": {
      "resourceSources": {          // ID sumber daya dari area
        "EARTH": "ID_AREA_EARTH",
        "MUD": "ID_AREA_MUD",
        "CLAY": "ID_AREA_CLAY",
        "SAND": "ID_AREA_SAND",
        "COPPER": "ID_AREA_COPPER"
      },

      "trading": {
        "enabled": true,           // Aktifkan sistem trading
        "globalCheckInterval": "5 menit", //waktu berapa kali untuk trader
        "rules": [
          {
            "item": "SAND",         // Nama resource
            "enabled": true,
            "strategy": "PERCENT_OF_BALANCE",
            "sell_percent": 25, //jual berapa koin
            "sellAbove": 500,  //jual pas balance koin 500 ketasa
            "buy": "COIN"
          }
        ]
      },

      "mine": {
        "enabled": true,           // Aktifkan fitur mining utama
        "name": "Tambang Utama",
        "mineId": "ID_MINE",
        "fullDuration": "1 jam 30 menit", //durasi minung di server berapa
        "claimInterval": "5 menit 30 detik" //untuk claimnya berapa 
      },

      "factories": {
        "mud_production": [
          {
            "name": "Mud Factory 1",
            "enabled": true,
            "factoryId": "ID_FACTORY",
            "areaId": "ID_AREA",
            "amountToClaim": 1470, //claim per factory
            "cooldown": ["9 menit 4 detik", "9 menit 8 detik"], //durasi mining oer factory
            "inputCost": { "EARTH": 4230 }, //biaya mining per factory
            "paksaClaim": false
          }
        ],

        "clay_production": [
          {
            "name": "Clay Factory 1",
            "enabled": true,
            "factoryId": "ID_FACTORY",
            "areaId": "ID_AREA",
            "amountToClaim": 315,
            "cooldown": ["30 menit 5 detik", "30 menit 10 detik"],
            "inputCost": { "MUD": 3050 },
            "paksaClaim": false
          }
        ],

        "sand_production": [
          {
            "name": "Sand Factory 1",
            "enabled": true,
            "factoryId": "ID_FACTORY",
            "areaId": "ID_AREA",
            "amountToClaim": 125,
            "cooldown": ["29 menit 14 detik", "29 menit 15 detik"],
            "inputCost": { "CLAY": 362 },
            "paksaClaim": false
          }
        ],

        "copper_production": [
          {
            "name": "Copper Factory 1",
            "enabled": true,
            "factoryId": "ID_FACTORY",
            "areaId": "ID_AREA",
            "amountToClaim": 7,
            "cooldown": ["1 jam 53 menit", "1 jam 53 menit 5 detik"],
            "inputCost": { "SAND": 210 },
            "paksaClaim": false
          }
        ],

        "seawater_production": [
          {
            "name": "Seawater Factory",
            "enabled": true,
            "factoryId": "ID_FACTORY",
            "areaId": "ID_AREA",
            "amountToClaim": 1,
            "cooldown": ["2 jam 5 detik", "2 jam 6 detik"],
            "inputCost": { "WATER": 8 },
            "paksaClaim": false
          }
        ],

        "heat_production": [
          {
            "name": "Heat Factory",
            "enabled": true,
            "factoryId": "ID_FACTORY",
            "areaId": "ID_AREA",
            "amountToClaim": 1,
            "cooldown": ["2 jam 30 menit 5 detik", "2 jam 30 menit 6 detik"],
            "inputCost": { "FIRE": 9 },
            "paksaClaim": false
          }
        ]
      }
    }
  }
}
```
## 📁Konfigurasi `.env`

``` .env
LICENSE_API_URL=LINK JANGAN DIHAPUS
LICENSE_KEY=xxxxISI_LISENSI_LUxccccccc
```

### 📃 Penjelasan Singkat
- **`mineId`**: ID tambang utama yang dimiliki akun.
- **`mineInterval`**: Interval waktu mining (dalam milidetik).
- **`areas`**: Daftar area yang bisa diklaim (klaim otomatis).
- **`factories`**: Daftar pabrik yang dijalankan secara otomatis.

---

## 📜 Lisensi & Akses

‘ **Lisensi Wajib**  
Untuk menjalankan script ini, Anda membutuhkan lisensi valid dari API berikut:

***📄 [rest-api.adnanboot.my.id](https://rest-api.adnanboot.my.id)**

 **Trial:** 1 Hari Gratis  
📜 Hubungi admin untuk pembelian lisensi open source.

---

## 📕 Kontak & Komunitas

📞 **Admin Telegram:** [`@Nnuuuyyyy18`](https://t.me/Nnuuuyyyy18)  
📞 **Channel Update:** [DropBotHunter](https://t.me/DropBotHunter)

---

## 📕 Requirements

- Node.js v18+
- File `config.json` yang sudah disesuaikan

Install dependencies:
```bash
git clone https://github.com/Adnanbootnt17/GameKntl.git
cd GameKntl
npm install
```
settings config bot:
```bash
nano config.json
```
settings privetkey bot:
```bash
nano pk.txt
```
settings tokenfirebase bot:
```bash
nano tokenfirebase.txt
```
Jalankan bot:
```bash
npm start
```

---

## 📕 Tips
- Gunakan interval mining minimal 60.000 ms (1 menit) agar tidak banned.
- Pastikan ID-ID sudah benar dan terverifikasi dari server target.

---

> 🔐”’ Bot ini dibuat untuk penggunaan pribadi dan edukasi. Tidak disarankan digunakan untuk aktivitas ilegal atau spam.
