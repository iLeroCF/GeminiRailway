// events/clientReady.js

const { Events, ChannelType } = require("discord.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`[BİLGİ] ${client.user.tag} olarak giriş yapıldı! Bot hazır.`);
        client.user.setActivity("Lero ❤️ Discord");

        // Sunucu ayarlarını veritabanından çek ve client.settings'e yükle
        try {
            const allSettings = client.db.all().filter(i => i.ID.startsWith('settings_'));
            for (const setting of allSettings) {
                const guildID = setting.ID.split('_')[1];
                client.settings.set(guildID, setting.data);
            }
            console.log(`[BİLGİ] ${client.settings.size} sunucunun ayarları yüklendi.`);
        } catch (err) {
            console.error("[HATA] Sunucu ayarları yüklenirken bir hata oluştu:", err);
        }

        // --- ÖZEL ODA TEMİZLEYİCİ ---
        console.log("[BİLGİ] Özel Oda Temizleyici (Interval) başlatıldı.");
        setInterval(async () => {
            try {
                const ozelOdalar = client.db.all().filter(i => i.ID.startsWith('ozeloda_'));
                for (const oda of ozelOdalar) {
                    const channel = client.channels.cache.get(oda.data);
                    if (channel && channel.type === ChannelType.GuildVoice && channel.members.size === 0) {
                        const ownerId = client.db.get(`${channel.id}`);
                        console.log(`[ÖZEL ODA] Boşta kalan oda bulundu: ${channel.name} (${channel.id}). Sahip: ${ownerId}. Siliniyor...`);
                        await channel.delete({ reason: "Oda boş kaldığı için otomatik silindi." }).catch(e => console.error(`[HATA] Boş oda silinirken hata: ${e.message}`));
                        if (ownerId) client.db.delete(`ozeloda_${ownerId}`);
                        client.db.delete(`members_${channel.id}`);
                        client.db.delete(`${channel.id}`);
                    }
                }
            } catch (e) {
                console.error("[HATA] Özel oda temizleyici interval hatası:", e);
            }
        }, 60000); // Her 60 saniyede bir kontrol et
    }
};