# Soccer Scrapper

Backend data sepak bola menggunakan Node.js, Express, TypeScript, MongoDB, dan
Mongoose.

## Struktur Proyek

```text
soccer-scrapper/
├── src/
│   ├── controllers/
│   ├── db/
│   │   └── db.ts
│   ├── interfaces/
│   │   ├── country.interface.ts
│   │   ├── league.interface.ts
│   │   ├── live.interface.ts
│   │   ├── match.interface.ts
│   │   ├── odds.interface.ts
│   │   ├── schedule.interface.ts
│   │   └── team.interface.ts
│   ├── middlewares/
│   ├── models/
│   │   ├── country.ts
│   │   ├── league.ts
│   │   ├── live.ts
│   │   ├── match.ts
│   │   ├── odds.ts
│   │   ├── schedule.ts
│   │   └── team.ts
│   ├── routes/
│   ├── app.ts
│   └── server.ts
├── .env
├── package.json
└── tsconfig.json
```

Pembagian tanggung jawab:

| Folder | Tanggung jawab |
| --- | --- |
| `interfaces` | Mendefinisikan bentuk data TypeScript |
| `models` | Mendefinisikan Mongoose schema, index, dan model |
| `db` | Mengelola koneksi MongoDB |
| `routes` | Mendefinisikan endpoint Express |
| `controllers` | Menangani request dan response |
| `middlewares` | Menangani proses lintas endpoint seperti error |

## Instalasi

Masuk ke folder proyek dan pasang dependency:

```bash
cd soccer-scrapper
npm install
```

Development dependency TypeScript:

```bash
npm install -D typescript tsx @types/node @types/express @types/cors
```

Runtime dependency database:

```bash
npm install mongoose
```

Mongoose sudah membawa tipe TypeScript sendiri. Jangan memasang
`@types/mongoose`.

Opsi `-D` berarti `--save-dev`, bukan global. Package development dipasang
secara lokal dan dicatat pada `devDependencies`.

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
   Pisahkan interface dari implementasi
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

### 1. Instal TypeScript

`typescript` digunakan untuk pemeriksaan tipe dan build. `tsx` menjalankan
source TypeScript secara langsung saat development.

```bash
npm install -D typescript tsx @types/node @types/express @types/cors
```

### 2. Konfigurasi TypeScript

`tsconfig.json` mengatur source, output build, module system, dan pemeriksaan
tipe:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

`Node16` digunakan karena `moduleResolution: "Node"` adalah mode lama yang
dipetakan ke `node10` dan telah deprecated.

### 3. Ubah Ekstensi Source

```text
server.js → server.ts
app.js    → app.ts
```

Hapus file `.js` lama setelah migrasi. Menyimpan `.js` dan `.ts` dengan nama
modul yang sama dapat membuat resolver memilih file yang tidak diharapkan.

### 4. Ubah Import dan Export

JavaScript CommonJS:

```js
const express = require('express');
module.exports = app;
```

TypeScript:

```ts
import express from 'express';
export default app;
```

Named export harus memakai named import:

```ts
export const MatchModel = model('Match', matchSchema);
```

```ts
import { MatchModel } from './models/match';
```

Untuk nilai yang hanya diperlukan oleh compiler, gunakan `import type`:

```ts
import type { Match } from '../interfaces/match.interface';
```

### 5. Pisahkan Interface dan Model

Interface mendeskripsikan bentuk data:

```ts
// src/interfaces/match.interface.ts
import type { Types } from 'mongoose';

export interface Match {
  externalId: string;
  league: Types.ObjectId;
  homeTeam: Types.ObjectId;
  awayTeam: Types.ObjectId;
  kickoffAt: Date;
}
```

Model mendeskripsikan aturan MongoDB:

```ts
// src/models/match.ts
import { model, Schema, Types } from 'mongoose';
import type { Match } from '../interfaces/match.interface';

const matchSchema = new Schema<Match>({
  externalId: {
    type: String,
    required: true,
  },
  league: {
    type: Types.ObjectId,
    ref: 'League',
    required: true,
  },
  homeTeam: {
    type: Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  awayTeam: {
    type: Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  kickoffAt: {
    type: Date,
    required: true,
  },
});

export const MatchModel = model<Match>('Match', matchSchema);
```

Interface hanya ada saat pemeriksaan TypeScript. Model tersedia saat runtime
dan digunakan untuk berkomunikasi dengan MongoDB.

### 6. Perbarui Script

Konfigurasi yang direkomendasikan:

