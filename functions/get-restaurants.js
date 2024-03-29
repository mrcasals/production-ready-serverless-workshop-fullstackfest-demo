const AWSXRay = require('aws-xray-sdk-core')
const AWS = process.env.LAMBDA_RUNTIME_DIR
  ? AWSXRay.captureAWS(require('aws-sdk'))
  : require('aws-sdk')
const wrap = require('@dazn/lambda-powertools-pattern-basic')
const dynamodb = new AWS.DynamoDB.DocumentClient()

const defaultResults = process.env.defaultResults || 8
const tableName = process.env.restaurants_table

const getRestaurants = async (count) => {
  const req = {
    TableName: tableName,
    Limit: count
  }
  console.log(req)

  try {
    const resp = await dynamodb.scan(req).promise()
    return resp.Items
  } catch (err) {
    console.log(err)
  }
}

module.exports.handler = wrap(async (event, context) => {
  const restaurants = await getRestaurants(defaultResults)
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants)
  }

  return response
})