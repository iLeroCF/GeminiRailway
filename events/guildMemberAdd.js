// events/guildMemberAdd.js

const { Events, EmbedBuilder, AttachmentBuilder, PermissionsBitField } = require('discord.js');
const moment = require('moment'); // Zaman formatlama için

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) { // Parametre sırası değişti, client sona geldi
    // Botun kendisi eklenirse veya bir DM'de olursa işlemi durdur
    if (member.user.bot || !member.guild) return;

    const guild = member.guild;
    const settings = client.settings.get(guild.id);

    // Ayarlar veya hoş geldin kanalı ayarlanmamışsa işlemi durdur
    if (!settings) return;

    // Kayıtsız rolünü ver
    if (settings.kayıtsızRolü) {
        const unregRole = guild.roles.cache.get(settings.kayıtsızRolü);
        if (unregRole) {
            await member.roles.add(unregRole).catch(err => {
                console.error(`[HATA] ${member.user.tag} kullanıcısına kayıtsız rolü verilemedi:`, err);
            });
        } else {
            console.warn(`[UYARI] Ayarlarda belirtilen kayıtsız rolü (${settings.kayıtsızRolü}) sunucuda bulunamadı.`);
        }
    }

    // Hoş geldin mesajını gönder
    if (settings.hgbbKanalID) {
        const channel = guild.channels.cache.get(settings.hgbbKanalID);
        if (!channel || !channel.isTextBased() || !channel.permissionsFor(guild.members.me).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles])) {
            return console.warn(`[UYARI] Hoş geldin kanalı (${settings.hgbbKanalID}) bulunamadı, metin kanalı değil veya mesaj/dosya gönderme iznim yok.`);
        }

        // --- Embed ile Hoş Geldin Mesajı Oluşturma ---
        // Değişkenleri tanımla
        const replacements = {
            '{uye}': member.toString(),
            '{uyeAd}': member.displayName,
            '{uyeTag}': member.user.tag,
            '{sunucuAd}': guild.name,
            '{uyeSayisi}': guild.memberCount.toString()
        };

        // Mesajı ve rengi ayarla (varsayılan değerlerle)
        const customMessage = settings.hgMesaj || `Aramıza hoş geldin, {uye}! Seninle birlikte **{uyeSayisi}** kişi olduk.`;
        const finalMessage = customMessage.replace(/{uye}|{uyeAd}|{uyeTag}|{sunucuAd}|{uyeSayisi}/g, match => replacements[match]);
        const embedColor = settings.hgRenk || "Green";
        const accountCreatedAgo = moment(member.user.createdAt).fromNow();

        // YENİ: Hesap güvenilirliği kontrolü
        const accountAgeDays = moment().diff(member.user.createdAt, 'days');
        let trustStatus = "Güvenli ✅";
        if (accountAgeDays < 7) { // 7 günden yeni hesaplar "Yeni Hesap" olarak işaretlensin
            trustStatus = "Yeni Hesap ⚠️";
        }

        const welcomeEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setAuthor({ name: `${member.user.tag} Sunucuya Katıldı!`, iconURL: member.user.displayAvatarURL() })
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setDescription(finalMessage)
            .addFields(
                { name: 'Hesap Oluşturulma', value: `> ${accountCreatedAgo}`, inline: true },
                { name: 'Sunucuya Katılma', value: `> <t:${parseInt(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Hesap Güvenilirliği', value: `> ${trustStatus}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: guild.name, iconURL: guild.iconURL() });

        await channel.send({ embeds: [welcomeEmbed] }).catch(err => {
            console.error("[HATA] Hoş geldin mesajı gönderilemedi:", err);
        });
    }

    // Kayıt kanalına mesaj gönder
    if (settings.kayıtKanalı && settings.kayıtStaffRolü) {
        const kayıtChannel = guild.channels.cache.get(settings.kayıtKanalı);
        const staffRole = guild.roles.cache.get(settings.kayıtStaffRolü); // Bu satır zaten vardı, sorun yok.

        if (kayıtChannel && staffRole && kayıtChannel.isTextBased()) {
            const kayıtEmbed = new EmbedBuilder()
                .setColor("Gold")
                .setDescription(`
Sunucumuza hoş geldin ${member}!

Kaydını tamamlamak için lütfen sesli kanallara geçiş yap. ${staffRole} rolündeki yetkililerimiz seninle ilgilenecektir.
                `);
            kayıtChannel.send({ content: `${member} ${staffRole}`, embeds: [kayıtEmbed] }).catch(console.error);
        }
    }
    }
};