import { Readable } from 'stream';
import {
    CloudFormationClient,
    DescribeStackEventsCommand,
    DescribeStacksCommand
} from '@aws-sdk/client-cloudformation';
import type {
    AwsCredentialIdentity,
    AwsCredentialIdentityProvider,
    Provider,
} from '@aws-sdk/types';


export interface CFStreamInput {
    region: string;
    credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>;
    pollInterval: number | undefined;
    lastEventId: string | undefined;
}

export default function(stackName: string, options: CFStreamInput) {
    const cfn = new CloudFormationClient({
        credentials: options.credentials,
        region: options.region
    });

    const stream = new Readable({ objectMode: true }),
        pollInterval = options.pollInterval || 10000,
        seen = new Map(),
        push = stream.push.bind(stream);

    let describing = false,
        complete = false,
        stackId = stackName,
        events: object[] = [];


    if (options.lastEventId) {
        seen.set(options.lastEventId, true);
    }

    stream._read = function() {
        if (describing || complete) return;
        describeStack();
    };

    async function describeEvents(nextToken?: string) {
        if (describing) return;
        describing = true;
        // Describe stacks using stackId (ARN) as CF stacks are actually
        // not unique by name.
        try {
            const data = await cfn.send(new DescribeStackEventsCommand({
                StackName: stackId,
                NextToken: nextToken
            }));
            describing = false;

            let i;
            for (i = 0; i < (data.StackEvents || []).length; i++) {
                const event = data.StackEvents[i];

                // Assuming StackEvents are in strictly reverse chronological order,
                // stop reading events once we reach one we've seen already.
                if (seen.has(event.EventId))
                    break;

                // Collect new events in an array and mark them as "seen".
                events.push(event);
                seen.set(event.EventId, true);

                // If we reach a user initiated event assume this event is the
                // initiating event the caller intends to monitor.
                if (event.LogicalResourceId === stackName &&
                    event.ResourceType === 'AWS::CloudFormation::Stack' &&
                    event.ResourceStatusReason === 'User Initiated') {
                    break;
                }
            }

            // If we did not find an event on this page we had already seen, paginate.
            if (i === (data.StackEvents || []).length && data.NextToken) {
                describeEvents(data.NextToken);
            }

            // We know that the update is complete, whatever we have in the events
            // array represents the last few events to stream.
            else if (complete) {
                events.reverse().forEach(push);
                push(null);
            }

            // The update is not complete, and there aren't any new events or more
            // pages to scan. DescribeStack in order to check again to see if the
            // update has completed.
            else {
                setTimeout(describeStack, pollInterval);
                events.reverse().forEach(push);
                events = [];
            }
        } catch (err) {
            return stream.emit('error', err);
        }
    }

    async function describeStack() {
        if (describing) return;
        describing = true;
        try {
            const data = await cfn.send(new DescribeStacksCommand({
                StackName: stackId
            }));
            describing = false;

            if (!data.Stacks.length) return stream.emit('error', new Error('Could not describe stack: ' + stackName));

            stackId = data.Stacks[0].StackId;

            if (/COMPLETE$/.test(data.Stacks[0].StackStatus)) {
                complete = true;
                describeEvents();
            } else {
                setTimeout(describeEvents, pollInterval);
            }
        } catch (err) {
            return stream.emit('error', err);
        }
    }

    return stream;
}
