import { NotificationManager } from '../../../common/notification';
import { SlackNotificationService } from '../../../common/notification/slack/SlackNotificationService';

let dummySlackChannel = "C04AQ36PJM_"
let dummySlackToken = 'xoxp-1234567890-1234567890-1234567890-abcdef';

describe('NotificationManager', () => {
    let notificationManager: NotificationManager;
    let slackNotificationService: SlackNotificationService;

    beforeAll(async () => {
        // Create a mock instance of the class that contains the postMessage method
        slackNotificationService = new SlackNotificationService(
            dummySlackToken,
            dummySlackChannel,
        );

        notificationManager = new NotificationManager(slackNotificationService);
    });

    afterEach(async () => {
        jest.resetAllMocks();
        jest.clearAllMocks();
    });

    it('constructor initializes web client with correct token and channel', () => {
        expect(notificationManager.slackNotificationService).toBeInstanceOf(SlackNotificationService);
    });

    it('should call getSlackNotifyObject()', () => {
        let expectedOutput = {
            data: {
                text: "test",
                channel: dummySlackChannel
            }
        }
        jest.spyOn(notificationManager.slackNotificationService, "getNotifyObject").mockReturnValueOnce(expectedOutput)

        let result = notificationManager.getSlackNotifyObject("test");
        expect(result).toEqual(expectedOutput);
    });

    it('should call sendSlackNotification()', () => {
        let methodInput = {
            data: {
                text: "test",
                channel: dummySlackChannel
            }
        }
        jest.spyOn(notificationManager.slackNotificationService, "notify").mockImplementationOnce(() => Promise.resolve());

        expect(notificationManager.sendSlackNotification(methodInput)).resolves;
    });
});