// commands/Kullanıcı/say.js

const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: "say",
    aliases: ["söyle", "tekrarla", "webhook-say"],
    category: "Kullanıcı",
    description: "Bot, yazdığınız mesajı sizin veya etiketlediğiniz kişinin adına (webhook ile) tekrar eder.",
    usage: "[@kullanıcı/ID] <mesaj>", // Kullanımı güncelledik

    // Komutu kullanmak için "Mesajları Yönet" yetkisi
    permissions: [PermissionsBitField.Flags.ManageMessages],

    execute: async (client, message, args) => {

        // Botun webhook yönetme izni var mı?
        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageWebhooks)) {
            return message.reply("Bu komutu kullanabilmem için 'Webhookları Yönet' iznine ihtiyacım var.");
        }
        if (!message.channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.ManageWebhooks)) {
             return message.reply("Bu kanalda webhook oluşturma veya yönetme iznim yok.");
        }

        let targetUser = message.author; // Varsayılan olarak komutu yazan kişi
        let sayMessageArgs = [...args]; // Argümanların kopyasını al

        // İlk argüman bir kullanıcı etiketi veya ID'si mi?
        if (args.length > 0) {
            const potentialUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
            // Eğer geçerli bir kullanıcı bulunduysa ve bu kullanıcı bot değilse
            if (potentialUser && !potentialUser.bot) {
                targetUser = potentialUser; // Hedef kullanıcıyı güncelle
                sayMessageArgs.shift(); // Kullanıcı etiketini/ID'sini mesajdan çıkar
            }
        }

        const sayMessage = sayMessageArgs.join(' '); // Kalan argümanları birleştir

        if (!sayMessage) {
            return message.reply(`Tekrar etmem için bir mesaj yazmalısın! Örnek: \`${client.config.prefix}say [@kullanıcı] Merhaba Dünya!\``);
        }

        // Önce orijinal mesajı silmeyi dene
        try {
            await message.delete();
        } catch (error) {
            console.warn(`[Say Komutu] ${message.author.tag} tarafından yazılan mesaj silinemedi: ${error.message}`);
        }

        try {
            // Mevcut webhook'ları bul
            const webhooks = await message.channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.owner.id === client.user.id && wh.name === "LeroSayHook");

            // Eğer bot'a ait webhook yoksa, yeni bir tane oluştur
            if (!webhook) {
                webhook = await message.channel.createWebhook({
                    name: 'LeroSayHook',
                    avatar: client.user.displayAvatarURL(),
                    reason: '.say komutu için oluşturuldu'
                });
            }

            // Webhook'u kullanarak mesajı gönder (Hedef kullanıcının adı ve avatarı ile)
            await webhook.send({
                content: sayMessage,
                username: targetUser.username, // Hedef kullanıcının adı
                avatarURL: targetUser.displayAvatarURL({ dynamic: true }) // Hedef kullanıcının avatarı
            });

        } catch (error) {
            console.error("[HATA] Say komutu (webhook) hatası:", error);
             message.channel.send(`Webhook ile mesaj gönderilirken bir hata oluştu: ${error.message}`).catch(e => {});
        }
    }
};