
import { Type } from '@google/genai';

export const DIALOGUE_SPEAKERS = ['Alex', 'Ben'];

export const DIALOGUE_SCHEMA = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            speaker: {
                type: Type.STRING,
                description: `The speaker's name, either '${DIALOGUE_SPEAKERS[0]}' or '${DIALOGUE_SPEAKERS[1]}'.`
            },
            line: {
                type: Type.STRING,
                description: 'The line of dialogue spoken by the speaker.'
            }
        },
        required: ['speaker', 'line'],
    }
};
