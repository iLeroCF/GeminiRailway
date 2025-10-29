// commands/Kullanıcı/kbilgi.js

const { EmbedBuilder } = require('discord.js');
const moment = require('moment'); // Zaman formatlama için
require('moment-duration-format'); // moment için eklenti

module.exports = {
    name: "kbilgi",
    aliases: ["kullanıcıbilgi", "profil", "ui", "userinfo"],
    category: "Kullanıcı",
    description: "Belirtilen kullanıcının veya kendinizin profil bilgilerini gösterir.",

    execute: async (client, message, args) => {

        // Kullanıcıyı belirle (etiketlenen, ID'si verilen veya komutu yazan)
        let member;
        try {
            member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
             if (!member) {
                 // Normalde bu bloğa girmez çünkü || message.member var ama ekstra kontrol
                 return message.reply("Kullanıcı bulunamadı!");
             }
        } catch (error) {
             console.error("[HATA] kbilgi - Kullanıcı belirlenirken hata:", error); // Hata logu kalsın
             return message.reply("Kullanıcı bilgileri alınırken bir hata oluştu (üye bulunamadı).");
        }


        try {
            // Hesap oluşturulma ve sunucuya katılma tarihlerini formatla
            const accountCreated = moment(member.user.createdAt).format('DD/MM/YYYY HH:mm');
            const accountCreatedAgo = moment(member.user.createdAt).fromNow();
            const serverJoined = moment(member.joinedAt).format('DD/MM/YYYY HH:mm');
            const serverJoinedAgo = moment(member.joinedAt).fromNow();

            // Kullanıcının rollerini listele
            const roles = member.roles.cache
                .filter(role => role.id !== message.guild.id) // @everyone rolünü filtrele
                .sort((a, b) => b.position - a.position) // Yetki sırasına göre sırala
                .map(role => role.toString())
                .slice(0, 15) // Çok fazla rol varsa listeyi kısalt
                .join(', ') || "Rolü yok";

             // Kullanıcının en yüksek rolü (renk için)
             const highestRole = member.roles.highest;


            // Embed oluştur
            const embed = new EmbedBuilder()
                .setColor(highestRole.hexColor || "White") // En yüksek rolün rengini kullan
                .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 2048 }))
                .addFields(
                    { name: '👤 Kullanıcı Bilgisi', value: `**ID:** ${member.id}\n**Profil:** ${member.user}`, inline: false },
                    { name: '📅 Hesap Oluşturulma', value: `${accountCreated} (${accountCreatedAgo})`, inline: false },
                    { name: '➡️ Sunucuya Katılma', value: `${serverJoined} (${serverJoinedAgo})`, inline: false },
                    { name: `🎭 Roller (${member.roles.cache.filter(r => r.id !== message.guild.id).size})`, value: roles, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: `İsteyen: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("[HATA] kbilgi komutu içinde hata oluştu:", error); // Hata logu kalsın
            message.reply("Komut işlenirken bir hata oluştu.");
        }
    }
};