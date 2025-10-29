// commands/Yönetim/ticket-kur.js

const { PermissionsBitField } = require('discord.js');
// --- DÜZELTME KONTROLÜ ---
const { setupTicketSystem } = require('../../utils/ticketHelper.js'); // Yolun bu olduğundan emin ol
// ------------------------

module.exports = {
    name: "ticket-kur",
    aliases: ["ticketkur", "ticket-setup"],
    category: "Yönetim",
    description: "Ticket sistemini sunucuya kurar (Roller, Kategori, Kanallar, Panel).",

    permissions: [PermissionsBitField.Flags.Administrator],

    execute: async (client, message, args) => {
        // setupTicketSystem fonksiyonunu çağırıyoruz.
        // Hata olursa veya zaten kuruluysa fonksiyon içinde mesaj gönderecek.
        await setupTicketSystem(message.guild, client.db, client, message.channel, {});
    }
};