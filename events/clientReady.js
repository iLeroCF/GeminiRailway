// events/clientReady.js

const { ChannelType } = require("discord.js");
const { GiveawaysManager } = require('discord-giveaways'); // Yeni Eklendi

module.exports = (client) => {
    console.log(`[BİLGİ] ${client.user.tag} olarak giriş yapıldı! Bot hazır.`);
    client.user.setActivity("Lero ❤️ Discord");

    // Veritabanındaki sunucu ayarlarını hafızaya yükle
    try {
        const allSettings = client.db.all().filter(i => i.ID.startsWith("settings_"));
        let count = 0;
        allSettings.forEach(settings => {
            const guildID = settings.ID.split('_')[1];
            client.settings.set(guildID, settings.data);
            count++;
        });
        console.log(`[BİLGİ] ${count} sunucunun ayarları veritabanından yüklendi.`);
    } catch (err) {
        console.error("[HATA] Sunucu ayarları yüklenirken bir hata oluştu:", err);
    }

    // --- YENİ EKLENDİ: ÇEKİLİŞ YÖNETİCİSİNİ BAŞLAT ---
    // Eğer zaten başlatılmamışsa (bot yeniden başlatıldığında tekrar tekrar başlatmamak için)
    if (!client.giveawaysManager) {
        client.giveawaysManager = new GiveawaysManager(client, {
            storage: './giveaways.json', // Çekiliş verilerini saklamak için dosya
            default: {
                botsCanWin: false,
                embedColor: '#FF0000',
                embedColorEnd: '#000000',
                reaction: '🎉'
            }
        });
        console.log("[BİLGİ] Çekiliş Yöneticisi (GiveawaysManager) başlatıldı.");
    }
    // --- ÇEKİLİŞ YÖNETİCİSİ SONU ---


    // --- ÖZEL ODA TEMİZLEYİCİ ---
    console.log("[BİLGİ] Özel Oda Temizleyici (Interval) başlatıldı.");
    setInterval(async () => {
        try {
            for (const [guildID, settings] of client.settings) {
                if (!settings || !settings.ozelOdaKategoriID || !settings.ozelOdaOlusturID || !settings.ozelOdaSure) continue;
                const guild = client.guilds.cache.get(guildID);
                if (!guild) continue;
                const category = guild.channels.cache.get(settings.ozelOdaKategoriID);
                if (!category) continue;

                category.children.cache.forEach(async (channel) => {
                    if (channel.type !== ChannelType.GuildVoice || channel.id === settings.ozelOdaOlusturID) return;
                    if (channel.members.size === 0) {
                        let deleteTime = client.db.get(`delete_${channel.id}`);
                        if (!deleteTime) { client.db.set(`delete_${channel.id}`, Date.now() + settings.ozelOdaSure); }
                        else {
                            if (Date.now() >= deleteTime) {
                                console.log(`[ÖZEL ODA] Boş kanal (${channel.name}) süresi dolduğu için siliniyor.`);
                                const ownerID = client.db.get(`${channel.id}`);
                                if (ownerID) { client.db.delete(`ozeloda_${ownerID}`); }
                                client.db.delete(`members_${channel.id}`);
                                client.db.delete(`${channel.id}`);
                                client.db.delete(`delete_${channel.id}`);
                                await channel.delete({ reason: "Özel oda boşaldı ve süresi doldu." }).catch(err => { client.db.delete(`delete_${channel.id}`); });
                            }
                        }
                    } else {
                        if (client.db.has(`delete_${channel.id}`)) { client.db.delete(`delete_${channel.id}`); }
                    }
                });
            }
        } catch (e) {
            console.error("[HATA] Özel oda temizleyici interval hatası:", e);
        }
    }, 60000); // Her 60 saniyede bir kontrol et
};