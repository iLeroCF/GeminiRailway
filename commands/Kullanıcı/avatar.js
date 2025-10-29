// commands/Genel/avatar.js

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Belirtilen kullanıcının veya kendinizin avatarını gösterir.')
        .addUserOption(option => 
            option.setName('kullanıcı')
                .setDescription('Avatarını görmek istediğiniz kullanıcı.')
                .setRequired(false)),

    // Prefix Command tanımı
    name: "avatar",
    aliases: ["av", "pp"],
    category: "Genel",
    description: "Belirtilen kullanıcının avatarını gösterir.",

    // Hem 'message' hem de 'interaction' ile çalışacak execute fonksiyonu
    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        let user;

        if (isInteraction) {
            user = interactionOrMessage.options.getUser('kullanıcı') || interactionOrMessage.user;
        } else {
            user = interactionOrMessage.mentions.users.first() || client.users.cache.get(args[0]) || interactionOrMessage.author;
        }

        const embed = new EmbedBuilder()
            .setColor("Blurple")
            .setTitle(`${user.username}'ın Avatarı`)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 4096 }))
            .setTimestamp();

        await interactionOrMessage.reply({ embeds: [embed] });
    }
};