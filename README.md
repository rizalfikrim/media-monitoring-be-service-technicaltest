# Media Monitoring Backend

Backend service sederhana untuk media monitoring: menerima data mention (artikel & social media) secara bulk, membersihkan & menormalkan data mentah, mencegah duplikasi, menyimpannya ke PostgreSQL, lalu menyajikan endpoint pencarian dan statistik.

Proyek ini adalah **technical assessment** yang dikerjakan secara bertahap dan terkontrol (Stage 1–8), dengan setiap stage direview dan disetujui oleh developer sebelum lanjut. Tujuan utama penilaian adalah kualitas desain backend, desain schema, normalisasi data, idempotency, desain query, dan kemampuan menjelaskan trade-off.

---

## 1. Overview

Masalah yang diselesaikan: data media mention mentah datang dari berbagai sumber dalam format yang tidak konsisten — duplikat, raw HTML, format tanggal berbeda, angka dalam bentuk string, data tidak lengkap, dan beberapa perbedaan kecil lain antar sumber.

Backend ini menangani alur berikut:

```
Mention mentah
  → validasi
  → normalisasi (teks, source, HTML, tanggal, engagement)
  → deteksi duplikasi (dedupe key)
  → penyimpanan ke PostgreSQL
  → API pencarian & statistik
```

Hasilnya: data tersimpan **bersih dan konsisten**, setiap mention logis hanya tersimpan **satu kali**, dan pengiriman ulang batch yang sama **aman (idempotent)**.

---

## 2. Key Features

| Fitur | Keterangan |
|---|---|
| Bulk ingestion | `POST /internal/mentions/bulk` menerima banyak record sekaligus |
| Normalisasi | trim, normalisasi spasi, source lowercase, strip HTML, parse tanggal, parse engagement |
| Validasi | request validation (Zod) + business validation (source wajib, title/content wajib minimal satu) |
| Duplikasi & idempotency | `dedupe_key` SHA-256 + `UNIQUE` constraint di database; pengiriman ulang tidak membuat baris baru |
| Search | `GET /mentions` dengan keyword, filter source, filter rentang tanggal |
| Pagination | `page`/`limit` dengan metadata `total` & `totalPages`, max `limit` 100 |
| Date filtering | tanggal bisa berupa date-only atau datetime penuh; `to` date-only bersifat inklusif hingga akhir hari |
| Statistics | `GET /mentions/stats?group_by=source\|day` |
| Error handling konsisten | 400/404/500 semuanya JSON dengan format sama; tidak ada stack trace bocor ke client |
| Automated tests | 12 file test, unit + repository + service + HTTP integration + seed fidelity |

---

## 3. Architecture

Aliran request:

```
HTTP route
  → controller
  → service
  → repository
  → PostgreSQL
```

| Layer | Tanggung jawab |
|---|---|
| `routes/` | Mendefinisikan HTTP method & path, menghubungkan ke controller |
| `controllers/` | Memvalidasi request/query via Zod, memanggil service, membentuk HTTP response. Tetap tipis |
| `services/` | Business logic: normalisasi, business validation, dedupe key, mapping response |
| `repositories/` | Semua SQL (insert, search, count, stats). Satu-satunya layer yang menyentuh database |
| `utils/` | Fungsi murni: teks, tanggal, dedupe, engagement |

Normalisasi & validasi bisnis terjadi di **service layer**; request/query validation di **controller layer** (lewat schema Zod); SQL hanya ada di **repository layer**.

---

## 4. Tech Stack

| Teknologi | Peran |
|---|---|
| Node.js (>= 20) | Runtime |
| TypeScript | Type safety, strict mode |
| Express | HTTP framework |
| PostgreSQL | Penyimpanan persistent |
| pg | Akses PostgreSQL (tanpa ORM; schema eksplisit lewat SQL migration) |
| Zod | Validasi request body & query parameter |
| he | Decode entity HTML saat strip HTML |
| Vitest | Test runner |
| tsx | Menjalankan TypeScript langsung saat development |
| Docker / Docker Compose | Lingkungan PostgreSQL lokal (opsional, jalur ideal reviewer) |

