// commands/Yönetim/kayıt-kur.js

const { PermissionsBitField, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
// Schema'ya gerek yok

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('kayıt-kur')
        .setDescription('Kayıt sistemi için gerekli rolleri otomatik oluşturur ve ayarlar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // Prefix Command tanımı
    name: "kayıt-kur",
    aliases: ["kayitkur", "register-setup"],
    category: "Yönetim",
    description: "Kayıt sistemi için gerekli tüm rolleri otomatik olarak oluşturur ve ayarlar.",
    permissions: [PermissionsBitField.Flags.Administrator], 

    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = interactionOrMessage.isChatInputCommand?.() || interactionOrMessage.isButton?.(); // Hem slash hem de buton etkileşimlerini kontrol et
        const guild = interactionOrMessage.guild;
        const guildID = guild.id;
        const db = client.db; // db'yi client'tan al

        // Yanıt fonksiyonlarını tanımla
        let replyFunction;
        if (isInteraction) {
            // Eğer etkileşim panelden geliyorsa (ve deferUpdate yapılmışsa), deferReply yapma.
            if (!interactionOrMessage.deferred) {
                await interactionOrMessage.deferReply({ ephemeral: true });
            }
            // Panelden gelen etkileşimler için followUp, diğerleri için editReply kullan.
            // Bu, panelin "çalışıyor..." mesajı göndermemesini sağlar, komut kendi mesajını yönetir.
            replyFunction = (options) => interactionOrMessage.replied || interactionOrMessage.deferred ? interactionOrMessage.followUp({ ...options, ephemeral: true }) : interactionOrMessage.editReply(options);
        } else {
            replyFunction = (options) => interactionOrMessage.reply(options);
        }

        const existingSettings = client.settings.get(guildID);
        if (existingSettings && existingSettings.kayıtsızRolü) {
            return await replyFunction({ content: "Sistem zaten kurulu görünüyor. Ayarları değiştirmek için `/ayarla` komutunu kullanın." });
        }

        try {
            await replyFunction({ content: "Kayıt sistemi kurulumu başlatılıyor... ⌛ Roller oluşturuluyor..." });

            // 1. Rolleri Oluştur (Kod aynı)
            const staffRole = await guild.roles.create({ name: 'Kayıt Yetkilisi', color: '#1E90FF', reason: 'Lero Kayıt Kurulumu' });
            const memberRole = await guild.roles.create({ name: 'Üye', color: '#F0FFFF', reason: 'Lero Kayıt Kurulumu' });
            const maleRole = await guild.roles.create({ name: 'Erkek', color: '#0000FF', reason: 'Lero Kayıt Kurulumu' });
            const femaleRole = await guild.roles.create({ name: 'Kadın', color: '#FF007F', reason: 'Lero Kayıt Kurulumu' });
            const unregRole = await guild.roles.create({ name: 'Kayıtsız', color: '#808080', reason: 'Lero Kayıt Kurulumu' });

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
                    { name: 'Üye Rolü', value: `${memberRole}` },
                    { name: 'Erkek Rolü', value: `${maleRole}` },
                    { name: 'Kadın Rolü', value: `${femaleRole}` }
                )
                .setFooter({ text: "Sistem artık kullanıma hazır!" });

            await interactionOrMessage.channel.send({ embeds: [embed] }); // Bu genel bir mesaj olduğu için kalabilir

        } catch (error) {
            console.error("[HATA] 'kayıt-kur' komutu hatası:", error);
            await replyFunction({ content: "Rolleri oluştururken bir hata oluştu. Lütfen botun sunucuda 'Rolleri Yönet' yetkisine sahip olduğundan emin olun." });
        }
    }
};