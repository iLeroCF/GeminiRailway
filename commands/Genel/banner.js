// commands/Kullanıcı/banner.js

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Belirtilen kullanıcının veya kendinizin Discord banner\'ını gösterir.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Banner\'ını görmek istediğiniz kullanıcı.')
                .setRequired(false)),

    // Prefix Command tanımı
    name: "banner",
    aliases: ["arkaplan"],
    category: "Kullanıcı",
    description: "Belirtilen kullanıcının veya kendinizin Discord banner'ını gösterir.",

    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
        const user = isInteraction
            ? (interactionOrMessage.options.getUser('kullanıcı') || author)
            : (interactionOrMessage.mentions.users.first() || client.users.cache.get(args[0]) || author);

        // Kullanıcı bilgilerini ve banner'ını çek (fetch ile en güncel hali alınır)
        try {
            await user.fetch({ force: true }); // force: true ile önbelleği atla
        } catch (error) {
            console.error("Kullanıcı bilgileri çekilirken hata:", error);
            return interactionOrMessage.reply({ content: "Kullanıcı bilgileri alınırken bir hata oluştu.", ephemeral: true });
        }


        // Banner URL'sini al
        const bannerUrl = user.bannerURL({ dynamic: true, size: 4096 });

        if (!bannerUrl) {
            // Eğer banner yoksa, kullanıcının accent color'ını kullanabiliriz (opsiyonel)
            const accentColor = user.accentColor ? `#${user.accentColor.toString(16)}` : "Grey"; // Hex rengi veya varsayılan
            const noBannerEmbed = new EmbedBuilder()
                .setColor(accentColor) // Profil rengini kullan
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`${user} kullanıcısının bir banner'ı bulunmuyor.`)
                 .setImage(user.displayAvatarURL({ dynamic: true, size: 2048 })) // Banner yerine avatarı göster
                .setTimestamp()
                .setFooter({ text: `İsteyen: ${author.tag}`});
            return interactionOrMessage.reply({ embeds: [noBannerEmbed] });
        }

        // Banner varsa embed oluştur
        const embed = new EmbedBuilder()
            .setColor("Blue") // Veya kullanıcının accent color'ını kullanabilirsin: user.accentColor || "Blue"
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`${user.username}'ın Banner'ı`)
            .setImage(bannerUrl)
            .setTimestamp()
            .setFooter({ text: `İsteyen: ${author.tag}` });

        interactionOrMessage.reply({ embeds: [embed] });
    }
};