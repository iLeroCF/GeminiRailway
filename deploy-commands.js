// deploy-commands.js

const { REST, Routes } = require('discord.js');
const { Client, Collection, GatewayIntentBits } = require('discord.js'); // Client ve Collection eklendi
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');

// Geçici bir client oluşturup komutları yükleyelim ki panel komutu diğerlerini bulabilsin.
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commands = [];
const categories = fs.readdirSync(path.join(__dirname, 'commands'));

console.log("Komutlar taranıyor...");

for (const category of categories) {
    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands', category)).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        try {
            const command = require(path.join(__dirname, 'commands', category, file));
            
            if (command.data) {
                if (Array.isArray(command.data)) { // Eğer data bir dizi ise (örn: kayıt.js)
                    command.data.forEach(cmdData => {
                        if (cmdData instanceof SlashCommandBuilder) {
                            commands.push(cmdData.toJSON());
                            client.commands.set(cmdData.name, command); // Komutu koleksiyona ekle
                            console.log(`[KOMUT] ${file} -> /${cmdData.name} (${category}) yüklendi.`);
                        }
                    });
                } else if (command.data instanceof SlashCommandBuilder) { // Eğer tek bir builder ise
                    client.commands.set(command.data.name, command); // Komutu koleksiyona ekle
                    commands.push(command.data.toJSON());
                    console.log(`[KOMUT] ${file} (${category}) yüklendi.`);
                }
            } else {
                console.warn(`[UYARI] ${file} dosyasında 'data' (SlashCommandBuilder) özelliği bulunamadı, atlandı.`);
            }
        } catch (error) {
            console.error(`[HATA] ${file} yüklenirken bir sorun oluştu: ${error.message}`);
        }
    }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log(`[BİLGİ] ${commands.length} adet (/) komutu Discord'a kaydedilmek üzere gönderiliyor.`);

        // --- DEĞİŞİKLİK: Komutları tek bir sunucuya değil, global olarak kaydediyoruz. ---
        // Bu, komutların botun eklendiği TÜM sunucularda görünmesini sağlar.
        // Not: Global komutların güncellenmesi 1 saate kadar sürebilir.
        const data = await rest.put(
            // Eski Kod: Routes.applicationGuildCommands(config.clientID, config.guildID),
            Routes.applicationCommands(config.clientID), // Yeni Kod
            { body: commands },
        );

        console.log(`[BAŞARILI] ${data.length} adet (/) komutu başarıyla kaydedildi.`);
    } catch (error) {
        console.error("[HATA] Komutlar kaydedilirken bir hata oluştu:", error);
    }
})();