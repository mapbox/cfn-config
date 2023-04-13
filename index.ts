import Actions from './lib/actions.js';
import { Commands } from './lib/commands.js';
import Lookup from './lib/lookup.js';
import Prompt from './lib/prompt.js';
import TemplateReader from './lib/template.js';
import type {
    CommandOptions
} from './lib/commands.js'
import type {
    AwsCredentialIdentity,
    AwsCredentialIdentityProvider,
    Provider,
} from '@aws-sdk/types';

export interface CFNConfigClient {
    region: string;
    credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>;
}

export default class CFNConfig {
    actions: Actions;
    commands: Commands;
    lookup: Lookup;
    prompt: Prompt;
    template: TemplateReader;
    client: CFNConfigClient;

    constructor(client: CFNConfigClient, options: CommandOptions = {}) {
        this.client = client;
 
        if (!options) options = {};

        this.actions = new Actions(this.client);
        this.commands = new Commands(this.client, options);
        this.lookup = new Lookup(this.client);
        this.prompt = Prompt;
        this.template = new TemplateReader(this.client);
    }
}
