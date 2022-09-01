import Actions from './lib/actions.js';
import { Commands } from './lib/commands.js';
import Lookup from './lib/lookup.js';
import Prompt from './lib/prompt.js';
import Template from './lib/template.js';
import AWS from 'aws-sdk';

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

export default {
    Actions,
    Commands,
    Lookup,
    Prompt,
    Template,
    preauth
};

export {
    Actions,
    Commands,
    Lookup,
    Prompt,
    Template,
    preauth
};
