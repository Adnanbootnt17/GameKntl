#  Auto Claim & Factory Bot Configurator

Skript otomatis untuk klaim area dan jalankan pabrik di platform mining berbasis API. Dikustomisasi penuh melalui `config.json`.

---

## ðŸ“ Konfigurasi `config.json`

Semua pengaturan bot diatur melalui file `config.json`. Berikut struktur dasarnya:

```jsonc
{
  "//": "--- PENGATURAN GLOBAL ---",
  "claimInterval_default": 125000, // Waktu antar klaim (dalam ms)
  "enableFactory": true,           // Aktifkan pabrik
  "enableArea": true,              // Aktifkan area klaim
  "delayBetweenAccounts": 10000,   // Delay antar akun (ms)

  "//": "--- PENGATURAN PER AKUN ---",
  "accounts": {
    "1": {
      "mine": {
        "mineId": "ID_MINE_UTAMA_ANDA",
        "mineInterval": 120000
      },
      "areas": [
        { "areaId": "ID_AREA_UNTUK_MUD", "amountToClaim": 10, "resourceName": "MUD Area" },
        { "areaId": "ID_AREA_UNTUK_CLAY", "amountToClaim": 5, "resourceName": "CLAY Area" },
        { "areaId": "ID_AREA_LAINNYA", "amountToClaim": 20, "resourceName": "Main Area" }
      ],
      "factories": [
        { "factoryId": "ID_FACTORY_Mud_1", "resourceName": "Mud Factory 1" },
        { "factoryId": "ID_FACTORY_CLAY_1", "resourceName": "Clay Factory 1" },
        { "factoryId": "ID_FACTORY_CLAY_2", "resourceName": "Clay Factory 2" },
        { "factoryId": "ID_FACTORY_SAND_1", "recipeId": "ID_RESEP_UNTUK_PASIR", "resourceName": "Sand Factory" }
      ]
    },
    "2": {
      "mine": {
        "mineId": "ID_MINE_AKUN_2",
        "mineInterval": 120000
      },
      "areas": [
        { "areaId": "ID_AREA_AKUN_2", "amountToClaim": 15, "resourceName": "Area Akun 2" }
      ],
      "factories": []
    }
  }
}
```

### âœï¸ Penjelasan Singkat
- **`mineId`**: ID tambang utama yang dimiliki akun.
- **`mineInterval`**: Interval waktu mining (dalam milidetik).
- **`areas`**: Daftar area yang bisa diklaim (klaim otomatis).
- **`factories`**: Daftar pabrik yang dijalankan secara otomatis.

---

## ðŸ” Lisensi & Akses

ðŸ”‘ **Lisensi Wajib**  
Untuk menjalankan script ini, Anda membutuhkan lisensi valid dari API berikut:

**ðŸŒ [rest-api.adnanboot.my.id](https://rest-api.adnanboot.my.id)**

ðŸŽ **Trial:** 1 Hari Gratis  
ðŸ’¬ Hubungi admin untuk pembelian lisensi open source.

---

## ðŸ“ž Kontak & Komunitas

ðŸ‘¤ **Admin Telegram:** [`@Nnuuuyyyy18`](https://t.me/Nnuuuyyyy18)  
ðŸ“¢ **Channel Update:** [DropBotHunter](https://t.me/DropBotHunter)

---

## ðŸ–¥ï¸ Requirements

- Node.js v18+
- File `config.json` yang sudah disesuaikan

Install dependencies:
```bash
npm install
```

Jalankan bot:
```bash
node main.js
```

---

## ðŸ’¡ Tips
- Gunakan interval mining minimal 60.000 ms (1 menit) agar tidak banned.
- Pastikan ID-ID sudah benar dan terverifikasi dari server target.

---

> ðŸ”’ Bot ini dibuat untuk penggunaan pribadi dan edukasi. Tidak disarankan digunakan untuk aktivitas ilegal atau spam.
