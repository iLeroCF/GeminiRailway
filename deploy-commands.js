// deploy-commands.js

const { REST, Routes } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');

const commands = [];
const categories = fs.readdirSync(path.join(__dirname, 'commands'));

console.log("Komutlar taranıyor...");

for (const category of categories) {
    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands', category)).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        try {
            const command = require(path.join(__dirname, 'commands', category, file));
            
            if (command.data && command.data instanceof SlashCommandBuilder) {
                commands.push(command.data.toJSON());
                console.log(`[KOMUT] ${file} (${category}) yüklendi.`);
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

        const data = await rest.put(
            Routes.applicationGuildCommands(config.clientID, config.guildID),
            { body: commands },
        );

        console.log(`[BAŞARILI] ${data.length} adet (/) komutu başarıyla kaydedildi.`);
    } catch (error) {
        console.error("[HATA] Komutlar kaydedilirken bir hata oluştu:", error);
    }
})();