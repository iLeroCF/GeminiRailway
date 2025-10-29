// events/interactionCreate.js

const { InteractionType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelType, PermissionFlagsBits, MessageFlags, EmbedBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionsBitField } = require("discord.js"); // <-- PermissionsBitField EKLENDİ
const fs = require('fs'); // Dosya işlemleri için (log)

module.exports = async (client, interaction) => {
    const db = client.db;
    const member = interaction.member;
    // Interaction member yoksa (örn: DM'de buton), işlemi durdur
    if (!member) return;
    const guild = interaction.guild;
    // Guild yoksa (DM'de buton), işlemi durdur
    if (!guild) return;

    // Ayarları çek
    const settings = client.settings.get(guild.id);

    // --- ÖZEL ODA BUTONLARI VE MODALLARI ---
    if (interaction.customId.startsWith('oda-') || interaction.customId.startsWith('user-') || interaction.customId.startsWith('name-') || interaction.customId.startsWith('bit-') || interaction.customId.startsWith('limit-')) {
         if (!settings || !settings.ozelOdaKategoriID) {
              try { return await interaction.reply({ content: "Özel oda sistemi henüz kurulmamış veya ayarlar yüklenememiş.", flags: [MessageFlags.Ephemeral] }); } catch {}
              return;
         }
         try {
             // --- Buton Etkileşimleri ---
            if (interaction.isButton()) {
                const value = interaction.customId;
                const userRoomData = db.get(`ozeloda_${member.id}`);
                const channel = userRoomData ? guild.channels.cache.get(userRoomData) : null;

                // Oda Oluşturma Butonu
                if (value === "oda-oluştur") {
                    if (userRoomData && channel) { return interaction.reply({ content: `> **Zaten bir özel odan bulunmakta: ${channel}**`, flags: [MessageFlags.Ephemeral] }); }
                    if (userRoomData && !channel) { db.delete(`ozeloda_${member.id}`); db.delete(`members_${userRoomData}`); db.delete(`${userRoomData}`); }
                    const besModal = new ModalBuilder().setCustomId('oda-create').setTitle("Özel Oda Oluştur");
                    let odaisim = new TextInputBuilder().setCustomId('oda-adı').setPlaceholder(`örn; ${member.displayName}'ın odası`).setLabel("Oda Adı Belirtin").setStyle(TextInputStyle.Short).setMinLength(2).setMaxLength(25).setRequired(true);
                    let odalimit = new TextInputBuilder().setCustomId('oda-limit').setPlaceholder('0-99 | 0 = Sınırsız').setLabel("Oda Limit'i Belirtin").setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(2).setRequired(true);
                    besModal.addComponents(new ActionRowBuilder().addComponents(odaisim), new ActionRowBuilder().addComponents(odalimit));
                    return await interaction.showModal(besModal);
                }

                // Diğer Butonlar (Sahip kontrolü)
                if (!userRoomData || !channel) { return interaction.reply({ content: `> **Aktif bir özel odan bulunmamakta!**`, flags: [MessageFlags.Ephemeral] }); }
                const ownerCheck = db.get(`${channel.id}`);
                if (ownerCheck !== member.id) { if(db.has(`ozeloda_${member.id}`)) db.delete(`ozeloda_${member.id}`); return interaction.reply({ content: `> **Bu odanın sahibi sen değilsin veya bir hata oluştu!**`, flags: [MessageFlags.Ephemeral] }); }

                // User Modalları
                if (["user-ekle", "user-cıkar", "sesten-at"].includes(value)) {
                    const modalIdMap = { "user-ekle": "user-add", "user-cıkar": "user-substract", "sesten-at": "user-kick" };
                    const titleMap = { "user-ekle": "Odaya Kullanıcı Ekle", "user-cıkar": "Odaya Kullanıcı Çıkar", "sesten-at": "Odadan Kullanıcı At" };
                    const besModal = new ModalBuilder().setCustomId(modalIdMap[value]).setTitle(titleMap[value]);
                    let user_id_input = new TextInputBuilder().setCustomId('user-id').setPlaceholder('Kullanıcı ID veya Etiket').setLabel("Kullanıcıyı Belirtin (ID / Etiket)").setStyle(TextInputStyle.Short).setMinLength(10).setMaxLength(40).setRequired(true);
                    besModal.addComponents(new ActionRowBuilder().addComponents(user_id_input));
                    return await interaction.showModal(besModal);
                }
                // Oda Ayar Modalları
                if (["oda-isim", "oda-bit", "oda-limit"].includes(value)) {
                    const modalIdMap = { "oda-isim": "name-change", "oda-bit": "bit-change", "oda-limit": "limit-change" };
                    const titleMap = { "oda-isim": "Oda Adını Değiştir", "oda-bit": `Bit Hızını Değiştir (8-${guild.maximumBitrate / 1000})`, "oda-limit": "Oda Limitini Değiştir (0-99)" };
                    const placeholderMap = { "oda-isim": "Yeni Oda Adı", "oda-bit": `8-${guild.maximumBitrate / 1000} arası bir sayı (örn: 64)`, "oda-limit": "0-99 arası bir sayı (0 = Sınırsız)" };
                    const besModal = new ModalBuilder().setCustomId(modalIdMap[value]).setTitle(titleMap[value]);
                    let new_value_input = new TextInputBuilder().setCustomId('new-value').setPlaceholder(placeholderMap[value]).setLabel("Yeni Değeri Girin").setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(25).setRequired(true);
                    besModal.addComponents(new ActionRowBuilder().addComponents(new_value_input));
                    return await interaction.showModal(besModal);
                }
                // Doğrudan Eylemler
                if (value === "oda-sil") { db.delete(`ozeloda_${member.id}`); db.delete(`members_${channel.id}`); db.delete(`${channel.id}`); await channel.delete({ reason: "Oda sahibi tarafından silindi." }); return interaction.reply({ content: `> **Özel odan başarıyla silindi!**`, flags: [MessageFlags.Ephemeral] }); }
                if (value === "oda-kilit") { await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false, ViewChannel: false, Speak: false }); return interaction.reply({ content: `> **Odan başarıyla kilitlendi,** odaya kimse (izinliler hariç) giremez!`, flags: [MessageFlags.Ephemeral] }); }
                if (value === "oda-herkes") { await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: true, ViewChannel: true, Speak: true }); return interaction.reply({ content: `> **Odan başarıyla herkese açıldı,** artık herkes girip konuşabilir!`, flags: [MessageFlags.Ephemeral] }); }
                if (value === "oda-bilgi") { const allowedUsers = db.get(`members_${channel.id}`) || []; const userList = allowedUsers.map(id => `<@${id}>`).join(', ') || "Kimse yok"; return interaction.reply({ content: `> **Oda Bilgileri:**\n> Sahip: ${member}\n> Limit: \`${channel.userLimit === 0 ? "Sınırsız" : channel.userLimit}\`\n> Bit Hızı: \`${channel.bitrate / 1000}kbps\`\n> İzinliler: ${userList}`, flags: [MessageFlags.Ephemeral] }); }
            }
             // --- Modal Yanıtları ---
            if (interaction.isModalSubmit()) {
                const value = interaction.customId;
                const userRoomData = db.get(`ozeloda_${member.id}`);
                const channel = userRoomData ? guild.channels.cache.get(userRoomData) : null;
                if (!userRoomData || !channel || db.get(`${channel.id}`) !== member.id) { return interaction.reply({ content: `> **Özel odan bulunamadı veya artık sahibi değilsin!**`, flags: [MessageFlags.Ephemeral] }); }

                // Oda Oluştur Modal
                if (value === "oda-create") {
                     const name = interaction.fields.getTextInputValue('oda-adı');
                     let limit = interaction.fields.getTextInputValue('oda-limit');
                     if (isNaN(limit) || parseInt(limit) < 0 || parseInt(limit) > 99) { return interaction.reply({ content: `> **Geçersiz limit!** Lütfen 0 (sınırsız) ile 99 arasında bir sayı girin.`, flags: [MessageFlags.Ephemeral] }); }
                     limit = parseInt(limit);
                     try {
                         const newChannel = await guild.channels.create({ name: `#${name}`, type: ChannelType.GuildVoice, parent: settings.ozelOdaKategoriID, userLimit: limit, permissionOverwrites: [ { id: member.id, allow: [ PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.Stream, PermissionFlagsBits.Speak, PermissionFlagsBits.ManageChannels ] }, { id: guild.id, deny: [ PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Speak ] } ] });
                         if (member.voice.channel) { await member.voice.setChannel(newChannel.id); }
                         db.set(`ozeloda_${member.id}`, newChannel.id); db.set(`${newChannel.id}`, member.id); db.push(`members_${newChannel.id}`, member.id);
                         return interaction.reply({ content: `> **Özel odan başarıyla oluşturuldu:** ${newChannel}`, flags: [MessageFlags.Ephemeral] });
                     } catch (err) { console.error("Modal ile oda oluşturma hatası:", err); return interaction.reply({ content: `> **Oda oluşturulamadı.** (Kategori dolu olabilir veya yetkim yetersiz).`, flags: [MessageFlags.Ephemeral] }); }
                }
                // Kullanıcı Yönetimi Modalları
                if (["user-add", "user-substract", "user-kick"].includes(value)) {
                     const userInput = interaction.fields.getTextInputValue('user-id');
                     const targetUser = guild.members.cache.get(userInput.replace(/[^0-9]/g, ''));
                     if (!targetUser) { return interaction.reply({ content: `> **Kullanıcı bulunamadı!** Lütfen geçerli bir ID veya etiket girin.`, flags: [MessageFlags.Ephemeral] }); }
                     if (value === "user-add") { db.push(`members_${channel.id}`, targetUser.id); await channel.permissionOverwrites.edit(targetUser, { Connect: true, ViewChannel: true, Speak: true }); return interaction.reply({ content: `> **${targetUser.displayName}** başarıyla odaya eklendi!`, flags: [MessageFlags.Ephemeral] }); }
                     if (value === "user-substract") { db.pull(`members_${channel.id}`, targetUser.id); await channel.permissionOverwrites.delete(targetUser.id, "Oda sahibi tarafından çıkarıldı."); if (targetUser.voice.channelId === channel.id) { await targetUser.voice.setChannel(null); } return interaction.reply({ content: `> **${targetUser.displayName}** başarıyla odadan çıkarıldı!`, flags: [MessageFlags.Ephemeral] }); }
                     if (value === "user-kick") { if (targetUser.voice.channelId !== channel.id) { return interaction.reply({ content: `> **Kullanıcı zaten odanda değil!**`, flags: [MessageFlags.Ephemeral] }); } await targetUser.voice.setChannel(null); return interaction.reply({ content: `> **${targetUser.displayName}** başarıyla odadan atıldı!`, flags: [MessageFlags.Ephemeral] }); }
                }
                // Oda Ayarları Modalları
                if (["name-change", "bit-change", "limit-change"].includes(value)) {
                    const newValue = interaction.fields.getTextInputValue('new-value');
                    if (value === "name-change") { await channel.setName(`#${newValue}`, "Oda sahibi tarafından değiştirildi."); return interaction.reply({ content: `> **Oda adı başarıyla değiştirildi:** \`#${newValue}\``, flags: [MessageFlags.Ephemeral] }); }
                    if (value === "bit-change") { if (isNaN(newValue) || parseInt(newValue) < 8 || parseInt(newValue) > (guild.maximumBitrate / 1000)) { return interaction.reply({ content: `> **Geçersiz bit hızı!** Lütfen 8 ile ${guild.maximumBitrate / 1000} arasında bir sayı girin.`, flags: [MessageFlags.Ephemeral] }); } const bitrate = parseInt(newValue) * 1000; await channel.setBitrate(bitrate, "Oda sahibi tarafından değiştirildi."); return interaction.reply({ content: `> **Oda bit hızı başarıyla \`${newValue}kbps\` olarak ayarlandı!**`, flags: [MessageFlags.Ephemeral] }); }
                    if (value === "limit-change") { if (isNaN(newValue) || parseInt(newValue) < 0 || parseInt(newValue) > 99) { return interaction.reply({ content: `> **Geçersiz limit!** Lütfen 0 (sınırsız) ile 99 arasında bir sayı girin.`, flags: [MessageFlags.Ephemeral] }); } const limit = parseInt(newValue); await channel.setUserLimit(limit, "Oda sahibi tarafından değiştirildi."); return interaction.reply({ content: `> **Oda limiti başarıyla \`${limit === 0 ? "Sınırsız" : limit}\` olarak ayarlandı!**`, flags: [MessageFlags.Ephemeral] }); }
                }
            }
         } catch(e) { console.error("Özel oda etkileşim hatası:", e); try { await interaction.reply({ content: "Bir hata oluştu.", flags: [MessageFlags.Ephemeral] }); } catch {} }
         return; // Özel oda işlemi bitti, aşağıya devam etme
    }
    // --- ÖZEL ODA SONU ---


    // --- TICKET SİSTEMİ BUTONLARI VE MODALLARI ---
    if (interaction.customId.startsWith('ticket-')) {
        // Ticket ayarları var mı?
        if (!settings || !settings.ticketKategoriID || !settings.ticketOlusturKanalID || !settings.ticketLogKanalID || !settings.ticketYetkiliRolID || !settings.ticketUyeRolID) {
            try { return await interaction.reply({ content: "Ticket sistemi henüz kurulmamış veya ayarları eksik.", flags: [MessageFlags.Ephemeral] }); } catch {}
            return;
        }

        const ticketYetkiliRol = guild.roles.cache.get(settings.ticketYetkiliRolID);
        const ticketUyeRol = guild.roles.cache.get(settings.ticketUyeRolID);
        const ticketKategori = guild.channels.cache.get(settings.ticketKategoriID);
        const ticketLogKanal = guild.channels.cache.get(settings.ticketLogKanalID);

        if (!ticketYetkiliRol || !ticketUyeRol || !ticketKategori || !ticketLogKanal) {
             try { return await interaction.reply({ content: "Ticket sistemi ayarları (roller/kanallar) bulunamadı. Kurulumu kontrol edin.", flags: [MessageFlags.Ephemeral] }); } catch {}
             return;
        }


        // --- Buton: Ticket Aç ---
        if (interaction.isButton() && interaction.customId === 'ticket-ac') {
            try {
                if (member.roles.cache.has(ticketUyeRol.id)) {
                    const existingTicketChannel = guild.channels.cache.find(ch => ch.parentId === ticketKategori.id && ch.name.startsWith(`ticket-${member.user.username.substring(0, 10).toLowerCase().replace(/[^a-z0-9]/g, '-')}`) && ch.permissionOverwrites.cache.has(member.id));
                    let contentMsg = "> Zaten açık bir destek talebiniz bulunuyor.";
                    if(existingTicketChannel) contentMsg += ` (${existingTicketChannel})`;
                    return await interaction.reply({ content: contentMsg, flags: [MessageFlags.Ephemeral] });
                }

                const modal = new ModalBuilder()
                    .setCustomId('ticket-sebep-modal')
                    .setTitle('Destek Talebi Oluştur');
                const sebepInput = new TextInputBuilder()
                    .setCustomId('ticket-sebep')
                    .setLabel('Lütfen sorununuzu kısaca açıklayın')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Örn: Kayıt olurken sorun yaşıyorum.')
                    .setRequired(true)
                    .setMinLength(10)
                    .setMaxLength(1000);

                const actionRow = new ActionRowBuilder().addComponents(sebepInput);
                modal.addComponents(actionRow);

                await interaction.showModal(modal);

            } catch (e) {
                console.error("Ticket açma butonu hatası:", e);
                try { await interaction.reply({ content: "Ticket oluşturma paneli gösterilirken bir hata oluştu.", flags: [MessageFlags.Ephemeral] }); } catch {}
            }
             return; // İşlem bitti
        }

        // --- Modal Yanıtı: Ticket Sebebi ---
        if (interaction.isModalSubmit() && interaction.customId === 'ticket-sebep-modal') {
             try {
                const sebep = interaction.fields.getTextInputValue('ticket-sebep');
                 const channelName = `ticket-${interaction.user.username.substring(0, 10).toLowerCase().replace(/[^a-z0-9]/g, '-')}-${interaction.user.discriminator === '0' ? interaction.user.id.slice(-4) : interaction.user.discriminator}`; // Discriminator 0 ise ID son 4 hane


                // Yeni kanalı oluştur
                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: ticketKategori.id,
                    topic: `Ticket Sahibi: ${interaction.user.tag} (${interaction.user.id}) | Sebep: ${sebep.substring(0, 100)}`,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // everyone ID eklendi
                        { id: ticketYetkiliRol.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ManageChannels] }
                    ],
                    reason: `Ticket oluşturuldu: ${interaction.user.tag}`
                });

                // Kullanıcıya Ticket Üyesi rolünü ver
                await member.roles.add(ticketUyeRol).catch(console.error);

                // Kanala başlangıç mesajını ve kapat butonunu gönder
                 const kapatButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ticket-kapat-${ticketChannel.id}`)
                            .setLabel('🔒 Ticketi Kapat')
                            .setStyle(ButtonStyle.Danger)
                    );
                 const embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle(`Destek Talebi #${channelName.split('-').pop()}`) // Kanal adından numara al
                    .setDescription(`Hoşgeldiniz ${member}!\n\nLütfen sorununuzu detaylı bir şekilde açıklayın. ${ticketYetkiliRol} rolüne sahip bir yetkili en kısa sürede sizinle ilgilenecektir.\n\n**Sebep:**\n${sebep}`)
                    .setTimestamp();

                 await ticketChannel.send({ content: `${member} ${ticketYetkiliRol}`, embeds: [embed], components: [kapatButton] });

                 await interaction.reply({ content: `Destek talebiniz başarıyla oluşturuldu: ${ticketChannel}`, flags: [MessageFlags.Ephemeral] });

             } catch (e) {
                 console.error("Ticket oluşturma modal hatası:", e);
                 try { await interaction.reply({ content: "Ticket oluşturulurken bir hata oluştu. Lütfen tekrar deneyin veya yetkililere bildirin.", flags: [MessageFlags.Ephemeral] }); } catch {}
             }
              return; // İşlem bitti
        }

        // --- Buton: Ticketi Kapat ---
        if (interaction.isButton() && interaction.customId.startsWith('ticket-kapat-')) {
            const channelIdToClose = interaction.customId.split('-')[2];
            const channelToClose = guild.channels.cache.get(channelIdToClose);

            if (!channelToClose || channelToClose.parentId !== ticketKategori.id) {
                try { return await interaction.reply({ content: "Kapatılacak ticket kanalı bulunamadı.", flags: [MessageFlags.Ephemeral] }); } catch {}
                return;
            }

            // Ticket sahibi veya yetkili mi?
            const ticketOwnerId = channelToClose.topic?.match(/Ticket Sahibi:.*\((\d+)\)/)?.[1];
            const isOwner = member.id === ticketOwnerId;
            const isStaff = member.roles.cache.has(ticketYetkiliRol.id);

            if (!isOwner && !isStaff) {
                 try { return await interaction.reply({ content: "Bu ticketı kapatma yetkiniz yok.", flags: [MessageFlags.Ephemeral] }); } catch {}
                 return;
            }

            try {
                // Ticketi açan kullanıcıyı bul ve rolünü al
                if (ticketOwnerId) {
                    const ownerMember = await guild.members.fetch(ticketOwnerId).catch(() => null);
                    if (ownerMember && ownerMember.roles.cache.has(ticketUyeRol.id)) {
                         await ownerMember.roles.remove(ticketUyeRol).catch(console.error);
                    }
                }

                // Kanal izinlerini güncelle (kullanıcı artık göremez)
                 // Önce eski izni sil (varsa) sonra yenisini ekle
                await channelToClose.permissionOverwrites.delete(ticketOwnerId, 'Ticket kapatıldı.');
                await channelToClose.permissionOverwrites.create(ticketOwnerId, { ViewChannel: false }, { reason: 'Ticket kapatıldı.'});


                // Butonları güncelle (Sil butonu ekle)
                 const silButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ticket-sil-${channelToClose.id}`)
                            .setLabel('🗑️ Ticketi Kalıcı Olarak Sil')
                            .setStyle(ButtonStyle.Danger)
                    );

                 // Kapatma mesajını gönder (ve eski butonları kaldır)
                 await interaction.update({ // update kullanarak butona anında yanıt ver
                     content: `Ticket ${interaction.user} tarafından kapatıldı. Sadece yetkililer kanalı görebilir.`,
                     components: [silButton] // Sadece sil butonu kalsın
                 });


            } catch(e) {
                 console.error("Ticket kapatma hatası:", e);
                 try { await interaction.reply({ content: "Ticket kapatılırken bir hata oluştu.", flags: [MessageFlags.Ephemeral] }); } catch {}
            }
             return; // İşlem bitti
        }

        // --- Buton: Ticketi Sil ---
        if (interaction.isButton() && interaction.customId.startsWith('ticket-sil-')) {
             const channelIdToDelete = interaction.customId.split('-')[2];
             const channelToDelete = guild.channels.cache.get(channelIdToDelete);

             if (!channelToDelete || channelToDelete.parentId !== ticketKategori.id) {
                 try { return await interaction.reply({ content: "Silinecek ticket kanalı bulunamadı.", flags: [MessageFlags.Ephemeral] }); } catch {}
                 return;
             }

             // Sadece yetkili silebilir
             if (!member.roles.cache.has(ticketYetkiliRol.id)) {
                 try { return await interaction.reply({ content: "Bu ticketı silme yetkiniz yok.", flags: [MessageFlags.Ephemeral] }); } catch {}
                 return;
             }

             try {
                 await interaction.reply({ content: `Ticket ${channelToDelete.name} siliniyor ve loglanıyor...`, flags: [MessageFlags.Ephemeral] });

                 // Mesajları topla ve logla
                 let messages = await channelToDelete.messages.fetch({ limit: 100 });
                 messages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                 let transcript = `Ticket Logları: #${channelToDelete.name}\nTicket Sahibi: ${channelToDelete.topic?.match(/Ticket Sahibi: (.*?)(?: \||$)/)?.[1] || "Bilinmiyor"}\nSilen Yetkili: ${interaction.user.tag}\n\n`;

                 messages.forEach(msg => {
                     const time = new Date(msg.createdTimestamp).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
                     transcript += `[${time}] ${msg.author.tag}: ${msg.content}\n`;
                     if (msg.attachments.size > 0) {
                         transcript += `  📎 Ekler: ${msg.attachments.map(a => a.url).join(', ')}\n`;
                     }
                 });

                 // Log kanalına gönder (txt dosyası olarak)
                 const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { name: `${channelToDelete.name}-log.txt` });
                 const logEmbed = new EmbedBuilder()
                      .setColor("Red")
                      .setTitle("Ticket Kapatıldı ve Silindi")
                      .setDescription(`**Kanal:** ${channelToDelete.name}\n**Ticket Sahibi:** ${channelToDelete.topic?.match(/Ticket Sahibi: (.*?)(?: \||$)/)?.[1] || "Bilinmiyor"}\n**Silen Yetkili:** ${interaction.user.tag}`)
                      .setTimestamp();

                 await ticketLogKanal.send({ embeds: [logEmbed], files: [attachment] });

                 // Kanalı sil
                 await channelToDelete.delete({ reason: `Ticket ${interaction.user.tag} tarafından silindi.` });

                 // Silindi mesajını silelim (artık kanal yok)
                 // await interaction.deleteReply(); // Kanal silindiği için bu hata verebilir, yoruma aldım

             } catch(e) {
                 console.error("Ticket silme hatası:", e);
                 // Kanal silindiği için followUp kullanmak yerine loglayabiliriz
                 console.error(`[HATA] Ticket silinirken veya loglanırken hata oluştu (Kanal: ${channelIdToDelete}). Silme işlemi yarıda kalmış olabilir.`);
                 // try { await interaction.followUp({ content: "Ticket silinirken veya loglanırken bir hata oluştu.", flags: [MessageFlags.Ephemeral] }); } catch {}
             }
              return; // İşlem bitti
        }
    }
    // --- TICKET SİSTEMİ SONU ---
};