---

## 5. Project Structure

```
.
├── src/
│   ├── app.ts                  # Express app + global error/404 handler
│   ├── server.ts               # Bootstrap server
│   ├── config/                 # env & database pool
│   ├── routes/                 # route definitions
│   ├── controllers/            # HTTP controllers
│   ├── services/               # business logic
│   ├── repositories/           # SQL queries
│   ├── schemas/                # Zod schemas
│   ├── utils/                  # text/date/dedupe/engagement
│   ├── types/                  # shared TypeScript types
│   └── *.test.ts               # test colocated
├── migrations/                 # SQL migration (001_create_mentions.sql)
├── scripts/                    # migrate.ts, verify-db.ts
├── seed_mentions.json          # sample data mentah (15 record)
├── docker-compose.yml          # PostgreSQL lokal
├── .env.example                # template environment variables
├── package.json
└── tsconfig.json
```

Test file berada di samping kode yang diuji (`*.test.ts`).

---

## 6. Setup

Prasyarat: Node.js >= 20, Docker (untuk PostgreSQL lokal), dan npm.

```bash
# 1. Install dependencies
npm install

# 2. Siapkan environment
cp .env.example .env        # Windows: copy .env.example .env

# 3. Jalankan PostgreSQL (Docker Compose)
npm run db:up

# 4. Jalankan migration (membuat tabel mentions)
npm run migrate

# 5. (Opsional) verifikasi schema database
npm run db:verify

# 6a. Development server (watch mode)
npm run dev

# 6b. Atau production build + start
npm run build
npm start
```

Semua command di atas sesuai script yang ada di `package.json`.

---

## 7. Environment Variables

Template lengkap ada di `.env.example` (sudah ter-commit). Nilai pada `.env.example` adalah kredensial **lokal Docker development** saja, bukan secret produksi.

```
PORT=3000
DATABASE_URL=postgresql://monitor:monitor@localhost:5433/media_monitoring
```

| Variable | Wajib | Keterangan |
|---|---|---|
| `PORT` | Tidak (default `3000`) | Port HTTP server; harus integer 1–65535 |
| `DATABASE_URL` | Ya | Connection string `postgresql://...`; divalidasi saat startup |

`.env` tidak ter-commit (ada di `.gitignore`).

---

## 8. Database

Satu tabel utama: `mentions` (detail lengkap di `DATABASE.md`).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGSERIAL | Primary key |
| `external_id` | TEXT | ID dari sumber asal |
| `source` | TEXT (NOT NULL) | Source ternormalisasi (lowercase) |
| `title` | TEXT | Judul |
| `content` | TEXT | Konten bersih (HTML sudah di-strip) |
| `url` | TEXT | URL asli |
| `author` | TEXT | Penulis/akun |
| `published_at` | TIMESTAMPTZ | Waktu terbit (bisa NULL) |
| `engagement` | BIGINT | Nilai engagement (bisa NULL) |
| `dedupe_key` | CHAR(64) (NOT NULL, UNIQUE) | SHA-256 untuk deteksi duplikasi |
| `created_at` | TIMESTAMPTZ | Waktu record masuk (default now) |

Index: `idx_mentions_source` (source), `idx_mentions_published_at` (published_at DESC).

---

## 9. Data Processing

Setiap record mentah melewati pipeline berikut:

```
Raw input
  → schema validation (struktur record)
  → normalisasi teks (trim + collapse whitespace)
  → normalisasi source (lowercase)
  → strip HTML pada content (termasuk script/style/comment, entity decode)
  → parse tanggal (published_at)
  → parse engagement
  → business validation
  → generate dedupe key
  → insert ke database
```

Behavior untuk nilai invalid/missing (keputusan yang disetujui developer):

