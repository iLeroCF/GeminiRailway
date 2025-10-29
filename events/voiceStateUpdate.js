// events/voiceStateUpdate.js

const { ChannelType, PermissionFlagsBits } = require("discord.js");

module.exports = async (client, oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return; 

    const db = client.db;
    const guild = newState.guild || oldState.guild;
    const settings = client.settings.get(guild.id);

    if (!settings || !settings.ozelOdaOlusturID || !settings.ozelOdaKategoriID) {
        return;
    }

    // --- Özel Oda Oluşturma ---
    if (newState.channelId === settings.ozelOdaOlusturID) {
        let userRoomData = db.get(`ozeloda_${member.id}`); 
        if (userRoomData) {
            const existingChannel = guild.channels.cache.get(userRoomData);
            if (existingChannel) {
                try { await member.voice.setChannel(existingChannel.id); } 
                catch (err) {
                    console.error(`Kullanıcı ${member.user.tag} mevcut özel odasına taşınamadı:`, err);
                    db.delete(`ozeloda_${member.id}`); db.delete(`members_${userRoomData}`); db.delete(`${userRoomData}`);
                }
                return; 
            } else {
                db.delete(`ozeloda_${member.id}`); db.delete(`members_${userRoomData}`); db.delete(`${userRoomData}`);
            }
        }
        let roomName = member.displayName.length > 10 ? member.displayName.substring(0, 10).trim() + ".." : member.displayName;
        try {
            const newChannel = await guild.channels.create({
                name: `#${roomName}`, type: ChannelType.GuildVoice, parent: settings.ozelOdaKategoriID, userLimit: 1, 
                permissionOverwrites: [
                    { 
                        id: member.id, 
                        allow: [
                            PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.MuteMembers,
                            PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.Stream, PermissionFlagsBits.Speak,
                            PermissionFlagsBits.ManageChannels 
                        ] 
                    },
                    { id: guild.id, deny: [ PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Speak ] }
                ]
            });

            db.set(`ozeloda_${member.id}`, newChannel.id); 
            db.set(`${newChannel.id}`, member.id);         
            db.push(`members_${newChannel.id}`, member.id); 

            await member.voice.setChannel(newChannel.id);

        } catch (err) {
            console.error(`Özel oda oluşturulamadı (${member.user.tag}):`, err);
            try { await member.send("Özel odan oluşturulurken bir hata oluştu.").catch(); await member.voice.setChannel(null).catch(); } catch {}
        }
    }

    // --- İzin Kontrolü (Başka Odaya Girerse) ---
    if (newState.channel && newState.channel.parentId === settings.ozelOdaKategoriID && newState.channelId !== settings.ozelOdaOlusturID) {
        
        const allowedMembers = db.get(`members_${newState.channelId}`) || [];
        const ownerId = db.get(`${newState.channelId}`); 

        // ----- HATA DÜZELTMESİ: isPublic tanımı buraya geri eklendi -----
        const isPublic = newState.channel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.Connect);
        // -----------------------------------------------------------------

        // Eğer oda kilitliyse VE kullanıcı izinli değilse VE kullanıcı odanın sahibi DEĞİLSE
        if (!isPublic && !allowedMembers.includes(member.id) && member.id !== ownerId) {
            try {
                await member.send(`Bu özel odaya giriş iznin yok.`).catch();
                await member.voice.setChannel(null);
            } catch (err) {
                console.error(`Kullanıcı (${member.user.tag}) izinli olmadığı özel odadan atılamadı:`, err);
            }
        }
    }

    // --- Sahip Çıkınca Anında Silme ---
    if (oldState.channel && oldState.channel.parentId === settings.ozelOdaKategoriID && oldState.channelId !== settings.ozelOdaOlusturID) {
        const ownerId = db.get(`${oldState.channelId}`); 
        if (ownerId === member.id) {
            console.log(`[ÖZEL ODA] Sahip (${member.user.tag}) ${oldState.channel.name} odasından ayrıldı. Oda 1 saniye içinde silinecek.`);
            
            const channelToCheck = guild.channels.cache.get(oldState.channelId);
             if (channelToCheck && channelToCheck.members.size > 0 && channelToCheck.members.every(m => m.id !== ownerId)) {
                console.log(`[ÖZEL ODA] Sahip ayrıldı ama odada başkası var, silme işlemi iptal edildi.`);
                return; 
             }

            setTimeout(async () => {
                const channelToDelete = guild.channels.cache.get(oldState.channelId); 
                if (channelToDelete) {
                    try {
                        console.log(`[ÖZEL ODA] ${channelToDelete.name} (${channelToDelete.id}) siliniyor...`);
                        db.delete(`ozeloda_${member.id}`); 
                        db.delete(`members_${channelToDelete.id}`); 
                        db.delete(`${channelToDelete.id}`); 
                        db.delete(`delete_${channelToDelete.id}`); 
                        await channelToDelete.delete({ reason: "Oda sahibi kanaldan ayrıldı." });
                        console.log(`[ÖZEL ODA] ${channelToDelete.name} başarıyla silindi.`);
                    } catch (err) {
                        console.error(`[ÖZEL ODA] Sahip ayrıldıktan sonra kanal (${oldState.channelId}) silinirken hata oluştu:`, err);
                        db.delete(`ozeloda_${member.id}`); db.delete(`members_${oldState.channelId}`); db.delete(`${oldState.channelId}`); db.delete(`delete_${oldState.channelId}`); 
                    }
                } else {
                    console.log(`[ÖZEL ODA] Kanal (${oldState.channelId}) silinemeden önce zaten yok olmuş.`);
                     db.delete(`ozeloda_${member.id}`); db.delete(`members_${oldState.channelId}`); db.delete(`${oldState.channelId}`); db.delete(`delete_${oldState.channelId}`); 
                }
            }, 1000); 
        }
    }
};