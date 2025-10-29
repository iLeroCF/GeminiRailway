// commands/Yönetim/ozeloda-sil.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionsBitField } = require('discord.js');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ozeloda-sil')
        .setDescription('Özel oda sistemini (kanallar ve ayarlar) sunucudan tamamen kaldırır.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    name: "ozeloda-sil",
    aliases: ["ozelodasil"],
    category: "Yönetim",
    description: "Özel oda sistemini (kanallar ve ayarlar) sunucudan tamamen kaldırır.",
    permissions: [PermissionsBitField.Flags.Administrator],

    execute: async (client, interactionOrMessage) => {
        const isInteraction = interactionOrMessage.isChatInputCommand?.() || interactionOrMessage.isButton?.(); // Hem slash hem de buton etkileşimlerini kontrol et
        const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
        const guild = interactionOrMessage.guild;

        const settings = client.settings.get(guild.id);
        if (!settings || !settings.ozelOdaKategoriID) {
            const replyOptions = { content: "❌ Özel oda sistemi zaten kurulu değil veya ayarları bulunamadı.", ephemeral: true };
            return isInteraction ? interactionOrMessage.reply(replyOptions) : interactionOrMessage.reply(replyOptions);
        }

        const confirmationEmbed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("⚠️ Özel Oda Sistemini Silme Onayı")
            .setDescription("Bu işlem, özel oda sistemiyle ilgili **tüm kanalları** (kategori, panel, oluşturma kanalı) sunucudan **kalıcı olarak silecek** ve veritabanı ayarlarını temizleyecektir.\n\n**Bu işlem geri alınamaz!**\n\nDevam etmek için `EVET` butonuna tıklayın.");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_delete_ozeloda').setLabel('EVET, SİL').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_delete').setLabel('HAYIR, İPTAL ET').setStyle(ButtonStyle.Secondary)
        );

        const reply = await interactionOrMessage.reply({ embeds: [confirmationEmbed], components: [row], fetchReply: true });

        const filter = i => i.user.id === author.id;
        try {
            const confirmation = await reply.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 20000 });

            if (confirmation.customId === 'confirm_delete_ozeloda') {
                await confirmation.update({ content: '✅ Onaylandı! Özel oda sistemi sunucudan ve veritabanından kaldırılıyor...', embeds: [], components: [] });

                const category = guild.channels.cache.get(settings.ozelOdaKategoriID);
                if (category) {
                    // Kategori içindeki tüm kanalları sil
                    for (const channel of category.children.cache.values()) {
                        try { await channel.delete('Özel oda sistemi silindi.'); await wait(300); } catch (err) { console.warn(`[OZELODA-SİL] ${channel.name} kanalı silinemedi: ${err.message}`); }
                    }
                    // Kategoriyi sil
                    try { await category.delete('Özel oda sistemi silindi.'); } catch (err) { console.warn(`[OZELODA-SİL] ${category.name} kategorisi silinemedi: ${err.message}`); }
                }

                // Ayarları temizle
                delete settings.ozelOdaKategoriID;
                delete settings.ozelOdaOlusturID;
                delete settings.ozelOdaPanelID;
                delete settings.ozelOdaSure;

                client.db.set(`settings_${guild.id}`, settings);
                client.settings.set(guild.id, settings);

                await confirmation.followUp({ content: "✅ Özel oda sistemiyle ilgili tüm kanallar ve ayarlar başarıyla silindi.", ephemeral: true });

            } else {
                await confirmation.update({ content: 'İşlem iptal edildi.', embeds: [], components: [] });
            }
        } catch (e) {
            // Kanal silinmiş olabileceğinden, mesajı düzenlemeye çalışırken hata almamak için try-catch kullan.
            try {
                await reply.edit({ content: 'Onay süresi (20s) dolduğu için işlem iptal edildi.', embeds: [], components: [] });
            } catch (error) {
                console.warn("[OZELODA-SİL] Onay mesajı düzenlenemedi, muhtemelen kanal silindi.", error.message);
            }
        }
    }
};