// events/messageCreate.js

const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const ms = require('ms'); // Zaman çevirme için

module.exports = async (client, message) => {
    if (message.author.bot || !message.guild) return;

    const settings = client.settings.get(message.guild.id);

    // ----- GÖRSEL KANALI FİLTRESİ -----
    try {
        if (settings && settings.gorselKanal && message.channel.id === settings.gorselKanal) {
            const hasAttachment = message.attachments.size > 0;
            const hasLink = message.content.includes('http://') || message.content.includes('https://');
            if (!hasAttachment && !hasLink) {
                await message.delete();
                const warning = await message.channel.send(`${message.author}, bu kanala sadece görsel, GIF veya link gönderebilirsin.`);
                setTimeout(() => { if (warning && warning.deletable) { warning.delete().catch(e => {}); } }, 5000);
                return;
            }
        }
    } catch (err) { console.error("[HATA] Görsel kanalı filtresinde bir hata oluştu:", err); }

    // ----- ÖNERİ KANALI SİSTEMİ -----
    try {
        if (settings && settings.oneriKanal && message.channel.id === settings.oneriKanal) {
            if (!message.content.startsWith(client.config.prefix)) {
                const suggestionText = message.content;
                await message.delete();
                const embed = new EmbedBuilder()
                    .setColor("Yellow")
                    .setAuthor({ name: `${message.author.tag} (${message.author.id})`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setDescription(suggestionText)
                    .setTimestamp()
                    .setFooter({ text: "Yeni Öneri" });
                const suggestionMessage = await message.channel.send({ embeds: [embed] });
                await suggestionMessage.react('✅');
                await suggestionMessage.react('❌');
                return;
            }
        }
    } catch (err) { console.error("[HATA] Öneri kanalı sisteminde bir hata oluştu:", err); }

    // ----- YENİ: DUYURU KANALI OTOMASYONU -----
    try {
        if (settings && settings.duyuruKanal && message.channel.id === settings.duyuruKanal) {
            // Yetki kontrolü (Mesajları Yönetebiliyor mu?)
            if (message.member && message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                // Eğer mesaj bir komutsa, bu sistemi çalıştırma
                if (!message.content.startsWith(client.config.prefix)) {
                    const duyuruText = message.content;
                    await message.delete(); // Orijinal mesajı sil

                    const embed = new EmbedBuilder()
                        .setColor("Aqua")
                        .setAuthor({ name: `${message.guild.name} Duyuru`, iconURL: message.guild.iconURL({ dynamic: true }) })
                        .setDescription(duyuruText)
                        .setTimestamp()
                        .setFooter({ text: `Duyuran: ${message.author.tag}` });

                    await message.channel.send({ content: "@everyone", embeds: [embed] });
                    return; // Mesaj işlendi
                }
            }
        }
    } catch (err) { console.error("[HATA] Duyuru kanalı otomasyonunda bir hata oluştu:", err); }

    // ----- YENİ: ÇEKİLİŞ KANALI OTOMASYONU -----
    try {
        if (settings && settings.cekilisKanal && message.channel.id === settings.cekilisKanal) {
            // Yetki kontrolü (Mesajları Yönetebiliyor mu?)
            if (message.member && message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                // Eğer mesaj bir komutsa, bu sistemi çalıştırma
                if (!message.content.startsWith(client.config.prefix)) {
                    const args = message.content.split(' '); // Mesajı boşluklara göre ayır

                    // Format: <süre> <kazanan sayısı> <ödül>
                    // Örnek: 1d 1 Nitro Classic
                    // Örnek: 30m 3 Özel Rol

                    const cekilisSuresi = args[0]; // örn: "1d", "30m"
                    const kazananSayisiStr = args[1]; // örn: "1", "3"
                    const odul = args.slice(2).join(' '); // örn: "Nitro Classic", "Özel Rol"

                    // Girdileri doğrula
                    const sureMs = ms(cekilisSuresi); // Süreyi milisaniyeye çevir
                    const kazananSayisi = parseInt(kazananSayisiStr);

                    if (!sureMs || isNaN(kazananSayisi) || kazananSayisi <= 0 || !odul) {
                        // Eğer format yanlışsa, kullanıcıyı uyar ve mesajını silme (belki sohbet ediyorlardır)
                        const uyari = await message.reply("Hatalı format! Kullanım: `<süre> <kazanan sayısı> <ödül>`\nÖrnek: `1d 1 Nitro Classic` veya `30m 3 Özel Rol`");
                         setTimeout(() => { if (uyari && uyari.deletable) { uyari.delete().catch(e => {}); } }, 10000);
                        // return; // Mesajı silmediğimiz için return demeye gerek yok
                    } else {
                        // Format doğru, çekilişi başlat
                        await message.delete(); // Yetkilinin mesajını sil

                        client.giveawaysManager.start(message.channel, {
                            duration: sureMs,
                            winnerCount: kazananSayisi,
                            prize: odul,
                            hostedBy: message.author,
                            messages: {
                                giveaway: '@everyone\n\n🎉🎉 **ÇEKİLİŞ BAŞLADI** 🎉🎉',
                                giveawayEnded: '@everyone\n\n🎉🎉 **ÇEKİLİŞ BİTTİ** 🎉🎉',
                                timeRemaining: 'Kalan Süre: **{duration}**!',
                                inviteToParticipate: 'Katılmak için 🎉 tepkisine tıkla!',
                                winMessage: 'Tebrikler, {winners}! **{this.prize}** kazandınız!',
                                embedFooter: 'Çekiliş',
                                noWinner: 'Yeterli katılım olmadığı için kazanan belirlenemedi!',
                                hostedBy: 'Çekilişi Yapan: {this.hostedBy}',
                                winners: 'Kazanan(lar)',
                                endedAt: 'Bittiği Zaman',
                                units: { minutes: 'dakika', hours: 'saat', days: 'gün' }
                            }
                        }).then(() => {
                            console.log(`[ÇEKİLİŞ] ${message.author.tag} tarafından ${odul} çekilişi başlatıldı.`);
                        }).catch((err) => {
                            console.error('[HATA] Çekiliş başlatılamadı:', err);
                            message.channel.send(`${message.author}, çekilişi başlatırken bir hata oluştu.`);
                        });
                        return; // Mesaj işlendi
                    }
                }
            }
        }
    } catch (err) { console.error("[HATA] Çekiliş kanalı otomasyonunda bir hata oluştu:", err); }


    // Komut işleyici (Filtrelerden geçerse burası çalışır)
    if (!message.content.startsWith(client.config.prefix)) return;

    const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
    if (!command) return;

    // Yetki kontrolleri
    if (command.ownerOnly && !client.config.owners.includes(message.author.id)) { return message.reply("Bu komutu sadece bot sahipleri kullanabilir."); }
    if (command.permissions && !message.member.permissions.has(command.permissions)) { return message.reply("Bu komutu kullanmak için yeterli yetkin yok. (`Yönetici` yetkisi gerekebilir)"); }

    try { await command.execute(client, message, args); }
    catch (error) { console.error(`[HATA] ${command.name} (prefix) komutu çalıştırılırken hata:`, error); message.reply("Komutu çalıştırırken bir hata oluştu!"); }
};