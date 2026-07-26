# Gosoccer Scrapper

API scraper berbasis Node.js, Express, TypeScript, dan Puppeteer.

## Flow Migrasi JavaScript ke TypeScript

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

Setiap langkah pada flow tersebut dijelaskan pada section berikut.

## 1. Instal TypeScript dan Type Definitions

### Penjelasan

TypeScript tidak harus dipasang secara global. TypeScript sebaiknya dipasang
sebagai development dependency lokal agar setiap developer menggunakan versi
yang sama sesuai `package.json`.

Package `@types` menyediakan informasi tipe untuk library JavaScript. Express,
Node.js, dan CORS memerlukan package tersebut agar TypeScript mengenali API,
parameter, dan object yang tersedia.

### Perintah

```bash
npm install -D typescript tsx @types/node @types/express @types/cors
```

`-D` adalah singkatan dari `--save-dev`, bukan global. Instalasi global
menggunakan `-g`.

### Fungsi Package

| Package | Fungsi |
| --- | --- |
| `typescript` | Memeriksa dan mengompilasi TypeScript |
| `tsx` | Menjalankan file TypeScript saat development |
| `@types/node` | Menyediakan tipe API Node.js |
| `@types/express` | Menyediakan tipe Express |
| `@types/cors` | Menyediakan tipe middleware CORS |

### Hasil

Package tersebut tercatat di `devDependencies` dan dapat digunakan melalui
script NPM tanpa instalasi global.

## 2. Buat `tsconfig.json`

### Penjelasan

`tsconfig.json` adalah konfigurasi compiler TypeScript. File ini menentukan
lokasi source, lokasi output, versi JavaScript tujuan, module system, dan aturan
pemeriksaan tipe.

### Konfigurasi

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
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

### Properti Penting

| Properti | Fungsi |
| --- | --- |
| `rootDir` | Menentukan folder source TypeScript |
| `outDir` | Menentukan folder JavaScript hasil build |
| `strict` | Mengaktifkan pemeriksaan tipe yang ketat |
| `esModuleInterop` | Memudahkan import package CommonJS |
| `include` | Menentukan file yang diperiksa |
| `exclude` | Menentukan folder yang tidak diperiksa |

### Hasil

TypeScript mengetahui bahwa source berasal dari `src` dan hasil build harus
ditulis ke `dist`.

```text
src/*.ts → TypeScript compiler → dist/*.js
```

## 3. Ubah File `.js` Menjadi `.ts`

### Penjelasan

Ekstensi `.ts` menandakan bahwa file merupakan source TypeScript. Migrasi dapat
dilakukan bertahap dari entry point sampai service.

### Perubahan File

```text
src/server.js                         → src/server.ts
src/app.js                            → src/app.ts
src/routes/scrape.routes.js           → src/routes/scrape.routes.ts
src/controllers/scrape.controller.js  → src/controllers/scrape.controller.ts
src/services/scraper.service.js       → src/services/scraper.service.ts
src/middlewares/error-handler.js      → src/middlewares/error-handler.ts
```

File `.js` lama dihapus setelah isinya dipindahkan. Jangan menyimpan file `.js`
dan `.ts` dengan nama modul yang sama karena module resolver dapat memilih file
yang tidak diharapkan.

### Hasil

Seluruh source di dalam `src` menggunakan TypeScript:

```text
src/
├── controllers/
│   └── scrape.controller.ts
├── middlewares/
│   └── error-handler.ts
├── routes/
│   └── scrape.routes.ts
├── services/
│   └── scraper.service.ts
├── app.ts
└── server.ts
```

## 4. Ubah `require` Menjadi `import`

### Penjelasan

Source JavaScript lama menggunakan `require` dari CommonJS. Pada source
TypeScript, dependency dan module lokal diimpor menggunakan sintaks `import`.

### Sebelum

```js
const express = require('express');
const app = require('./app');
```

### Sesudah

```ts
import express from 'express';
import app from './app';
```

Untuk nilai yang hanya dipakai sebagai tipe, gunakan `import type`:

```ts
import type { RequestHandler } from 'express';
```

`import type` tidak menghasilkan import runtime pada JavaScript hasil build.

### Hasil

Dependency dan hubungan antar-file dapat dianalisis oleh TypeScript. Editor juga
dapat menyediakan autocomplete dan pemeriksaan nama export.

## 5. Ubah `module.exports` Menjadi `export`

### Penjelasan

