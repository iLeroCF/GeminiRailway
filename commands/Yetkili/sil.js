const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    // Slash Command
    data: new SlashCommandBuilder()
        .setName('sil')
        .setDescription('Belirtilen miktarda mesajı kanaldan siler (0 = tümünü).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
        .addIntegerOption(option =>
            option.setName('miktar')
                .setDescription('Silinecek mesaj miktarı (1-100). Tüm kanalı silmek için 0 girin.')
                .setRequired(true)),

    // Prefix Command
    name: "sil",
    aliases: ["clear", "purge"],
    category: "Yönetim",
    description: "Belirtilen miktarda mesajı kanaldan siler. `0` girilirse kanalı klonlayıp tüm mesajları siler.",
    usage: "<0-100>",
    permissions: [PermissionsBitField.Flags.ManageMessages],

    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        const reply = (options) => isInteraction ? interactionOrMessage.reply(options) : interactionOrMessage.reply(options); // Bu yardımcı fonksiyon genel kullanım için kalabilir
        const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
        const channel = interactionOrMessage.channel;

        let amount;
        if (isInteraction) {
            amount = interactionOrMessage.options.getInteger('miktar');
        } else {
            if (!args[0] || isNaN(args[0])) {
                return reply({ content: `Lütfen silinecek mesaj miktarını belirtin. (Örnek: \`${client.config.prefix}sil 50\`)`, ephemeral: true });
            }
            amount = parseInt(args[0]);
        }

        // Miktar 0 ise kanalı klonla ve sil
        if (amount === 0) {
            if (!channel.permissionsFor(interactionOrMessage.member).has(PermissionsBitField.Flags.Administrator)) {
                return reply({ content: 'Bu kanalı tamamen silmek için `Yönetici` yetkisine sahip olmalısınız.', ephemeral: true });
            }
            if (!channel.permissionsFor(interactionOrMessage.guild.members.me).has(PermissionsBitField.Flags.ManageChannels)) {
                return reply({ content: 'Bu işlemi yapabilmem için `Kanalları Yönet` yetkisine ihtiyacım var.', ephemeral: true });
            }

            try {
                // Komutun alındığını bildiren başlangıçta ephemeral bir yanıt gönder.
                // Bu yanıt, kanal silindiğinde "bilinmeyen mesaj" hatası verebilir, ancak bu en iyi çabadır.
                if (isInteraction) await interactionOrMessage.reply({ content: 'Kanal temizleme işlemi başlatılıyor...', ephemeral: true });

                const originalChannelId = channel.id;
                const guild = interactionOrMessage.guild;

                const newChannel = await channel.clone({ reason: `${author.tag} tarafından istendi.` });

                // Ayarları güncelleme mantığı
                let settings = client.settings.get(guild.id);
                let settingsUpdated = false;
                let updatedKeys = [];
                if (settings) {
                    for (const key in settings) {
                        if (settings[key] === originalChannelId) {
                            settings[key] = newChannel.id;
                            settingsUpdated = true;
                            updatedKeys.push(key);
                        }
                    }
                    if (settingsUpdated) {
                        client.db.set(`settings_${guild.id}`, settings);
                        client.settings.set(guild.id, settings); // Hafızayı da güncelle
                    }

                    // YENİ: Eğer silinen kanal öneri kanalıysa, bilgilendirme mesajını tekrar gönder.
                    if (updatedKeys.includes('oneriKanal')) {
                        const oneriEmbed = new EmbedBuilder()
                            .setColor("Blue")
                            .setTitle("💡 Önerileriniz Bizim İçin Değerli!")
                            .setDescription(`Bu kanala sunucuyla ilgili **önerilerinizi** yazabilirsiniz.\n\nLütfen sadece **ciddi ve yapıcı** önerilerde bulunun. Kanalı amacı dışında kullanmak (sohbet, troll vb.) **yasaktır**.\n\nÖneriniz **yönetim tarafından** değerlendirilecek ve uygun görülürse uygulanacaktır.\n\n**Uyarı:** Kanalı amacı dışında kullananlar veya spam yapanlar hakkında **cezai işlem** uygulanacaktır.`)
                            .setFooter({ text: "Lero Bot Öneri Sistemi" });
                        
                        await newChannel.send({ embeds: [oneriEmbed] });
                    }
                }

                await channel.delete({ reason: `${author.tag} tarafından istendi.` });

                const successEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setDescription(`✅ Bu kanal temizlendi. Eski mesajlar arşivlendi ve bu yeni kanal oluşturuldu.` + (settingsUpdated ? `\n\n**Not:** Bu kanalın ayarları (\`${updatedKeys.join(', ')}\`) yeni kanala başarıyla aktarıldı.` : ''));

                const tempMsg = await newChannel.send({ embeds: [successEmbed] });
                // Mesajı 5 saniye sonra sil
                setTimeout(() => tempMsg.delete().catch(() => {}), 5000);
                
                // Etkileşimler için, başlangıçtaki ephemeral yanıt yeterlidir.
                // Prefix komutları için geçici mesaj yeterlidir.

            } catch (error) {
                console.error("Kanal klonlama/silme hatası:", error);
                const errorReply = { content: 'Kanal temizlenirken bir hata oluştu.', ephemeral: true };
                if (isInteraction && !interactionOrMessage.replied && !interactionOrMessage.deferred) await interactionOrMessage.reply(errorReply).catch(() => {});
                else await reply(errorReply);
            }
            return;
        }

        // Miktar 1-100 arası ise bulkDelete kullan
        if (amount < 1 || amount > 100) {
            return reply({ content: 'Lütfen 1 ile 100 arasında bir miktar belirtin. Tüm kanalı silmek için `0` kullanın.', ephemeral: true });
        }

        try {
            // bulkDelete öncesi geçici bir yanıt verelim
            if (isInteraction) {
                await interactionOrMessage.reply({ content: 'Mesajlar siliniyor...', ephemeral: true }); // deferReply yerine reply kullan
            }

            const deletedMessages = await channel.bulkDelete(amount, true);

            const successMessage = `✅ Başarıyla **${deletedMessages.size}** adet mesaj silindi.`;
            const finalReply = { content: successMessage };

            if (isInteraction) await interactionOrMessage.editReply(finalReply); // Bu editReply, kanal silinmediği için sorunsuz çalışmalı
            else {
                const tempMsg = await channel.send(successMessage);
                setTimeout(() => tempMsg.delete().catch(() => {}), 5000);
            }

        } catch (error) {
            console.error("Mesaj silme hatası:", error);
            const errorMessage = { content: 'Mesajlar silinirken bir hata oluştu. (14 günden eski mesajlar toplu olarak silinemez)', ephemeral: true };
            if (isInteraction) await interactionOrMessage.editReply(errorMessage).catch(() => {}); // Bu editReply da sorunsuz çalışmalı
            else await reply(errorMessage);
        }
    }
};