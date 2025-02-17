import { translate } from '@vitalets/google-translate-api';

/**
 * Translates text to Vietnamese if it's not already in Vietnamese
 * @param {string} text - The text to translate
 * @returns {Promise<string>} - The translated text or original text if translation fails
 */
export async function translator(text) {
    try {
        const result = await translate(text, { to: 'vi' });
        return result.text;
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Return original text if translation fails
    }
}

async function translateMessage(message, targetLang = 'vi') {
    if (!message || typeof message !== 'string') return message;
    
    // Don't translate if message starts with command prefixes
    if (message.startsWith('!') || message.startsWith('/')) {
        return message;
    }
    
    try {
        // Store mentions and emojis
        const mentions = message.match(/<@!?\d+>/g) || [];
        const emojis = message.match(/<:\w+:\d+>/g) || [];
        
        let tempMessage = message;
        
        // Replace mentions and emojis with placeholders
        mentions.forEach((mention, i) => {
            tempMessage = tempMessage.replace(mention, `@MENTION${i}@`);
        });
        
        emojis.forEach((emoji, i) => {
            tempMessage = tempMessage.replace(emoji, `@EMOJI${i}@`);
        });
        
        // Translate text
        const translatedText = await translator(tempMessage);
        
        // Restore mentions and emojis
        let finalText = translatedText;
        mentions.forEach((mention, i) => {
            finalText = finalText.replace(`@MENTION${i}@`, mention);
        });
        
        emojis.forEach((emoji, i) => {
            finalText = finalText.replace(`@EMOJI${i}@`, emoji);
        });
        
        return finalText;
    } catch (error) {
        console.error('Translation processing error:', error);
        return message;
    }
}

export { translateMessage }; 