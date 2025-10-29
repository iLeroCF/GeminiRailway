// commands/Yönetim/panel.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ComponentType } = require('discord.js');

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Botun ana kurulum ve yönetim panelini açar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // Prefix Command tanımı
    name: "panel",
    aliases: ["kontrol-paneli"],
    category: "Yönetim",
    description: "Botun ana kurulum ve yönetim panelini açar.",
    permissions: [PermissionsBitField.Flags.Administrator],

    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
        const channel = interactionOrMessage.channel;

        const mainEmbed = new EmbedBuilder()
            .setColor("Gold")
            .setTitle("🤖 Lero Bot Kontrol Paneli")
            .setDescription("Aşağıdaki butonları kullanarak sunucunuz için gerekli kurulumları kolayca yapabilirsiniz.\n\n**DİKKAT:** `Sunucu Kur` ve `Ayarları Sıfırla` işlemleri geri alınamaz!")
            .setFooter({ text: "İşlem yapmak için bir butona tıklayın." });

        // Kurulum Butonları
        const setupRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_kayıt_kur')
                    .setLabel('Kayıt Sistemi Kur')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('panel_ticket_kur')
                    .setLabel('Ticket Sistemi Kur')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫'),
                new ButtonBuilder()
                    .setCustomId('panel_ozeloda_kur')
                    .setLabel('Özel Oda Sistemi Kur')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🚪')
            );

        // Tehlikeli İşlem Butonları
        const dangerRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_sunucu_kur')
                    .setLabel('Sunucu Kur')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💥'),
                new ButtonBuilder()
                    .setCustomId('panel_ayarları_sıfırla') // Yeni buton
                    .setLabel('Ayarları Sıfırla')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔄')
            );

        const panelMessage = await channel.send({ embeds: [mainEmbed], components: [setupRow, dangerRow] });

        const collector = panelMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i) => i.user.id === author.id && i.isButton(),
            time: 300000 // 5 dakika
        });

        collector.on('collect', async (interaction) => {
            // deferUpdate yerine deferReply kullanarak, çağrılan komutun bu yanıtı düzenlemesine izin ver.
            // Bu, "Interaction has already been replied" hatasını önler.
            await interaction.deferReply({ ephemeral: true });

            const commandName = interaction.customId.replace('panel_', '').replace(/_/g, '-'); // Global replace
            const command = client.commands.get(commandName); // Komut objesini al

            if (command) {
                try {
                    // İlgili komutun execute fonksiyonunu, buton etkileşiminin (interaction) kendisiyle çağır.
                    // Ayrıca panelden geldiğini belirtmek için 3. argümana bir obje ekliyoruz.
                    // Bu, sunucu-kur gibi komutların onay adımını atlamasını sağlar.
                    await command.execute(client, interaction, { fromPanel: true });

                } catch (error) {
                    console.error(`Panel üzerinden '${commandName}' komutu çalıştırılırken hata:`, error);
                    await interaction.editReply({ content: `\`/${commandName}\` komutunu çalıştırırken bir hata oluştu. Lütfen konsolu kontrol edin.` });
                }
            } else {
                await interaction.editReply({ content: `\`${commandName}\` komutu bulunamadı.` });
            }
        });

        collector.on('end', () => {
            // Süre dolduğunda butonları devre dışı bırak
            const disabledRow = new ActionRowBuilder();
            const disabledDangerRow = new ActionRowBuilder();
            setupRow.components.forEach(button => {
                disabledRow.addComponents(ButtonBuilder.from(button).setDisabled(true));
            });
            dangerRow.components.forEach(button => {
                disabledDangerRow.addComponents(ButtonBuilder.from(button).setDisabled(true));
            });

            panelMessage.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Grey")
                        .setTitle("🤖 Lero Bot Kontrol Paneli (Süresi Doldu)")
                        .setDescription("Bu panelin etkileşim süresi dolmuştur. Yeni bir panel açmak için komutu tekrar kullanın.")
                ],
                components: [disabledRow, disabledDangerRow]
            }).catch(() => {}); // Mesaj silinmişse hata vermesini engelle
        });
    }
};