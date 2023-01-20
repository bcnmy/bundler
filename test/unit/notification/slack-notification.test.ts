import { WebClient } from '@slack/web-api';
import { NotificationManager } from '../../../common/notification';
import { SlackNotificationService } from '../../../common/notification/slack/SlackNotificationService';
import { SlackNotificationObjectType } from '../../../common/notification/types';
import { config } from '../../../config';

let dummySlackChannel = "C04AQ36PJM_"
let dummySlackToken = 'xoxp-1234567890-1234567890-1234567890-abcdef';

describe('SlackNotificationService', () => {
    let slackNotificationService: SlackNotificationService;
    let mockPostMessage: jest.Mock<any, any>;

    beforeAll(async () => {
        // Create a mock instance of the class that contains the postMessage method
        slackNotificationService = new SlackNotificationService(
            dummySlackToken,
            dummySlackChannel,
        );
    });

    afterEach(async () => {
        jest.resetAllMocks();
        jest.clearAllMocks();
    });

    it('constructor initializes web client with correct token and channel', () => {
        const slackChannel = '#test-channel';

        // Create an instance of the class with the slack token and channel
        let classInstance;
        try {
            classInstance = new SlackNotificationService("", slackChannel);
        } catch (error) {
            expect(classInstance).toThrowError;
        }
    });

    it('should call postMessage with the correct arguments', async () => {
        // Define the mock parameters for the Slack message
        const postSlackMessageParams = {
            channel: '#test-channel',
            text: 'test message'
        };

        jest.spyOn(slackNotificationService.web.chat, "postMessage").mockReturnThis();

        // Call the postMessage method on the mock class instance
        await slackNotificationService.postMessage(postSlackMessageParams);

        // Assert that the postMessage method was called with the correct parameters
        expect(slackNotificationService.postMessage).resolves;
    });

    it('should call notify with the correct arguments', async () => {
        mockPostMessage = jest.fn();
        slackNotificationService.postMessage = mockPostMessage;
        const input = { data: { text: 'unit test case' } };
        await slackNotificationService.notify(input);
        expect(mockPostMessage).toHaveBeenCalledWith({
            text: "unit test case",
            channel: dummySlackChannel,
        });
    });

    it('should call getNotifyObject with the correct arguments', async () => {
        const text = 'unit test case';

        // Call the getNotifyObject method on the mock class instance
        const result = await slackNotificationService.getNotifyObject(text);

        // Assert that the returned object is as expected
        expect(result).toEqual({
            data: {
                text: text,
                channel: dummySlackChannel
            }
        });
    });


});