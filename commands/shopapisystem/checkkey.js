import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool, checkKey } from '../../db/mysql.js';

export default {
    data: new SlashCommandBuilder()
        .setName('checkkey')
        .setDescription('Kiểm tra trạng thái của key hoặc HWID')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('Nhập key hoặc HWID cần kiểm tra')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const input = interaction.options.getString('input');
        
        try {
            const keyData = await checkKey(input);

            if (!keyData.length) {
                return interaction.editReply({
                    content: '❌ Không tìm thấy key hoặc HWID trong hệ thống!'
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🔍 Kết quả kiểm tra')
                .setTimestamp();

            if (keyData.length > 0) {
                const now = new Date();
                const expiryDate = new Date(keyData[0].expiryDate);
                const timeLeft = expiryDate - now;
                const daysLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));

                embed.setColor(timeLeft > 0 ? '#00FF00' : '#FF0000')
                    .addFields(
                        { name: 'Loại', value: 'License Key' },
                        { name: 'Key', value: keyData[0].key },
                        { name: 'Sản phẩm', value: keyData[0].product },
                        { name: 'HWID', value: keyData[0].hwid || 'Chưa kích hoạt' },
                        { name: 'Trạng thái', value: timeLeft > 0 ? '✅ Đang hoạt động' : '❌ Đã hết hạn' },
                        { name: 'Thời hạn còn lại', value: timeLeft > 0 ? `${daysLeft} ngày` : 'Đã hết hạn' },
                        { name: 'Ngày hết hạn', value: expiryDate.toLocaleDateString('vi-VN') },
                        { name: 'Người sử dụng', value: keyData[0].usedBy || 'Chưa được sử dụng' },
                        { name: 'Ngày kích hoạt', value: keyData[0].usedAt ? new Date(keyData[0].usedAt).toLocaleDateString('vi-VN') : 'Chưa kích hoạt' }
                    );
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error checking key/HWID:', error);
            await interaction.editReply({
                content: '❌ Đã xảy ra lỗi khi kiểm tra thông tin! Vui lòng thử lại sau.'
            });
        }
    },
};
