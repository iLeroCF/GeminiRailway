// events/guildMemberAdd.js

module.exports = async (client, member) => {
    // Botun kendisi veya başka bir bot katılırsa işlem yapma
    if (member.user.bot) return;

    // 1. Sunucu ayarlarını hafızadan al
    const settings = client.settings.get(member.guild.id);

    // 2. Ayarlar veya kayıtsız rolü ayarlanmamışsa, uyarı ver ve dur
    if (!settings || !settings.kayıtsızRolü) {
        console.warn(`[UYARI] ${member.guild.name} sunucusuna yeni bir üye katıldı (${member.user.tag}) ancak 'kayıtsızRolü' ayarlanmamış. Rol verilemedi.`);
        return;
    }

    // 3. Ayarlanan 'kayıtsızRolü' ID'sinden rolü bul
    const role = member.guild.roles.cache.get(settings.kayıtsızRolü);

    if (!role) {
        console.error(`[HATA] ${member.guild.name} sunucusu için 'kayıtsızRolü' (ID: ${settings.kayıtsızRolü}) ayarlı ancak sunucuda böyle bir rol bulunamadı! (Silinmiş olabilir)`);
        return;
    }

    // 4. Rolü yeni üyeye ver
    try {
        await member.roles.add(role);
        console.log(`[BİLGİ] Yeni üye ${member.user.tag} sunucuya katıldı ve ${role.name} rolü verildi.`);
    } catch (err) {
        console.error(`[HATA] ${member.guild.name} sunucusunda ${member.user.tag} üyesine rol verirken hata: ${err.message}. (Botun yetkisi rolün yetkisinden düşük olabilir)`);
    }
};