// commands/Yönetim/ayarları-sıfırla.js

const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    // Slash Command
    data: new SlashCommandBuilder()
        .setName('ayarları-sıfırla')
        .setDescription('DİKKAT: Sunucu için ayarlanmış TÜM bot ayarlarını kalıcı olarak siler.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // Prefix Command
    name: "ayarları-sıfırla",
    aliases: ["ayarlarisifirla", "reset-settings"],
    category: "Yönetim",
    description: "Sunucu için ayarlanmış TÜM bot ayarlarını kalıcı olarak siler.",
    permissions: [PermissionsBitField.Flags.Administrator],

    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = interactionOrMessage.isChatInputCommand?.();
        const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
        const guild = interactionOrMessage.guild;
        const guildID = guild.id;
        const db = client.db;

        // Ayarlar var mı kontrol et
        const settings = client.settings.get(guildID);
        if (!settings || Object.keys(settings).length === 0) {
            const replyOptions = { content: "❌ Bu sunucu için zaten ayarlanmış bir ayar bulunmuyor.", ephemeral: true };
            return isInteraction ? interactionOrMessage.reply(replyOptions) : interactionOrMessage.reply(replyOptions);
        }

        // Onay embed'i ve butonları
        const confirmationEmbed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("⚠️ TÜM AYARLARI SIFIRLAMA ONAYI")
            .setDescription("Bu işlem, bu sunucu için ayarlanmış **TÜM** bot ayarlarını (roller, kanallar, özel mesajlar vb.) veritabanından **kalıcı olarak silecek**.\n\nSistemleri yeniden kurmanız gerekecektir.\n\n**Bu işlem geri alınamaz!**\n\nDevam etmek için `EVET, TÜM AYARLARI SİL` butonuna tıklayın.");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_reset_all').setLabel('EVET, TÜM AYARLARI SİL').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_reset').setLabel('HAYIR, İPTAL ET').setStyle(ButtonStyle.Secondary)
        );

        const reply = await interactionOrMessage.reply({ embeds: [confirmationEmbed], components: [row], fetchReply: true });

        const filter = i => i.user.id === author.id;
        try {
            const confirmation = await reply.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 20000 });

            if (confirmation.customId === 'confirm_reset_all') {
                await confirmation.update({ content: '✅ Onaylandı! Ayarlar sıfırlanıyor ve ilgili kanallar/roller siliniyor...', embeds: [], components: [] });

                // --- TICKET SİSTEMİNİ SİL ---
                if (settings.ticketKategoriID) {
                    const channelIDs = [settings.ticketKategoriID, settings.ticketOlusturKanalID, settings.ticketLogKanalID];
                    for (const channelID of channelIDs) {
                        const channel = guild.channels.cache.get(channelID);
                        if (channel) {
                            try { await channel.delete('Tüm ayarlar sıfırlandı.'); await wait(300); }
                            catch (err) { console.warn(`[AYAR-SIFIRLA] Ticket kanalı ${channel.name} silinemedi: ${err.message}`); }
                        }
                    }
                    const roleIDs = [settings.ticketYetkiliRolID, settings.ticketUyeRolID];
                    for (const roleID of roleIDs) {
                        const role = guild.roles.cache.get(roleID);
                        if (role) {
                            try { await role.delete('Tüm ayarlar sıfırlandı.'); await wait(300); }
                            catch (err) { console.warn(`[AYAR-SIFIRLA] Ticket rolü ${role.name} silinemedi: ${err.message}`); }
                        }
                    }
                }

                // --- ÖZEL ODA SİSTEMİNİ SİL ---
                if (settings.ozelOdaKategoriID) {
                    const category = guild.channels.cache.get(settings.ozelOdaKategoriID);
                    if (category) {
                        for (const channel of category.children.cache.values()) {
                            try { await channel.delete('Tüm ayarlar sıfırlandı.'); } catch (err) { console.warn(`[AYAR-SIFIRLA] Özel oda kanalı ${channel.name} silinemedi: ${err.message}`); }
                        }
                        try { await category.delete('Tüm ayarlar sıfırlandı.'); } catch (err) { console.warn(`[AYAR-SIFIRLA] Özel oda kategorisi ${category.name} silinemedi: ${err.message}`); }
                    }
                }

                // --- KAYIT SİSTEMİNİ SİL ---
                if (settings.kayıtStaffRolü) {
                    const roleIDs = [
                        settings.kayıtStaffRolü, settings.kayıtsızRolü, settings.erkekRolü, settings.kadınRolü,
                        ...(settings.kayıtlıRolleri || [])
                    ].filter(Boolean);

                    for (const roleID of roleIDs) {
                        const role = guild.roles.cache.get(roleID);
                        if (role) {
                            try { await role.delete('Tüm ayarlar sıfırlandı.'); await wait(300); }
                            catch (err) { console.warn(`[AYAR-SIFIRLA] Kayıt rolü ${role.name} silinemedi: ${err.message}`); }
                        }
                    }
                }

                // Ayarları veritabanından ve hafızadan (cache) sil
                db.delete(`settings_${guildID}`);
                client.settings.delete(guildID);

                // Son olarak, kullanıcıya işlemin tamamlandığını bildir.
                // confirmation.update zaten yapıldığı için followUp kullanıyoruz.
                await confirmation.followUp({
                    content: '✅ Bu sunucu için tüm bot ayarları, ilgili kanallar ve roller başarıyla sıfırlandı.',
                    ephemeral: true
                });

            } else {
                await confirmation.update({ content: 'İşlem iptal edildi.', embeds: [], components: [] });
            }
        } catch (e) {
            await reply.edit({ content: 'Onay süresi (20s) dolduğu için işlem iptal edildi.', embeds: [], components: [] });
        }
    }
};