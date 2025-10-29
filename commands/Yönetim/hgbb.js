// commands/Yönetim/hgbb.js

const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    // Slash Command
    data: new SlashCommandBuilder()
        .setName('hgbb')
        .setDescription('Hoş geldin/Güle güle (HG-BB) sistemini yönetir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('aç')
                .setDescription('HG-BB sistemini açar ve kanalını ayarlar.')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Hoş geldin ve güle güle mesajlarının gönderileceği kanal.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('kapat')
                .setDescription('HG-BB sistemini kapatır.')
        ),

    // Prefix Command
    name: "hgbb",
    aliases: ["hoşgeldin-ayarla", "welcome-setup"],
    category: "Yönetim",
    description: "Hoş geldin/Güle güle (HG-BB) sistemini açar veya kapatır.",
    usage: "aç <#kanal> | kapat",
    permissions: [PermissionsBitField.Flags.Administrator],

    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = interactionOrMessage.isChatInputCommand?.();
        const guild = interactionOrMessage.guild;
        const guildID = guild.id;
        const db = client.db;

        const subcommand = isInteraction ? interactionOrMessage.options.getSubcommand() : args[0];

        if (subcommand === 'aç' || subcommand === 'on') {
            let targetChannel;
            if (isInteraction) {
                targetChannel = interactionOrMessage.options.getChannel('kanal');
            } else {
                targetChannel = interactionOrMessage.mentions.channels.first() || guild.channels.cache.get(args[1]);
            }

            if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                return interactionOrMessage.reply({ content: `Lütfen geçerli bir metin kanalı etiketleyin veya ID'sini girin.`, ephemeral: true });
            }

            let settings = client.settings.get(guildID) || {};
            settings.hgbbKanalID = targetChannel.id;

            db.set(`settings_${guildID}`, settings);
            client.settings.set(guildID, settings); // Cache'i de güncelle

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ HG-BB Sistemi Aktif!")
                .setDescription(`Hoş geldin ve güle güle mesajları artık ${targetChannel} kanalına gönderilecek.`);

            return interactionOrMessage.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'kapat' || subcommand === 'off') {
            let settings = client.settings.get(guildID);
            if (!settings || !settings.hgbbKanalID) {
                return interactionOrMessage.reply({ content: 'HG-BB sistemi zaten kapalı.', ephemeral: true });
            }

            // Sadece kanalı değil, ilgili tüm ayarları sil
            delete settings.hgbbKanalID;
            delete settings.hgMesaj;
            delete settings.hgRenk;
            delete settings.bbMesaj;
            delete settings.bbRenk;

            db.set(`settings_${guildID}`, settings);
            client.settings.set(guildID, settings); // Cache'i de güncelle

            return interactionOrMessage.reply({ content: '✅ HG-BB sistemi başarıyla kapatıldı. Artık giriş/çıkış mesajları gönderilmeyecek ve ilgili tüm özel ayarlar (mesaj, renk) sıfırlandı.', ephemeral: true });

        } else {
            return interactionOrMessage.reply({ content: `Geçersiz kullanım! Lütfen \`aç <#kanal>\` veya \`kapat\` seçeneklerini kullanın.`, ephemeral: true });
        }
    }
};