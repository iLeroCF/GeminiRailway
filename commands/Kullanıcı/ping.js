// commands/Genel/ping.js

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun gecikme sürelerini gösterir.'),
    
    // Prefix Command tanımı
    name: "ping",
    aliases: ["gecikme", "ms"],
    category: "Genel",
    description: "Botun gecikme sürelerini gösterir.",
    
    // Hem 'message' hem de 'interaction' ile çalışacak execute fonksiyonu
    execute: async (client, interactionOrMessage) => {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
        const createdTimestamp = isInteraction ? interactionOrMessage.createdTimestamp : interactionOrMessage.createdTimestamp;
        
        const embed = new EmbedBuilder()
            .setColor("Blurple")
            .setTitle("Pong! 🏓")
            .setDescription(`Mesaj Gecikmesi: **${Date.now() - createdTimestamp}ms**\nAPI Gecikmesi: **${Math.round(client.ws.ping)}ms**`)
            .setTimestamp()
            .setFooter({ text: author.tag, iconURL: author.displayAvatarURL({ dynamic: true }) });
            
        // Uygun metoda göre yanıtla
        await interactionOrMessage.reply({ embeds: [embed] });
    }
};