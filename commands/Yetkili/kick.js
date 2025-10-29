const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Bir kullanıcıyı sunucudan atar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Atılacak kullanıcı.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Atılma sebebi.')
                .setRequired(false)),

    // Prefix Command tanımı
    name: "kick",
    aliases: ["at"],
    category: "Yönetim",
    description: "Bir kullanıcıyı sunucudan atar.",
    usage: "<@kullanıcı> [sebep]",
    permissions: [PermissionsBitField.Flags.KickMembers],

    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = interactionOrMessage.isChatInputCommand();
        const reply = (options) => isInteraction ? interactionOrMessage.reply(options) : interactionOrMessage.reply(options);
        const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
        const guild = interactionOrMessage.guild;

        let targetMember;
        let reason;

        if (isInteraction) {
            const user = interactionOrMessage.options.getUser('kullanıcı');
            targetMember = guild.members.cache.get(user.id);
            reason = interactionOrMessage.options.getString('sebep') || 'Sebep belirtilmedi.';
        } else {
            targetMember = interactionOrMessage.mentions.members.first() || guild.members.cache.get(args[0]);
            reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';
        }

        if (!targetMember) {
            return reply({ content: 'Lütfen atılacak bir kullanıcı belirtin.', ephemeral: true });
        }

        if (targetMember.id === author.id) {
            return reply({ content: 'Kendinizi atamazsınız!', ephemeral: true });
        }

        if (!targetMember.kickable) {
            return reply({ content: 'Bu kullanıcıyı atma yetkim yok. (Rolü benim rolümden daha yüksek olabilir)', ephemeral: true });
        }

        try {
            await targetMember.kick(reason);
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setDescription(`✅ **${targetMember.user.tag}** kullanıcısı, **${reason}** sebebiyle sunucudan atıldı.`);
            await reply({ embeds: [embed] });
        } catch (error) {
            console.error("Kick komutu hatası:", error);
            await reply({ content: 'Kullanıcı atılırken bir hata oluştu.', ephemeral: true });
        }
    }
};