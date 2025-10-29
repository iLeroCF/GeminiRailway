// events/guildMemberRemove.js

const { Events, EmbedBuilder, AttachmentBuilder, PermissionsBitField } = require('discord.js');
const moment = require('moment'); // Zaman formatlama için

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) { // Parametre sırası değişti, client sona geldi
    // Botun kendisi ayrılırsa veya bir DM'de olursa işlemi durdur
    if (member.user.bot || !member.guild) return;

    const guild = member.guild;
    const settings = client.settings.get(guild.id);

    // Ayarlar veya hoş geldin/güle güle kanalı ayarlanmamışsa işlemi durdur
    if (!settings || !settings.hgbbKanalID) {
        return;
    }

    const channel = guild.channels.cache.get(settings.hgbbKanalID);
    if (!channel || !channel.isTextBased() || !channel.permissionsFor(guild.members.me).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles])) {
        return console.warn(`[UYARI] Güle güle kanalı (${settings.hgbbKanalID}) bulunamadı, metin kanalı değil veya mesaj/dosya gönderme iznim yok.`);
    }

    // --- Embed ile Güle Güle Mesajı Oluşturma ---
    // Değişkenleri tanımla
    const replacements = {
        '{uyeAd}': member.displayName,
        '{uyeTag}': member.user.tag,
        '{sunucuAd}': guild.name,
        '{uyeSayisi}': guild.memberCount.toString()
    };

    // Mesajı ve rengi ayarla (varsayılan değerlerle)
    const customMessage = settings.bbMesaj || `**{uyeAd}** aramızdan ayrıldı. Sunucuda **{uyeSayisi}** kişi kaldık.`;
    const finalMessage = customMessage.replace(/{uyeAd}|{uyeTag}|{sunucuAd}|{uyeSayisi}/g, match => replacements[match]);
    const embedColor = settings.bbRenk || "Red";
    
    // YENİ: Hesap güvenilirliği kontrolü
    const accountAgeDays = moment().diff(member.user.createdAt, 'days');
    let trustStatus = "Güvenli ✅";
    if (accountAgeDays < 7) {
        trustStatus = "Yeni Hesap ⚠️";
    }

    const farewellEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setAuthor({ name: `${member.user.tag} Sunucudan Ayrıldı!`, iconURL: member.user.displayAvatarURL() })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription(finalMessage)
        .addFields({ name: 'Hesap Güvenilirliği', value: `> ${trustStatus}`, inline: false })
        .setTimestamp()
        .setFooter({ text: guild.name, iconURL: guild.iconURL() });

    await channel.send({ embeds: [farewellEmbed] }).catch(err => {
        console.error("[HATA] Güle güle mesajı gönderilemedi:", err);
    });
    }
};