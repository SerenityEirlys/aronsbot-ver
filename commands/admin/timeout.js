import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Timeout duration in minutes')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    // Check if user has timeout permission
    if (!interaction.member.permissions.has('TIMEOUT_MEMBERS')) {
      const noPermEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⛔ Insufficient Permissions')
        .setDescription('You need TIMEOUT_MEMBERS permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    const targetMember = await interaction.guild.members.fetch(targetUser.id);

    // Check if user can be timed out
    if (!targetMember.moderatable) {
      return interaction.reply({
        content: '❌ I cannot timeout this user. They may have higher permissions than me.',
        ephemeral: true
      });
    }

    // Check if duration is valid
    if (duration < 1 || duration > 40320) { // 40320 = 28 days in minutes
      return interaction.reply({
        content: '❌ Timeout duration must be between 1 minute and 28 days.',
        ephemeral: true
      });
    }

    try {
      await targetMember.timeout(duration * 60 * 1000, reason);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🔇 Member Timed Out')
        .setDescription(`${targetUser.tag} has been timed out.`)
        .addFields(
          { name: '👤 User', value: `${targetUser}`, inline: true },
          { name: '⏱️ Duration', value: `${duration} minutes`, inline: true },
          { name: '📝 Reason', value: reason }
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // DM the user
      try {
        await targetUser.send({
          content: `You have been timed out in ${interaction.guild.name} for ${duration} minutes.\nReason: ${reason}`
        });
      } catch (error) {
        console.log('Could not DM user about timeout');
      }

    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: '❌ An error occurred while trying to timeout the user.',
        ephemeral: true
      });
    }
  },
};
