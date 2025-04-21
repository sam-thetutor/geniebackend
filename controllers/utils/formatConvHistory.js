export function formatConvHistory(messages) {
    return messages.map((message, i) => {
        if (message.role === "user" ){
            return `Human: ${message.content}`
        } else {
            return `AI: ${message.content}`
        }
    }).join('\n')
}
