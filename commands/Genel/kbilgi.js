// commands/Kullanıcı/kbilgi.js

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const moment = require('moment'); // Zaman formatlama için
require('moment-duration-format'); // moment için eklenti

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('kbilgi')
        .setDescription('Belirtilen kullanıcının veya kendinizin profil bilgilerini gösterir.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Bilgilerini görmek istediğiniz kullanıcı.')
                .setRequired(false)),

    // Prefix Command tanımı
    name: "kbilgi",
    aliases: ["kullanıcıbilgi", "profil", "ui", "userinfo"],
    category: "Kullanıcı",
    description: "Belirtilen kullanıcının veya kendinizin profil bilgilerini gösterir.",

    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
        const guild = interactionOrMessage.guild;
        
        let member;
        try {
            const user = isInteraction ? (interactionOrMessage.options.getUser('kullanıcı') || author) : (interactionOrMessage.mentions.users.first() || client.users.cache.get(args[0]) || author);
            member = guild.members.cache.get(user.id);
        } catch (error) {
             console.error("[HATA] kbilgi - Kullanıcı belirlenirken hata:", error); // Hata logu kalsın
             return interactionOrMessage.reply({ content: "Kullanıcı bilgileri alınırken bir hata oluştu (üye bulunamadı).", ephemeral: true });
        }


        try {
            // Hesap oluşturulma ve sunucuya katılma tarihlerini formatla
            const accountCreated = moment(member.user.createdAt).format('DD/MM/YYYY HH:mm');
            const accountCreatedAgo = moment(member.user.createdAt).fromNow();
            const serverJoined = moment(member.joinedAt).format('DD/MM/YYYY HH:mm');
            const serverJoinedAgo = moment(member.joinedAt).fromNow();

            // Kullanıcının rollerini listele
            const roles = member.roles.cache
                .filter(role => role.id !== guild.id) // @everyone rolünü filtrele
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
                    { name: `🎭 Roller (${member.roles.cache.filter(r => r.id !== guild.id).size})`, value: roles, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: `İsteyen: ${author.tag}`, iconURL: author.displayAvatarURL({ dynamic: true }) });

            interactionOrMessage.reply({ embeds: [embed] });

        } catch (error) {
            console.error("[HATA] kbilgi komutu içinde hata oluştu:", error); // Hata logu kalsın
            interactionOrMessage.reply({ content: "Komut işlenirken bir hata oluştu.", ephemeral: true });
        }
    }
};