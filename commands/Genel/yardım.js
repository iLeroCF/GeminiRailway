// commands/Kullanıcı/yardım.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionsBitField } = require('discord.js');

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('yardım')
        .setDescription('Botun interaktif yardım panelini açar.'),

    // Prefix Command tanımı
    name: "yardım",
    aliases: ["help", "y"],
    category: "Kullanıcı",
    description: "Botun interaktif yardım panelini açar.",
    permissions: [], // Herkes kullanabilir

    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
        const guild = interactionOrMessage.guild;
        const channel = interactionOrMessage.channel;

        // --- AYARLAR KISMI (ayarla.js'den alındı ve uyarlandı) ---
        const settingsCategories = {
            kayit: {
                label: 'Kayıt Ayarları',
                emoji: '📝',
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

        // --- PANEL OLUŞTURMA FONKSİYONLARI ---

        // Ana Menü Paneli
        const generateMainMenu = () => {
            const embed = new EmbedBuilder()
                .setColor("Blurple")
                .setTitle("🤖 Lero Bot Yardım Paneli")
                .setDescription("Aşağıdaki butonları kullanarak bot hakkında bilgi alabilir veya ayarları yönetebilirsiniz.");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('yardim_sistemler').setLabel('Sistemler').setEmoji('⚙️').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('yardim_komutlar').setLabel('Komutlar').setEmoji('📜').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('yardim_kayit_ayarlari').setLabel('Kayıt Ayarları').setEmoji('📝').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('yardim_kanal_ayarlari').setLabel('Kanal Ayarları').setEmoji('📺').setStyle(ButtonStyle.Primary)
            );

            return { embeds: [embed], components: [row] };
        };

        // Sistemler Bilgi Paneli
        const generateSystemsMenu = () => {
            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("⚙️ Sistem Komutları")
                .setDescription("Hakkında bilgi almak istediğiniz sistemi seçin.");

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('yardim_sistem_kayit').setLabel('Kayıt Sistemi').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('yardim_sistem_ozeloda').setLabel('Özel Oda Sistemi').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('yardim_sistem_ticket').setLabel('Ticket Sistemi').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('yardim_sistem_sunucukur').setLabel('Sunucu Kur').setStyle(ButtonStyle.Danger).setEmoji('💥')
            );
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('yardim_main_menu').setLabel('⬅️ Geri').setStyle(ButtonStyle.Secondary)
            );

            return { embeds: [embed], components: [row1, row2] };
        };

        // Belirli bir sistemin detaylarını gösteren panel
        const generateSystemDetail = (system) => {
            const details = {
                kayit: { title: "📝 Kayıt Sistemi", description: "Yeni üyeleri kaydetmek için kullanılır.\n`/kayıt-kur`: Gerekli rolleri oluşturur.\n`/kayıt <@üye> <isim> <yaş>`: Üyeyi kaydeder." },
                ozeloda: { title: "🚪 Özel Oda Sistemi", description: "Kullanıcıların geçici özel ses odaları oluşturmasını sağlar.\n`/ozel-oda-kur`: Sistemi kurar.\nOda panelinden veya `➕ Oda Oluştur` kanalından kullanılır." },
                ticket: { title: "🎫 Ticket Sistemi", description: "Üyelerin destek talebi oluşturmasını sağlar.\n`/ticket-kur`: Sistemi kurar.\n`#ticket-oluştur` kanalındaki butondan kullanılır." },
                sunucukur: { title: "💥 Sunucu Kur", description: "**DİKKAT: Bu komut sunucunuzdaki TÜM kanalları ve botun silebileceği TÜM rolleri siler ve sunucuyu sıfırdan kurar.**\n`/sunucu-kur`: Sunucuyu sıfırlar ve şablonla yeniden kurar." }
            };
            const detail = details[system];
            const embed = new EmbedBuilder().setColor("Aqua").setTitle(detail.title).setDescription(detail.description);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('yardim_sistemler').setLabel('⬅️ Geri').setStyle(ButtonStyle.Secondary));
            return { embeds: [embed], components: [row] };
        };

        // Komut Kategorileri Paneli
        const generateCommandsMenu = () => {
            const embed = new EmbedBuilder()
                .setColor("Orange")
                .setTitle("📜 Komut Kategorileri")
                .setDescription("Hakkında bilgi almak istediğiniz komut kategorisini seçin.");

            // Komutlardan benzersiz kategorileri al
            const categories = [...new Set(client.commands.filter(c => c.category).map(c => c.category))];

            const rows = [];
            // Her kategori için buton oluştur (her satırda en fazla 5)
            for (let i = 0; i < categories.length; i += 5) {
                const row = new ActionRowBuilder();
                categories.slice(i, i + 5).forEach(category => {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`yardim_komut_kategori_${category.toLowerCase()}`)
                            .setLabel(category)
                            .setStyle(ButtonStyle.Primary)
                    );
                });
                rows.push(row);
            }

            rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('yardim_main_menu').setLabel('⬅️ Geri').setStyle(ButtonStyle.Secondary)));
            return { embeds: [embed], components: rows };
        };

        // Belirli bir kategorinin komutlarını listeleyen panel
        const generateCommandList = (category) => {
            const commandsInCategory = client.commands.filter(cmd => cmd.category && cmd.category.toLowerCase() === category.toLowerCase());
            const embed = new EmbedBuilder()
                .setColor("Orange")
                .setTitle(`📜 ${category} Komutları`)
                .setDescription(commandsInCategory.map(cmd => `\`/${cmd.data?.name || cmd.name}\`: ${cmd.description || 'Açıklama yok.'}`).join('\n') || 'Bu kategoride komut bulunamadı.');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('yardim_komutlar').setLabel('⬅️ Geri').setStyle(ButtonStyle.Secondary));
            return { embeds: [embed], components: [row] };
        };

        // Ayar Paneli (ayarla.js'den)
        const generateSettingsPanel = (categoryKey) => {
            // Bu paneli sadece yöneticiler kullanabilir
            if (!interactionOrMessage.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return { content: "Bu bölümü sadece `Yönetici` yetkisine sahip kullanıcılar görebilir.", embeds: [], components: [], ephemeral: true };
            }

            const currentSettings = client.settings.get(guild.id) || {};
            const category = settingsCategories[categoryKey]; // Bu satır doğru, kalsın
            const embed = new EmbedBuilder().setColor("Gold").setTitle(`🛠️ ${category.label}`);

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

            embed.setDescription(description);

            const rows = [];
            for (let i = 0; i < category.settings.length; i += 5) {
                const row = new ActionRowBuilder();
                category.settings.slice(i, i + 5).forEach(s => {
                    row.addComponents(new ButtonBuilder().setCustomId(s.customId).setLabel(s.label).setStyle(ButtonStyle.Primary));
                });
                rows.push(row);
            }

            rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('yardim_main_menu').setLabel('⬅️ Ana Menüye Dön').setStyle(ButtonStyle.Secondary)));
            return { embeds: [embed], components: rows };
        };

        // --- ANA MANTIK ---

        const panelMessage = await channel.send(generateMainMenu());

        const collector = panelMessage.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 600000 // 10 dakika
        });

        collector.on('collect', async (interaction) => {
            const customId = interaction.customId;

            // Ana Menü ve Sistem Menüsü Navigasyonu
            if (customId === 'yardim_main_menu') {
                return await interaction.update(generateMainMenu());
            }
            if (customId === 'yardim_sistemler') {
                return await interaction.update(generateSystemsMenu());
            }
            if (customId.startsWith('yardim_sistem_')) {
                const system = customId.replace('yardim_sistem_', '');
                return await interaction.update(generateSystemDetail(system));
            }
            
            // Komut Menüsü Navigasyonu
            if (customId === 'yardim_komutlar') {
                return await interaction.update(generateCommandsMenu());
            }
            if (customId.startsWith('yardim_komut_kategori_')) {
                const category = customId.replace('yardim_komut_kategori_', '');
                return await interaction.update(generateCommandList(category));
            }


            // Ayar Panelleri
            if (customId === 'yardim_kayit_ayarlari') {
                return await interaction.update(generateSettingsPanel('kayit'));
            }
            if (customId === 'yardim_kanal_ayarlari') {
                return await interaction.update(generateSettingsPanel('kanal'));
            }

            // Ayar Değiştirme Mantığı (ayarla.js'den)
            const allSettings = Object.values(settingsCategories).flatMap(c => c.settings);
            const setting = allSettings.find(s => s.customId === customId);

            if (setting) {
                // Yetki kontrolü
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return await interaction.reply({ content: "Bu ayarı değiştirmek için `Yönetici` yetkisine sahip olmalısınız.", ephemeral: true });
                }

                const typeText = setting.type === 'channel' ? 'kanalı' : (setting.type === 'string' ? 'metni/rengi' : 'rolü');
                await interaction.reply({ content: `Lütfen **${setting.label}** olarak ayarlamak istediğiniz yeni ${typeText} 30 saniye içinde bu kanala yazın. (Etiketleyebilir, ID veya link girebilirsiniz)`, ephemeral: true });

                const messageCollector = channel.createMessageCollector({
                    filter: m => m.author.id === author.id,
                    time: 30000,
                    max: 1
                });

                messageCollector.on('collect', async (msg) => {
                    let valueToSet;
                    let displayValue;

                    if (setting.type === 'string') {
                        valueToSet = msg.content.trim();
                        // Renk ayarı için geçerli bir hex kodu mu kontrolü
                        if ((setting.key === 'hgRenk' || setting.key === 'bbRenk') && !/^#([0-9A-F]{3}){1,2}$/i.test(valueToSet)) {
                            return msg.reply('Geçersiz renk kodu! Lütfen `#RRGGBB` formatında bir hex kodu girin (örn: `#3498DB`). İşlem iptal edildi.');
                        }
                        displayValue = `\`${valueToSet.substring(0, 50)}${valueToSet.length > 50 ? '...' : ''}\``;
                    } else if (setting.type === 'channel') {
                        const entity = msg.mentions.channels.first() || guild.channels.cache.get(msg.content.trim());
                        if (!entity) return msg.reply(`Geçersiz bir kanal belirttiniz. İşlem iptal edildi.`);
                        valueToSet = entity.id;
                        displayValue = `${entity}`;
                    } else { // role
                        const entity = msg.mentions.roles.first() || guild.roles.cache.get(msg.content.trim());
                        if (!entity) return msg.reply(`Geçersiz bir rol belirttiniz. İşlem iptal edildi.`);
                        valueToSet = entity.id;
                        displayValue = `${entity}`;
                    }

                    try {
                        let currentSettings = client.settings.get(guild.id) || {};
                        currentSettings[setting.key] = valueToSet;

                        client.db.set(`settings_${guild.id}`, currentSettings);
                        client.settings.set(guild.id, currentSettings);

                        await msg.reply(`✅ **${setting.label}** başarıyla ${displayValue} olarak ayarlandı!`);

                        const currentCategoryKey = Object.keys(settingsCategories).find(key => settingsCategories[key].settings.some(s => s.customId === customId));
                        await panelMessage.edit(generateSettingsPanel(currentCategoryKey));

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

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder();
            panelMessage.components[0].components.forEach(button => {
                disabledRow.addComponents(ButtonBuilder.from(button).setDisabled(true));
            });
            panelMessage.edit({
                embeds: [new EmbedBuilder().setColor("Grey").setTitle("Yardım Paneli (Süresi Doldu)").setDescription("Bu panelin etkileşim süresi dolmuştur.")],
                components: [disabledRow]
            }).catch(() => {});
        });
    }
};