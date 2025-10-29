const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    // Slash Command
    data: new SlashCommandBuilder()
        .setName('öneriler-kanalı')
        .setDescription('Önerilerin gönderileceği kanalı ayarlar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Öneri kanalı olarak ayarlanacak metin kanalı.')
                .addChannelTypes(ChannelType.GuildText) // Sadece metin kanalları seçilebilir
                .setRequired(true)),

    // Prefix Command
    name: "öneriler-kanalı",
    aliases: ["önerikanalı", "suggestion-channel"],
    category: "Yönetim",
    description: "Önerilerin gönderileceği kanalı ayarlar.",
    usage: "<#kanal>",
    permissions: [PermissionsBitField.Flags.Administrator],

    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        const reply = (options) => isInteraction ? interactionOrMessage.reply(options) : interactionOrMessage.reply(options);
        const guild = interactionOrMessage.guild;
        const guildID = guild.id;
        const db = client.db;

        let targetChannel;

        if (isInteraction) {
            targetChannel = interactionOrMessage.options.getChannel('kanal');
        } else {
            targetChannel = interactionOrMessage.mentions.channels.first() || guild.channels.cache.get(args[0]);
        }

        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return reply({ content: `Lütfen geçerli bir metin kanalı etiketleyin veya ID'sini girin.`, ephemeral: true });
        }

        try {
            // Ayarları al, üzerine yaz ve kaydet
            let settings = client.settings.get(guildID) || {};
            settings.oneriKanal = targetChannel.id;

            db.set(`settings_${guildID}`, settings);
            client.settings.set(guildID, settings); // Hafızayı güncelle

            await reply({ content: `✅ **Öneri kanalı başarıyla ${targetChannel} olarak ayarlandı!**\n\nArtık bu kanala yazılan komut olmayan her mesaj, oylama embed'ine dönüştürülecektir.`, ephemeral: true });

        } catch (error) {
            console.error("Öneriler kanalı ayarlama hatası:", error);
            await reply({ content: 'Kanal ayarlanırken bir hata oluştu.', ephemeral: true });
        }
    }
};