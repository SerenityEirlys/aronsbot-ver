import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } from 'discord.js';
import { addReview } from '../../db/mysql.js';

export default {
    data: new SlashCommandBuilder()
        .setName('vouchchesse')
        .setDescription('Review a chesse product'),

    async execute(interaction) {
        const games = [
            { label: 'Genshin Impacts', value: 'gs', emoji: '<:Gi:1327875368971014156>' },
            { label: 'Honkai StarRail', value: 'hsr', emoji: '<:hsr:1327873865635987469>' },
            { label: 'Zenless Zen Zero', value: 'zzz', emoji: '<:zzz:1327873879527526410>' },
            { label: 'Marvel Rivals', value: 'mrs', emoji: '<:mr:1327873867498258492>' },
            { label: 'Wuthering Wave', value: 'ww', emoji: '🌊' },
            { label: 'Valorant', value: 'valorant', emoji: '<:val:1327873872002940929>' },
            { label: 'Counter Strike 2', value: 'cs2', emoji: '<:cs2:1327873881498849392>' },
            { label: 'DeadLock', value: 'deadlock', emoji: '<:deadlock:1327873888809390151>' },
        ];

        // Create game selection menu
        const gameMenu = new StringSelectMenuBuilder()
            .setCustomId('select_game_review')
            .setPlaceholder('Select a game to review')
            .addOptions(games.map(game => ({
                label: game.label,
                value: game.value,
                emoji: game.emoji
            })));

        const gameRow = new ActionRowBuilder().addComponents(gameMenu);

        const initialEmbed = new EmbedBuilder()
            .setTitle('🌟 Chesse Review System')
            .setDescription('```md\n# Welcome to the Review System!\n\n> Your feedback helps the community make informed decisions\n> Select a game below to start your review\n> All reviews are public and cannot be edited```')
            .setColor('#FFD700')
            .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
            .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' });

        await interaction.reply({
            embeds: [initialEmbed],
            components: [gameRow],
            ephemeral: true
        });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector();

        collector.on('collect', async (i) => {
            if (i.customId === 'select_game_review') {
                const selectedGame = i.values[0];
                const loaderInfo = {
                    'gs': ['akebi', 'unicore'],
                    'hsr': ['Unistar'],
                    'zzz': ['Unizone'],
                    'mrs': ['Unirivals'],
                    'ww': ['Uniwaves', 'aurora'],
                    'valorant': ['Valorant-Pro', 'Neox-AIM'],
                    'cs2': ['Predator'],
                    'deadlock': ['Predator']
                };

                const loaders = loaderInfo[selectedGame] || [];
                
                const loaderMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_loader_review_${selectedGame}`)
                    .setPlaceholder('Select a chesse to review')
                    .addOptions(loaders.map(loader => ({
                        label: loader,
                        value: loader.toLowerCase().replace(/ /g, '-')
                    })));

                const loaderRow = new ActionRowBuilder().addComponents(loaderMenu);

                await i.update({
                    components: [loaderRow]
                });
            }

            if (i.customId.startsWith('select_loader_review_')) {
                const selectedGame = i.customId.split('_').pop();
                const selectedLoader = i.values[0];
                
                const modal = new ModalBuilder()
                    .setCustomId(`review_modal_${selectedGame}_${selectedLoader}`)
                    .setTitle(`✍️ Review ${selectedLoader}`);

                const ratingInput = new TextInputBuilder()
                    .setCustomId('rating')
                    .setLabel('⭐ Rating (1-5)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter a number between 1 and 5')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(1);

                const commentInput = new TextInputBuilder()
                    .setCustomId('comment')
                    .setLabel('💭 Your Review Comment')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Share your honest experience with this chesse...')
                    .setRequired(true)
                    .setMinLength(10)
                    .setMaxLength(1000);

                const ratingRow = new ActionRowBuilder().addComponents(ratingInput);
                const commentRow = new ActionRowBuilder().addComponents(commentInput);

                modal.addComponents(ratingRow, commentRow);
                await i.showModal(modal);

                // Xử lý modal submit ngay tại đây
                try {
                    const modalSubmit = await i.awaitModalSubmit({
                        time: 300000,
                        filter: (modalInteraction) => 
                            modalInteraction.customId === `review_modal_${selectedGame}_${selectedLoader}`
                    });

                    const rating = parseInt(modalSubmit.fields.getTextInputValue('rating'));
                    const comment = modalSubmit.fields.getTextInputValue('comment');

                    if (isNaN(rating) || rating < 1 || rating > 5) {
                        return await modalSubmit.reply({
                            content: 'Vui lòng nhập rating từ 1 đến 5!',
                            ephemeral: true
                        });
                    }

                    const reviewData = {
                        userId: modalSubmit.user.id,
                        username: modalSubmit.user.username,
                        gameId: selectedGame,
                        productId: selectedLoader,
                        rating: rating,
                        comment: comment,
                        timestamp: new Date()
                    };

                    await addReview(reviewData);

                    const thankEmbed = new EmbedBuilder()
                        .setTitle('🌟 Cảm ơn bạn đã đánh giá!')
                        .setDescription(`\`\`\`md\n# Đã gửi đánh giá thành công!\nSản phẩm: ${selectedLoader}\`\`\``)
                        .addFields(
                            { name: '⭐ Đánh giá của bạn', value: getStarDisplay(rating), inline: true },
                            { name: '📝 Nhận xét của bạn', value: `> ${comment}` }
                        )
                        .setColor('#00FF00')
                        .setTimestamp()
                        .setFooter({ text: '💫 Đánh giá của bạn sẽ được hiển thị trong thông tin sản phẩm' });

                    await modalSubmit.reply({
                        embeds: [thankEmbed],
                        ephemeral: true
                    });

                } catch (error) {
                    console.error('Error handling modal submit:', error);
                    if (error.code === 'InteractionCollectorError') {
                        await i.followUp({
                            content: 'Phiên đánh giá đã hết hạn. Vui lòng thử lại.',
                            ephemeral: true
                        });
                    } else {
                        await i.followUp({
                            content: 'Đã xảy ra lỗi khi lưu đánh giá. Vui lòng thử lại sau.',
                            ephemeral: true
                        });
                    }
                }
            }
        });
    }
};

function getStarDisplay(rating) {
    const fullStar = '<a:star:1330152905055142044>';
    const emptyStar = '☆';
    const roundedRating = Math.round(rating);
    return fullStar.repeat(roundedRating) + emptyStar.repeat(5 - roundedRating);
}