Cara mengimpor sebuah nilai harus sesuai dengan cara nilai tersebut di-export.
Ada dua bentuk export, yaitu default export dan named export.

### Default Export

Sebelum:

```js
module.exports = app;
```

Sesudah:

```ts
export default app;
```

Import-nya tidak memakai kurung kurawal:

```ts
import app from './app';
```

### Named Export

Sebelum:

```js
module.exports = { scrape };
```

Sesudah:

```ts
export { scrape };
```

Import-nya memakai kurung kurawal:

```ts
import { scrape } from './services/scraper.service';
```

### Hasil

Semua module menggunakan pola import dan export yang konsisten:

```text
server → app → route → controller → service
```

Default import dan named import tidak boleh tertukar. Bentuk yang tidak cocok
dapat menghasilkan nilai `undefined` saat runtime.

## 6. Tambahkan Tipe Parameter dan Hasil Fungsi

### Penjelasan

TypeScript memeriksa bentuk data yang diterima dan dikembalikan oleh fungsi.
Tipe membantu menemukan kesalahan sebelum aplikasi dijalankan.

### Sebelum

```js
async function scrape(url) {
  // ...
}
```

### Sesudah

```ts
type ScrapeResult = {
  title: string;
  url: string;
  text: string;
};

async function scrape(url: string): Promise<ScrapeResult> {
  // ...
}
```

Express handler dapat menggunakan tipe dari Express:

```ts
import type { RequestHandler } from 'express';

export const scrapePage: RequestHandler = async (req, res, next) => {
  // ...
};
```

Input HTTP tetap harus divalidasi karena nilainya baru diketahui saat runtime:

```ts
if (typeof req.query.url !== 'string' || !req.query.url) {
  res.status(400).json({
    message: 'Query parameter "url" is required',
  });
  return;
}
```

### Hasil

Parameter, hasil fungsi, request Express, dan bentuk response lebih jelas.
Kesalahan tipe dapat ditemukan oleh editor atau perintah `typecheck`.

## 7. Perbarui Script `package.json`

### Penjelasan

Development dan production menggunakan flow yang berbeda. Development dapat
menjalankan TypeScript dengan `tsx`, sedangkan production menjalankan
JavaScript hasil build dari folder `dist`.

### Konfigurasi

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

### Fungsi Script

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan TypeScript dan restart saat source berubah |
| `npm run typecheck` | Memeriksa tipe tanpa membuat file JavaScript |
| `npm run build` | Mengompilasi TypeScript ke folder `dist` |
| `npm start` | Menjalankan JavaScript hasil build |

### Hasil

Proyek memiliki perintah terpisah untuk development, pemeriksaan tipe, build,
dan production.

## 8. Jalankan Typecheck

### Penjelasan

Typecheck memeriksa semua file TypeScript tanpa menjalankan aplikasi dan tanpa
menghasilkan file JavaScript.

### Perintah

```bash
npm run typecheck
```

Script tersebut menjalankan:

```bash
tsc --noEmit
```

Jika ada tipe parameter yang salah, import yang tidak tersedia, atau hasil
fungsi yang tidak sesuai, TypeScript akan menampilkan lokasi error.

### Hasil

Jika perintah selesai tanpa error, source lolos pemeriksaan tipe dan siap
dibuild.

## 9. Build TypeScript ke JavaScript

### Penjelasan

Node.js production menjalankan JavaScript. Compiler `tsc` mengubah source
TypeScript dari `src` menjadi JavaScript di `dist`.

### Perintah

```bash
npm run build
```

### Proses

```text
tsc membaca tsconfig.json
            ↓
memeriksa file src/**/*.ts
            ↓
mengompilasi TypeScript
            ↓
menulis JavaScript ke dist
```

Contoh hasil:

```text
src/server.ts → dist/server.js
src/app.ts    → dist/app.js
```

### Hasil

Folder `dist` berisi JavaScript yang siap dijalankan oleh Node.js. Folder ini
merupakan hasil build dan tidak perlu diedit secara manual.

## 10. Jalankan JavaScript dari `dist`

### Penjelasan

Setelah build berhasil, aplikasi production dijalankan dari JavaScript di
folder `dist`, bukan langsung dari source `.ts`.

### Perintah

```bash
npm start
```

Script tersebut menjalankan:

```bash
node dist/server.js
```

### Flow Production

