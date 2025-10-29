// commands/Kullanıcı/banner.js

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "banner",
    aliases: ["arkaplan"],
    category: "Kullanıcı",
    description: "Belirtilen kullanıcının veya kendinizin Discord banner'ını gösterir.",

    execute: async (client, message, args) => {

        // Kullanıcıyı belirle (etiketlenen, ID'si verilen veya komutu yazan)
        const user = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;

        // Kullanıcı bilgilerini ve banner'ını çek (fetch ile en güncel hali alınır)
        try {
            await user.fetch({ force: true }); // force: true ile önbelleği atla
        } catch (error) {
            console.error("Kullanıcı bilgileri çekilirken hata:", error);
            return message.reply("Kullanıcı bilgileri alınırken bir hata oluştu.");
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
                .setFooter({ text: `İsteyen: ${message.author.tag}`});
            return message.reply({ embeds: [noBannerEmbed] });
        }

        // Banner varsa embed oluştur
        const embed = new EmbedBuilder()
            .setColor("Blue") // Veya kullanıcının accent color'ını kullanabilirsin: user.accentColor || "Blue"
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`${user.username}'ın Banner'ı`)
            .setImage(bannerUrl)
            .setTimestamp()
            .setFooter({ text: `İsteyen: ${message.author.tag}` });

        message.reply({ embeds: [embed] });
    }
};