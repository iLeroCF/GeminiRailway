// utils/ticketHelper.js

const { PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Ticket sistemini kuran fonksiyon
async function setupTicketSystem(guild, db, client, roleIDs = {}) { // interactionOrMessage parametresini kaldırıyoruz
    const guildID = guild.id;
    let settings = client.settings.get(guildID) || {}; // Mevcut ayarları al veya boş obje oluştur

    // Zaten kurulu mu?
    if (settings.ticketKategoriID) {
        return { success: false, message: "Ticket sistemi zaten kurulu görünüyor." };
    }

    try {
        // 1. Rolleri Oluştur
        const ticketYetkiliRole = roleIDs.yetkiliRolID ? { id: roleIDs.yetkiliRolID } : await guild.roles.create({
            name: 'Ticket Yetkilisi',
            color: '#FFA500', // Turuncu
            reason: 'Lero Ticket Kurulumu'
        });
        const ticketUyeRole = roleIDs.uyeRolID ? { id: roleIDs.uyeRolID } : await guild.roles.create({
            name: 'Ticket Üyesi', // Aktif ticketı olanlara verilecek rol
            color: '#ADD8E6', // Açık Mavi
            reason: 'Lero Ticket Kurulumu'
        });
        
        // 2. Kategori Oluştur (Sadece Yetkili ve Ticket Üyesi görebilsin)
        const ticketCat = await guild.channels.create({
            name: 'TICKETLER',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // Herkes görmesin
                { id: ticketYetkiliRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, // Yetkili görsün ve mesaj yazabilsin
                { id: ticketUyeRole.id, deny: [PermissionsBitField.Flags.ViewChannel] } // Ticketı olan üye kategoriyi görmesin
            ],
            reason: 'Lero Ticket Kurulumu'
        });

        // --- DÜZELTME: Kayıtsız rolünün varlığını ve geçerliliğini kontrol et ---
        const kayitsizRolId = roleIDs.kayitsizRolID || settings.kayıtsızRolü;
        const kayitsizOverwrite = [];
        if (kayitsizRolId && (guild.roles.cache.has(kayitsizRolId) || roleIDs.kayitsizRolID)) { // sunucu-kur'dan geliyorsa cache'de olmayabilir, yine de ekle
             kayitsizOverwrite.push({ id: kayitsizRolId, deny: [PermissionsBitField.Flags.ViewChannel] });
        } else if (kayitsizRolId) {
             console.warn(`[Ticket Kurulum] Ayarlarda kayıtsızRolü (${kayitsizRolId}) tanımlı ancak sunucuda bulunamadı. İzin ayarlanamadı.`);
        }


        // 3. Ticket Oluşturma Kanalı
        const ticketOlusturChannel = await guild.channels.create({
            name: '🎫-ticket-oluştur',
            type: ChannelType.GuildText,
            parent: ticketCat.id,
            permissionOverwrites: [
                { id: guild.roles.everyone.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] }, // Herkes görsün ama yazamasın
                { id: ticketYetkiliRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, // Yetkili görsün ve yazabilsin
                { id: ticketUyeRole.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // Ticket üyesi rolü bu kanalı görmesin
                ...kayitsizOverwrite
            ],
            reason: 'Lero Ticket Kurulumu'
        });

        // 4. Ticket Log Kanalı (Sadece Yetkililer Görsün)
        const ticketLogChannel = await guild.channels.create({
            name: '📜-ticket-log',
            type: ChannelType.GuildText,
            parent: ticketCat.id, // Veya istersen Yönetim kategorisine taşıyabilirsin
            permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // Herkes görmesin
                { id: ticketYetkiliRole.id, allow: [PermissionsBitField.Flags.ViewChannel] } // Sadece yetkili görsün
            ],
            reason: 'Lero Ticket Kurulumu'
        });

        // 5. Ticket Açma Butonunu Gönder
        const ticketAcButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket-ac')
                    .setLabel('🎫 Ticket Oluştur')
                    .setStyle(ButtonStyle.Success)
            );
        await ticketOlusturChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Destek Talebi Oluştur")
                    .setDescription("Sunucuyla ilgili bir sorununuz veya sorunuz varsa aşağıdaki butona tıklayarak bir destek talebi (ticket) oluşturabilirsiniz.")
            ],
            components: [ticketAcButton]
        });

        // 6. Ayarları Veritabanına Kaydet
        settings.ticketYetkiliRolID = ticketYetkiliRole.id;
        settings.ticketUyeRolID = ticketUyeRole.id;
        settings.ticketKategoriID = ticketCat.id;
        settings.ticketOlusturKanalID = ticketOlusturChannel.id;
        settings.ticketLogKanalID = ticketLogChannel.id;

        db.set(`settings_${guildID}`, settings);
        client.settings.set(guildID, settings); // Hafızayı da güncelle

        return {
            success: true,
            message: {
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Ticket Sistemi Başarıyla Kuruldu!")
                        .setDescription(`Sistem kanalları ${ticketCat} kategorisi altına kuruldu.\nTicket açma paneli ${ticketOlusturChannel} kanalına gönderildi.\nYetkililer için rol: ${ticketYetkiliRole}`)
                ]
            }
        };

    } catch (error) {
        console.error("[HATA] Ticket sistemi kurulurken hata oluştu:", error);
        return { success: false, message: "Ticket sistemi kurulurken bir hata oluştu. Lütfen botun 'Rolleri Yönet' ve 'Kanalları Yönet' yetkileri olduğundan emin olun." };
    }
}

// Fonksiyonu dışa aktar
module.exports = { setupTicketSystem };