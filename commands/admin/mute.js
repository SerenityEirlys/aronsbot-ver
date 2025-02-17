import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import 'dotenv/config';

export default {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to mute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for muting')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Mute duration in minutes')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    // Defer reply immediately
    await interaction.deferReply();

    // Check if user has permission (server admin or bot owner)
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const isBotOwner = process.env.ADMIN_ID?.split(',').includes(interaction.user.id);

    if (!isAdmin && !isBotOwner) {
      const noPermEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⛔ Insufficient Permissions')
        .setDescription('You need to be a server administrator or bot owner to use this command.')
        .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
        .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
        .setTimestamp();
      return interaction.editReply({ embeds: [noPermEmbed], ephemeral: true });
    }

    const target = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason');
    const duration = interaction.options.getInteger('duration');

    // Check if target is valid
    if (!target) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('Could not find that user!')
        .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
        .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
        .setTimestamp();
      return interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Check if target can be muted
    if (!target.moderatable) {
      const permErrorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Permission Error')
        .setDescription('I cannot mute this user! They may have higher permissions than me.')
        .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
        .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
        .setTimestamp();
      return interaction.editReply({ embeds: [permErrorEmbed], ephemeral: true });
    }

    try {
      // Convert duration to milliseconds and ensure it's within Discord's limits (1 year)
      const muteTime = Math.min(duration * 60 * 1000, 365 * 24 * 60 * 60 * 1000); // Max 1 year

      // Check if the user already has a timeout
      if (target.communicationDisabledUntil) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Error')
          .setDescription('This user is already muted!')
          .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
          .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
          .setTimestamp();
        return interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
      }

      // Apply the timeout
      await target.timeout(muteTime, reason);

      // Format duration display
      let durationDisplay = '';
      if (duration >= 1440) { // 24 hours in minutes
        const days = Math.floor(duration / 1440);
        const hours = Math.floor((duration % 1440) / 60);
        const minutes = duration % 60;
        durationDisplay = `${days} day${days > 1 ? 's' : ''}${hours > 0 ? ` ${hours} hour${hours > 1 ? 's' : ''}` : ''}${minutes > 0 ? ` ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
      } else if (duration >= 60) {
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        durationDisplay = `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
      } else {
        durationDisplay = `${duration} minute${duration > 1 ? 's' : ''}`;
      }

      const muteEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔇 User Muted Successfully')
        .setDescription(`${target} has been muted for ${durationDisplay}`)
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '👤 Muted User', value: `${target.user.tag}`, inline: true },
          { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: '⏱️ Duration', value: durationDisplay, inline: false },
          { name: '📝 Reason', value: reason, inline: false },
          { name: '🕒 Mute Expires', value: `<t:${Math.floor((Date.now() + muteTime) / 1000)}:R>`, inline: false }
        )
        .setImage('https://media0.giphy.com/media/tjYS8yUChlzSmdKx9x/200.gif')
        .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
        .setTimestamp();

      await interaction.editReply({ embeds: [muteEmbed] });

    } catch (error) {
      console.error(error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('There was an error trying to mute this user!')
        .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
        .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
        .setTimestamp();
      await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
