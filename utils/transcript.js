import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function createTranscript(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        
        let content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Transcript for #${channel.name}</title>
    <style>
        body { 
            font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
            margin: 0;
            background-color: #36393f;
            color: #dcddde;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #2f3136;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .message {
            display: flex;
            padding: 10px 20px;
            margin-bottom: 4px;
        }
        .message:hover {
            background-color: #32353b;
        }
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 16px;
        }
        .message-content {
            flex: 1;
        }
        .author-name {
            color: #fff;
            font-weight: 500;
            margin-right: 8px;
        }
        .timestamp {
            color: #72767d;
            font-size: 0.75rem;
        }
        .text-content {
            margin-top: 6px;
            white-space: pre-wrap;
        }
        .attachment {
            margin-top: 8px;
            max-width: 100%;
        }
        .attachment img {
            max-width: 400px;
            max-height: 300px;
            border-radius: 4px;
        }
        .attachment video {
            max-width: 400px;
            max-height: 300px;
            border-radius: 4px;
        }
        .embed {
            margin-top: 8px;
            background: #2f3136;
            border-left: 4px solid #4f545c;
            border-radius: 4px;
            padding: 12px;
        }
        .embed-title {
            color: #fff;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .embed-description {
            color: #dcddde;
        }
        .file-attachment {
            display: inline-block;
            margin-top: 8px;
            padding: 10px;
            background: #2f3136;
            border-radius: 4px;
            color: #00b0f4;
            text-decoration: none;
        }
        .file-attachment:hover {
            background: #33363c;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Transcript for #${channel.name}</h1>
            <p>Created at: ${new Date().toISOString()}</p>
        </div>
`;
        
        let currentDay = null;
        
        messages.reverse().forEach(msg => {
            const messageDate = new Date(msg.createdAt);
            const messageDay = messageDate.toLocaleDateString();
            
            if (currentDay !== messageDay) {
                content += `<div class="message" style="justify-content: center;">
                    <div style="background: #32353b; padding: 4px 10px; border-radius: 12px; font-size: 0.9rem;">
                        ${messageDay}
                    </div>
                </div>`;
                currentDay = messageDay;
            }

            content += `<div class="message">
                <img class="avatar" src="${msg.author.displayAvatarURL({ format: 'png', size: 128 })}" alt="${msg.author.tag}">
                <div class="message-content">
                    <span class="author-name">${msg.author.tag}</span>
                    <span class="timestamp">${messageDate.toLocaleTimeString()}</span>
                    <div class="text-content">${msg.content}</div>`;
            
            // Handle attachments
            msg.attachments.forEach(attachment => {
                const isImage = attachment.url.match(/\.(jpg|jpeg|png|gif)$/i);
                const isVideo = attachment.url.match(/\.(mp4|webm|mov)$/i);
                
                if (isImage) {
                    content += `<div class="attachment">
                        <img src="${attachment.url}" alt="Image Attachment">
                    </div>`;
                } else if (isVideo) {
                    content += `<div class="attachment">
                        <video controls>
                            <source src="${attachment.url}" type="video/${isVideo[1]}">
                            Your browser does not support the video tag.
                        </video>
                    </div>`;
                } else {
                    content += `<a href="${attachment.url}" class="file-attachment" target="_blank">
                        📎 ${attachment.name} (${formatFileSize(attachment.size)})
                    </a>`;
                }
            });
            
            // Handle embeds
            msg.embeds.forEach(embed => {
                content += `<div class="embed">`;
                if (embed.title) {
                    content += `<div class="embed-title">${embed.title}</div>`;
                }
                if (embed.description) {
                    content += `<div class="embed-description">${embed.description}</div>`;
                }
                if (embed.image) {
                    content += `<div class="attachment">
                        <img src="${embed.image.url}" alt="Embed Image">
                    </div>`;
                }
                content += `</div>`;
            });
            
            content += `</div></div>`;
        });
        
        content += `</div></body></html>`;
        
        // Create file path
        const fileName = `transcript-${channel.id}-${Date.now()}.html`;
        const filePath = path.join(__dirname, '..', 'transcripts', fileName);
        
        // Write to file
        await fs.promises.writeFile(filePath, content, 'utf8');
        
        const result = {
            attachment: filePath,
            name: fileName
        };

        // Delete file after sending
        setTimeout(async () => {
            try {
                await fs.promises.unlink(filePath);
                console.log(`Deleted transcript file: ${fileName}`);
            } catch (err) {
                console.error('Error deleting transcript file:', err);
            }
        }, 5000);

        return result;
    } catch (error) {
        console.error('Error creating transcript:', error);
        throw error;
    }
}

// Helper function to format file sizes
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 