// commands/Yönetim/kayıt-kur.js

const { PermissionsBitField, EmbedBuilder } = require('discord.js');
// Schema'ya gerek yok

module.exports = {
    name: "kayıt-kur",
    aliases: ["kayitkur", "register-setup"],
    category: "Yönetim",
    description: "Kayıt sistemi için gerekli tüm rolleri otomatik olarak oluşturur ve ayarlar.",
    permissions: [PermissionsBitField.Flags.Administrator], 

    execute: async (client, message, args) => {
        
        const guild = message.guild;
        const guildID = guild.id;
        const db = client.db; // db'yi client'tan al

        const existingSettings = client.settings.get(guildID);
        if (existingSettings && existingSettings.kayıtsızRolü) {
            return message.reply("Sistem zaten kurulu görünüyor. Ayarları değiştirmek için `.ayarla` komutunu kullanın.");
        }

        try {
            await message.reply("Kayıt sistemi kurulumu başlatılıyor... ⌛ Roller oluşturuluyor...");

            // 1. Rolleri Oluştur (Kod aynı)
            const staffRole = await guild.roles.create({ name: 'Kayıt Yetkilisi', color: '#1E90FF', reason: 'Lero Kayıt Kurulumu' });
            const unregRole = await guild.roles.create({ name: 'Kayıtsız', color: '#808080', reason: 'Lero Kayıt Kurulumu' });
            const memberRole = await guild.roles.create({ name: 'Kayıtlı', color: '#F0FFFF', reason: 'Lero Kayıt Kurulumu' });
            const maleRole = await guild.roles.create({ name: 'Erkek', color: '#0000FF', reason: 'Lero Kayıt Kurulumu' });
            const femaleRole = await guild.roles.create({ name: 'Kadın', color: '#FF007F', reason: 'Lero Kayıt Kurulumu' });

            // 2. Ayarları Veritabanına Kaydet
            const newSettings = {
                // guildID'ye gerek yok, anahtarın içinde saklayacağız
                kayıtStaffRolü: staffRole.id,
                kayıtsızRolü: unregRole.id,
                erkekRolü: maleRole.id,
                kadınRolü: femaleRole.id,
                kayıtlıRolleri: [memberRole.id]
            };
            
            // Veritabanına 'settings_guildID' anahtarıyla kaydet
            db.set(`settings_${guildID}`, newSettings);

            // 3. Ayarları anında hafızaya (client.settings) yükle
            client.settings.set(guildID, newSettings);

            // 4. Başarı Mesajı Gönder (Kod aynı)
            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ Kayıt Sistemi Başarıyla Kuruldu!")
                .setDescription("Aşağıdaki roller oluşturuldu ve sistem ayarları veritabanına kaydedildi:")
                .addFields(
                    { name: 'Kayıt Yetkilisi Rolü', value: `${staffRole}` },
                    { name: 'Kayıtsız Rolü', value: `${unregRole}` },
                    { name: 'Kayıtlı Rolü', value: `${memberRole}` },
                    { name: 'Erkek Rolü', value: `${maleRole}` },
                    { name: 'Kadın Rolü', value: `${femaleRole}` }
                )
                .setFooter({ text: "Sistem artık kullanıma hazır!" });

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error("[HATA] 'kayıt-kur' komutu hatası:", error);
            message.reply("Rolleri oluştururken bir hata oluştu. Lütfen botun sunucuda 'Rolleri Yönet' yetkisine sahip olduğundan emin olun.");
        }
    }
};