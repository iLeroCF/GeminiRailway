// commands/Yönetim/ayarla.js
const { PermissionsBitField } = require('discord.js');
// Artık schema'ya gerek yok
// const db = require('crox.db'); // index.js'de zaten tanımladık, client.db kullanabiliriz

module.exports = {
    name: "ayarla",
    aliases: ["setup", "config"],
    category: "Yönetim",
    description: "Sunucu kayıt ayarlarını yapar.",
    permissions: [PermissionsBitField.Flags.Administrator], 

    execute: async (client, message, args) => {
        
        const ayar = args[0];
        const rol = message.mentions.roles.first();
        const guildID = message.guild.id;
        const db = client.db; // db'yi client'tan al

        if (!ayar) {
            return message.reply(
                "Hangi ayarı yapacaksın? (`yetkili`, `kayıtsız`, `erkek`, `kadın`, `kayıtlı-ekle`, `kayıtlı-sil`)\n" +
                "Örnek: `.ayarla yetkili @KayıtYetkilisi`"
            );
        }

        let ayarAdı = "";
        let dataKey = `settings_${guildID}`;
        
        // Önce mevcut ayarları çek
        let currentSettings = client.settings.get(guildID) || {};

        switch (ayar.toLowerCase()) {
            case "yetkili":
            case "staff":
                ayarAdı = "Kayıt Yetkili Rolü";
                if (!rol) return message.reply(`Lütfen bir rol etiketle. Örnek: \`.ayarla yetkili @Rol\``);
                currentSettings.kayıtStaffRolü = rol.id;
                break;

            case "kayıtsız":
            case "unreg":
                ayarAdı = "Kayıtsız Rolü";
                if (!rol) return message.reply(`Lütfen bir rol etiketle. Örnek: \`.ayarla kayıtsız @Rol\``);
                currentSettings.kayıtsızRolü = rol.id;
                break;

            case "erkek":
                ayarAdı = "Erkek Rolü";
                if (!rol) return message.reply(`Lütfen bir rol etiketle. Örnek: \`.ayarla erkek @Rol\``);
                currentSettings.erkekRolü = rol.id;
                break;
                
            case "kadın":
            case "kız":
                ayarAdı = "Kadın Rolü";
                if (!rol) return message.reply(`Lütfen bir rol etiketle. Örnek: \`.ayarla kadın @Rol\``);
                currentSettings.kadınRolü = rol.id;
                break;
                
            case "kayıtlı-ekle":
                ayarAdı = "Kayıtlı Rolü (Eklendi)";
                if (!rol) return message.reply(`Lütfen bir rol etiketle. Örnek: \`.ayarla kayıtlı-ekle @Rol\``);
                
                if (!currentSettings.kayıtlıRolleri) currentSettings.kayıtlıRolleri = [];
                if (currentSettings.kayıtlıRolleri.includes(rol.id)) return message.reply("Bu rol zaten kayıtlı rolleri arasında.");
                
                currentSettings.kayıtlıRolleri.push(rol.id);
                break;

            case "kayıtlı-sil":
            case "kayıtlı-çıkar":
                ayarAdı = "Kayıtlı Rolü (Çıkarıldı)";
                if (!rol) return message.reply(`Lütfen bir rol etiketle. Örnek: \`.ayarla kayıtlı-sil @Rol\``);
                
                if (!currentSettings.kayıtlıRolleri || !currentSettings.kayıtlıRolleri.includes(rol.id)) return message.reply("Bu rol zaten kayıtlı rolleri arasında değil.");

                currentSettings.kayıtlıRolleri = currentSettings.kayıtlıRolleri.filter(r => r !== rol.id);
                break;

            default:
                return message.reply("Geçersiz ayar adı. Lütfen `yetkili`, `kayıtsız`, `erkek`, `kadın`, `kayıtlı-ekle`, `kayıtlı-sil` kullanın.");
        }

        // Veritabanını ve hafızayı güncelle
        db.set(dataKey, currentSettings);
        client.settings.set(guildID, currentSettings);

        message.reply(`Başarılı! **${ayarAdı}** artık ${rol || 'belirtilen rol'} olarak ayarlandı.`);
    }
};