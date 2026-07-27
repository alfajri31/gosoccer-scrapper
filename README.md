# Soccer Scrapper

Backend sinkronisasi data master sepak bola dari Wikipedia menggunakan
Node.js, Express, TypeScript, Puppeteer, MongoDB, dan Mongoose.

## Struktur Proyek

```text
soccer-scrapper/
├── src/
│   ├── controllers/
│   ├── db/
│   │   └── db.ts
│   ├── interfaces/
│   │   ├── classement.interface.ts
│   │   ├── coach.interface.ts
│   │   ├── country.interface.ts
│   │   ├── cup.interface.ts
│   │   ├── image.interface.ts
│   │   ├── league.interface.ts
│   │   ├── player.interface.ts
│   │   ├── referee.interface.ts
│   │   ├── season.interface.ts
│   │   ├── stadium.interface.ts
│   │   ├── team.interface.ts
│   │   ├── top-scorer.interface.ts
│   │   └── year.interface.ts
│   ├── models/
│   │   ├── classement.ts
│   │   ├── coach.ts
│   │   ├── country.ts
│   │   ├── cup.ts
│   │   ├── league.ts
│   │   ├── player.ts
│   │   ├── referee.ts
│   │   ├── season.ts
│   │   ├── stadium.ts
│   │   ├── team.ts
│   │   ├── top-scorer.ts
│   │   └── year.ts
│   ├── services/
│   │   └── wikipedia-master.service.ts
│   ├── app.ts
│   └── server.ts
├── .env
├── package.json
└── tsconfig.json
```

| Folder | Tanggung jawab |
| --- | --- |
| `interfaces` | Mendefinisikan bentuk data TypeScript |
| `models` | Mendefinisikan schema, index, reference, dan model Mongoose |
| `services` | Mengambil data Wikipedia dan menyinkronkannya ke MongoDB |
| `db` | Mengelola koneksi MongoDB |
| `controllers` | Menangani request dan response HTTP jika diaktifkan |
| `routes` | Mendefinisikan endpoint Express jika diaktifkan |

## Instalasi

```bash
cd soccer-scrapper
npm install
```

Dependency runtime utama:

```bash
npm install express cors dotenv mongoose puppeteer
```

Dependency development TypeScript:

```bash
npm install -D typescript tsx @types/node @types/express @types/cors
```

Mongoose membawa tipe TypeScript sendiri sehingga `@types/mongoose` tidak
diperlukan. Opsi `-D` berarti `--save-dev`, bukan instalasi global.

## Konfigurasi MongoDB

Buat `.env` di root proyek:

```dotenv
PORT=3000
MONGODB_URI=mongodb://admin:change-this-password@localhost:27017/gosoccer?authSource=admin
PUPPETEER_HEADLESS=true
```

Format MongoDB URI:

```text
mongodb://username:password@hostname:port/database?authSource=admin
```

Jangan menambahkan `http://` pada URI MongoDB dan jangan menyimpan kredensial
langsung di source code. `.env` harus dicantumkan pada `.gitignore`.

Koneksi dibuat satu kali sebelum server dan sinkronisasi dijalankan:

```ts
export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  await mongoose.connect(uri);
}
```

## MongoDB dengan Docker

Contoh `compose.yaml`:

```yaml
services:
  mongodb:
    image: mongo:8
    container_name: gosoccer-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: change-this-password
      MONGO_INITDB_DATABASE: gosoccer
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

Perintah Docker:

```bash
docker compose up -d
docker compose ps
docker compose logs -f mongodb
docker compose down
```

`docker compose down -v` juga menghapus volume dan seluruh data MongoDB.

## Menjalankan Aplikasi

Development:

```bash
npm run dev
```

Menjalankan satu jenis sinkronisasi:

```bash
npm run dev -- --sync=player
```

Format dengan spasi juga didukung:

```bash
npm run dev -- --sync player
```

Shorthand berikut menghasilkan proses yang sama:

```bash
npm run dev -- --player
```

Target yang tersedia:

```text
year
country
league
cup
team
player
coach
stadium
season
classement
top-scorer
referee
```

Nama plural juga diterima, misalnya `--sync=players` atau
`--sync=top-scorers`. Target `team`, `player`, `coach`, dan `stadium` membaca
relasi yang sudah tersedia di MongoDB lalu hanya menjalankan sinkronisasi
pilihan tersebut. Jika flag tidak diberikan, seluruh sync tetap dijalankan
berdasarkan prioritas jumlah dokumen.

Server menjalankan proses berikut:

```text
Membaca environment variable
              ↓
