// App login wins over legacy display prefixes. Shared-account history stays readable.
export const botNames = Object.freeze({'rolexg[bot]':'RolexG','jimini[bot]':'Jimini','gemini-reviewer[bot]':'Gemini','claude-bot[bot]':'Claude','copilot[bot]':'Copilot'});
export function botName(login, text = '') {
  return botNames[login] || (/^(?:github-actions\[bot\]|cillian1)$/.test(login || '')
    ? Object.values(botNames).concat('The Gambler').find(name => new RegExp('^\\s*' + name + '(?: review)?:', 'i').test(text)) : undefined);
}
export const withoutBotPrefix = text => text.replace(/^\s*(?:RolexG|Jimini|Gemini|Claude|Copilot|The Gambler)(?: review)?:\s*/i, '');
