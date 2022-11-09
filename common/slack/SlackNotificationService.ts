import { logger } from '../log-config';

const log = logger(module);

let web: { chat: { postMessage: (arg0: any) => any; }; };

class SlackNotification {
  constructor() {
    this.slackConfig = config.notification ? config.notification.slack : undefined;
    if (this.slackConfig && this.slackConfig.GAS_MANAGER_ALERT_TOKEN) {
      this.token = this.slackConfig.GAS_MANAGER_ALERT_TOKEN;
      web = new slackWebAPI.WebClient(this.token);
    } else {
      throw new Error('Slack TOKEN for gas manager is not present in slack configuration');
    }
  }

  validate(data: { text: any; channel: any; }, useDefault: any) {
    if (!data || !data.text || (!useDefault && !data.channel)) {
      throw new Error('Input data should include text and channel keys or just text if useDefault flag is true');
    }
  }

  /**
     * Method to call if you want to send some notifications to Slack.
     * Input should be in below format
     * {
     *   useDefault: true | false, // If true, use default channel IDs from config file
     *   data: {
     *     text: "Message to be sent in notificaiton",
     *     channel: "Channel id of channel to where the notification should go"
     *   }
     * }
     *
     * @param {object} input Object containing information on what to send in notificaiton
     * @throws Error is thrown if there's some error while sending notification
     */
  async notify(input: { data: { text: any; channel: any; }; useDefault: any; }) {
    this.validate(input.data, input.useDefault);
    const slackConfig = config.notification ? config.notification.slack : undefined;
    if (input.useDefault) {
      // Send notificaitons to default channel ids from configuration
      if (slackConfig && slackConfig.channelIds) {
        slackConfig.channelIds.forEach(async (channelId: any) => {
          await this.postMessage({
            text: input.data.text,
            channel: channelId,
          });
        });
      } else {
        log.error('Default Slack channels are not configured to send notifiactions');
      }
    } else {
      // Send notification to channel Id as mentioned in input data
      await this.postMessage({
        text: input.data.text,
        channel: input.data.channel,
      });
    }
  }

  /**
     * Call this method to call Slack API with input data passed in the format
     * {
     *     text: "Message to be sent",
     *     channel: "Channel id of slack channel like C00279KO0QP"
     * }
     * @param {object} data Object containing data to be sent in notification
     */
  async postMessage(data: { text: any; channel: any; }) {
    log.info(web);
    if (!web) {
      throw new Error('Slack web client is not initialized. Check if slack configurations are present');
    }
    const result = await web.chat.postMessage(data);
    log.debug(result);
    log.info(`Successfully sent message ${data.text} to Slack channel with id ${data.channel}`);
  }

  /**
     * Static method which returns an object which can be directly sent
     * to Slack API to send the notification.
     *
     * @param {string} text Message to be sent in notification
     * @param {boolean} useDefault If true, default channel Ids from c
     * onfiguration will be used to send notification
     * @param {string} channel Destination Channel ID of slack channel for notification
     */
  static getNotifyObject(text: any, useDefault: any, channel: any) {
    const slackNotifyObject = {
      name: 'slack',
      data: { text, channel },
      useDefault,
    };
    return slackNotifyObject;
  }
}

export { SlackNotification };