| Kasus | Perilaku |
|---|---|
| `source` kosong setelah normalisasi | **Record ditolak** (rejected) |
| `title` dan `content` sama-sama kosong/null | **Record ditolak** (rejected) |
| `published_at` tidak ada / null / string kosong | Disimpan sebagai **NULL**, record tetap valid |
| `published_at` invalid (tidak bisa di-parse) | **Record ditolak** (rejected) |
| datetime tanpa timezone (naive) | Dianggap **UTC** |
| `published_at` numerik (epoch detik) | Dikonversi ke timestamp |
| `engagement` invalid / bukan angka non-negatif / non-numeric string | Disimpan sebagai **NULL** |
| `engagement` numeric string (mis. `"1,204"`, `"3,402"`) | Diparse menjadi angka |
| HTML pada content | Di-strip sebelum disimpan |
| spasi berlebih / whitespace | Dinormalisasi (collapse) |
| source huruf campuran / spasi | Dinormalisasi ke lowercase + trim |

Prinsip normalisasi: **normalize for consistency, do not invent data, do not change meaning.** Tidak ada fuzzy matching source.

---

## 10. Deduplication & Idempotency

Dua mention dianggap duplikat jika menghasilkan `dedupe_key` yang sama.

```
dedupe_key = SHA-256(
  normalized source +
  normalized title +
  normalized content +
  normalized published_at (ISO)
)
```

Detail:
- Input key menggunakan **huruf kecil** (case-insensitive) untuk source, title, dan content.
- **Engagement TIDAK termasuk** dalam dedupe key.
- Hash disimpan di kolom `dedupe_key` dengan constraint `UNIQUE` di database.

**Contoh intentional dari seed data:** record `str-99120` muncul dua kali dengan nilai engagement berbeda (412 dan 415) tetapi source, title, content, dan published_at identik → keduanya dianggap mention yang sama → **hanya satu baris yang disimpan**.

Alur idempotency: database adalah lapisan proteksi utama. Insert memakai `INSERT ... ON CONFLICT (dedupe_key) DO NOTHING` dalam satu transaction — tidak ada SELECT-then-INSERT yang rentan race condition. Mengirim batch yang sama dua kali menghasilkan jumlah duplicate, bukan baris ganda.

---

## 11. API Documentation

Semua response memiliki bentuk konsisten: `{"success": true|false, ...}`. Semua response pada endpoint search/stats menggunakan **camelCase** untuk field response.

### POST /internal/mentions/bulk

Menerima array record mention mentah. Field record sesuai `seed_mentions.json`: `external_id`, `source`, `title`, `content`, `url`, `author`, `published_at`, `engagement`.

- Body harus berupa **array** minimal 1 elemen (array kosong → **400**).
- Setiap record divalidasi & dinormalisasi; record invalid dihitung sebagai `rejected`, tidak menggagalkan batch.
- Response 200:

```json
{
  "success": true,
  "data": {
    "received": 15,
    "inserted": 14,
    "duplicates": 1,
    "rejected": 0
  }
}
```

- Contoh request:

```bash
curl.exe -s -X POST http://localhost:3000/internal/mentions/bulk \
  -H "Content-Type: application/json" \
  --data-binary "@seed_mentions.json"
```

Idempotent: mengirim payload sama lagi → `inserted: 0`, `duplicates: 15`.

### GET /mentions

Mencari & memfilter mention. Parameter:

| Parameter | Default | Keterangan |
|---|---|---|
| `q` | - | Keyword, case-insensitive, dicari di `title` OR `content` (`ILIKE` dengan escape `%`/`_`) |
| `source` | - | Filter source **eksak** terhadap source ternormalisasi (lowercase) |
| `from` | - | Batas bawah `published_at >= from` |
| `to` | - | Batas atas `published_at <= to` |
| `page` | `1` | Halaman; harus >= 1 |
| `limit` | `20` | Jumlah per halaman; 1–100 |

