// commands/Genel/ping.js

const { EmbedBuilder } = require('discord.js');

module.exports = {
    // 'data' değil, 'name' kullanıyoruz
    name: "ping",
    aliases: ["gecikme", "ms"],
    category: "Genel",
    description: "Botun gecikme sürelerini gösterir.",
    
    // 'interaction' değil, 'message' ve 'args' kullanıyoruz
    execute: async (client, message, args) => {
        
        const embed = new EmbedBuilder()
            .setColor("Blurple")
            .setTitle("Pong! 🏓")
            .setDescription(`Mesaj Gecikmesi: **${Date.now() - message.createdTimestamp}ms**\nAPI Gecikmesi: **${Math.round(client.ws.ping)}ms**`)
            .setTimestamp()
            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });
            
        message.reply({ embeds: [embed] });
    }
};