import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        // Defer reply immediately
        await interaction.deferReply();

        // Check if user has ban permission
        if (!interaction.member.permissions.has('BAN_MEMBERS')) {
            const noPermEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⛔ Insufficient Permissions')
                .setDescription('You need BAN_MEMBERS permission to use this command.')
                .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();
            return interaction.editReply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        // Check if target is valid
        if (!targetMember) {
            const invalidUserEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error')
                .setDescription('Could not find that user!')
                .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();
            return interaction.editReply({ embeds: [invalidUserEmbed], ephemeral: true });
        }

        // Check if user can be banned
        if (!targetMember.bannable) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Permission Error')
                .setDescription('I cannot ban this user! They may have higher permissions than me.')
                .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();
            return interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            await targetMember.ban({ reason });

            const banEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔨 User Banned Successfully')
                .setDescription(`${targetUser} has been permanently banned from the server.`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Banned User', value: `${targetUser.tag}`, inline: true },
                    { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '⏰ Ban Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setImage('https://media.tenor.com/yPUAJMwL2IQAAAAC/ban-hammer.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();

            await interaction.editReply({ embeds: [banEmbed] });

        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error')
                .setDescription('There was an error trying to ban this user!')
                .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();
            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