Aturan penting:
- `from`/`to` menerima date-only (`YYYY-MM-DD`) atau datetime penuh. **`to` date-only bersifat inklusif hingga akhir hari** (`23:59:59.999Z`); `from` date-only dimulai dari `00:00:00.000Z`.
- Record dengan `published_at = NULL` tidak masuk hasil filter tanggal.
- `from` tidak boleh lebih besar dari `to` (400).
- Sorting stabil: `published_at DESC NULLS LAST, id DESC`.
- Hasil kosong → **200** dengan `data: []` (bukan 404).

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "externalId": "nst-40199",
      "source": "new straits times",
      "title": "Tourism arrivals up 12 per cent year-on-year",
      "content": "Malaysia recorded 2.4 million international arrivals in July, said Tourism Malaysia.",
      "url": "https://www.nst.com.my/news/nation/2026/08/tourism-arrivals-july",
      "author": "Bernama",
      "publishedAt": "2026-08-15T09:45:00.000Z",
      "engagement": 61,
      "createdAt": "2026-08-19T12:25:42.131Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 14, "totalPages": 1 }
}
```

### GET /mentions/stats

`group_by` **wajib** ada. Nilai yang diterima: `source` atau `day` (selain itu → 400).

- `group_by=source` → `GROUP BY source`, urut `count DESC, source ASC`.
- `group_by=day` → `GROUP BY` tanggal dalam **UTC** (`YYYY-MM-DD`), urut ascending. Record dengan `published_at = NULL` tidak dihitung.

Response:

```json
{
  "success": true,
  "group_by": "source",
  "data": [
    { "key": "the star", "count": 4 },
    { "key": "new straits times", "count": 3 }
  ]
}
```

---

## 12. Error Handling

Semua error dikembalikan sebagai JSON dengan format konsisten:

| Kondisi | Status | Response |
|---|---|---|
| Body/query invalid | 400 | `{ "success": false, "message": "...", "errors": [{"field","message"}] }` |
| JSON body malformed | 400 | `{ "success": false, "message": "Invalid JSON body" }` |
| Route tidak dikenal | 404 | `{ "success": false, "message": "Route not found" }` |
| Error server tak terduga | 500 | `{ "success": false, "message": "Internal server error" }` |

Detail teknis (stack trace, error database, kredensial) hanya dicatat ke **server log**, tidak pernah bocor ke client.

---

## 13. Testing

Strategi: **risk-based, bukan mengejar coverage**. Prioritas pada duplicate/idempotency, normalisasi, HTML cleaning, dan date parsing; kemudian search, pagination, dan stats.

| Jenis | Cakupan |
|---|---|
| Unit test | `src/utils/` — teks, source, HTML, tanggal, engagement, dedupe key |
| Schema test | `src/schemas/` — validasi body & query |
| Repository/database test | `src/repositories/` — insert + ON CONFLICT, search/filter/pagination, stats |
| Service test | `src/services/` — pipeline normalisasi, bulk summary, idempotency, search mapping, stats |
| HTTP integration test | `src/app.test.ts` — semua endpoint via server nyata (`app.listen(0)` + `fetch`) |
| Seed-fidelity test | `src/services/mention.seed.test.ts` — seed asli 15 → 14 inserted + 1 duplicate |

Command:

```bash
npm test          # vitest run (butuh PostgreSQL berjalan)
npm run typecheck # tsc --noEmit
npm run build     # tsc
```

Hasil terakhir: **12 file test, 81 test, semua lulus** (diverifikasi pada Stage 7 & Stage 8). Test yang menyentuh database memakai data isolasi (source unik) dan dibersihkan setelahnya.

---

## 14. Seed Data Verification

`seed_mentions.json` berisi **15 record** mentah yang merepresentasikan keragaman data nyata:

- HTML + entity (`&nbsp;`, `&quot;`), termasuk `<script>` di salah satu content.
- 5 format tanggal: ISO dengan `Z`, naive tanpa timezone, `+08:00`, epoch detik, `DD/MM/YYYY`, dan `null`.
- Engagement dalam bentuk angka dan string (`"1,204"`, `"3,402"`).
- Duplikat intentional: `str-99120` dua kali dengan engagement berbeda (412 & 415).
- Variasi penulisan source (`The Star`, `thestar`, `TWITTER`, `instagram`, `malaysiakini ` dengan spasi).

Hasil ingestion seed: **received 15, inserted 14, duplicates 1, rejected 0** — dibuktikan oleh seed-fidelity test dan verifikasi manual. Field `external_id`, `url`, dan `author` terpersist dengan benar (tidak hilang).

---

## 15. Design Decisions & Trade-offs

| Keputusan | Alasan | Trade-off |
|---|---|---|
| Schema diperluas (`external_id`, `url`, `author`, `engagement`) | Field tersebut ada di data mentah; menyimpannya mencegah kehilangan informasi | Kolom nullable, tidak ada relasi FK |
| `engagement` tidak termasuk dedupe key | Dua duplikat bisa beda engagement (lihat `str-99120`); engagement bukan identitas mention | Perubahan engagement pada mention yang sama tidak membuat record baru |
| Tanggal invalid → record ditolak | Menghindari data kotor; nilai NULL hanya untuk missing date, bukan error | Data dengan tanggal rusak tidak tersimpan |
| Datetime naive dianggap UTC | Perilaku deterministik & dokumentasi PRD | Waktu lokal aktual sumber bisa bergeser (tidak diketahui) |
| Engagement parse gagal → NULL | Tidak menggagalkan record hanya karena metrik; konsisten dengan missing date | Informasi engagement hilang untuk record tersebut |
| Tidak ada fuzzy matching source | Menyatukan entitas berbeda secara salah lebih berbahaya daripada pisah | `thestar` vs `The Star` vs `The Star (Website)` tidak otomatis digabung |
| `to` date-only inklusif akhir hari | Intuitif untuk filter "sampai tanggal X" | Boundary harus jelas (23:59:59.999Z) |
| Response API camelCase | Standar umum API; PRD menyebut contoh camelCase | Berbeda dengan nama kolom DB (snake_case) |
| `group_by` wajib | Mencegah pemanggilan tanpa konteks agregasi; behavior eksplisit | Satu request tambahan bila ingin kedua jenis |
| Group day dalam UTC | Timestamp tersimpan UTC; konsisten dan bebas zona | Bukan "hari lokal" sumber |
| Search memakai `ILIKE` | Sederhana, cukup untuk dataset assessment | Bukan full-text search; kurang optimal untuk dataset besar |

---

## 16. Security / Quality Considerations

- **Parameterized SQL** di semua query (`$1`, `$2`, ...) — tidak ada interpolasi input user ke SQL; wildcard `%`/`_` di-escape.
- **Validasi input** di setiap endpoint (Zod) sebelum menyentuh business logic.
- **Konfigurasi berbasis environment** (`PORT`, `DATABASE_URL`); `.env` tidak ter-commit, tidak ada kredensial di source code.
- **Pagination dibatasi** (`limit` maksimum 100).
- **Response error aman**: detail teknis hanya di server log.
- **Duplicate protection di level database** (UNIQUE constraint), bukan hanya aplikasi.
- Tidak ada authentication/authorization — **sengaja tidak ada** (di luar scope).

---

## 17. Scope / Non-Goals

Yang **tidak** diimplementasikan (sesuai scope assessment):

- Authentication / authorization / JWT / user management.
- Sentiment analysis, machine learning, AI/NLP.
- Frontend/dashboard.
- Infrastruktur tambahan (Redis, Elasticsearch, queue, microservices, K8s).
- Endpoint di luar tiga yang ditentukan (tidak ada `/health`, tidak ada CRUD).
- Full-text search PostgreSQL.
- Crawler/pengumpul data eksternal (data masuk via API bulk).

---

## 18. Quick Reviewer Checklist

```bash
npm install                 # install dependencies
cp .env.example .env        # configure environment
npm run db:up               # start PostgreSQL
npm run migrate             # run migration
npm test                    # run tests (81 passed)
npm run dev                 # start server (atau npm run build && npm start)
```

- [x] Install dependencies
- [x] Configure environment
- [x] Start PostgreSQL
- [x] Run migration
- [x] Run tests
- [x] Start server
- [x] Test bulk ingestion
- [x] Test search
- [x] Test statistics

---

## 19. Waktu Pengerjaan

Proyek dikerjakan secara bertahap dalam 8 stage yang masing-masing direview developer:

| Stage | Fokus | Status |
|---|---|---|
| 1 | Project setup | Selesai & disetujui |
| 2 | Database setup | Selesai & disetujui |
| 3 | Data processing | Selesai & disetujui |
| 4 | Bulk ingestion API | Selesai & disetujui |
| 5 | Search API | Selesai & disetujui |
| 6 | Statistics API | Selesai & disetujui |
| 7 | Testing & quality review | Selesai & disetujui |
| 8 | Documentation | Selesai |

> Total jam pengerjaan persis: **needs developer confirmation** (belum tercatat akurat di repository).

---

## 20. Dengan Satu Minggu Lagi, Saya Akan...

- Menambahkan full-text search PostgreSQL (`tsvector`) untuk keyword search yang lebih baik.
- Menambah migration versioning yang lebih formal (tabel `schema_migrations`) untuk migrasi yang benar-benar idempotent & terurut.
- Menambahkan validasi `engagement` dan `published_at` yang lebih ketat berdasarkan kebutuhan sumber data nyata.
- Menambahkan indeks komposit `(source, published_at)` jika pola query search dominan memakai kombinasi keduanya.
- Menambahkan lapisan observasi sederhana (structured logging + query timing) untuk memudahkan debugging.
- Menerapkan rate limiting / ukuran body limit pada endpoint internal bulk.

---

## 21. Assessment Traceability

| Requirement Assessment | Implementasi | Test / Verifikasi |
|---|---|---|
| Bulk ingestion | `POST /internal/mentions/bulk` → `processBulkMentions` → `bulkInsertMentions` | `src/app.test.ts` (HTTP), `src/repositories/mention.repository.test.ts` (insert/ON CONFLICT), `src/services/mention.service.test.ts` (summary), verifikasi manual curl seed |
| Duplication / idempotency | `dedupe_key` SHA-256 + `UNIQUE` constraint + `ON CONFLICT DO NOTHING` | `mention.seed.test.ts` (15→14+1), `mention.repository.test.ts` (idempotency), `mention.service.test.ts` (duplicate) |
| Normalization & HTML cleaning | `src/utils/text.ts`, `src/utils/date.ts`, `src/utils/engagement.ts` | `src/utils/*.test.ts` (23 unit test) |
| Search | `GET /mentions` → dynamic WHERE + `ILIKE` escape + stable sort | `mention.repository.search.test.ts`, `mention.search.test.ts`, `src/app.test.ts` |
| Pagination & date filter | Zod schema (`page`/`limit`/`from`/`to`), `LIMIT/OFFSET`, count query | `mention.schema.test.ts`, `mention.repository.search.test.ts`, `src/app.test.ts` |
| Statistics | `GET /mentions/stats` → `statsBySource` / `statsByDay` (UTC) | `mention.repository.stats.test.ts`, `mention.stats.test.ts`, `src/app.test.ts` |
| Error handling | Global `notFoundHandler` + `errorHandler` di `src/app.ts` | `src/app.test.ts` (404, malformed JSON 400, 500) |
| Validasi | Zod `bulkMentionSchema`, `searchMentionsQuerySchema`, `statsQuerySchema` | `mention.schema.test.ts`, `src/app.test.ts` (400 cases) |
| Extended fields persist | INSERT 9 kolom (termasuk `external_id`, `url`, `author`, `engagement`) | `mention.seed.test.ts` (assert non-null), `mention.repository.test.ts` |