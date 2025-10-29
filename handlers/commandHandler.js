// handlers/commandHandler.js

const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    console.log("[BİLGİ] Prefix komutları taranıyor...");
    
    try {
        const categories = fs.readdirSync(path.join(__dirname, '..', 'commands'));

        for (const category of categories) {
            const commandFiles = fs.readdirSync(path.join(__dirname, '..', 'commands', category)).filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                try {
                    const command = require(path.join(__dirname, '..', 'commands', category, file));
                    
                    if (command.name && command.execute) {
                        client.commands.set(command.name, command);
                        
                        if (command.aliases && Array.isArray(command.aliases)) {
                            command.aliases.forEach(alias => {
                                client.aliases.set(alias, command.name);
                            });
                        }
                        console.log(`[PREFIX KOMUT] ${file} (${category}) yüklendi.`);
                    } else {
                         console.warn(`[UYARI] ${file} geçerli bir prefix komut yapısı içermiyor (name veya execute eksik).`);
                    }
                } catch (error) {
                    console.error(`[HATA] ${file} yüklenirken bir sorun oluştu: ${error.message}`);
                }
            }
        }
    } catch (err) {
        console.error("[HATA] 'commands' klasörü okunurken bir hata oluştu:", err);
    }
};