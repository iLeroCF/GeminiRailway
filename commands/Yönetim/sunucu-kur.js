// commands/Yönetim/sunucu-kur.js

const { PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { setupTicketSystem } = require('../../utils/ticketHelper.js'); // Ticket helper'ı içe aktar

// Silme işlemi sırasında Discord API limitlerine takılmamak için kısa bir bekleme fonksiyonu
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: "sunucu-kur",
    aliases: ["sk", "sunucu-sıfırla"],
    category: "Yönetim",
    description: "TÜM KANALLARI VE ROLLERİ SİLER, ardından sunucuyu zengin bir şablon, özel oda ve ticket sistemiyle sıfırdan kurar.",

    permissions: [PermissionsBitField.Flags.Administrator],

    execute: async (client, message, args) => {

        const guild = message.guild;
        const guildID = guild.id;
        const db = client.db;
        const protectedChannelId = message.channel.id;

        // ----- 1. ADIM: ONAY İSTE -----
        let msg;
        try {
            msg = await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("⚠️ SON UYARI! GERİ DÖNÜŞÜ YOK!")
                        .setDescription(`Bu komut, **TÜM KANALLARI** (bu kanal hariç) ve botun silebileceği **TÜM ROLLERİ** kalıcı olarak silecek.\n\nSunucunuzdaki **TÜM VERİLER (MESAJLAR DAHİL)** kaybolacak.\n\nEmin misiniz? Onaylıyorsanız 10 saniye içinde \`EVET\` yazın.`)
                ]
            });
        } catch (e) { return; }

        const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'evet';

        try {
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] });
            if (collected.first().content.toLowerCase() !== 'evet') {
                return msg.edit({ embeds: [new EmbedBuilder().setColor("Green").setDescription("İşlem iptal edildi.")] });
            }
        } catch (err) {
            return msg.edit({ embeds: [new EmbedBuilder().setColor("Yellow").setDescription("10 saniye içinde `EVET` yazılmadığı için işlem iptal edildi.")] });
        }


        // ----- 2. ADIM: SİLME İŞLEMİ -----
        const embed = new EmbedBuilder().setColor("Yellow").setTitle("🛠️ Sunucu Sıfırlanıyor...");
        await msg.edit({ embeds: [embed.setDescription("1. Kanallar siliniyor... (Bu kanal hariç)")] });

        // Kanalları Sil
        for (const [id, channel] of guild.channels.cache) {
             if (id === protectedChannelId) continue;
             try { await channel.delete({ reason: 'Lero Sunucu Sıfırlama' }); await wait(250); }
             catch (err) { console.warn(`[SIFIRLAMA] ${channel.name} kanalı silinemedi: ${err.message}`); }
        }
        await msg.edit({ embeds: [embed.setDescription("1. Kanallar silindi.\n2. Roller siliniyor...")] });

        // Rolleri Sil
        const botRolePosition = message.guild.members.me ? message.guild.members.me.roles.highest.position : 0; // Botun rol pozisyonunu al (veya 0)
        for (const [id, role] of guild.roles.cache) {
             if (role.id === guild.id || role.managed || role.position >= botRolePosition) continue; // @everyone, entegrasyon rolleri veya botun üstündekiler silinmesin
             try { await role.delete({ reason: 'Lero Sunucu Sıfırlama' }); await wait(250); }
             catch (err) { console.warn(`[SIFIRLAMA] ${role.name} rolü silinemedi: ${err.message}`); }
        }

        // ----- 3. ADIM: YENİDEN KURULUM -----
        await msg.edit({ embeds: [embed.setDescription("1. Kanallar silindi.\n2. Roller silindi.\n3. Sunucu yeniden kuruluyor...")] });

        try {
            // --- YENİ ROL OLUŞTURMA SIRASI (HİYERARŞİYE GÖRE TERS) ---
            const kurucuRole = await guild.roles.create({ name: '👑 Kurucu', permissions: [PermissionsBitField.Flags.Administrator], color: '#FFD700', hoist: true, reason: 'Lero Sunucu Kurulumu' });
            await message.member.roles.add(kurucuRole, 'Sunucu Kurulumunu Başlatan Yetkili'); // Komutu kullanan kişiye Kurucu rolünü ver
            const yetkiliRole = await guild.roles.create({ name: '🛡️ Yetkili', permissions: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageGuild, PermissionsBitField.Flags.ManageRoles, PermissionsBitField.Flags.ManageWebhooks, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers, PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ManageNicknames, PermissionsBitField.Flags.ViewAuditLog], color: '#C0C0C0', hoist: true, reason: 'Lero Sunucu Kurulumu' });
            const modRole = await guild.roles.create({ name: '🔨 Moderatör', permissions: [PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers, PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ManageNicknames, PermissionsBitField.Flags.ViewAuditLog], color: '#CD7F32', hoist: true, reason: 'Lero Sunucu Kurulumu' });
            const rehberRole = await guild.roles.create({ name: '🧭 Rehber', permissions: [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ViewAuditLog], color: '#40E0D0', hoist: true, reason: 'Lero Sunucu Kurulumu' });
            const ticketYetkiliRole = await guild.roles.create({ name: 'Ticket Yetkilisi', color: '#FFA500', hoist: true, reason: 'Lero Sunucu Kurulumu' });
            const staffRole = await guild.roles.create({ name: 'Kayıt Yetkilisi', color: '#1E90FF', hoist: true, reason: 'Lero Sunucu Kurulumu' });

            // KAYIT ROLLERİ (En alta yakın olanlar, hiyerarşiye göre doğru sıraya dizildi)
            const memberRole = await guild.roles.create({ name: 'Kayıtlı', color: '#F0FFFF', hoist: true, reason: 'Lero Sunucu Kurulumu' });
            const maleRole = await guild.roles.create({ name: 'Erkek', color: '#0000FF', hoist: true, reason: 'Lero Sunucu Kurulumu' });
            const femaleRole = await guild.roles.create({ name: 'Kadın', color: '#FF007F', hoist: true, reason: 'Lero Sunucu Kurulumu' });
            const ticketUyeRole = await guild.roles.create({ name: 'Ticket Üyesi', color: '#ADD8E6', reason: 'Lero Sunucu Kurulumu' });
            const unregRole = await guild.roles.create({ name: 'Kayıtsız', color: '#808080', reason: 'Lero Sunucu Kurulumu' }); // En alt ilgili rol
            // --- ROL OLUŞTURMA SIRASI SONU ---

            // KANALLAR VE KATEGORİLER
            const everyoneRole = guild.roles.everyone;
            // İzin Ayarları
            const kayitsizGorebilirYazamaz = { id: unregRole.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] };
            const kayitsizGorebilirYazabilir = { id: unregRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] };
            const kayitsizGoremez = { id: unregRole.id, deny: [PermissionsBitField.Flags.ViewChannel] };
            const kayitliGoremez = { id: memberRole.id, deny: [PermissionsBitField.Flags.ViewChannel] };
            const herkesYazamaz = { id: everyoneRole.id, deny: [PermissionsBitField.Flags.SendMessages] };
            const yetkiliYazabilir = { id: yetkiliRole.id, allow: [PermissionsBitField.Flags.SendMessages] };

            // BİLGİ KATEGORİSİ
            const infoCat = await guild.channels.create({ name: "--- BİLGİ ---", type: ChannelType.GuildCategory, permissionOverwrites: [ { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] }, kayitsizGorebilirYazamaz, { id: memberRole.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] } ]});
            const kurallar = await guild.channels.create({ name: "📜-kurallar", type: ChannelType.GuildText, parent: infoCat.id, permissionOverwrites: [ kayitsizGorebilirYazamaz, herkesYazamaz, yetkiliYazabilir ]});
            const duyurular = await guild.channels.create({ name: "📢-duyurular", type: ChannelType.GuildText, parent: infoCat.id, permissionOverwrites: [ kayitsizGoremez, herkesYazamaz, yetkiliYazabilir ] });
            const cekilis = await guild.channels.create({ name: "🎉-çekiliş", type: ChannelType.GuildText, parent: infoCat.id, permissionOverwrites: [ kayitsizGoremez, herkesYazamaz, yetkiliYazabilir ]});
            
            // HG/BB Kanalı
            const hgbbKanal = await guild.channels.create({ name: "👋-hoş-geldin", type: ChannelType.GuildText, parent: infoCat.id, permissionOverwrites: [ kayitsizGorebilirYazamaz, herkesYazamaz, yetkiliYazabilir ] });

            // KAYIT KATEGORİSİ
            const kayıtCat = await guild.channels.create({ name: "--- KAYIT ---", type: ChannelType.GuildCategory, permissionOverwrites: [ { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] }, kayitsizGorebilirYazabilir, kayitliGoremez, { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }, { id: kurucuRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }, { id: yetkiliRole.id, allow: [PermissionsBitField.Flags.ViewChannel] } ]});
            const kayitOdasi = await guild.channels.create({ name: "🚪-kayıt-odası", type: ChannelType.GuildText, parent: kayıtCat.id, permissionOverwrites: [ kayitsizGorebilirYazabilir, kayitliGoremez ]});

            // GENEL KATEGORİSİ
            const genelCat = await guild.channels.create({ name: "--- GENEL ---", type: ChannelType.GuildCategory, permissionOverwrites: [ { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] }, kayitsizGoremez, { id: memberRole.id, allow: [PermissionsBitField.Flags.ViewChannel] } ]});
            await guild.channels.create({ name: "💬-sohbet", type: ChannelType.GuildText, parent: genelCat.id });
            await guild.channels.create({ name: "🤖-bot-komut", type: ChannelType.GuildText, parent: genelCat.id });
            const oneriler = await guild.channels.create({ name: "💡-öneriler", type: ChannelType.GuildText, parent: genelCat.id });
            const gorsel = await guild.channels.create({ name: "🖼️-görseller", type: ChannelType.GuildText, parent: genelCat.id });
            await gorsel.permissionOverwrites.edit(memberRole.id, { SendMessages: true, AttachFiles: true });

            // SES KANALLARI KATEGORİSİ
            const sesCat = await guild.channels.create({ name: "--- SES KANALLARI ---", type: ChannelType.GuildCategory, permissionOverwrites: [ { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] }, kayitsizGoremez, { id: memberRole.id, allow: [PermissionsBitField.Flags.ViewChannel] } ]});
            await guild.channels.create({ name: '🎤-Sohbet 1', type: ChannelType.GuildVoice, parent: sesCat.id });
            await guild.channels.create({ name: '🎤-Sohbet 2', type: ChannelType.GuildVoice, parent: sesCat.id });
            await guild.channels.create({ name: '🎮-Oyun Odası', type: ChannelType.GuildVoice, parent: sesCat.id });
            await guild.channels.create({ name: '🎵-Müzik Odası', type: ChannelType.GuildVoice, parent: sesCat.id });
            const afkKanal = await guild.channels.create({ name: '💤-AFK', type: ChannelType.GuildVoice, parent: sesCat.id, permissionOverwrites: [ kayitsizGoremez, { id: memberRole.id, deny: [PermissionsBitField.Flags.Speak] } ]});
            await guild.setAFKChannel(afkKanal.id, { reason: 'Lero Sunucu Kurulumu' });
            await guild.setAFKTimeout(300, { reason: 'Lero Sunucu Kurulumu' });

            // YÖNETİM KATEGORİSİ
            const staffCat = await guild.channels.create({ name: "--- YÖNETİM ---", type: ChannelType.GuildCategory, permissionOverwrites: [ { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] }, kayitsizGoremez, kayitliGoremez, { id: rehberRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }, { id: modRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }, { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }, { id: yetkiliRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }, { id: kurucuRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }, { id: ticketYetkiliRole.id, allow: [PermissionsBitField.Flags.ViewChannel] } ]}); // Ticket yetkilisi de görsün
            await guild.channels.create({ name: '🔒-yönetim-sohbet', type: ChannelType.GuildText, parent: staffCat.id });
            await guild.channels.create({ name: '🔒-komut-odası', type: ChannelType.GuildText, parent: staffCat.id });
            await guild.channels.create({ name: '📜-log-odası', type: ChannelType.GuildText, parent: staffCat.id });
            await guild.channels.create({ name: '🔒-yetkili-ses', type: ChannelType.GuildVoice, parent: staffCat.id });

            // ÖZEL ODA SİSTEMİ KURULUMU
            await msg.edit({ embeds: [embed.setDescription("1. Kanallar silindi.\n2. Roller silindi.\n3. Sunucu kuruluyor...\n4. Özel Oda Sistemi kuruluyor...")] });
            const ozelOdaCat = await guild.channels.create({ name: 'ÖZEL ODALAR', type: ChannelType.GuildCategory, permissionOverwrites: [ { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] }, kayitsizGoremez, { id: memberRole.id, allow: [PermissionsBitField.Flags.ViewChannel] } ]});
            const ozelOdaOlustur = await guild.channels.create({ name: '➕ Oda Oluştur', type: ChannelType.GuildVoice, parent: ozelOdaCat.id, reason: 'Lero Sunucu Kurulumu' });
            const ozelOdaPanel = await guild.channels.create({ name: '🤖-oda-paneli', type: ChannelType.GuildText, parent: ozelOdaCat.id, permissionOverwrites: [ herkesYazamaz, kayitsizGoremez ], reason: 'Lero Sunucu Kurulumu' });
            // Panel Butonları
            const panelButtonRow1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setEmoji('🏷️').setCustomId('oda-oluştur').setLabel(`Oda Oluştur`).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setEmoji('➕').setCustomId('user-ekle').setLabel(`User Ekle`).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setEmoji('➖').setCustomId('user-cıkar').setLabel(`User Çıkar`).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setEmoji('✍️').setCustomId('oda-isim').setLabel(`Oda Adı Değiştir`).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setEmoji('🆑').setCustomId('oda-sil').setLabel(`Odayı Sil`).setStyle(ButtonStyle.Success)
                );
            const panelButtonRow2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setEmoji('🔒').setCustomId('oda-kilit').setLabel(`Odayı Kilitle`).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setEmoji('📻').setCustomId('oda-bit').setLabel(`Bit Hızı Değiştir`).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setEmoji('👥').setCustomId('oda-limit').setLabel(`Oda Limiti Değiştir`).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setEmoji('👺').setCustomId('sesten-at').setLabel(`Sesten At`).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setEmoji('🔓').setCustomId('oda-herkes').setLabel(`Odayı Herkese Aç`).setStyle(ButtonStyle.Danger)
                );
            const panelButtonRow3 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setEmoji('❓').setCustomId('oda-bilgi').setLabel(`Oda Bilgisi`).setStyle(ButtonStyle.Primary)
                );
            await ozelOdaPanel.send({ content: `> **Aşağıdaki Butonlar Üzerinden Özel Odanızı Oluşturabilir,**\n> **Düzenleyebilir Veya Diğer İşlemleri Gerçekleştirebilirsiniz!**`, components: [panelButtonRow1, panelButtonRow2, panelButtonRow3] });

            // TICKET SİSTEMİ KURULUMU
            await msg.edit({ embeds: [embed.setDescription("1. Kanallar silindi.\n2. Roller silindi.\n3. Sunucu kuruldu.\n4. Özel Oda Sistemi kuruldu.\n5. Ticket Sistemi kuruluyor...")] });
            const ticketKuruldu = await setupTicketSystem(guild, db, client, null, { yetkiliRolID: ticketYetkiliRole.id, uyeRolID: ticketUyeRole.id, kayitsizRolID: unregRole.id }); // Yardımcı fonksiyonu çağır

            // VERİTABANI GÜNCELLEME (Tüm Ayarlar)
             let currentSettings = client.settings.get(guildID) || {}; // Ticket ayarları dahil tüm güncel ayarları al
             currentSettings = {
                 ...currentSettings, // Ticket ayarlarını koru
                 kurucuRolü: kurucuRole.id, yetkiliRolü: yetkiliRole.id, moderatörRolü: modRole.id, rehberRolü: rehberRole.id,
                 kayıtStaffRolü: staffRole.id, kayıtsızRolü: unregRole.id, erkekRolü: maleRole.id, kadınRolü: femaleRole.id, kayıtlıRolleri: [memberRole.id],
                 gorselKanal: gorsel.id, oneriKanal: oneriler.id, duyuruKanal: duyurular.id, cekilisKanal: cekilis.id,
                 ozelOdaKategoriID: ozelOdaCat.id, ozelOdaOlusturID: ozelOdaOlustur.id, ozelOdaPanelID: ozelOdaPanel.id, ozelOdaSure: 120000,
                 hgbbKanalID: hgbbKanal.id // Yeni eklenen HG/BB Kanalı ID'si
             };
            db.set(`settings_${guildID}`, currentSettings);
            client.settings.set(guildID, currentSettings);

            // ÖNERİ KANALI MESAJI
            await oneriler.send({ embeds: [
                 new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("💡 Önerileriniz Bizim İçin Değerli!")
                    .setDescription(`Bu kanala sunucuyla ilgili **önerilerinizi** yazabilirsiniz.\n\nLütfen sadece **ciddi ve yapıcı** önerilerde bulunun. Kanalı amacı dışında kullanmak (sohbet, troll vb.) **yasaktır**.\n\nÖneriniz **yönetim tarafından** değerlendirilecek ve uygun görülürse uygulanacaktır.\n\n**Uyarı:** Kanalı amacı dışında kullananlar veya spam yapanlar hakkında **cezai işlem** uygulanacaktır.`)
                    .setFooter({ text: "Lero Bot Öneri Sistemi" })
            ]});
            // KURALLARI YAZ
            await kurallar.send({ embeds: [ new EmbedBuilder().setColor("Red").setTitle("SUNUCU KURALLARI").setDescription(`
**Saygı ve Nezaket:**
1.  Üyelere, yetkililere ve tüm bireylere karşı saygılı ve nazik olun.
2.  Irkçılık, cinsiyetçilik, homofobi veya herhangi bir ayrımcılık türü kesinlikle yasaktır.
3.  Kişisel hakaret (toxic) yasaktır.

**Metin ve Ses Kanalları:**
1.  Kanalları amacı dışında kullanmayın (Örn: Sohbet kanalında spam yapmak).
2.  NSFW, şiddet veya rahatsız edici paylaşımlar yasaktır.

**Reklam ve Spam:**
1.  İzinsiz reklam yapmak yasaktır.
2.  Spam (tekrarlayan mesaj), flood (hızlı mesaj) yapmak yasaktır.

*Sunucuya katılan herkes bu kuralları okumuş ve kabul etmiş sayılır.*
            `) ]});

            // ----- 4. ADIM: BİTİŞ -----
            const bitisMesaji = ticketKuruldu
                 ? "Zenginleştirilmiş sunucu şablonu, Özel Oda Sistemi ve **Ticket Sistemi** başarıyla yüklendi."
                 : "Zenginleştirilmiş sunucu şablonu ve Özel Oda Sistemi başarıyla yüklendi. (Ticket sistemi zaten kurulu olduğu için atlandı veya hata oluştu)";

            await msg.edit({ embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ Sunucu Sıfırlandı ve Yeniden Kuruldu!")
                    .setDescription(`${bitisMesaji}\n\nRol hiyerarşisi ayarlandı.\n\n\`Kayıtsız\` rolü için detaylı izinler ayarlandı.\n\nHoş Geldin/Güle Güle sistemi için kanal oluşturuldu.\n\nKomutu kullandığınız bu kanal silinmedi, dilerseniz manuel olarak silebilirsiniz.`)
            ]});

        } catch (error) {
            console.error("[HATA] 'sunucu-kur' (yeniden kurulum) komutu hatası:", error);
            await message.reply("Kurulum sırasında kritik bir hata oluştu. Sunucu yarıda kalmış olabilir. Lütfen botun 'Yönetici' yetkisine sahip olduğundan emin olun.");
        }
    }
};