```text
npm run typecheck
        ↓
npm run build
        ↓
src/*.ts dikompilasi menjadi dist/*.js
        ↓
npm start
        ↓
Node.js menjalankan dist/server.js
```

### Hasil

Server production berjalan menggunakan JavaScript hasil kompilasi yang sudah
lolos pemeriksaan TypeScript.

## Menjalankan Saat Development

Saat development, build manual tidak diperlukan:

```bash
npm run dev
```

Flow development:

```text
npm run dev
      ↓
tsx watch src/server.ts
      ↓
server.ts mengimpor app.ts
      ↓
app.ts memasang middleware dan routes
      ↓
route memanggil controller
      ↓
controller memanggil service
      ↓
tsx restart otomatis saat source berubah
```

## Environment

Buat `.env` dari file contoh:

```bash
cp .env.example .env
```

```dotenv
PORT=3000
PUPPETEER_HEADLESS=true
```

## Koneksi ke MongoDB

### 1. Jalankan MongoDB dengan Docker

Buat `docker-compose.yml` di root proyek:

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
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: gosoccer
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

Jalankan container:

```bash
docker compose up -d
```

Cek status container:

```bash
docker compose ps
```

Data MongoDB disimpan di volume `mongodb_data`, sehingga tidak hilang ketika
container dihentikan atau dibuat ulang.

### 2. Tambahkan Connection String

Tambahkan `MONGODB_URI` ke `.env`:

```dotenv
PORT=3000
PUPPETEER_HEADLESS=true
MONGODB_URI=mongodb://admin:admin123@localhost:27017/gosoccer?authSource=admin
```

Tambahkan juga key tanpa nilai rahasia ke `.env.example`:

```dotenv
MONGODB_URI=mongodb://username:password@localhost:27017/database?authSource=admin
```

Penjelasan connection string:

| Bagian | Fungsi |
| --- | --- |
| `admin:admin123` | Username dan password MongoDB |
| `localhost:27017` | Host dan port MongoDB |
| `gosoccer` | Database yang digunakan aplikasi |
| `authSource=admin` | Database tempat root user melakukan autentikasi |

File `.env` tidak boleh dimasukkan ke Git karena berisi kredensial.

### 3. Instal Mongoose

Mongoose digunakan untuk membuat koneksi, schema, model, dan query MongoDB dari
aplikasi Node.js.

```bash
npm install mongoose
```

Mongoose sudah menyediakan tipe TypeScript, sehingga tidak perlu memasang
`@types/mongoose`.

### 4. Buat Modul Koneksi

Buat `src/config/database.ts`:

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

Pemeriksaan `MONGODB_URI` diperlukan karena environment variable dapat bernilai
`undefined`. Fungsi mengembalikan `Promise<void>` karena proses koneksi berjalan
secara asynchronous.

### 5. Hubungkan Database Sebelum Server Berjalan

Perbarui `src/server.ts` agar Express baru menerima request setelah koneksi
MongoDB berhasil:

```ts
import 'dotenv/config';

import app from './app';
import { connectDatabase } from './config/database';

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

Flow koneksi:

```text
npm run dev
      ↓
server.ts membaca .env
      ↓
connectDatabase membaca MONGODB_URI
      ↓
Mongoose terhubung ke container MongoDB
      ↓
Express membuka port HTTP
```

Jika koneksi gagal, server tidak dibuka dan aplikasi berhenti dengan exit code
`1`. Hal ini mencegah API menerima request ketika database belum tersedia.

### 6. Verifikasi MongoDB

Lihat log container:

```bash
docker compose logs -f mongodb
```

Masuk ke MongoDB shell:

```bash
docker exec -it gosoccer-mongodb mongosh \
  -u admin \
  -p admin123 \
  --authenticationDatabase admin
```

Setelah masuk ke `mongosh`, pilih database:

```javascript
use gosoccer
```

Tampilkan collection:

```javascript
show collections
```

### 7. Menghentikan MongoDB

Hentikan dan hapus container tanpa menghapus data:

```bash
docker compose down
```

Hentikan container sekaligus hapus seluruh data MongoDB:

```bash
docker compose down -v
```

Opsi `-v` menghapus volume `mongodb_data`. Gunakan hanya ketika data memang
boleh dihapus.

## Endpoint

Health check:

```http
GET /health
```

Scrape halaman:

```http
GET /api/scrape?url=https://example.com
```

Contoh request:

```bash
curl "http://localhost:3000/api/scrape?url=https://example.com"
```
