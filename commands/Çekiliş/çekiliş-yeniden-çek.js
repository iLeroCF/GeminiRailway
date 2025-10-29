const { PermissionsBitField, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'çekiliş-yeniden-çek',
    aliases: ['reroll', 'gyenile'],
    category: 'Çekiliş',
    description: 'Bitmiş bir çekiliş için yeni bir kazanan seçer.',
    usage: '<mesaj_id>',
    permissions: [PermissionsBitField.Flags.ManageMessages],

    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('çekiliş-yeniden-çek')
        .setDescription('Bitmiş bir çekiliş için yeni bir kazanan seçer.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
        .addStringOption(option =>
            option.setName('mesaj_id')
                .setDescription('Yeniden çekilecek çekilişin mesaj ID\'si.')
                .setRequired(true)),

    async execute(client, interactionOrMessage, args) {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        const reply = (options) => isInteraction ? interactionOrMessage.reply(options) : interactionOrMessage.reply(options);

        const query = isInteraction ? interactionOrMessage.options.getString('mesaj_id') : args[0];

        if (!query) {
            return reply({ content: `Lütfen yeniden çekilecek çekilişin mesaj ID'sini belirtin.`, ephemeral: true });
        }

        try {
            await client.giveawaysManager.reroll(query, {
                messages: {
                    congrat: 'Tebrikler yeni kazanan(lar): {winners}! **{this.prize}** ödülünü kazandınız!',
                    error: 'Geçerli katılım kalmadı, yeni kazanan seçilemiyor!'
                }
            });
            if (isInteraction) await reply({ content: 'Çekiliş için yeni kazanan başarıyla çekildi!', ephemeral: true });
        } catch (e) {
            await reply({ content: `\`${query}\` ID'li bir çekiliş bulunamadı veya çekiliş henüz bitmemiş.`, ephemeral: true });
        }
    }
};