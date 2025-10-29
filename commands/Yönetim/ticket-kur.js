// commands/Yönetim/ticket-kur.js

const { PermissionsBitField, SlashCommandBuilder, ChatInputCommandInteraction } = require('discord.js');
// --- DÜZELTME KONTROLÜ ---
const { setupTicketSystem } = require('../../utils/ticketHelper.js'); // Yolun bu olduğundan emin ol
// ------------------------

module.exports = {
    // Slash Command tanımı
    data: new SlashCommandBuilder()
        .setName('ticket-kur')
        .setDescription('Ticket sistemini sunucuya kurar (Roller, Kanallar, Panel).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // Prefix Command tanımı
    name: "ticket-kur",
    aliases: ["ticketkur", "ticket-setup"],
    category: "Yönetim",
    description: "Ticket sistemini sunucuya kurar (Roller, Kategori, Kanallar, Panel).",
    permissions: [PermissionsBitField.Flags.Administrator],

    execute: async (client, message, args) => {
        const isInteraction = message.isChatInputCommand?.() || message.isButton?.(); // Hem slash hem de buton etkileşimlerini kontrol et

        // Interaction ise hemen deferReply yap
        if (isInteraction && !message.deferred && !message.replied) { // Güvenli kontrol için optional chaining kullan
            await message.deferReply({ ephemeral: true });
        }

        // setupTicketSystem fonksiyonunu çağırıyoruz.
        // Hata olursa veya zaten kuruluysa fonksiyon içinde mesaj gönderecek.
        const result = await setupTicketSystem(message.guild, client.db, client, {});

        if (isInteraction) {
            if (result.success) {
                await message.editReply(result.message);
            } else {
                await message.editReply({ content: result.message, ephemeral: true });
            }
        } else { // Prefix command
            if (result.success) await message.channel.send(result.message);
            else await message.reply(result.message);
        }
    }
};