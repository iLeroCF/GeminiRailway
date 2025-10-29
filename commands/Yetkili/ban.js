const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bir kullanıcıyı sunucudan yasaklar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Yasaklanacak kullanıcı.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Yasaklama sebebi.')
                .setRequired(false)),

    // Prefix Command tanımı
    name: "ban",
    aliases: ["yasakla"],
    category: "Yönetim",
    description: "Bir kullanıcıyı sunucudan yasaklar.",
    usage: "<@kullanıcı> [sebep]",
    permissions: [PermissionsBitField.Flags.BanMembers],

    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
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
            return reply({ content: 'Lütfen yasaklanacak bir kullanıcı belirtin.', ephemeral: true });
        }

        if (targetMember.id === author.id) {
            return reply({ content: 'Kendinizi yasaklayamazsınız!', ephemeral: true });
        }

        if (!targetMember.bannable) {
            return reply({ content: 'Bu kullanıcıyı yasaklama yetkim yok. (Rolü benim rolümden daha yüksek olabilir)', ephemeral: true });
        }

        try {
            await targetMember.ban({ reason: reason });
            const embed = new EmbedBuilder()
                .setColor("DarkRed")
                .setDescription(`🚫 **${targetMember.user.tag}** kullanıcısı, **${reason}** sebebiyle sunucudan yasaklandı.`);
            await reply({ embeds: [embed] });
        } catch (error) {
            console.error("Ban komutu hatası:", error);
            await reply({ content: 'Kullanıcı yasaklanırken bir hata oluştu.', ephemeral: true });
        }
    }
};