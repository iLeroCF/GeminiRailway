// commands/Yönetim/ozel-oda-kur.js

const { PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('ozel-oda-kur')
        .setDescription('Özel oda sistemini sunucuya kurar (Kategori, Ses Kanalı, Panel).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // Prefix Command tanımı
    name: "ozel-oda-kur",
    aliases: ["özelodakur", "oda-sistemi-kur"],
    category: "Yönetim",
    description: "Özel oda sistemini sunucuya kurar (Kategori, Ses Kanalı, Panel).",
    permissions: [PermissionsBitField.Flags.Administrator], 

    execute: async (client, interactionOrMessage) => {
        const isInteraction = interactionOrMessage.isChatInputCommand?.() || interactionOrMessage.isButton?.(); // Hem slash hem de buton etkileşimlerini kontrol et
        const guild = interactionOrMessage.guild;
        const guildID = guild.id;
        const db = client.db;

        // Yanıt fonksiyonlarını tanımla
        let replyFunction;
        if (isInteraction) {
            if (!interactionOrMessage.deferred) {
                await interactionOrMessage.deferReply({ ephemeral: true });
            }
            // Panelden gelen etkileşimler için followUp, diğerleri için editReply kullan.
            replyFunction = (options) => interactionOrMessage.replied || interactionOrMessage.deferred ? interactionOrMessage.followUp({ ...options, ephemeral: true }) : interactionOrMessage.editReply(options);
        } else {
            replyFunction = (options) => interactionOrMessage.reply(options);
        }

        // Ayarları veritabanından çek
        let settings = client.settings.get(guildID);
        if (settings && settings.ozelOdaKategoriID) {
            return await replyFunction({ content: "Özel oda sistemi zaten kurulu görünüyor." });
        }
        if (!settings) settings = {}; // Eğer `.sunucu-kur` çalıştırılmadıysa boş bir obje oluştur

        try {
            await replyFunction({ content: "Özel oda sistemi kurulumu başlatılıyor... ⌛" });

            // 1. Kategori Oluştur
            const ozelOdaCat = await guild.channels.create({
                name: 'ÖZEL ODALAR',
                type: ChannelType.GuildCategory,
                reason: 'Lero Özel Oda Kurulumu'
            });

            // 2. Oda Oluşturma (Tetikleyici) Ses Kanalı
            const ozelOdaOlustur = await guild.channels.create({
                name: '➕ Oda Oluştur',
                type: ChannelType.GuildVoice,
                parent: ozelOdaCat.id,
                reason: 'Lero Özel Oda Kurulumu'
            });

            // 3. Oda Paneli (Butonlar) Metin Kanalı
            const ozelOdaPanel = await guild.channels.create({
                name: '🤖-oda-paneli',
                type: ChannelType.GuildText,
                parent: ozelOdaCat.id,
                // @everyone'ın mesaj atmasını engelle
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.SendMessages]
                    }
                ],
                reason: 'Lero Özel Oda Kurulumu'
            });

            // 4. Panel Butonlarını Gönder
            const besbutton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setEmoji('🏷️').setCustomId('oda-oluştur').setLabel(`Oda Oluştur`).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setEmoji('➕').setCustomId('user-ekle').setLabel(`User Ekle`).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setEmoji('➖').setCustomId('user-cıkar').setLabel(`User Çıkar`).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setEmoji('✍️').setCustomId('oda-isim').setLabel(`Oda Adı Değiştir`).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setEmoji('🆑').setCustomId('oda-sil').setLabel(`Odayı Sil`).setStyle(ButtonStyle.Success)
                );
            const besbutton2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setEmoji('🔒').setCustomId('oda-kilit').setLabel(`Odayı Kilitle`).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setEmoji('📻').setCustomId('oda-bit').setLabel(`Bit Hızı Değiştir`).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setEmoji('👥').setCustomId('oda-limit').setLabel(`Oda Limiti Değiştir`).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setEmoji('👺').setCustomId('sesten-at').setLabel(`Sesten At`).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setEmoji('🔓').setCustomId('oda-herkes').setLabel(`Odayı Herkese Aç`).setStyle(ButtonStyle.Danger)
                );
            const besbutton3 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setEmoji('❓').setCustomId('oda-bilgi').setLabel(`Oda Bilgisi`).setStyle(ButtonStyle.Primary)
                );

            await ozelOdaPanel.send({
                content: `> **Aşağıdaki Butonlar Üzerinden Özel Odanızı Oluşturabilir,**\n> **Düzenleyebilir Veya Diğer İşlemleri Gerçekleştirebilirsiniz!**`,
                components: [besbutton, besbutton2, besbutton3]
            });

            // 5. Ayarları Veritabanına Kaydet
            // (Mevcut ayarları koruyarak üzerine yaz)
            settings.ozelOdaKategoriID = ozelOdaCat.id;
            settings.ozelOdaOlusturID = ozelOdaOlustur.id;
            settings.ozelOdaPanelID = ozelOdaPanel.id;
            settings.ozelOdaSure = 120000; // 2 Dakika (milisaniye)

            db.set(`settings_${guildID}`, settings);
            client.settings.set(guildID, settings); // Hafızayı da güncelle

            await interactionOrMessage.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Özel Oda Sistemi Başarıyla Kuruldu!")
                        .setDescription(`Sistem kanalları ${ozelOdaCat} kategorisi altına kuruldu.\nPanel ${ozelOdaPanel} kanalına gönderildi.`)
                ]
            });

        } catch (error) {
            console.error("[HATA] 'ozel-oda-kur' komutu hatası:", error);
            await replyFunction({ content: "Kurulum sırasında bir hata oluştu. Lütfen botun 'Kanalları Yönet' yetkisi olduğundan emin olun." });
        }
    }
};