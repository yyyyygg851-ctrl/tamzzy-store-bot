import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

import pino from "pino";
import http from "http";

const PORT = process.env.PORT || 10000;
const BOT_NUMBER = "6285122688033"; (process.env.BOT_NUMBER || "").replace(/\D/g, "");

const logger = pino({
  level: "silent"
});

const MENU = `👋 WELCOME TO TAMZZY STORE

Halo! Terima kasih sudah menghubungi TAMZZY STORE.

Kami menyediakan berbagai produk digital & jasa dengan proses yang cepat dan pelayanan yang siap membantu kebutuhan Anda.

━━━━━━━━━━━━━━━━━━
📌 MENU UTAMA
━━━━━━━━━━━━━━━━━━

Ketik salah satu angka berikut:

1 → 🛒 ORDER PRODUK
2 → 📋 KATALOG & HARGA
3 → 📦 CEK PESANAN
4 → 💳 INFO PEMBAYARAN
5 → 💬 HUBUNGI ADMIN
6 → ❓ BANTUAN

━━━━━━━━━━━━━━━━━━
🤖 AUTO RESPONSE
━━━━━━━━━━━━━━━━━━

Silakan balas dengan angka 1–6.

✨ TAMZZY STORE
Fast Process • Trusted Service • Digital Solution

Terima kasih telah memilih TAMZZY STORE.`;

const RESPONSES = {
  "1": `🛒 FORM ORDER TAMZZY STORE

Produk:
Nama/Username:
ID/Detail:
Paket/Nominal:

Silakan isi data di atas dengan lengkap.

Setelah itu admin akan mengecek pesanan dan memberikan total pembayaran.`,

  "2": `📋 KATALOG & HARGA TAMZZY STORE

Silakan ketik KATALOG untuk mendapatkan daftar produk dan harga terbaru.`,

  "3": `📦 CEK STATUS PESANAN

Silakan kirim:

Nama/Username:
Nomor Order:
Produk:

Admin akan membantu mengecek status pesanan Anda.`,

  "4": `💳 INFO PEMBAYARAN

Untuk mendapatkan detail pembayaran terbaru, silakan hubungi admin terlebih dahulu.

⚠️ Jangan melakukan pembayaran sebelum mendapat konfirmasi dan detail pembayaran resmi dari admin.`,

  "5": `💬 MENGHUBUNGKAN KE ADMIN

Pesan Anda sudah diterima.

Silakan tunggu hingga admin merespons.

Admin 1: [Kontak Admin 1]
Admin 2: [Kontak Admin 2]`,

  "6": `❓ PUSAT BANTUAN

Silakan jelaskan kebutuhan atau kendala Anda secara detail.

Contoh:

Kak, saya mau order produk...
Kak, pembayaran saya sudah dilakukan.
Kak, pesanan saya belum masuk.

Admin akan membantu Anda sesegera mungkin.`
};

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("TAMZZY STORE BOT ONLINE");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server berjalan di port ${PORT}`);
});

let starting = false;

async function startBot() {
  if (starting) return;
  starting = true;

  try {
    const { state, saveCreds } =
      await useMultiFileAuthState("./session");

    const sock = makeWASocket({
      auth: state,
      logger,
      printQRInTerminal: false,
      markOnlineOnConnect: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const {
        connection,
        lastDisconnect
      } = update;

      if (connection === "open") {
        console.log("================================");
        console.log("✅ TAMZZY STORE BOT TERHUBUNG");
        console.log("================================");
        starting = false;
      }

      if (connection === "close") {
        starting = false;

        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        if (statusCode !== DisconnectReason.loggedOut) {
          console.log("🔄 Koneksi terputus.");
          console.log("🔄 Mencoba menyambungkan kembali...");

          setTimeout(() => {
            startBot();
          }, 5000);
        } else {
          console.log("❌ WhatsApp logout.");
        }
      }
    });

    if (!state.creds.registered) {
      if (!BOT_NUMBER) {
        console.log("❌ BOT_NUMBER belum diatur.");
        return;
      }

      console.log("🔑 Meminta pairing code...");

      const code =
        await sock.requestPairingCode(BOT_NUMBER);

      console.log("");
      console.log("================================");
      console.log("🔑 PAIRING CODE TAMZZY STORE");
      console.log("================================");
      console.log(code);
      console.log("================================");
      console.log("");
      console.log("WhatsApp → Perangkat Tertaut");
      console.log("→ Tautkan perangkat");
      console.log("→ Tautkan dengan nomor telepon");
      console.log("→ Masukkan pairing code tersebut.");
      console.log("");
    }

    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        const msg = messages[0];

        if (!msg?.message) return;
        if (msg.key.fromMe) return;

        const jid = msg.key.remoteJid;

        if (!jid) return;

        // Abaikan grup
        if (jid.endsWith("@g.us")) return;

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          "";

        const command =
          text.trim().toLowerCase();

        console.log(`📩 Pesan: ${text}`);

        if (RESPONSES[command]) {
          await sock.sendMessage(jid, {
            text: RESPONSES[command]
          });

          return;
        }

        if (command === "katalog") {
          await sock.sendMessage(jid, {
            text: `📋 KATALOG TAMZZY STORE

Silakan tunggu, admin akan mengirimkan katalog dan harga terbaru.

Untuk melakukan order, balas:
1`
          });

          return;
        }

        await sock.sendMessage(jid, {
          text: MENU
        });

      } catch (error) {
        console.log(
          "❌ Error pesan:",
          error.message
        );
      }
    });

  } catch (error) {
    starting = false;

    console.log(
      "❌ Error bot:",
      error.message
    );

    setTimeout(() => {
      startBot();
    }, 10000);
  }
}

startBot();
