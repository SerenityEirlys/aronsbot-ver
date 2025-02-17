import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ComponentType } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('loader')
        .setDescription('Select a game and its loader to get a download link'),

    async execute(interaction) {
        // Check if the command is used in the correct server
        if (interaction.guild.id !== '1104940962804936856') {
            return interaction.reply({ 
                content: '❌ This command can only be used in the designated server.', 
                ephemeral: true 
            });
        }

        const games = [
            { label: 'Genshin Impacts', value: 'gs', emoji: '<:Gi:1327875368971014156>' },
            { label: 'Honkai StarRail', value: 'hsr', emoji: '<:hsr:1327873865635987469>' },
            { label: 'Zenless Zen Zero', value: 'zzz', emoji: '<:zzz:1327873879527526410>' },
            { label: 'Marvel Rivals', value: 'mrs', emoji: '<:mr:1327873867498258492>' },
            { label: 'Wuthering Wave', value: 'ww', emoji: '🌊' },
            { label: 'Valorant', value: 'valorant', emoji: '<:val:1327873872002940929>' },
            { label: 'Counter Strike 2', value: 'cs2', emoji: '<:cs2:1327873881498849392>' },
            { label: 'DeadLock', value: 'deadlock', emoji: '<:deadlock:1327873888809390151>' },
            { label: 'Defender Controller', value: 'defender', emoji: '🛡️' },
            { label: 'FiveM', value: 'fivem', emoji: '🎲' },
            { label: 'RageMP', value: 'ragemp', emoji: '🎯' }
        ];

        const loadersByGame = {
            'gs': [{ label: 'Akebi', value: 'akebi' }, { label: 'UniCore', value: 'unicore' }],
            'hsr': [{ label: 'Unistar', value: 'unistar' }, { label: 'Loader', value: 'Loader' }],
            'zzz': [{ label: 'Unizone', value: 'unizone' }, { label: 'Loader', value: 'Loader' }],
            'mrs': [{ label: 'Unirivals', value: 'unirivals' }, { label: 'Loader', value: 'Loader' }],
            'ww': [{ label: 'Uniwaves', value: 'uniwaves' }, { label: 'meowaves', value: 'meowaves' }],
            'valorant': [{ label: 'NeoExclusive', value: 'neoexclusive' }, { label: 'NeoxAim', value: 'neoxaim' }],
            'cs2': [{ label: 'Predator', value: 'cs2' }, { label: 'Loader1', value: 'loader1' }],
            'deadlock': [{ label: 'Predator', value: 'deadlock' }, { label: 'Loader1', value: 'loader1' }],
            'defender': [{ label: 'Defender Controller', value: 'defender' }, { label: 'Loader1', value: 'loader1' }],
            'fivem': [{ label: 'Unicore FiveM', value: 'unicorefivem' }],
            'ragemp': [{ label: 'Unicore RageMP', value: 'unicoreragemp' }]
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
            .setTitle('🎮 Game Selection')
            .setDescription('Please select a game from the dropdown menu below')
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
            componentType: ComponentType.StringSelect,
            time: 60000,
        });

        collector.on('collect', async (gameInteraction) => {
            if (gameInteraction.customId === 'select_game') {
                const selectedGame = gameInteraction.values[0];
                const selectedGameInfo = games.find(game => game.value === selectedGame);

                const embed = new EmbedBuilder()
                    .setTitle(`${selectedGameInfo.emoji} Selected Game: ${selectedGameInfo.label}`)
                    .setDescription('Now select a loader for the chosen game.')
                    .setColor('#FF69B4')
                    .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                    .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' });

                const loaders = loadersByGame[selectedGame] || [];
                if (loaders.length === 0) {
                    await gameInteraction.update({
                        content: `No loaders available for **${selectedGameInfo.label}**.`,
                        components: [],
                        embeds: [embed]
                    });
                    return;
                }

                const loaderMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_loader')
                    .setPlaceholder('Select a loader')
                    .addOptions(loaders);

                const loaderRow = new ActionRowBuilder().addComponents(loaderMenu);

                await gameInteraction.update({
                    embeds: [embed],
                    components: [loaderRow],
                });

                const loaderCollector = message.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect,
                    time: 60000,
                });

                loaderCollector.on('collect', async (loaderInteraction) => {
                    if (loaderInteraction.customId === 'select_loader') {
                        const selectedLoader = loaderInteraction.values[0];
                        const selectedLoaderLabel = loaders.find(loader => loader.value === selectedLoader).label;

                        const downloadLink = `https://arons.dev/loader/${selectedGame}/${selectedLoader}.zip`;

                        const finalEmbed = new EmbedBuilder()
                            .setTitle('✅ Download Ready!')
                            .setDescription(`**Selected Game:** ${selectedGameInfo.emoji} ${selectedGameInfo.label}\n**Selected Loader:** ${selectedLoaderLabel}`)
                            .addFields({ name: '🔗 Download Link', value: `[Click Here to Download](${downloadLink})` })
                            .setColor('#00FF00')
                            .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                            .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' });

                        await loaderInteraction.update({
                            embeds: [finalEmbed],
                            components: [],
                        });
                    }
                });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ Time Out')
                    .setDescription('Interaction timed out. Please use `/loader` to try again.')
                    .setColor('#FF0000');

                interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [],
                });
            }
        });
    },
};
