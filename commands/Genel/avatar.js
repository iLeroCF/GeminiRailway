// commands/Kullanıcı/avatar.js

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "avatar",
    aliases: ["av", "pp"],
    category: "Kullanıcı",
    description: "Belirtilen kullanıcının veya kendinizin profil resmini (avatarını) gösterir.",

    execute: async (client, message, args) => {

        // Kullanıcıyı belirle (etiketlenen, ID'si verilen veya komutu yazan)
        const user = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;

        // Avatar URL'sini al (dinamik GIF desteği ve en yüksek çözünürlük ile)
        const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 4096 });

        // Embed oluştur
        const embed = new EmbedBuilder()
            .setColor("Blurple") // Genel bir renk
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`${user.username}'ın Avatarı`)
            .setImage(avatarUrl)
            .setTimestamp()
            .setFooter({ text: `İsteyen: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) }); // İsteyenin avatarını ekledim

        message.reply({ embeds: [embed] });
    }
};