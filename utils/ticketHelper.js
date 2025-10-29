// utils/ticketHelper.js

const { PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

// Ticket sistemini kuran fonksiyon
async function setupTicketSystem(guild, db, client, messageReplyChannel, roleIDs = {}) {
    const guildID = guild.id;
    let settings = client.settings.get(guildID) || {}; // Mevcut ayarları al veya boş obje oluştur

    // Zaten kurulu mu?
    if (settings.ticketKategoriID) {
        if (messageReplyChannel) { // Eğer bir komut çağrısıysa bilgilendir
             await messageReplyChannel.send("Ticket sistemi zaten kurulu görünüyor.").catch(console.error);
        } else {
             console.log(`[Ticket Kurulum] ${guild.name} sunucusunda sistem zaten kurulu, atlanıyor.`);
        }
        return false; // Kurulum yapılmadı
    }

    try {
        if (messageReplyChannel) {
            await messageReplyChannel.send("Ticket sistemi kurulumu başlatılıyor... ⌛").catch(console.error);
        } else {
            console.log(`[Ticket Kurulum] ${guild.name} sunucusunda kurulum başlatılıyor...`);
        }


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
                // --- DÜZELTME: @everyone ID'sini kullan ---
                { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // Herkes görmesin
                { id: ticketYetkiliRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }, // Yetkili görsün
                { id: ticketUyeRole.id, allow: [PermissionsBitField.Flags.ViewChannel] } // Ticketı olan üye görsün
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
                // --- DÜZELTME: @everyone ID'sini kullan ---
                { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }, // Kimse yazamasın
                { id: guild.roles.everyone.id, allow: [PermissionsBitField.Flags.ViewChannel] }, // Ama herkes görebilsin
                // Kayıtsızlar görmesin (Kontrol edilmiş dizi kullanılıyor)
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
                 // --- DÜZELTME: @everyone ID'sini kullan ---
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

        if (messageReplyChannel) {
             await messageReplyChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Ticket Sistemi Başarıyla Kuruldu!")
                        .setDescription(`Sistem kanalları ${ticketCat} kategorisi altına kuruldu.\nTicket açma paneli ${ticketOlusturChannel} kanalına gönderildi.\nYetkililer için rol: ${ticketYetkiliRole}`)
                ]
            }).catch(console.error);
        } else {
             console.log(`[Ticket Kurulum] ${guild.name} sunucusunda kurulum tamamlandı.`);
        }
        return true; // Kurulum başarılı

    } catch (error) {
        console.error("[HATA] Ticket sistemi kurulurken hata oluştu:", error);
         if (messageReplyChannel) {
             await messageReplyChannel.send("Ticket sistemi kurulurken bir hata oluştu. Lütfen botun 'Rolleri Yönet' ve 'Kanalları Yönet' yetkileri olduğundan emin olun.").catch(console.error);
         }
        return false; // Kurulum başarısız
    }
}

// Fonksiyonu dışa aktar
module.exports = { setupTicketSystem };