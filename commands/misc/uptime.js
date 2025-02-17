import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import os from 'os';

export default {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Xem thời gian hoạt động của bot'),
  async execute(interaction) {
    // Get bot uptime in milliseconds
    const uptime = interaction.client.uptime;
    
    // Convert to readable format
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    // Get system info
    const cpuModel = os.cpus()[0].model;
    const cpuCores = os.cpus().length;
    const totalMemory = Math.round(os.totalmem() / (1024 * 1024 * 1024)); // Convert to GB
    const freeMemory = Math.round(os.freemem() / (1024 * 1024 * 1024)); // Convert to GB
    const usedMemory = totalMemory - freeMemory;
    const platform = os.platform();
    const arch = os.arch();

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('🕒 Bot Status')
      .setColor(0x00FF00)
      .addFields(
        {
          name: '⏰ Uptime',
          value: `**${days}** days\n**${hours}** hours\n**${minutes}** minutes\n**${seconds}** seconds`,
          inline: true
        },
        {
          name: '💻 System',
          value: `**OS:** ${platform} ${arch}\n**CPU:** ${cpuModel}\n**Cores:** ${cpuCores}`,
          inline: true
        },
        {
          name: '📊 Memory',
          value: `**Total:** ${totalMemory}GB\n**Used:** ${usedMemory}GB\n**Free:** ${freeMemory}GB`,
          inline: true
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