```json
{
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "typecheck": "tsc --noEmit",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### 7. Typecheck dan Build

Periksa tipe tanpa membuat file:

```bash
npm run typecheck
```

Build TypeScript menjadi JavaScript:

```bash
npm run build
```

Jalankan hasil build:

```bash
npm start
```

Flow production:

```text
src/*.ts
   ↓ tsc
dist/*.js
   ↓ node
dist/server.js
```

## MongoDB dengan Docker

Gunakan Docker Compose agar database dapat dijalankan secara konsisten.

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

Jalankan MongoDB:

```bash
docker compose up -d
```

Cek status:

```bash
docker compose ps
```

Lihat log:

```bash
docker compose logs -f mongodb
```

Hentikan tanpa menghapus data:

```bash
docker compose down
```

Perintah berikut juga menghapus volume dan seluruh data:

```bash
docker compose down -v
```

## Environment Variable

`process.env` merupakan fitur Node.js dan tidak perlu dipasang. Package
`dotenv` digunakan untuk memuat isi `.env`.

Buat `.env` di root `soccer-scrapper`:

```dotenv
PORT=3000
MONGODB_URI=mongodb://admin:change-this-password@localhost:27017/gosoccer?authSource=admin
```

Muat environment paling awal:

```ts
import 'dotenv/config';
```

Jangan menulis username dan password database langsung di source. File `.env`
harus tercantum di `.gitignore`.

Struktur MongoDB URI:

```text
mongodb://username:password@hostname:port/database?authSource=admin
```

Port dipisahkan dengan `:`, bukan `/`, dan URI tidak menggunakan `http://`.

## Koneksi Database

Koneksi dibuat satu kali di `src/db/db.ts`:

```ts
import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
```

Database harus terhubung sebelum Express membuka port:

```ts
import 'dotenv/config';

import app from './app';
import { connectDatabase } from './db/db';

const port = Number(process.env.PORT) || 3000;

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

void startServer();
```

Flow startup:

```text
server.ts membaca .env
          ↓
connectDatabase membaca MONGODB_URI
          ↓
Mongoose terhubung ke MongoDB
          ↓
Express membuka port HTTP
```

Jangan membuka koneksi baru dari controller untuk setiap request.

## Model dan Relasi

Model yang tersedia:

| Model | Fungsi |
| --- | --- |
| `Country` | Negara asal liga atau tim |
| `League` | Kompetisi sepak bola |
| `Team` | Klub atau tim |
| `Match` | Data utama pertandingan |
| `Schedule` | Informasi jadwal pertandingan |
| `LiveMatch` | Kondisi pertandingan yang sedang berjalan |
| `Odds` | Pasar dan nilai odds pertandingan |

Relasi disimpan sebagai `ObjectId` dan ditentukan melalui `ref`:

```text
Country 1 ─── N League
Country 1 ─── N Team
League  1 ─── N Match
Team    1 ─── N Match
Match   1 ─── 1 Schedule
Match   1 ─── 1 LiveMatch
Match   1 ─── N Odds
```

Contoh relasi:

```ts
league: {
  type: Types.ObjectId,
  ref: 'League',
  required: true,
}
```

- `Types.ObjectId` adalah `_id` yang disimpan pada dokumen.
- `ref: 'League'` menunjukkan model tujuan.
- Nilai `ref` harus sama dengan nama pada `model('League', ...)`.

Ambil dokumen beserta relasinya menggunakan `populate()`:

```ts
const match = await MatchModel.findById(matchId)
  .populate('league')
  .populate('homeTeam')
  .populate('awayTeam');
```

Tanpa `populate`, field relasi hanya berisi `ObjectId`. MongoDB tidak memiliki
foreign key constraint seperti SQL, sehingga aplikasi tetap perlu menjaga
validitas relasi.

## Membuat Data Awal

Gunakan upsert agar startup berulang tidak membuat dokumen duplikat:

```ts
await CountryModel.updateOne(
  { externalId: 'ID' },
  {
    $setOnInsert: {
      externalId: 'ID',
      name: 'Indonesia',
      code: 'ID',
    },
  },
  {
    upsert: true,
  },
);
```

Flow:

```text
Hubungkan MongoDB
        ↓
Jalankan seed dengan upsert
        ↓
Buat dokumen hanya jika belum ada
        ↓
Jalankan Express
```

Hindari `Model.create()` pada setiap startup jika dokumen harus unik.

## Penyimpanan Gambar

Untuk tahap awal, simpan URL gambar pada MongoDB:

```ts
logoUrl?: string;
flagUrl?: string;
```

Object storage seperti MinIO belum diperlukan jika aplikasi hanya menggunakan
URL logo dari sumber.

Gunakan MinIO atau object storage kompatibel S3 ketika:

- Sistem perlu memiliki salinan gambarnya sendiri.
- URL sumber tidak boleh menjadi ketergantungan.
- File harus dikelola, dibatasi aksesnya, atau disajikan dari storage sendiri.

Jika object storage digunakan, MongoDB hanya menyimpan metadata:

```ts
export interface ImageAsset {
  bucket: string;
  objectKey: string;
  contentType: string;
  size: number;
  publicUrl?: string;
}
```

Flow penyimpanan:

```text
Terima atau unduh file
        ↓
Upload binary ke object storage
        ↓
Simpan objectKey dan metadata di MongoDB
```

Jangan menyimpan binary gambar langsung dalam model utama. GridFS tersedia
untuk kebutuhan file di MongoDB, tetapi object storage biasanya lebih sesuai
untuk aset gambar aplikasi.

## Debug di Cursor

Cursor menggunakan debugger yang kompatibel dengan VS Code. Buat
`.vscode/launch.json` di root workspace:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Soccer Scrapper",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/soccer-scrapper/node_modules/.bin/tsx",
      "program": "${workspaceFolder}/soccer-scrapper/src/server.ts",
      "cwd": "${workspaceFolder}/soccer-scrapper",
      "envFile": "${workspaceFolder}/soccer-scrapper/.env",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": [
        "<node_internals>/**",
        "${workspaceFolder}/soccer-scrapper/node_modules/**"
      ]
    }
  ]
}
```

Pasang breakpoint di sebelah nomor baris, buka **Run and Debug**, pilih
**Debug Soccer Scrapper**, lalu tekan `F5`.
