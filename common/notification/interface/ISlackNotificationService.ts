import slackWebAPI from '@slack/web-api';
import { PostSlackMessageParamsType, SlackNotificationObjectType } from '../types';

export interface ISlackNotificationService {
  web: slackWebAPI.WebClient;
  slackToken: string;
  slackChannel: string;

  notify(input: { data: { text: string; }; }): Promise<void>;
  postMessage(
    postSlackMessageParams: PostSlackMessageParamsType,
  ): Promise<void>
  getNotifyObject(text: string): SlackNotificationObjectType
}
