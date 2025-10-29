// commands/Kayıt/kayıt.js

const { EmbedBuilder } = require('discord.js');
// Schema'lara gerek yok

module.exports = {
    name: "kayıt",
    aliases: ["e", "k", "erkek", "kadın"],
    category: "Kayıt",
    description: "Yeni üyeleri sunucuya kaydeder.",
    
    execute: async (client, message, args) => {
        
        const db = client.db; // db'yi client'tan al

        // 1. Sunucu ayarlarını hafızadan al
        const settings = client.settings.get(message.guild.id);
        
        // 2. Ayarlar yapılmış mı diye kontrol et
        if (!settings || !settings.kayıtStaffRolü || !settings.kayıtsızRolü || !settings.erkekRolü || !settings.kadınRolü || !settings.kayıtlıRolleri) {
            return message.reply("Kayıt sistemi ayarları tam olarak yapılmamış! Lütfen `.kayıt-kur` komutunu veya `.ayarla` komutunu kullanın.");
        }
        
        // 3. Yetki Kontrolü
        if (!message.member.roles.cache.has(settings.kayıtStaffRolü) && !client.config.owners.includes(message.author.id)) {
            return message.reply("Bu komutu kullanmak için `Kayıt Yetkilisi` olman gerekiyor.");
        }

        // ... (4. Cinsiyeti Belirleme - Kod aynı) ...
        const commandName = message.content.slice(client.config.prefix.length).trim().split(/ +/).shift().toLowerCase();
        let gender = "";
        let genderRole = "";

        if (commandName === "e" || commandName === "erkek") {
            gender = "Erkek";
            genderRole = settings.erkekRolü;
        } else if (commandName === "k" || commandName === "kadın") {
            gender = "Kadın";
            genderRole = settings.kadınRolü;
        } else if (commandName === "kayıt") {
             return message.reply(`Hatalı kullanım! Lütfen \`.e @üye <isim> <yaş>\` veya \`.k @üye <isim> <yaş>\` şeklinde kullanın.`);
        }
        
        // ... (5. Kullanıcı ve İsim/Yaş Bilgilerini Alma - Kod aynı) ...
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const name = args.slice(1, -1).join(' ');
        const age = args[args.length - 1];

        if (!member) return message.reply("Hatalı kullanım! Bir üye etiketlemelisiniz. (`.e @Lero İsim Yaş`)");
        if (!name || !age || isNaN(age)) return message.reply("Hatalı kullanım! İsim ve yaş belirtmelisiniz. (`.e @Lero İsim Yaş`)");
        if (member.id === message.author.id) return message.reply("Kendini kaydedemezsin!");
        if (!member.roles.cache.has(settings.kayıtsızRolü)) return message.reply("Bu kullanıcı zaten sunucuya kayıtlı görünüyor (Kayıtsız rolü yok).");
        
        const finalName = `${name} | ${age}`;

        // ... (6. Kullanıcıyı Güncelle (Roller ve İsim) - Kod aynı) ...
        try {
            await member.setNickname(finalName);
            const rollerToAdd = [...settings.kayıtlıRolleri, genderRole];
            await member.roles.add(rollerToAdd);
            await member.roles.remove(settings.kayıtsızRolü);
        } catch (err) {
            console.error("[HATA] Kayıt sırasında rol/isim güncelleme hatası:", err);
            return message.reply("Kullanıcının rollerini veya ismini güncellerken bir hata oluştu. Lütfen botun yetkilerinin tam olduğundan emin olun.");
        }

        // 7. Veritabanına İsim Geçmişini Kaydet (crox.db)
        const newNameEntry = {
            name: name,
            age: age,
            gender: gender,
            staff: message.author.id,
            date: Date.now()
        };
        db.push(`nameHistory_${member.id}`, newNameEntry);

        // 8. Veritabanına Yetkili İstatistiğini Kaydet (crox.db)
        const staffKey = `staffStats_${message.author.id}`;
        db.add(`${staffKey}_total`, 1);
        db.add(`${staffKey}_${gender.toLowerCase()}`, 1); // 'male' veya 'female'

        // 9. Başarı Mesajı (Kod aynı)
        const embed = new EmbedBuilder()
            .setColor(gender === "Erkek" ? "Blue" : "Red")
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${member} başarıyla **${gender}** olarak kaydedildi.\nKullanıcının yeni ismi: **${finalName}**`)
            .setTimestamp();
            
        message.reply({ embeds: [embed] });
    }
};