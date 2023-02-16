import Actions from './lib/actions.js';
import { Commands } from './lib/commands.js';
import Lookup from './lib/lookup.js';
import Prompt from './lib/prompt.js';
import Template from './lib/template.js';
import type {
    AwsCredentialIdentity,
    AwsCredentialIdentityProvider,
    Provider,
} from '@aws-sdk/types';

export default class CFNConfig {
    Actions: Actions;
    Commands: Commands;
    Lookup: Lookup;
    Prompt: Prompt;
    Template: Template;

    client: {
        region: string;
        credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>;
    }

    constructor(credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>, region: string) {
        this.client = {
            credentials,
            region
        };

        this.Actions = new Actions(this);
        this.Commands = new Commands(this);
        this.Lookup = new Lookup(this);
        this.Prompt = Prompt;
        this.Template = new Template(this);
    }
}
