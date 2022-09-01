export default {
    Resources: new Array(5000).fill(0).reduce((resources, _, i) => {
        resources['Thing' + i] = {
            Type: 'AWS::SNS::Topic',
            Properties: {
                TopicName: 'Thing' + i
            }
        };
        return resources;
    }, {})
};
