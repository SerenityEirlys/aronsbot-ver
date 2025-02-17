import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiển thị trợ giúp'),
  async execute(interaction) {
    try {
      // Get user's locale/language
      const locale = interaction.locale;

      // Define translations
      const translations = {
        'en-US': {
          title: '📚 Command List',
          description: 'Here are all available commands:',
          footer: 'Use /help to see this message again'
        },
        'vi': {
          title: '📚 Danh Sách Lệnh',
          description: 'Đây là tất cả các lệnh có sẵn:',
          footer: 'Sử dụng /help để xem lại thông báo này'
        },
        'zh-CN': {
          title: '📚 命令列表',
          description: '以下是所有可用的命令：',
          footer: '使用 /help 再次查看此消息'
        }
      };

      // Get translations for user's locale, fallback to English
      const t = translations[locale] || translations['en-US'];

      // Load commands from folders
      const commandFolders = fs.readdirSync(path.join(__dirname, '../'));
      const commandFields = [];

      for (const folder of commandFolders) {
        const commandsPath = path.join(__dirname, '../', folder);
        if (!fs.statSync(commandsPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        if (commandFiles.length === 0) continue;

        const commands = [];
        for (const file of commandFiles) {
          const command = (await import(`file://${path.join(commandsPath, file)}`)).default;
          if (!command.data) continue;
          commands.push(`/${command.data.name} - ${command.data.description}`);
        }

        if (commands.length > 0) {
          const folderEmoji = {
            'admin': '👮',
            'misc': '🔧',
            'reseller': '🏪',
            'shopapisystem': '🛒',
            'ticket': '🎫'
          };

          commandFields.push({
            name: `${folderEmoji[folder] || '📁'} ${folder.charAt(0).toUpperCase() + folder.slice(1)} Commands`,
            value: '```\n' + commands.join('\n') + '```'
          });
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(t.title)
        .setColor(0x0099FF)
        .setDescription(t.description)
        .addFields(commandFields)
        .setTimestamp()
        .setFooter({ text: t.footer });

      // Check if interaction is still valid before replying
      if (interaction.isRepliable()) {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error in help command:', error);
      // Only try to reply with error if interaction hasn't been handled
      if (interaction.isRepliable()) {
        await interaction.reply({ 
          content: 'There was an error while executing this command!', 
          ephemeral: true 
        });
      }
    }
  },
};
