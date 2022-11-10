export type SlackNotificationDataType = SlackNotificationObjectType;

export type PostSlackMessageParamsType = {
  text: string,
  channel: string
};

export type SlackNotificationObjectType = {
  name: string,
  data: PostSlackMessageParamsType
};
