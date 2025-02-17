import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if required environment variables are set
if (!process.env.DISCORD_TOKEN) {
    console.error('Error: DISCORD_TOKEN environment variable is not set');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('Error: CLIENT_ID environment variable is not set');
    process.exit(1);
}

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

console.log(`Found ${commandFolders.length} command folders`);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    console.log(`Processing folder '${folder}': found ${commandFiles.length} command files`);
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            console.log(`Loading command from file: ${file}`);
            const command = await import(`file://${filePath}`);
            
            if ('data' in command.default && 'execute' in command.default) {
                // Keep original DM permissions from command files
                commands.push(command.default.data.toJSON());
                console.log(`Successfully loaded command: ${command.default.data.name}`);
            } else {
                console.warn(`[WARNING] Command at ${file} is missing required "data" or "execute" property`);
            }
        } catch (error) {
            console.error(`[ERROR] Failed to load command from ${file}:`, error);
        }
    }
}

// Sửa đoạn kiểm tra lệnh trùng tên
const commandNames = commands.map(command => command.name);
console.log('Command names:', commandNames);

const duplicateCommands = commandNames.filter((name, index) => 
    commandNames.indexOf(name) !== index
);

if (duplicateCommands.length > 0) {
    console.log('Phát hiện lệnh trùng tên:');
    console.log(duplicateCommands);
    process.exit(1);
}

// Create a new REST instance
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('='.repeat(50));
        console.log(`Starting to refresh ${commands.length} application (/) commands`);
        console.log('Command names to be deployed:', commands.map(cmd => cmd.name).join(', '));

        // Always deploy commands globally to enable DM functionality
        console.log('Deploying commands globally');
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('='.repeat(50));
        console.log(`Successfully reloaded ${data.length} application (/) commands`);
        console.log('Deployed command names:', data.map(cmd => cmd.name).join(', '));
    } catch (error) {
        console.error('Error deploying commands:', error);
        if (error.rawError) {
            console.error('Detailed error:', JSON.stringify(error.rawError, null, 2));
        }
        process.exit(1);
    }
})();