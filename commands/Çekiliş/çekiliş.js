const { PermissionsBitField, SlashCommandBuilder } = require('discord.js');
const ms = require('ms');

module.exports = {
    name: 'çekiliş-başlat',
    aliases: ['giveaway-start', 'gstart'],
    category: 'Çekiliş', // Yardım menüsü için kategori
    description: 'Yeni bir çekiliş başlatır.',
    usage: '<süre> <kazanan_sayısı> <ödül>',
    permissions: [PermissionsBitField.Flags.ManageMessages],
    
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('çekiliş-başlat')
        .setDescription('Yeni bir çekiliş başlatır.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages) // Yetkiyi burada da belirtiyoruz
        .addStringOption(option =>
            option.setName('süre')
                .setDescription('Çekiliş süresi (örn: 10m, 1h, 2d)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('kazanan-sayısı')
                .setDescription('Kaç kişinin kazanacağı')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ödül')
                .setDescription('Çekilişin ödülü ne olacak?')
                .setRequired(true)),

    async execute(client, interactionOrMessage, args) {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        const reply = (content) => isInteraction ? interactionOrMessage.reply({ content, ephemeral: true }) : interactionOrMessage.reply(content);

        let durationString, winnerCountString, prize;

        if (isInteraction) {
            durationString = interactionOrMessage.options.getString('süre');
            winnerCountString = interactionOrMessage.options.getInteger('kazanan-sayısı').toString();
            prize = interactionOrMessage.options.getString('ödül');
        } else {
            if (args.length < 3) {
                return reply(`Lütfen komutu doğru kullanın! \n**Örnek:** \`${client.config.prefix}çekiliş-başlat 10m 1 Nitro\``);
            }
            [durationString, winnerCountString, ...prize] = args;
            prize = prize.join(' ');
        }
        
        const duration = ms(durationString);
        if (!duration || duration < 10000) { // En az 10 saniye
            return reply('Geçersiz bir süre belirttiniz. Minimum 10 saniye olmalıdır. Örnekler: `10m`, `1h`, `2d`');
        }

        const winnerCount = parseInt(winnerCountString, 10);
        if (isNaN(winnerCount) || winnerCount < 1) {
            return reply('Geçersiz bir kazanan sayısı belirttiniz. Lütfen 1 veya daha büyük bir sayı girin.');
        }

        // Çekilişin başlatılacağı kanalı belirle
        const settings = client.settings.get(interactionOrMessage.guild.id);
        let targetChannel = interactionOrMessage.channel;
        let successMessage = 'Çekiliş bu kanalda başarıyla başlatıldı!';

        if (settings && settings.cekilisKanal) {
            const designatedChannel = interactionOrMessage.guild.channels.cache.get(settings.cekilisKanal);
            // Belirlenen kanal varsa ve metin tabanlı bir kanalsa, hedefi o kanal yap
            if (designatedChannel && designatedChannel.isTextBased()) {
                targetChannel = designatedChannel;
                successMessage = `Çekiliş başarıyla ${targetChannel} kanalında başlatıldı!`;
            }
        }

        if (isInteraction) {
            await interactionOrMessage.reply({ content: successMessage, ephemeral: true });
        }

        await client.giveawaysManager.start(targetChannel, {
            duration: duration,
            winnerCount,
            prize,
            hostedBy: isInteraction ? interactionOrMessage.user : interactionOrMessage.author,
            messages: {
                giveaway: '🎉 **ÇEKİLİŞ** 🎉',
                giveawayEnded: '🎉 **ÇEKİLİŞ BİTTİ** 🎉',
                winMessage: 'Tebrikler, {winners}! **{this.prize}** kazandınız!',
            }
        });
        
        if (!isInteraction && interactionOrMessage.deletable) {
            interactionOrMessage.delete().catch(e => {});
        }
    }
};