Menghubungkan Mongoose ke MongoDB
              ↓
Menjalankan sinkronisasi Wikipedia
              ↓
Express membuka port HTTP
```

Puppeteer ditutup melalui blok `finally` setelah seluruh pipeline selesai.
Ketika proses menerima `SIGINT` atau `SIGTERM`, browser aktif juga ditutup.

## Flow Sinkronisasi

```text
Hitung jumlah dokumen setiap koleksi
                    ↓
Urutkan dari jumlah paling sedikit
                    ↓
Jalankan setiap sync secara berurutan
```

Urutan dihitung saat proses dimulai untuk `Year`, `Country`, `League`, `Cup`,
`Season`, `Classement`, `TopScorer`, dan `Referee`. Contoh log:

```text
[sync-priority] topScorers=3 -> referees=8 -> cups=25 -> seasons=40
```

Jika jumlah dua koleksi sama, urutan deklarasi yang menjaga relasi digunakan
sebagai tie-breaker. `syncTeams`, `syncTeamImage`, `syncStadium`, `syncCoach`,
dan `syncPlayers` tetap dijalankan sebagai bagian dari `syncLeagues` karena
fungsi tersebut membutuhkan ID country, league, dan team.

Sebelum task dijalankan, service memeriksa dokumen relasi yang dibutuhkan. Task
yang dependency-nya belum tersedia dilewati tanpa menggagalkan pipeline:

```text
[sync-priority] Skipped topScorers: Season atau Team belum tersedia
```

Jalankan aplikasi kembali untuk menghitung urutan baru dan memproses task yang
sebelumnya dilewati. Urutan terpilih tersedia pada `syncState.priorityOrder`,
sedangkan task yang dilewati tersedia pada `syncState.skippedSyncs`.

### 1. Tahun

`syncYears()` membuat master tahun dari 2000 sampai 2026 menggunakan upsert.
Nilai tahun digunakan sebagai identitas bisnis, sedangkan MongoDB tetap
memberikan `_id` pada setiap dokumen.

### 2. Negara

`syncCountries()` mengambil daftar negara. `externalId` Wikipedia digunakan
untuk mengenali dokumen yang sama ketika sinkronisasi dijalankan ulang.

### 3. Liga

`syncLeagues()` menyimpan liga dan mencari negara terkait terlebih dahulu.
Field `country` pada dokumen liga berisi `country._id`.

### 4. Tim dan Data Tim

`syncTeams()` menyimpan tim berdasarkan `externalId`, lalu menghubungkannya ke
country dan league melalui `_id` MongoDB. Setiap tim dilanjutkan ke:

- `syncTeamImage()` untuk URL gambar tim.
- `syncStadium()` untuk stadion dan relasi team/country.
- `syncCoach()` untuk pelatih dan relasi team.
- `syncPlayers()` untuk current squad dan relasi team.

Gambar pemain tidak diunduh dan nilainya disimpan sebagai `null`.

### 5. Cup

`syncCup()` menyimpan kompetisi piala. Cup terhubung ke country menggunakan
`country._id`.

### 6. Season

`syncSeason()` mencari current season setiap league atau cup. Season hanya
memiliki salah satu relasi:

```text
Season → League
atau
Season → Cup
```

Season sebelumnya pada kompetisi yang sama ditandai `isCurrent: false`.

### 7. Classement

`syncClassement()` menyimpan posisi klasemen berdasarkan league dan year.
Setiap baris klasemen menyimpan `_id` team, league, dan year terkait.

### 8. Top Scorer

`syncTopScorer()` membaca tabel pencetak gol pada halaman season. Player dan
team dicari menggunakan `externalId` Wikipedia, kemudian `_id` dokumennya
disimpan sebagai relasi.

Top scorer liga menyimpan `league`, sedangkan top scorer kompetisi piala
menyimpan `cup`. Jika player belum tersedia, sinkronisasi membuat dokumen
Player dari baris top scorer selama team terkait berhasil ditemukan. Player
hanya dilewati jika relasi team juga tidak tersedia.

### 9. Referee

`syncReferee()` menyimpan master wasit yang ditemukan pada halaman season.
Wasit di-upsert berdasarkan `externalId`. Ketersediaan data wasit bergantung
pada struktur dan isi halaman Wikipedia.

## Model dan Relasi

| Model | Fungsi dan relasi utama |
| --- | --- |
| `Country` | Master negara |
| `League` | Kompetisi liga, memiliki `country` |
| `Cup` | Kompetisi piala, memiliki `country` |
| `Team` | Tim, memiliki `country` dan `leagues[]` |
| `Player` | Pemain, memiliki `team` |
| `Coach` | Pelatih, memiliki `team` |
| `Stadium` | Stadion, memiliki `country` dan `teams[]` |
| `Year` | Master tahun 2000-2026 |
| `Season` | Musim milik satu `league` atau `cup` |
| `Classement` | Posisi team berdasarkan `league` dan `year` |
| `TopScorer` | Pencetak gol berdasarkan player, team, season, dan kompetisi |
| `Referee` | Master wasit |

Relasi utama:

```text
Country  1 ─── N League
Country  1 ─── N Cup
Country  1 ─── N Team
Country  1 ─── N Stadium
League   N ─── N Team
Team     1 ─── N Player
Team     1 ─── N Coach
Team     N ─── N Stadium
League   1 ─── N Season
Cup      1 ─── N Season
League   1 ─── N Classement
Season   1 ─── N TopScorer
Player   1 ─── N TopScorer
Team     1 ─── N TopScorer
```

## externalId dan ObjectId

`externalId` dan `_id` mempunyai fungsi berbeda:

- `externalId` berasal dari Wikipedia dan digunakan untuk pencarian, upsert,
  serta deduplikasi.
- `_id` dibuat MongoDB dan digunakan sebagai relasi antardokumen.
- `ref` memberi tahu Mongoose model tujuan ketika menggunakan `populate()`.

Contoh alur relasi top scorer:

```text
URL pemain Wikipedia
          ↓
