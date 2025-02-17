import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../../db/mysql.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stock')
        .setDescription('View current stock and product inventory'),
        
    async execute(interaction) {
        // Logic xử lý lệnh ở đây
        await interaction.reply('Thông tin tồn kho...');
    }
};
