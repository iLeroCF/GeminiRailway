// commands/Genel/yardım.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: "yardım",
    aliases: ["help", "y", "komutlar"],
    category: "Genel", // Komutun kendisi Genel kategorisinde
    description: "Botun komutlarını listeler veya belirli bir komut hakkında bilgi verir.",

    execute: async (client, message, args) => {

        const prefix = client.config.prefix;

        // Belirli bir komut mu istendi? (örn: .yardım ping)
        if (args.length > 0) {
            const commandName = args[0].toLowerCase();
            const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));

            if (!command) {
                return message.reply(`\`${commandName}\` adında bir komut bulunamadı. Tüm komutları görmek için \`${prefix}yardım\` yazın.`);
            }

            // Komut detay embed'i
            const commandEmbed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle(`Komut: ${prefix}${command.name}`)
                .setDescription(command.description || "Açıklama bulunmuyor.")
                .addFields({ name: "Kategori", value: command.category || "Bilinmiyor", inline: true });

            if (command.aliases && command.aliases.length > 0) {
                commandEmbed.addFields({ name: "Takma Adlar", value: command.aliases.map(alias => `\`${prefix}${alias}\``).join(', '), inline: true });
            }

            // Komut dosyasında 'usage' tanımlıysa ekle (örn: usage: "ping <ip>")
            if (command.usage) {
                 commandEmbed.addFields({ name: "Kullanım", value: `\`${prefix}${command.name} ${command.usage}\``, inline: false });
            }


            return message.reply({ embeds: [commandEmbed] });
        }

        // --- Kategori Listesi ve Butonlar ---

        // Mevcut tüm kategorileri topla (tekilleştirerek)
        const categories = [...new Set(client.commands.map(cmd => cmd.category || "Diğer"))];

        // Kategori embed'i
        const categoryEmbed = new EmbedBuilder()
            .setColor("Green")
            .setTitle(`${client.user.username} Yardım Menüsü`)
            .setDescription(`Komutları görmek için aşağıdaki butonlardan bir kategori seçin.\nBelirli bir komut hakkında bilgi almak için: \`${prefix}yardım <komut_adı>\``)
            .setFooter({ text: `${client.commands.size} komut mevcut.` });

        // Kategori butonlarını oluştur
        const buttonsRow = new ActionRowBuilder();
        categories.forEach(category => {
            // Buton ID'si: help-category-KategoriAdı (boşluksuz)
            const buttonId = `help-category-${category.replace(/\s+/g, '')}`;
            buttonsRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(buttonId)
                    .setLabel(category)
                    .setStyle(ButtonStyle.Primary)
                    // .setEmoji('❓') // Opsiyonel: Her kategori için farklı emoji
            );
             // Discord en fazla 5 buton alabilir bir sırada, gerekirse yeni sıra ekle
             // Bu örnekte şimdilik tek sıra varsayıyoruz, kategori sayısı artarsa bu kısım geliştirilebilir.
        });


        // Yardım mesajını gönder
        const helpMessage = await message.reply({ embeds: [categoryEmbed], components: [buttonsRow] });

        // Buton etkileşimlerini dinlemek için bir kolektör oluştur (sadece komutu yazan kişi için, 2 dakika süreli)
        const collector = helpMessage.createMessageComponentCollector({
             componentType: ComponentType.Button,
             filter: (interaction) => interaction.user.id === message.author.id,
             time: 120000 // 2 dakika (milisaniye)
        });

        collector.on('collect', async (interaction) => {
            // Tıklanan butonun ID'sinden kategori adını çıkar
            if (!interaction.customId.startsWith('help-category-')) return; // Güvenlik kontrolü
            const categoryName = categories.find(cat => `help-category-${cat.replace(/\s+/g, '')}` === interaction.customId);

            if (!categoryName) {
                 try { await interaction.reply({ content: "Geçersiz kategori butonu.", flags: [MessageFlags.Ephemeral] }); } catch {}
                 return;
            }

            // Seçilen kategoriye ait komutları bul
            const commandsInCategory = client.commands.filter(cmd => (cmd.category || "Diğer") === categoryName);

            // Komut listesi embed'ini oluştur
            const commandsEmbed = new EmbedBuilder()
                .setColor("Purple")
                .setTitle(`Kategori: ${categoryName}`)
                .setDescription(commandsInCategory.map(cmd => `**${prefix}${cmd.name}**: ${cmd.description || "Açıklama yok"}`).join('\n') || "Bu kategoride komut bulunmuyor.")
                .setFooter({ text: `${categoryName} kategorisinde ${commandsInCategory.size} komut.`});

            // Geri butonu ekle
            const backButtonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help-back-categories')
                        .setLabel('⬅️ Kategorilere Geri Dön')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Mesajı güncelle (komut listesi ve geri butonu ile)
            try {
                 await interaction.update({ embeds: [commandsEmbed], components: [backButtonRow] });
            } catch (e) { console.error("Yardım mesajı güncellenemedi:", e)}

        });

         // Kolektör içinde "Geri" butonu dinleyicisi
         collector.on('collect', async (interaction) => {
             if (interaction.customId === 'help-back-categories') {
                 // Mesajı ilk haline (kategori listesi ve butonları) geri döndür
                 try {
                     await interaction.update({ embeds: [categoryEmbed], components: [buttonsRow] });
                 } catch(e) { console.error("Yardım mesajı geri alınamadı:", e)}
             }
         });


        collector.on('end', collected => {
            // Süre dolduğunda butonları devre dışı bırak (opsiyonel)
            const disabledRow = ActionRowBuilder.from(buttonsRow); // Orijinal butonları kopyala
            disabledRow.components.forEach(button => button.setDisabled(true));
            // Geri butonu da varsa onu da devre dışı bırak (eğer son state komut listesi ise)
            // Bu kısmı daha karmaşık hale getirmemek için şimdilik atlıyorum.
            if (helpMessage.editable) {
                 helpMessage.edit({ components: [disabledRow] }).catch(e => {}); // Hata olursa görmezden gel
            }
        });
    }
};