Ubah menjadi externalId
          ↓
PlayerModel.findOne({ externalId })
          ↓
Ambil player._id
          ↓
Simpan ke TopScorer.player
```

Contoh interface:

```ts
export interface TopScorer {
  externalId: string;
  rank: number;
  goals: number;
  player: Types.ObjectId;
  team?: Types.ObjectId;
  season: Types.ObjectId;
  league?: Types.ObjectId;
  cup?: Types.ObjectId;
  sourceUrl: string;
  scrapedAt: Date;
}
```

Contoh penyimpanan:

```ts
const player = await PlayerModel.findOne({
  externalId: 'wikipedia:Erling_Haaland',
});

const team = await TeamModel.findOne({
  externalId: 'wikipedia:Manchester_City_F.C.',
});

await TopScorerModel.updateOne(
  {
    season: season._id,
    player: player._id,
  },
  {
    $set: {
      externalId: `${season.externalId}:${player.externalId}`,
      rank: 1,
      goals: 25,
      player: player._id,
      team: team._id,
      season: season._id,
      league: league._id,
      sourceUrl: season.sourceUrl,
      scrapedAt: new Date(),
    },
  },
  { upsert: true },
);
```

Contoh membaca relasi:

```ts
const scorers = await TopScorerModel.find({
  season: seasonId,
  league: leagueId,
})
  .sort({ rank: 1 })
  .populate('player')
  .populate('team')
  .populate('season')
  .populate('league')
  .populate('cup');
```

Tanpa `populate()`, field relasi hanya berisi ObjectId.

## Flow JavaScript ke TypeScript

```text
Instal TypeScript dan type definitions
                  ↓
Buat tsconfig.json
                  ↓
Ubah file .js menjadi .ts
                  ↓
Ubah require menjadi import
                  ↓
Ubah module.exports menjadi export
                  ↓
Pisahkan interface dari model
                  ↓
Tambahkan tipe parameter dan hasil fungsi
                  ↓
Perbarui script package.json
                  ↓
Jalankan typecheck
                  ↓
Build TypeScript ke JavaScript
                  ↓
Jalankan JavaScript dari dist
```

### Typecheck

```bash
npx tsc --noEmit
```

### Build

```bash
npx tsc
node dist/server.js
```

`tsx` digunakan saat development agar source `.ts` dapat dijalankan langsung.
Untuk production, TypeScript dibangun menjadi JavaScript pada folder `dist`.

## Catatan Scraping

- Target Wikipedia disimpan di source code, bukan query parameter.
- Selector Wikipedia dapat berubah sehingga setiap parser memiliki logging dan
  counter kegagalan.
- Tidak semua liga memiliki tabel klasemen, top scorer, current squad, atau
  referee dengan struktur yang sama.
- Gunakan jeda antarhalaman dan jangan menjalankan sinkronisasi paralel secara
  agresif.
- URL gambar disimpan apa adanya; file gambar tidak diunduh ke MongoDB.
- Hormati kebijakan, robots.txt, dan beban server sumber.
