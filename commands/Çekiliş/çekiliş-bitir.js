const { PermissionsBitField, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'çekiliş-bitir',
    aliases: ['end', 'gbitir'],
    category: 'Çekiliş',
    description: 'Devam eden bir çekilişi erken bitirir.',
    usage: '<mesaj_id>',
    permissions: [PermissionsBitField.Flags.ManageMessages],

    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('çekiliş-bitir')
        .setDescription('Devam eden bir çekilişi erken bitirir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
        .addStringOption(option =>
            option.setName('mesaj_id')
                .setDescription('Bitirilecek çekilişin mesaj ID\'si.')
                .setRequired(true)),

    async execute(client, interactionOrMessage, args) {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        const reply = (options) => isInteraction ? interactionOrMessage.reply(options) : interactionOrMessage.reply(options);

        const query = isInteraction ? interactionOrMessage.options.getString('mesaj_id') : args[0];

        if (!query) {
            return reply({ content: `Lütfen bitirilecek çekilişin mesaj ID'sini belirtin.`, ephemeral: true });
        }

        try {
            await client.giveawaysManager.end(query);
            if (isInteraction) await reply({ content: 'Çekiliş başarıyla bitirildi!', ephemeral: true });
            // Prefix komutunda mesaj silme, çünkü zaten bir onay mesajı yok.
        } catch (e) {
            await reply({ content: `\`${query}\` ID'li bir çekiliş bulunamadı veya çekiliş zaten bitmiş.`, ephemeral: true });
        }
    }
};