// commands/Yönetim/kayıt-sil.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionsBitField } = require('discord.js');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kayıt-sil')
        .setDescription('Kayıt sistemini (roller ve ayarlar) sunucudan tamamen kaldırır.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    name: "kayıt-sil",
    aliases: ["kayitsil"],
    category: "Yönetim",
    description: "Kayıt sistemini (roller ve ayarlar) sunucudan tamamen kaldırır.",
    permissions: [PermissionsBitField.Flags.Administrator],

    execute: async (client, interactionOrMessage) => {
        const isInteraction = interactionOrMessage.isChatInputCommand?.() || interactionOrMessage.isButton?.(); // Hem slash hem de buton etkileşimlerini kontrol et
        const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
        const guild = interactionOrMessage.guild;

        const settings = client.settings.get(guild.id);
        if (!settings || (!settings.kayıtStaffRolü && !settings.kayıtsızRolü)) {
            const replyOptions = { content: "❌ Kayıt sistemi zaten kurulu değil veya ayarları bulunamadı.", ephemeral: true };
            return isInteraction ? interactionOrMessage.reply(replyOptions) : interactionOrMessage.reply(replyOptions);
        }

        const confirmationEmbed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("⚠️ Kayıt Sistemini Silme Onayı")
            .setDescription("Bu işlem, kayıt sistemiyle ilgili **tüm rolleri** (Kayıt Yetkilisi, Kayıtsız, Erkek, Kadın, Üye vb.) sunucudan **kalıcı olarak silecek** ve veritabanı ayarlarını temizleyecektir.\n\n**Bu işlem geri alınamaz!**\n\nDevam etmek için `EVET` butonuna tıklayın.");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_delete_kayit').setLabel('EVET, SİL').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_delete').setLabel('HAYIR, İPTAL ET').setStyle(ButtonStyle.Secondary)
        );

        const reply = await interactionOrMessage.reply({ embeds: [confirmationEmbed], components: [row], fetchReply: true });

        const filter = i => i.user.id === author.id;
        try {
            const confirmation = await reply.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 20000 });

            if (confirmation.customId === 'confirm_delete_kayit') {
                await confirmation.update({ content: '✅ Onaylandı! Kayıt sistemi sunucudan ve veritabanından kaldırılıyor...', embeds: [], components: [] });

                const roleIDs = [
                    settings.kayıtStaffRolü,
                    settings.kayıtsızRolü,
                    settings.erkekRolü,
                    settings.kadınRolü,
                    ...(settings.kayıtlıRolleri || [])
                ].filter(Boolean); // Undefined/null olanları filtrele

                for (const roleID of roleIDs) {
                    const role = guild.roles.cache.get(roleID);
                    if (role) {
                        try {
                            await role.delete('Kayıt sistemi silindi.');
                            await wait(300);
                        } catch (err) {
                            console.warn(`[KAYIT-SİL] ${role.name} rolü silinemedi: ${err.message}`);
                        }
                    }
                }

                // Ayarları temizle
                delete settings.kayıtStaffRolü;
                delete settings.kayıtsızRolü;
                delete settings.erkekRolü;
                delete settings.kadınRolü;
                delete settings.kayıtlıRolleri;
                delete settings.kayıtKanalı;

                client.db.set(`settings_${guild.id}`, settings);
                client.settings.set(guild.id, settings);

                await confirmation.followUp({ content: "✅ Kayıt sistemiyle ilgili tüm roller ve ayarlar başarıyla silindi.", ephemeral: true });

            } else {
                await confirmation.update({ content: 'İşlem iptal edildi.', embeds: [], components: [] });
            }
        } catch (e) {
            // Kanal silinmiş olabileceğinden, mesajı düzenlemeye çalışırken hata almamak için try-catch kullan.
            try {
                await reply.edit({ content: 'Onay süresi (20s) dolduğu için işlem iptal edildi.', embeds: [], components: [] });
            } catch (error) {
                console.warn("[KAYIT-SİL] Onay mesajı düzenlenemedi, muhtemelen kanal silindi.", error.message);
            }
        }
    }
};