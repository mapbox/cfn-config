import Actions from './lib/actions.js';
import { Commands } from './lib/commands.js';
import Lookup from './lib/lookup.js';
import Prompt from './lib/prompt.js';
import Template from './lib/template.js';

function preauth(credentials) {
    AWS.config.credentials = credentials;

    return {
        Actions,
        Commands,
        Lookup,
        Prompt,
        Template
    };
}

export {
    Actions,
    Commands,
    Lookup,
    Prompt,
    Template
};
