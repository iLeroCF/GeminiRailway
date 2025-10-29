// index.js

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config.js');
const { YamlDatabase } = require('five.db');
// GiveawaysManager ve ms importları burdan kaldırıldı.

// 1. Client'ı (Botu) Oluştur
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions, // Çekiliş için GEREKLİ
        GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.User, Partials.Channel, Partials.GuildMember,
        Partials.Message, Partials.Reaction // Çekiliş için GEREKLİ
    ]
});

// 2. Veritabanını ve Ayarları Client'a Ekle
client.db = new YamlDatabase();
client.config = config;

// 3. Komutlar ve Ayarlar için Koleksiyonları Oluştur
client.commands = new Collection();
client.aliases = new Collection();
client.settings = new Collection();
// client.giveawaysManager burada tanımlanmayacak.

// 4. Yardımcı Fonksiyonları Yükle
require('./utils/helpers.js')(client);

// 5. İşleyicileri (Handlers) Yükle
require('./handlers/commandHandler.js')(client);
require('./handlers/eventHandler.js')(client);

// 6. Bota Giriş Yap
client.login(config.token).catch(err => {
    console.error("[HATA] Bota giriş yapılamadı! Token'ınızı kontrol edin.");
    console.error(err);
});