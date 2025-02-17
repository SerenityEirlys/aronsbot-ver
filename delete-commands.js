import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

// Check if required environment variables are set
if (!process.env.DISCORD_TOKEN) {
    console.error('Error: DISCORD_TOKEN environment variable is not set');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('Error: CLIENT_ID environment variable is not set');
    process.exit(1);
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
    console.log('Started deleting application (/) commands.');

    // Get list of guilds the bot is in
    const guilds = await rest.get(Routes.userGuilds());

    // Delete global commands
    const globalCommands = await rest.get(
        Routes.applicationCommands(process.env.CLIENT_ID)
    );

    // Delete each global command
    for (const command of globalCommands) {
        await rest.delete(
            Routes.applicationCommand(process.env.CLIENT_ID, command.id)
        );
        console.log(`Deleted global command ${command.name}`);
    }

    // Delete guild-specific commands for each guild
    for (const guild of guilds) {
        const guildCommands = await rest.get(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id)
        );

        for (const command of guildCommands) {
            await rest.delete(
                Routes.applicationGuildCommand(process.env.CLIENT_ID, guild.id, command.id)
            );
            console.log(`Deleted command ${command.name} from guild ${guild.name}`);
        }
    }

    console.log('Successfully deleted all application (/) commands.');
} catch (error) {
    console.error('Error deleting commands:', error.message);
    console.error('Error details:', error?.rawError?.message || error);
}
