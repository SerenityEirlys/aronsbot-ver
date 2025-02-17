import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ComponentType, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getProductReviews } from '../../db/mysql.js';

export default {
    data: new SlashCommandBuilder()
        .setName('infochesse')
        .setDescription('View detailed information about game cheats and loaders'),

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

        // Thông tin chi tiết về các loader (giả định, bạn cần thay thế bằng dữ liệu thực)
        const loaderInfo = {
            'gs': {
                'akebi': {
                    name: 'AKEBI',
                    rating: 4.8,
                    reviews: 256,
                    comments: 180,
                    thumbnail: 'https://media.discordapp.net/attachments/1142131273758949386/1340647390633529425/akebi_icon.png?ex=67b31ead&is=67b1cd2d&hm=774965033fb317718e32a7a6b902547aa32dc35b3d66f6de8d1f0fd70ca7b064&=&format=webp&quality=lossless&width=905&height=905',
                    description: 'Premium chesse for Genshin Impact with advanced features.',
                    features: ['Kill Aura - Kill All,Damge', 'ESP - Show Box,Distant,Line', 'Teleport - Custom,Quest,Chest', 'Auto Puzzle']
                },
                'unicore': {
                    name: 'UNICORE',
                    rating: 4.6,
                    reviews: 198,
                    comments: 145,
                    thumbnail: 'https://media.discordapp.net/attachments/1142131273758949386/1340647391849611297/uni.png?ex=67b31eae&is=67b1cd2e&hm=d30e96f817eba1ccd676e003fd5e05ec57b56f7675a8b02e1a31c88a48c601a1&=&format=webp&quality=lossless',
                    description: 'Stable and undetected cheat solution.',
                    features: ['Visual - ESP, Builder ', 'Combat - Kill Aura,Dmg Muti,', 'Teleport - Custom, Entities, Mouse, Quest, Camera ', 'Utility - FOV, FPS, Free Camera, Speed Dialog ']
                }
            },
            'hsr': {
                'Unistar': {
                    name: 'UNISTAR',
                    rating: 4.8,
                    reviews: 256,
                    comments: 180,
                    thumbnail: 'https://media.discordapp.net/attachments/1142131273758949386/1340647391849611297/uni.png?ex=67b31eae&is=67b1cd2e&hm=d30e96f817eba1ccd676e003fd5e05ec57b56f7675a8b02e1a31c88a48c601a1&=&format=webp&quality=lossless',
                    description: 'Premium chesse for Honkai StarRail with advanced features.',
                    features: ['Visual - ESP, Builder ','Player - Noclip','Combat - Speed Battle,Unlock Battle', 'Teleport - Chest, Mousse ', 'Utility - FOV, FPS, Speed Dialog  ']
                }
            },
            'zzz': {
                'Unizone': {
                    name: 'UNIZONE',
                    rating: 4.8,
                    reviews: 256,
                    comments: 180,
                    thumbnail: 'https://media.discordapp.net/attachments/1142131273758949386/1340647391849611297/uni.png?ex=67b31eae&is=67b1cd2e&hm=d30e96f817eba1ccd676e003fd5e05ec57b56f7675a8b02e1a31c88a48c601a1&=&format=webp&quality=lossless',
                    description: 'Premium chesse for Zenless Zen Zero with advanced features.',
                    features: ['Visual - ESP, Builder, Map Icon ','Player - Noclip','Combat - Kill Aura,  ', 'Teleport - Chest, Custom ', 'Utility - Speed Dialog, FPS, FOV ']
                }
            },
            'mrs': {
                'Unirivals': {
                    name: 'UNIRIVALS',
                    rating: 4.8,
                    reviews: 256,
                    comments: 180,
                    thumbnail: 'https://media.discordapp.net/attachments/1142131273758949386/1340647391849611297/uni.png?ex=67b31eae&is=67b1cd2e&hm=d30e96f817eba1ccd676e003fd5e05ec57b56f7675a8b02e1a31c88a48c601a1&=&format=webp&quality=lossless',
                    description: 'Premium cheat for Marvel Rivals with advanced features.',
                    features: ['Visual - ESP, Builder', 'Combat - ', 'Update..']
                }
            },
            'ww': {
                'Uniwaves': {
                    name: 'UNIWAVES',
                    rating: 4.8,
                    reviews: 256,
                    comments: 180,
                    thumbnail: 'https://media.discordapp.net/attachments/1142131273758949386/1340647391849611297/uni.png?ex=67b31eae&is=67b1cd2e&hm=d30e96f817eba1ccd676e003fd5e05ec57b56f7675a8b02e1a31c88a48c601a1&=&format=webp&quality=lossless',
                    description: 'Premium cheat for Wuthering Wave with advanced features.',
                    features: ['Visual - ESP, Builder','Player - Noclip', 'Combat - ', 'Teleport - ', 'Utility - Speed Dialog, FPS, FOV']
                },
                'aurora': {
                    name: 'AURORA',
                    rating: 4.6,
                    reviews: 198,
                    comments: 145,
                    thumbnail: 'https://cdn.discordapp.com/attachments/1142131273758949386/1340697359839137812/Aura-Logo.png?ex=67b34d37&is=67b1fbb7&hm=36e5bbe5ce08b55ddef4a8980591c05a359dbb03cc164420dbd7057f91547c86&',
                    description: 'Stable and undetected cheat solution.',
                    features: ['Visual - Box, Distants, Line ', 'Combat - Kill Aura,', 'Teleport - Custom, Question ', 'Utility - Speed Dialog, FPS, FOV'] 
                }
            },
            'valorant': {
                'Valorant-Pro': {
                    name: 'Anh Bảo Michelin - Privated',
                    rating: 4.8,
                    reviews: 256,
                    comments: 180,
                    thumbnail: 'https://example.com/akebi-thumbnail.png',
                    description: 'Premium chesse for Valorant with advanced features.',
                    features: ['AIM - Trigger Bot, Visibity Check, Fov, Memory AIM, Magnetic Trigger', 'ESP - Sekeleton, Box , Weapon, Bomb, Chat', 'Config - Save Config']
                },
                'Neox-AIM': {
                    name: 'Neox-AIM',
                    rating: 4.6,
                    reviews: 198,
                    comments: 145,
                    thumbnail: 'https://example.com/unicore-thumbnail.png',
                    description: 'Premium chesse for Valorant with advanced features.',
                    features: ['Aimbot - trigger bot, Record Control, Select Color', '', 'Save - config',]
                }
            },
            'cs2': {
                'Predator': {
                    name: 'Predator',
                    rating: 4.8,
                    reviews: 256,
                    comments: 180,
                    thumbnail: 'https://media.discordapp.net/attachments/1142131273758949386/1340647391094771712/Predator-logo.png?ex=67b31eae&is=67b1cd2e&hm=fbe2bec684a701d128e24d496a095651b9b5403c6145cd1f3cfedfded1c88e45&=&format=webp&quality=lossless&width=905&height=905',
                    description: 'Premium cheat for Counter Strike 2 with advanced features.',
                    features: ['Skin - Change Skin', 'ESP -  Glow, Box', 'AIM - Visibal, Slient', 'Save - Config']
                }
            },
            'deadlock': {
                'Predator': {
                    name: 'Predator',
                    rating: 4.8,
                    reviews: 256,
                    comments: 180,
                    thumbnail: 'https://media.discordapp.net/attachments/1142131273758949386/1340647391094771712/Predator-logo.png?ex=67b31eae&is=67b1cd2e&hm=fbe2bec684a701d128e24d496a095651b9b5403c6145cd1f3cfedfded1c88e45&=&format=webp&quality=lossless&width=905&height=905',
                    description: 'Premium cheat for Deadlock with advanced features.',
                    features: ['ESP - Box, Glow', 'AIM - Trôper, Souls, Ênmy, Slient','Misc - Trusted, Streaming,Map,Parry,etc',' Save - Config']
                }
            }
            // Thêm thông tin cho các game khác tương tự
        };

        const gameMenu = new StringSelectMenuBuilder()
            .setCustomId('select_game')
            .setPlaceholder('Select a game')
            .addOptions(games.map(game => ({
                label: game.label,
                value: game.value,
                emoji: game.emoji
            })));

        const gameRow = new ActionRowBuilder().addComponents(gameMenu);

        const initialEmbed = new EmbedBuilder()
            .setTitle('🎮 Chesse Information Center')
            .setDescription('```md\n# Welcome to the Chesse Information Center!\n\n> This is the official information board displaying user-rated chesses.\n> All ratings and comments are from real users.\n> We do not manipulate or create artificial ratings.```')
            .setColor('#FF69B4')
            .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
            .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' });

        await interaction.reply({
            embeds: [initialEmbed],
            components: [gameRow],
            ephemeral: true
        });

        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect
        });

        collector.on('collect', async (gameInteraction) => {
            if (gameInteraction.customId === 'select_game') {
                const selectedGame = gameInteraction.values[0];
                const selectedGameInfo = games.find(game => game.value === selectedGame);
                const loaders = Object.keys(loaderInfo[selectedGame] || {}).map(key => ({
                    label: loaderInfo[selectedGame][key].name,
                    value: key
                }));

                if (loaders.length === 0) {
                    await gameInteraction.update({
                        content: `No cheat information available for **${selectedGameInfo.label}**.`,
                        components: [],
                        embeds: [initialEmbed]
                    });
                    return;
                }

                const loaderMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_loader')
                    .setPlaceholder('Select a cheat to view details')
                    .addOptions(loaders);

                const loaderRow = new ActionRowBuilder().addComponents(loaderMenu);

                await gameInteraction.update({
                    embeds: [initialEmbed],
                    components: [loaderRow],
                });

                const loaderCollector = message.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect
                });

                loaderCollector.on('collect', async (loaderInteraction) => {
                    if (loaderInteraction.customId === 'select_loader') {
                        const selectedLoader = loaderInteraction.values[0];
                        const info = loaderInfo[selectedGame][selectedLoader];
                        
                        // Lấy thông tin đánh giá từ database
                        try {
                            const reviews = await getProductReviews(selectedGame, selectedLoader);
                            
                            const viewReviewsButton = new ButtonBuilder()
                                .setCustomId('view_reviews')
                                .setLabel('View User Reviews')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('💭');

                            const buttonRow = new ActionRowBuilder()
                                .addComponents(viewReviewsButton);
                            
                            const detailEmbed = new EmbedBuilder()
                                .setTitle(`${selectedGameInfo.emoji} ${info.name} - ${selectedGameInfo.label}`)
                                .setDescription(`\`\`\`md\n# Product Description\n${info.description}\`\`\``)
                                .addFields(
                                    { name: '⭐ Rating', value: `${reviews.averageRating}/5.0 ${getStarDisplay(reviews.averageRating)}`, inline: true },
                                    { name: '👥 Total Reviews', value: `${reviews.totalReviews}`, inline: true },
                                    { name: '📊 Statistics', value: `> 💭 Comments: ${reviews.totalComments || 0}\n> 📈 Usage: ${info.usageCount || 0}`, inline: true },
                                    { name: '🔧 Key Features', value: info.features.map(feature => `• ${feature}`).join('\n') }
                                )
                                .setColor('#00FF00')
                                .setThumbnail(info.thumbnail)
                                .setFooter({ text: '💫 Updated ratings in real-time | 🎨 Design by Arons' });

                            await loaderInteraction.update({
                                embeds: [detailEmbed],
                                components: [buttonRow],
                            });

                            const buttonCollector = message.createMessageComponentCollector({
                                componentType: ComponentType.Button
                            });

                            buttonCollector.on('collect', async (buttonInteraction) => {
                                if (buttonInteraction.customId === 'view_reviews') {
                                    const userReviews = reviews.reviews || [];
                                    
                                    const reviewsEmbed = new EmbedBuilder()
                                        .setTitle(`💭 User Reviews for ${info.name}`)
                                        .setColor('#00FF00')
                                        .setThumbnail(info.thumbnail);

                                    if (userReviews.length > 0) {
                                        const reviewFields = userReviews.slice(0, 5).map(review => {
                                            return {
                                                name: `👤 ${review.username || 'Anonymous'} ${getStarDisplay(review.rating)}`,
                                                value: `> 💬 ${review.comment || 'No comment'}\n> ⏰ <t:${Math.floor(new Date(review.timestamp).getTime()/1000)}:R>`
                                            };
                                        });
                                        
                                        reviewsEmbed
                                            .setDescription(`\`\`\`md\n# Latest Reviews\nShowing the 5 most recent reviews\`\`\``)
                                            .addFields(reviewFields);
                                    } else {
                                        reviewsEmbed.setDescription('```md\n# No Reviews Yet\nBe the first to review this product!```');
                                    }

                                    await buttonInteraction.reply({
                                        embeds: [reviewsEmbed],
                                        ephemeral: true
                                    });
                                }
                            });
                        } catch (error) {
                            console.error('Error displaying product info:', error);
                            await loaderInteraction.reply({
                                content: 'There was an error loading the product information. Please try again later.',
                                ephemeral: true
                            });
                        }
                    }
                });
            }
        });
    },
};

function getStarDisplay(rating) {
    const fullStar = '<a:star:1330152905055142044>';
    const emptyStar = '☆';
    const roundedRating = Math.round(rating);
    return fullStar.repeat(roundedRating) + emptyStar.repeat(5 - roundedRating);
}
