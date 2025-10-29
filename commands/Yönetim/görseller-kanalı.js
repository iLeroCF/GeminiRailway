const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    // Slash Command
    data: new SlashCommandBuilder()
        .setName('görseller-kanalı')
        .setDescription('Sadece görsel ve link gönderilebilen kanalı ayarlar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Görsel kanalı olarak ayarlanacak metin kanalı.')
                .addChannelTypes(ChannelType.GuildText) // Sadece metin kanalları
                .setRequired(true)),

    // Prefix Command
    name: "görseller-kanalı",
    aliases: ["görselkanalı", "image-channel"],
    category: "Yönetim",
    description: "Sadece görsel ve link gönderilebilen kanalı ayarlar.",
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
            settings.gorselKanal = targetChannel.id;

            db.set(`settings_${guildID}`, settings);
            client.settings.set(guildID, settings); // Hafızayı güncelle

            await reply({ content: `✅ **Görsel kanalı başarıyla ${targetChannel} olarak ayarlandı!**\n\nArtık bu kanala metin yazan kullanıcıların mesajları otomatik olarak silinecektir.`, ephemeral: true });

        } catch (error) {
            console.error("Görseller kanalı ayarlama hatası:", error);
            await reply({ content: 'Kanal ayarlanırken bir hata oluştu.', ephemeral: true });
        }
    }
};