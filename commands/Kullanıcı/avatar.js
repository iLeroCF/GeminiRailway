// commands/Genel/avatar.js

const { EmbedBuilder } = require('discord.js');

module.exports = {
    // Bu bir prefix komutu olduğu için 'name' kullanıyoruz, 'data' değil.
    name: "avatar",
    aliases: ["av", "pp"],
    category: "Genel",
    description: "Belirtilen kullanıcının avatarını gösterir.",

    // Prefix komutları 'message' ve 'args' alır
    execute: async (client, message, args) => {
        
        const user = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;

        const embed = new EmbedBuilder()
            .setColor("Blurple")
            .setTitle(`${user.username}'ın Avatarı`)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 4096 }))
            .setTimestamp()
            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

        message.reply({ embeds: [embed] });
    }
};