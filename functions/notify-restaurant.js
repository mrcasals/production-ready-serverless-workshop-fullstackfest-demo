const _ = require('lodash')
const Log = require('@dazn/lambda-powertools-logger')
const wrap = require('@dazn/lambda-powertools-pattern-basic')
const { getRecords } = require('../lib/kinesis')
const AWSXRay = require('aws-xray-sdk-core')
const AWS = process.env.LAMBDA_RUNTIME_DIR
  ? AWSXRay.captureAWS(require('aws-sdk'))
  : require('aws-sdk')
const kinesis = new AWS.Kinesis()
const sns = new AWS.SNS()

const streamName = process.env.order_events_stream
const topicArn = process.env.restaurant_notification_topic

module.exports.handler = wrap(async (event, context) => {
  const records = getRecords(event)
  const orderPlaced = records.filter(r => r.eventType === 'order_placed')

  for (let order of orderPlaced) {
    const snsReq = {
      Message: JSON.stringify(order),
      TopicArn: topicArn
    };
    await sns.publish(snsReq).promise()
    Log.debug(`notified restaurant [${order.restaurantName}] of order [${order.orderId}]`)

    const data = _.clone(order)
    data.eventType = 'restaurant_notified'

    const kinesisReq = {
      Data: JSON.stringify(data), // the SDK would base64 encode this for us
      PartitionKey: order.orderId,
      StreamName: streamName
    }
    await kinesis.putRecord(kinesisReq).promise()
    Log.debug(`published 'restaurant_notified' event to Kinesis`)
  }
})