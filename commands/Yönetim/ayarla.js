// commands/Yönetim/ayarla.js
const { PermissionsBitField, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('ayarla')
        .setDescription('Sunucu ayarlarını interaktif bir panel üzerinden yönetir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // Prefix Command tanımı
    name: "ayarla",
    aliases: ["setup", "config"],
    category: "Yönetim",
    description: "Sunucu ayarlarını interaktif bir panel üzerinden yönetir.",
    permissions: [PermissionsBitField.Flags.Administrator], 

    execute: async (client, message, args) => {
        const isInteraction = !!message.isChatInputCommand;
        const author = isInteraction ? message.user : message.author;
        const guild = message.guild;
        const channel = message.channel;

        // Ayarları kategorilere ayıralım
        const categories = {
            kayit: {
                label: 'Kayıt Ayarları',
                emoji: '📝',
                customId: 'ayarla_category_kayit',
                settings: [
                    { label: 'Kayıt Yetkili Rolü', key: 'kayıtStaffRolü', customId: 'ayarla_kayıtStaffRolü' },
                    { label: 'Kayıtsız Rolü', key: 'kayıtsızRolü', customId: 'ayarla_kayıtsızRolü' },
                    { label: 'Erkek Rolü', key: 'erkekRolü', customId: 'ayarla_erkekRolü' },
                    { label: 'Kadın Rolü', key: 'kadınRolü', customId: 'ayarla_kadınRolü' },
                    { label: 'Kayıt Kanalı', key: 'kayıtKanalı', customId: 'ayarla_kayıtKanalı', type: 'channel' },
                ]
            },
            kanal: {
                label: 'Kanal Ayarları',
                emoji: '📺',
                customId: 'ayarla_category_kanal',
                settings: [
                    { label: 'Çekiliş Kanalı', key: 'cekilisKanal', customId: 'ayarla_cekilisKanal', type: 'channel' },
                    { label: 'Duyuru Kanalı', key: 'duyuruKanal', customId: 'ayarla_duyuruKanal', type: 'channel' },
                    { label: 'Öneri Kanalı', key: 'oneriKanal', customId: 'ayarla_oneriKanal', type: 'channel' },
                    { label: 'Görsel Kanalı', key: 'gorselKanal', customId: 'ayarla_gorselKanal', type: 'channel' },
                    { label: 'HG-BB Kanalı', key: 'hgbbKanalID', customId: 'ayarla_hgbbKanalID', type: 'channel' },
                    { label: 'Hoş Geldin Mesajı', key: 'hgMesaj', customId: 'ayarla_hgMesaj', type: 'string' },
                    { label: 'Hoş Geldin Renk', key: 'hgRenk', customId: 'ayarla_hgRenk', type: 'string' },
                    { label: 'Güle Güle Mesajı', key: 'bbMesaj', customId: 'ayarla_bbMesaj', type: 'string' },
                    { label: 'Güle Güle Renk', key: 'bbRenk', customId: 'ayarla_bbRenk', type: 'string' },
                ]
            }
        };

        // Paneli oluşturan ve güncelleyen fonksiyon
        const generatePanel = (categoryKey = null) => {
            const currentSettings = client.settings.get(guild.id) || {};
            const embed = new EmbedBuilder().setColor("Gold").setTitle(`${guild.name} Sunucu Ayarları Paneli`);
            const rows = [];

            if (categoryKey) { // Bir kategori seçildiyse
                const category = categories[categoryKey];
                const description = category.settings.map(s => {
                    const value = currentSettings[s.key];
                    let displayValue = '`Ayarlanmamış`';
                    if (value) {
                        if (s.type === 'channel') displayValue = `<#${value}>`;
                        else if (s.type === 'string') displayValue = `\`${value.substring(0, 50)}${value.length > 50 ? '...' : ''}\``;
                        else displayValue = `<@&${value}>`;
                    }
                    return `**${s.label}:** ${displayValue}`;
                }).join('\n');

                embed.setDescription(description).setFooter({ text: `Şu anki kategori: ${category.label}` });

                // Ayar butonlarını oluştur
                for (let i = 0; i < category.settings.length; i += 5) {
                    const row = new ActionRowBuilder();
                    category.settings.slice(i, i + 5).forEach(s => {
                        row.addComponents(new ButtonBuilder().setCustomId(s.customId).setLabel(s.label).setStyle(ButtonStyle.Primary));
                    });
                    rows.push(row);
                }

                // Geri butonu
                const backRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ayarla_main_menu').setLabel('⬅️ Geri').setStyle(ButtonStyle.Secondary)
                );
                rows.push(backRow);

            } else { // Ana menüdeyse
                embed.setDescription('Lütfen düzenlemek istediğiniz ayar kategorisini seçin.');
                const categoryRow = new ActionRowBuilder();
                Object.values(categories).forEach(cat => {
                    categoryRow.addComponents(
                        new ButtonBuilder().setCustomId(cat.customId).setLabel(cat.label).setEmoji(cat.emoji).setStyle(ButtonStyle.Success)
                    );
                });
                rows.push(categoryRow);
            }

            return { embeds: [embed], components: rows };
        };

        const panelMessage = await channel.send(generatePanel());

        const buttonCollector = panelMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i) => i.user.id === author.id,
            time: 600000 // 10 dakika
        });

        buttonCollector.on('collect', async (interaction) => {
            const customId = interaction.customId;

            // Kategori veya Geri butonu mu?
            if (customId.startsWith('ayarla_category_') || customId === 'ayarla_main_menu') {
                const categoryKey = customId === 'ayarla_main_menu' ? null : customId.replace('ayarla_category_', '');
                await interaction.update(generatePanel(categoryKey));
                return;
            }

            // Ayar butonu mu?
            const allSettings = Object.values(categories).flatMap(c => c.settings);
            const setting = allSettings.find(s => s.customId === customId);

            if (setting) {
                const typeText = setting.type === 'channel' ? 'kanalı' : (setting.type === 'string' ? 'metni/rengi' : 'rolü');
                await interaction.reply({ content: `Lütfen **${setting.label}** olarak ayarlamak istediğiniz yeni ${typeText} 30 saniye içinde bu kanala yazın. (Etiketleyebilir, ID veya link girebilirsiniz)`, ephemeral: true });

                const messageCollector = channel.createMessageCollector({
                    filter: m => m.author.id === author.id,
                    time: 30000, // 30 saniye
                    max: 1
                });

                messageCollector.on('collect', async (msg) => {
                    let valueToSet;
                    let displayValue;

                    if (setting.type === 'channel') {
                        const resolvedChannel = msg.mentions.channels.first() || guild.channels.cache.get(msg.content.trim());
                        if (!resolvedChannel) return msg.reply(`Geçersiz bir kanal belirttiniz. İşlem iptal edildi.`);
                        valueToSet = resolvedChannel.id;
                        displayValue = `<#${valueToSet}>`;
                    } else if (setting.type === 'string') {
                        valueToSet = msg.content.trim();
                        // Renk ayarı için geçerli bir hex kodu mu kontrolü
                        if ((setting.key === 'hgRenk' || setting.key === 'bbRenk') && !/^#([0-9A-Fa-f]{3}){1,2}$/i.test(valueToSet)) {
                            await msg.reply('Geçersiz renk kodu! Lütfen `#RRGGBB` formatında bir hex kodu girin (örn: `#3498DB`). İşlem iptal edildi.');
                            return;
                        }
                        displayValue = `\`${valueToSet.substring(0, 50)}${valueToSet.length > 50 ? '...' : ''}\``;
                    } else { // role
                        const resolvedRole = msg.mentions.roles.first() || guild.roles.cache.get(msg.content.trim());
                        if (!resolvedRole) return msg.reply(`Geçersiz bir rol belirttiniz. İşlem iptal edildi.`);
                        valueToSet = resolvedRole.id;
                        displayValue = `<@&${valueToSet}>`;
                    }
                    
                    try {
                        let currentSettings = client.settings.get(guild.id) || {};
                        currentSettings[setting.key] = valueToSet;

                        client.db.set(`settings_${guild.id}`, currentSettings);
                        client.settings.set(guild.id, currentSettings);

                        await msg.reply(`✅ **${setting.label}** başarıyla ${displayValue} olarak ayarlandı!`);

                        // Paneli güncellemek için mevcut kategori anahtarını bul
                        const currentCategoryKey = Object.keys(categories).find(key => categories[key].settings.some(s => s.customId === customId));
                        await panelMessage.edit(generatePanel(currentCategoryKey));

                    } catch (error) {
                        console.error("Ayar kaydetme hatası:", error);
                        await msg.reply(`Ayarı kaydederken bir hata oluştu.`);
                    }
                });

                messageCollector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        interaction.followUp({ content: 'Süre dolduğu için ayar işlemi iptal edildi.', ephemeral: true });
                    }
                });
            }
        });

        buttonCollector.on('end', (collected, reason) => {
            if (reason === 'time') {
                panelMessage.edit({ content: 'Panelin etkileşim süresi doldu.', components: [] }).catch(() => {});
            }
        });
    }
};