import fs from 'fs';
import path from 'path';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

// 1. Load MongoDB URI from .env.local
const envPath = fs.existsSync(".env.local") ? ".env.local" : ".env";
const env = fs.readFileSync(path.resolve(envPath), "utf8")
  .split("\n")
  .reduce((acc, line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) acc[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    return acc;
  }, {});

const client = new MongoClient(env.MONGODB_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

const toCents = (amount) => Math.round(amount * 100);
const fromCents = (cents) => cents / 100;

const groupsToUpdate = [
  {
    "_id": "6ade31128e90399b7613ddad",
    "name": "Sreemangol",
    "members": [
      { "name": "Shohag", "totalPaid": 20030, "totalOwed": 3338.3333333333335 },
      { "name": "Saiful", "totalPaid": 0, "totalOwed": 3338.3333333333335 },
      { "name": "Nafiz", "totalPaid": 0, "totalOwed": 3338.3333333333335 },
      { "name": "Shuvo", "totalPaid": 0, "totalOwed": 3338.3333333333335 },
      { "name": "Shajbir", "totalPaid": 0, "totalOwed": 3338.3333333333335 },
      { "name": "Sajjad", "totalPaid": 0, "totalOwed": 3338.3333333333335 }
    ],
    "expenses": [
      { "id": "a1b2c3d4-0001-4111-8111-000000000001", "description": "Water", "amount": 45, "payerName": "Shohag", "time": "24/07/2025, 10:49 PM", "createdAt": "2025-07-24T22:49:00.000Z", "sequence": 1, "shares": [{ "memberName": "Shohag", "amount": 7.5 }, { "memberName": "Saiful", "amount": 7.5 }, { "memberName": "Nafiz", "amount": 7.5 }, { "memberName": "Shuvo", "amount": 7.5 }, { "memberName": "Shajbir", "amount": 7.5 }, { "memberName": "Sajjad", "amount": 7.5 }] },
      { "id": "a1b2c3d4-0002-4111-8111-000000000002", "description": "Chips", "amount": 90, "payerName": "Shohag", "time": "25/07/2025, 03:05 AM", "createdAt": "2025-07-25T03:05:00.000Z", "sequence": 2, "shares": [{ "memberName": "Shohag", "amount": 15 }, { "memberName": "Saiful", "amount": 15 }, { "memberName": "Nafiz", "amount": 15 }, { "memberName": "Shuvo", "amount": 15 }, { "memberName": "Shajbir", "amount": 15 }, { "memberName": "Sajjad", "amount": 15 }] },
      { "id": "a1b2c3d4-0003-4111-8111-000000000003", "description": "Breakfast - Roti, Egg, Veg", "amount": 390, "payerName": "Shohag", "time": "25/07/2025, 06:57 AM", "createdAt": "2025-07-25T06:57:00.000Z", "sequence": 3, "shares": [{ "memberName": "Shohag", "amount": 65 }, { "memberName": "Saiful", "amount": 65 }, { "memberName": "Nafiz", "amount": 65 }, { "memberName": "Shuvo", "amount": 65 }, { "memberName": "Shajbir", "amount": 65 }, { "memberName": "Sajjad", "amount": 65 }] },
      { "id": "a1b2c3d4-0004-4111-8111-000000000004", "description": "Peyara", "amount": 60, "payerName": "Shohag", "time": "25/07/2025, 09:05 AM", "createdAt": "2025-07-25T09:05:00.000Z", "sequence": 4, "shares": [{ "memberName": "Shohag", "amount": 10 }, { "memberName": "Saiful", "amount": 10 }, { "memberName": "Nafiz", "amount": 10 }, { "memberName": "Shuvo", "amount": 10 }, { "memberName": "Shajbir", "amount": 10 }, { "memberName": "Sajjad", "amount": 10 }] },
      { "id": "a1b2c3d4-0005-4111-8111-000000000005", "description": "Madhobpur Ticket", "amount": 50, "payerName": "Shohag", "time": "25/07/2025, 09:05 AM", "createdAt": "2025-07-25T09:05:00.000Z", "sequence": 5, "shares": [{ "memberName": "Shohag", "amount": 8.333333333333334 }, { "memberName": "Saiful", "amount": 8.333333333333334 }, { "memberName": "Nafiz", "amount": 8.333333333333334 }, { "memberName": "Shuvo", "amount": 8.333333333333334 }, { "memberName": "Shajbir", "amount": 8.333333333333334 }, { "memberName": "Sajjad", "amount": 8.333333333333334 }] },
      { "id": "a1b2c3d4-0006-4111-8111-000000000006", "description": "Water", "amount": 35, "payerName": "Shohag", "time": "25/07/2025, 09:05 AM", "createdAt": "2025-07-25T09:05:00.000Z", "sequence": 6, "shares": [{ "memberName": "Shohag", "amount": 5.833333333333333 }, { "memberName": "Saiful", "amount": 5.833333333333333 }, { "memberName": "Nafiz", "amount": 5.833333333333333 }, { "memberName": "Shuvo", "amount": 5.833333333333333 }, { "memberName": "Shajbir", "amount": 5.833333333333333 }, { "memberName": "Sajjad", "amount": 5.833333333333333 }] },
      { "id": "a1b2c3d4-0007-4111-8111-000000000007", "description": "Water, Saline", "amount": 70, "payerName": "Shohag", "time": "25/07/2025, 10:15 AM", "createdAt": "2025-07-25T10:15:00.000Z", "sequence": 7, "shares": [{ "memberName": "Shohag", "amount": 11.666666666666666 }, { "memberName": "Saiful", "amount": 11.666666666666666 }, { "memberName": "Nafiz", "amount": 11.666666666666666 }, { "memberName": "Shuvo", "amount": 11.666666666666666 }, { "memberName": "Shajbir", "amount": 11.666666666666666 }, { "memberName": "Sajjad", "amount": 11.666666666666666 }] },
      { "id": "a1b2c3d4-0008-4111-8111-000000000008", "description": "Pineapple", "amount": 80, "payerName": "Shohag", "time": "25/07/2025, 10:19 AM", "createdAt": "2025-07-25T10:19:00.000Z", "sequence": 8, "shares": [{ "memberName": "Shohag", "amount": 13.333333333333334 }, { "memberName": "Saiful", "amount": 13.333333333333334 }, { "memberName": "Nafiz", "amount": 13.333333333333334 }, { "memberName": "Shuvo", "amount": 13.333333333333334 }, { "memberName": "Shajbir", "amount": 13.333333333333334 }, { "memberName": "Sajjad", "amount": 13.333333333333334 }] },
      { "id": "a1b2c3d4-0009-4111-8111-000000000009", "description": "Tea", "amount": 80, "payerName": "Shohag", "time": "25/07/2025, 01:15 PM", "createdAt": "2025-07-25T13:15:00.000Z", "sequence": 9, "shares": [{ "memberName": "Shohag", "amount": 13.333333333333334 }, { "memberName": "Saiful", "amount": 13.333333333333334 }, { "memberName": "Nafiz", "amount": 13.333333333333334 }, { "memberName": "Shuvo", "amount": 13.333333333333334 }, { "memberName": "Shajbir", "amount": 13.333333333333334 }, { "memberName": "Sajjad", "amount": 13.333333333333334 }] },
      { "id": "a1b2c3d4-0010-4111-8111-000000000010", "description": "Lawachhara Ticket", "amount": 800, "payerName": "Shohag", "time": "25/07/2025, 01:16 PM", "createdAt": "2025-07-25T13:16:00.000Z", "sequence": 10, "shares": [{ "memberName": "Shohag", "amount": 133.33333333333334 }, { "memberName": "Saiful", "amount": 133.33333333333334 }, { "memberName": "Nafiz", "amount": 133.33333333333334 }, { "memberName": "Shuvo", "amount": 133.33333333333334 }, { "memberName": "Shajbir", "amount": 133.33333333333334 }, { "memberName": "Sajjad", "amount": 133.33333333333334 }] },
      { "id": "a1b2c3d4-0011-4111-8111-000000000011", "description": "Kola", "amount": 40, "payerName": "Shohag", "time": "25/07/2025, 01:17 PM", "createdAt": "2025-07-25T13:17:00.000Z", "sequence": 11, "shares": [{ "memberName": "Shohag", "amount": 6.666666666666667 }, { "memberName": "Saiful", "amount": 6.666666666666667 }, { "memberName": "Nafiz", "amount": 6.666666666666667 }, { "memberName": "Shuvo", "amount": 6.666666666666667 }, { "memberName": "Shajbir", "amount": 6.666666666666667 }, { "memberName": "Sajjad", "amount": 6.666666666666667 }] },
      { "id": "a1b2c3d4-0012-4111-8111-000000000012", "description": "Lunch", "amount": 1000, "payerName": "Shohag", "time": "25/07/2025, 02:03 PM", "createdAt": "2025-07-25T14:03:00.000Z", "sequence": 12, "shares": [{ "memberName": "Shohag", "amount": 166.66666666666666 }, { "memberName": "Saiful", "amount": 166.66666666666666 }, { "memberName": "Nafiz", "amount": 166.66666666666666 }, { "memberName": "Shuvo", "amount": 166.66666666666666 }, { "memberName": "Shajbir", "amount": 166.66666666666666 }, { "memberName": "Sajjad", "amount": 166.66666666666666 }] },
      { "id": "a1b2c3d4-0013-4111-8111-000000000013", "description": "Car Fare", "amount": 4000, "payerName": "Shohag", "time": "25/07/2025, 04:01 PM", "createdAt": "2025-07-25T16:01:00.000Z", "sequence": 13, "shares": [{ "memberName": "Shohag", "amount": 666.6666666666666 }, { "memberName": "Saiful", "amount": 666.6666666666666 }, { "memberName": "Nafiz", "amount": 666.6666666666666 }, { "memberName": "Shuvo", "amount": 666.6666666666666 }, { "memberName": "Shajbir", "amount": 666.6666666666666 }, { "memberName": "Sajjad", "amount": 666.6666666666666 }] },
      { "id": "a1b2c3d4-0014-4111-8111-000000000014", "description": "Tea", "amount": 270, "payerName": "Shohag", "time": "25/07/2025, 04:05 PM", "createdAt": "2025-07-25T16:05:00.000Z", "sequence": 14, "shares": [{ "memberName": "Shohag", "amount": 45 }, { "memberName": "Saiful", "amount": 45 }, { "memberName": "Nafiz", "amount": 45 }, { "memberName": "Shuvo", "amount": 45 }, { "memberName": "Shajbir", "amount": 45 }, { "memberName": "Sajjad", "amount": 45 }] },
      { "id": "a1b2c3d4-0015-4111-8111-000000000015", "description": "Bus Fare Sreemangal to Sylhet", "amount": 1080, "payerName": "Shohag", "time": "25/07/2025, 05:56 PM", "createdAt": "2025-07-25T17:56:00.000Z", "sequence": 15, "shares": [{ "memberName": "Shohag", "amount": 180 }, { "memberName": "Saiful", "amount": 180 }, { "memberName": "Nafiz", "amount": 180 }, { "memberName": "Shuvo", "amount": 180 }, { "memberName": "Shajbir", "amount": 180 }, { "memberName": "Sajjad", "amount": 180 }] },
      { "id": "a1b2c3d4-0016-4111-8111-000000000016", "description": "Bus Fare Partial Payment", "amount": 1000, "payerName": "Shohag", "time": "25/07/2025, 08:02 PM", "createdAt": "2025-07-25T20:02:00.000Z", "sequence": 16, "shares": [{ "memberName": "Shohag", "amount": 166.66666666666666 }, { "memberName": "Saiful", "amount": 166.66666666666666 }, { "memberName": "Nafiz", "amount": 166.66666666666666 }, { "memberName": "Shuvo", "amount": 166.66666666666666 }, { "memberName": "Shajbir", "amount": 166.66666666666666 }, { "memberName": "Sajjad", "amount": 166.66666666666666 }] },
      { "id": "a1b2c3d4-0017-4111-8111-000000000017", "description": "Hotel Fare", "amount": 2500, "payerName": "Shohag", "time": "25/07/2025, 09:19 PM", "createdAt": "2025-07-25T21:19:00.000Z", "sequence": 17, "shares": [{ "memberName": "Shohag", "amount": 416.6666666666667 }, { "memberName": "Saiful", "amount": 416.6666666666667 }, { "memberName": "Nafiz", "amount": 416.6666666666667 }, { "memberName": "Shuvo", "amount": 416.6666666666667 }, { "memberName": "Shajbir", "amount": 416.6666666666667 }, { "memberName": "Sajjad", "amount": 416.6666666666667 }] },
      { "id": "a1b2c3d4-0018-4111-8111-000000000018", "description": "CNG Vara ", "amount": 180, "payerName": "Shohag", "time": "26/07/2025, 10:20 AM", "createdAt": "2025-07-26T10:20:00.000Z", "sequence": 18, "shares": [{ "memberName": "Shohag", "amount": 30 }, { "memberName": "Saiful", "amount": 30 }, { "memberName": "Nafiz", "amount": 30 }, { "memberName": "Shuvo", "amount": 30 }, { "memberName": "Shajbir", "amount": 30 }, { "memberName": "Sajjad", "amount": 30 }] },
      { "id": "a1b2c3d4-0019-4111-8111-000000000019", "description": "Dinner", "amount": 840, "payerName": "Shohag", "time": "26/07/2025, 10:20 AM", "createdAt": "2025-07-26T10:20:00.000Z", "sequence": 19, "shares": [{ "memberName": "Shohag", "amount": 140 }, { "memberName": "Saiful", "amount": 140 }, { "memberName": "Nafiz", "amount": 140 }, { "memberName": "Shuvo", "amount": 140 }, { "memberName": "Shajbir", "amount": 140 }, { "memberName": "Sajjad", "amount": 140 }] },
      { "id": "a1b2c3d4-0020-4111-8111-000000000020", "description": "Breakfast", "amount": 380, "payerName": "Shohag", "time": "26/07/2025, 10:24 AM", "createdAt": "2025-07-26T10:24:00.000Z", "sequence": 20, "shares": [{ "memberName": "Shohag", "amount": 63.333333333333336 }, { "memberName": "Saiful", "amount": 63.333333333333336 }, { "memberName": "Nafiz", "amount": 63.333333333333336 }, { "memberName": "Shuvo", "amount": 63.333333333333336 }, { "memberName": "Shajbir", "amount": 63.333333333333336 }, { "memberName": "Sajjad", "amount": 63.333333333333336 }] },
      { "id": "a1b2c3d4-0021-4111-8111-000000000021", "description": "CNG Vara", "amount": 120, "payerName": "Shohag", "time": "26/07/2025, 10:24 AM", "createdAt": "2025-07-26T10:24:00.000Z", "sequence": 21, "shares": [{ "memberName": "Shohag", "amount": 20 }, { "memberName": "Saiful", "amount": 20 }, { "memberName": "Nafiz", "amount": 20 }, { "memberName": "Shuvo", "amount": 20 }, { "memberName": "Shajbir", "amount": 20 }, { "memberName": "Sajjad", "amount": 20 }] },
      { "id": "a1b2c3d4-0022-4111-8111-000000000022", "description": "Water", "amount": 30, "payerName": "Shohag", "time": "26/07/2025, 10:26 AM", "createdAt": "2025-07-26T10:26:00.000Z", "sequence": 22, "shares": [{ "memberName": "Shohag", "amount": 5 }, { "memberName": "Saiful", "amount": 5 }, { "memberName": "Nafiz", "amount": 5 }, { "memberName": "Shuvo", "amount": 5 }, { "memberName": "Shajbir", "amount": 5 }, { "memberName": "Sajjad", "amount": 5 }] },
      { "id": "a1b2c3d4-0023-4111-8111-000000000023", "description": "Auto Vara ", "amount": 50, "payerName": "Shohag", "time": "26/07/2025, 12:33 PM", "createdAt": "2025-07-26T12:33:00.000Z", "sequence": 23, "shares": [{ "memberName": "Shohag", "amount": 8.333333333333334 }, { "memberName": "Saiful", "amount": 8.333333333333334 }, { "memberName": "Nafiz", "amount": 8.333333333333334 }, { "memberName": "Shuvo", "amount": 8.333333333333334 }, { "memberName": "Shajbir", "amount": 8.333333333333334 }, { "memberName": "Sajjad", "amount": 8.333333333333334 }] },
      { "id": "a1b2c3d4-0024-4111-8111-000000000024", "description": "Water, Biscuits, Saline", "amount": 150, "payerName": "Shohag", "time": "26/07/2025, 12:35 PM", "createdAt": "2025-07-26T12:35:00.000Z", "sequence": 24, "shares": [{ "memberName": "Shohag", "amount": 25 }, { "memberName": "Saiful", "amount": 25 }, { "memberName": "Nafiz", "amount": 25 }, { "memberName": "Shuvo", "amount": 25 }, { "memberName": "Shajbir", "amount": 25 }, { "memberName": "Sajjad", "amount": 25 }] },
      { "id": "a1b2c3d4-0025-4111-8111-000000000025", "description": "Boat Fee", "amount": 600, "payerName": "Shohag", "time": "26/07/2025, 03:00 PM", "createdAt": "2025-07-26T15:00:00.000Z", "sequence": 25, "shares": [{ "memberName": "Shohag", "amount": 100 }, { "memberName": "Saiful", "amount": 100 }, { "memberName": "Nafiz", "amount": 100 }, { "memberName": "Shuvo", "amount": 100 }, { "memberName": "Shajbir", "amount": 100 }, { "memberName": "Sajjad", "amount": 100 }] },
      { "id": "a1b2c3d4-0026-4111-8111-000000000026", "description": "Bus", "amount": 900, "payerName": "Shohag", "time": "26/07/2025, 03:01 PM", "createdAt": "2025-07-26T15:01:00.000Z", "sequence": 26, "shares": [{ "memberName": "Shohag", "amount": 150 }, { "memberName": "Saiful", "amount": 150 }, { "memberName": "Nafiz", "amount": 150 }, { "memberName": "Shuvo", "amount": 150 }, { "memberName": "Shajbir", "amount": 150 }, { "memberName": "Sajjad", "amount": 150 }] },
      { "id": "a1b2c3d4-0027-4111-8111-000000000027", "description": "Locker", "amount": 200, "payerName": "Shohag", "time": "26/07/2025, 03:02 PM", "createdAt": "2025-07-26T15:02:00.000Z", "sequence": 27, "shares": [{ "memberName": "Shohag", "amount": 33.333333333333336 }, { "memberName": "Saiful", "amount": 33.333333333333336 }, { "memberName": "Nafiz", "amount": 33.333333333333336 }, { "memberName": "Shuvo", "amount": 33.333333333333336 }, { "memberName": "Shajbir", "amount": 33.333333333333336 }, { "memberName": "Sajjad", "amount": 33.333333333333336 }] },
      { "id": "a1b2c3d4-0028-4111-8111-000000000028", "description": "Water", "amount": 50, "payerName": "Shohag", "time": "26/07/2025, 03:08 PM", "createdAt": "2025-07-26T15:08:00.000Z", "sequence": 28, "shares": [{ "memberName": "Shohag", "amount": 8.333333333333334 }, { "memberName": "Saiful", "amount": 8.333333333333334 }, { "memberName": "Nafiz", "amount": 8.333333333333334 }, { "memberName": "Shuvo", "amount": 8.333333333333334 }, { "memberName": "Shajbir", "amount": 8.333333333333334 }, { "memberName": "Sajjad", "amount": 8.333333333333334 }] },
      { "id": "a1b2c3d4-0029-4111-8111-000000000029", "description": "Auto Vara", "amount": 120, "payerName": "Shohag", "time": "26/07/2025, 06:44 PM", "createdAt": "2025-07-26T18:44:00.000Z", "sequence": 29, "shares": [{ "memberName": "Shohag", "amount": 20 }, { "memberName": "Saiful", "amount": 20 }, { "memberName": "Nafiz", "amount": 20 }, { "memberName": "Shuvo", "amount": 20 }, { "memberName": "Shajbir", "amount": 20 }, { "memberName": "Sajjad", "amount": 20 }] },
      { "id": "a1b2c3d4-0030-4111-8111-000000000030", "description": "Bus Vara", "amount": 900, "payerName": "Shohag", "time": "26/07/2025, 06:45 PM", "createdAt": "2025-07-26T18:45:00.000Z", "sequence": 30, "shares": [{ "memberName": "Shohag", "amount": 150 }, { "memberName": "Saiful", "amount": 150 }, { "memberName": "Nafiz", "amount": 150 }, { "memberName": "Shuvo", "amount": 150 }, { "memberName": "Shajbir", "amount": 150 }, { "memberName": "Sajjad", "amount": 150 }] },
      { "id": "a1b2c3d4-0031-4111-8111-000000000031", "description": "Bus Remaining Payment", "amount": 3020, "payerName": "Shohag", "time": "26/07/2025, 09:24 PM", "createdAt": "2025-07-26T21:24:00.000Z", "sequence": 31, "shares": [{ "memberName": "Shohag", "amount": 503.3333333333333 }, { "memberName": "Saiful", "amount": 503.3333333333333 }, { "memberName": "Nafiz", "amount": 503.3333333333333 }, { "memberName": "Shuvo", "amount": 503.3333333333333 }, { "memberName": "Shajbir", "amount": 503.3333333333333 }, { "memberName": "Sajjad", "amount": 503.3333333333333 }] },
      { "id": "a1b2c3d4-0032-4111-8111-000000000032", "description": "Cheaken, Nun", "amount": 900, "payerName": "Shohag", "time": "26/07/2025, 11:35 PM", "createdAt": "2025-07-26T23:35:00.000Z", "sequence": 32, "shares": [{ "memberName": "Shohag", "amount": 150 }, { "memberName": "Saiful", "amount": 150 }, { "memberName": "Nafiz", "amount": 150 }, { "memberName": "Shuvo", "amount": 150 }, { "memberName": "Shajbir", "amount": 150 }, { "memberName": "Sajjad", "amount": 150 }] }
    ],
    "extraCharges": [],
    "isDisabled": true,
    "isFinished": true,
    "deposits": [],
    "nextSequence": 33
  },
  {
    "_id": "6ade312c8e90399b7613ddb1",
    "name": "Bandarban",
    "members": [
      { "name": "Nafiz", "totalPaid": 6485, "totalOwed": 5626.26 },
      { "name": "Promi", "totalPaid": 6760, "totalOwed": 5616.25 },
      { "name": "Borsha", "totalPaid": 7410, "totalOwed": 5766.25 },
      { "name": "Masum", "totalPaid": 1980, "totalOwed": 5626.24 }
    ],
    "expenses": [
      { "id": "b2b2c3d4-0001-4222-8222-000000000001", "description": "Hotel Booking Half", "amount": 3000, "payerName": "Borsha", "time": "14/10/2026, 10:37 PM", "createdAt": "2026-10-14T22:37:00.000Z", "sequence": 1, "shares": [{ "memberName": "Nafiz", "amount": 750 }, { "memberName": "Promi", "amount": 750 }, { "memberName": "Borsha", "amount": 750 }, { "memberName": "Masum", "amount": 750 }] },
      { "id": "b2b2c3d4-0002-4222-8222-000000000002", "description": "Bus out", "amount": 3920, "payerName": "Nafiz", "time": "14/10/2026, 10:39 PM", "createdAt": "2026-10-14T22:39:00.000Z", "sequence": 2, "shares": [{ "memberName": "Nafiz", "amount": 980 }, { "memberName": "Promi", "amount": 980 }, { "memberName": "Borsha", "amount": 980 }, { "memberName": "Masum", "amount": 980 }] },
      { "id": "b2b2c3d4-0003-4222-8222-000000000003", "description": "Bus in", "amount": 3000, "payerName": "Borsha", "time": "14/10/2026, 10:41 PM", "createdAt": "2026-10-14T22:41:00.000Z", "sequence": 3, "shares": [{ "memberName": "Nafiz", "amount": 750 }, { "memberName": "Promi", "amount": 750 }, { "memberName": "Borsha", "amount": 750 }, { "memberName": "Masum", "amount": 750 }] },
      { "id": "b2b2c3d4-0004-4222-8222-000000000004", "description": "Bus in", "amount": 920, "payerName": "Promi", "time": "14/10/2026, 10:42 PM", "createdAt": "2026-10-14T22:42:00.000Z", "sequence": 4, "shares": [{ "memberName": "Nafiz", "amount": 230 }, { "memberName": "Promi", "amount": 230 }, { "memberName": "Borsha", "amount": 230 }, { "memberName": "Masum", "amount": 230 }] },
      { "id": "b2b2c3d4-0005-4222-8222-000000000005", "description": "Auto vara", "amount": 160, "payerName": "Masum", "time": "21/10/2026, 06:43 AM", "createdAt": "2026-10-21T06:43:00.000Z", "sequence": 5, "shares": [{ "memberName": "Nafiz", "amount": 40 }, { "memberName": "Promi", "amount": 40 }, { "memberName": "Borsha", "amount": 40 }, { "memberName": "Masum", "amount": 40 }] },
      { "id": "b2b2c3d4-0006-4222-8222-000000000006", "description": "Auto To Mondir", "amount": 50, "payerName": "Borsha", "time": "21/10/2026, 06:01 PM", "createdAt": "2026-10-21T18:01:00.000Z", "sequence": 6, "shares": [{ "memberName": "Nafiz", "amount": 12.5 }, { "memberName": "Promi", "amount": 12.5 }, { "memberName": "Borsha", "amount": 12.5 }, { "memberName": "Masum", "amount": 12.5 }] },
      { "id": "b2b2c3d4-0007-4222-8222-000000000007", "description": "Kola ,jambura", "amount": 50, "payerName": "Masum", "time": "21/10/2026, 06:02 PM", "createdAt": "2026-10-21T18:02:00.000Z", "sequence": 7, "shares": [{ "memberName": "Nafiz", "amount": 12.5 }, { "memberName": "Promi", "amount": 12.5 }, { "memberName": "Borsha", "amount": 12.5 }, { "memberName": "Masum", "amount": 12.5 }] },
      { "id": "b2b2c3d4-0008-4222-8222-000000000008", "description": "Brush", "amount": 20, "payerName": "Masum", "time": "21/10/2026, 06:03 PM", "createdAt": "2026-10-21T18:03:00.000Z", "sequence": 8, "shares": [{ "memberName": "Nafiz", "amount": 0 }, { "memberName": "Promi", "amount": 0 }, { "memberName": "Borsha", "amount": 20 }, { "memberName": "Masum", "amount": 0 }] },
      { "id": "b2b2c3d4-0009-4222-8222-000000000009", "description": "Evening Snacks", "amount": 280, "payerName": "Nafiz", "time": "21/10/2026, 07:07 PM", "createdAt": "2026-10-21T19:07:00.000Z", "sequence": 9, "shares": [{ "memberName": "Nafiz", "amount": 70 }, { "memberName": "Promi", "amount": 70 }, { "memberName": "Borsha", "amount": 70 }, { "memberName": "Masum", "amount": 70 }] },
      { "id": "b2b2c3d4-0010-4222-8222-000000000010", "description": "Mondir to Resort", "amount": 30, "payerName": "Masum", "time": "21/10/2026, 08:33 PM", "createdAt": "2026-10-21T20:33:00.000Z", "sequence": 10, "shares": [{ "memberName": "Nafiz", "amount": 7.5 }, { "memberName": "Promi", "amount": 7.5 }, { "memberName": "Borsha", "amount": 7.5 }, { "memberName": "Masum", "amount": 7.5 }] },
      { "id": "b2b2c3d4-0011-4222-8222-000000000011", "description": "Auto 2nd half", "amount": 10, "payerName": "Borsha", "time": "21/10/2026, 08:33 PM", "createdAt": "2026-10-21T20:33:00.000Z", "sequence": 11, "shares": [{ "memberName": "Nafiz", "amount": 2.5 }, { "memberName": "Promi", "amount": 2.5 }, { "memberName": "Borsha", "amount": 2.5 }, { "memberName": "Masum", "amount": 2.5 }] },
      { "id": "b2b2c3d4-0012-4222-8222-000000000012", "description": "Hotel", "amount": 1500, "payerName": "Nafiz", "time": "22/10/2026, 11:43 AM", "createdAt": "2026-10-22T11:43:00.000Z", "sequence": 12, "shares": [{ "memberName": "Nafiz", "amount": 375 }, { "memberName": "Promi", "amount": 375 }, { "memberName": "Borsha", "amount": 375 }, { "memberName": "Masum", "amount": 375 }] },
      { "id": "b2b2c3d4-0013-4222-8222-000000000013", "description": "Hotel", "amount": 1500, "payerName": "Masum", "time": "22/10/2026, 11:44 AM", "createdAt": "2026-10-22T11:44:00.000Z", "sequence": 13, "shares": [{ "memberName": "Nafiz", "amount": 375 }, { "memberName": "Promi", "amount": 375 }, { "memberName": "Borsha", "amount": 375 }, { "memberName": "Masum", "amount": 375 }] },
      { "id": "b2b2c3d4-0014-4222-8222-000000000014", "description": "Food hotel 3 times", "amount": 5200, "payerName": "Promi", "time": "22/10/2026, 11:45 AM", "createdAt": "2026-10-22T11:45:00.000Z", "sequence": 14, "shares": [{ "memberName": "Nafiz", "amount": 1300 }, { "memberName": "Promi", "amount": 1300 }, { "memberName": "Borsha", "amount": 1300 }, { "memberName": "Masum", "amount": 1300 }] },
      { "id": "b2b2c3d4-0015-4222-8222-000000000015", "description": "Meghla In", "amount": 200, "payerName": "Borsha", "time": "22/10/2026, 02:23 PM", "createdAt": "2026-10-22T14:23:00.000Z", "sequence": 15, "shares": [{ "memberName": "Nafiz", "amount": 50 }, { "memberName": "Promi", "amount": 50 }, { "memberName": "Borsha", "amount": 50 }, { "memberName": "Masum", "amount": 50 }] },
      { "id": "b2b2c3d4-0016-4222-8222-000000000016", "description": "Cable Car", "amount": 200, "payerName": "Promi", "time": "22/10/2026, 02:24 PM", "createdAt": "2026-10-14T14:24:00.000Z", "sequence": 16, "shares": [{ "memberName": "Nafiz", "amount": 50 }, { "memberName": "Promi", "amount": 50 }, { "memberName": "Borsha", "amount": 50 }, { "memberName": "Masum", "amount": 50 }] },
      { "id": "b2b2c3d4-0017-4222-8222-000000000017", "description": "Daab", "amount": 300, "payerName": "Borsha", "time": "22/10/2026, 02:24 PM", "createdAt": "2026-10-22T14:24:00.000Z", "sequence": 17, "shares": [{ "memberName": "Nafiz", "amount": 75 }, { "memberName": "Promi", "amount": 75 }, { "memberName": "Borsha", "amount": 75 }, { "memberName": "Masum", "amount": 75 }] },
      { "id": "b2b2c3d4-0018-4222-8222-000000000018", "description": "Kola", "amount": 30, "payerName": "Nafiz", "time": "22/10/2026, 02:24 PM", "createdAt": "2026-10-22T14:24:00.000Z", "sequence": 18, "shares": [{ "memberName": "Nafiz", "amount": 7.5 }, { "memberName": "Promi", "amount": 7.5 }, { "memberName": "Borsha", "amount": 7.5 }, { "memberName": "Masum", "amount": 7.5 }] },
      { "id": "b2b2c3d4-0019-4222-8222-000000000019", "description": "Drinks & water", "amount": 55, "payerName": "Nafiz", "time": "22/10/2026, 03:21 PM", "createdAt": "2026-10-22T15:21:00.000Z", "sequence": 19, "shares": [{ "memberName": "Nafiz", "amount": 13.75 }, { "memberName": "Promi", "amount": 13.75 }, { "memberName": "Borsha", "amount": 13.75 }, { "memberName": "Masum", "amount": 13.75 }] },
      { "id": "b2b2c3d4-0020-4222-8222-000000000020", "description": "Zip line", "amount": 200, "payerName": "Promi", "time": "22/10/2026, 03:22 PM", "createdAt": "2026-10-22T15:22:00.000Z", "sequence": 20, "shares": [{ "memberName": "Nafiz", "amount": 0 }, { "memberName": "Promi", "amount": 100 }, { "memberName": "Borsha", "amount": 100 }, { "memberName": "Masum", "amount": 0 }] },
      { "id": "b2b2c3d4-0021-4222-8222-000000000021", "description": "CNG scam", "amount": 700, "payerName": "Nafiz", "time": "22/10/2026, 04:38 PM", "createdAt": "2026-10-22T16:38:00.000Z", "sequence": 21, "shares": [{ "memberName": "Nafiz", "amount": 175 }, { "memberName": "Promi", "amount": 175 }, { "memberName": "Borsha", "amount": 175 }, { "memberName": "Masum", "amount": 175 }] },
      { "id": "b2b2c3d4-0022-4222-8222-000000000022", "description": "Nilachol Entry", "amount": 200, "payerName": "Promi", "time": "22/10/2026, 04:38 PM", "createdAt": "2026-10-22T16:38:00.000Z", "sequence": 22, "shares": [{ "memberName": "Nafiz", "amount": 50 }, { "memberName": "Promi", "amount": 50 }, { "memberName": "Borsha", "amount": 50 }, { "memberName": "Masum", "amount": 50 }] },
      { "id": "b2b2c3d4-0023-4222-8222-000000000023", "description": "Nilachol to Bus counter CNG", "amount": 400, "payerName": "Borsha", "time": "22/10/2026, 06:12 PM", "createdAt": "2026-10-22T18:12:00.000Z", "sequence": 23, "shares": [{ "memberName": "Nafiz", "amount": 100 }, { "memberName": "Promi", "amount": 100 }, { "memberName": "Borsha", "amount": 100 }, { "memberName": "Masum", "amount": 100 }] },
      { "id": "b2b2c3d4-0024-4222-8222-000000000024", "description": "Dinner", "amount": 250, "payerName": "Borsha", "time": "22/10/2026, 06:42 PM", "createdAt": "2026-10-22T18:42:00.000Z", "sequence": 24, "shares": [{ "memberName": "Nafiz", "amount": 83.34 }, { "memberName": "Promi", "amount": 0 }, { "memberName": "Borsha", "amount": 83.33 }, { "memberName": "Masum", "amount": 83.33 }] },
      { "id": "b2b2c3d4-0025-4222-8222-000000000025", "description": "Dinner", "amount": 200, "payerName": "Masum", "time": "22/10/2026, 06:43 PM", "createdAt": "2026-10-22T18:43:00.000Z", "sequence": 25, "shares": [{ "memberName": "Nafiz", "amount": 66.67 }, { "memberName": "Promi", "amount": 0 }, { "memberName": "Borsha", "amount": 66.67 }, { "memberName": "Masum", "amount": 66.66 }] },
      { "id": "b2b2c3d4-0026-4222-8222-000000000026", "description": "Auto barmiz", "amount": 40, "payerName": "Borsha", "time": "22/10/2026, 07:08 PM", "createdAt": "2026-10-22T19:08:00.000Z", "sequence": 26, "shares": [{ "memberName": "Nafiz", "amount": 10 }, { "memberName": "Promi", "amount": 10 }, { "memberName": "Borsha", "amount": 10 }, { "memberName": "Masum", "amount": 10 }] },
      { "id": "b2b2c3d4-0027-4222-8222-000000000027", "description": "Egg", "amount": 60, "payerName": "Borsha", "time": "22/10/2026, 07:25 PM", "createdAt": "2026-10-22T19:25:00.000Z", "sequence": 27, "shares": [{ "memberName": "Nafiz", "amount": 0 }, { "memberName": "Promi", "amount": 40 }, { "memberName": "Borsha", "amount": 20 }, { "memberName": "Masum", "amount": 0 }] },
      { "id": "b2b2c3d4-0028-4222-8222-000000000028", "description": "Rishkwa 1", "amount": 20, "payerName": "Borsha", "time": "22/10/2026, 07:26 PM", "createdAt": "2026-10-22T19:26:00.000Z", "sequence": 28, "shares": [{ "memberName": "Nafiz", "amount": 0 }, { "memberName": "Promi", "amount": 10 }, { "memberName": "Borsha", "amount": 10 }, { "memberName": "Masum", "amount": 0 }] },
      { "id": "b2b2c3d4-0029-4222-8222-000000000029", "description": "Rishkwa 2", "amount": 20, "payerName": "Masum", "time": "22/10/2026, 07:27 PM", "createdAt": "2026-10-22T19:27:00.000Z", "sequence": 29, "shares": [{ "memberName": "Nafiz", "amount": 10 }, { "memberName": "Promi", "amount": 0 }, { "memberName": "Borsha", "amount": 0 }, { "memberName": "Masum", "amount": 10 }] },
      { "id": "b2b2c3d4-0030-4222-8222-000000000030", "description": "Auto back", "amount": 80, "payerName": "Borsha", "time": "22/10/2026, 08:05 PM", "createdAt": "2026-10-22T20:05:00.000Z", "sequence": 30, "shares": [{ "memberName": "Nafiz", "amount": 20 }, { "memberName": "Promi", "amount": 20 }, { "memberName": "Borsha", "amount": 20 }, { "memberName": "Masum", "amount": 20 }] },
      { "id": "b2b2c3d4-0031-4222-8222-000000000031", "description": "H20", "amount": 40, "payerName": "Promi", "time": "22/10/2026, 08:20 PM", "createdAt": "2026-10-22T20:20:00.000Z", "sequence": 31, "shares": [{ "memberName": "Nafiz", "amount": 10 }, { "memberName": "Promi", "amount": 10 }, { "memberName": "Borsha", "amount": 10 }, { "memberName": "Masum", "amount": 10 }] }
    ],
    "extraCharges": [],
    "isDisabled": true,
    "isFinished": false,
    "deposits": [],
    "nextSequence": 32
  }
];

function recalculateGroup(group) {
  const members = group.members;
  const debts = [];
  const creditCents = new Map();
  members.forEach(m => creditCents.set(m.name, 0));

  // Rebuild debts
  const timeline = group.expenses.sort((a, b) => a.sequence - b.sequence);

  for (const expense of timeline) {
    const payerName = expense.payerName;
    for (const share of expense.shares) {
      const shareCents = toCents(share.amount);
      if (share.memberName === payerName) continue; // Fix A

      debts.push({
        id: `${expense.id}:debt:${share.memberName}`,
        expenseId: expense.id,
        fromMember: share.memberName,
        toMember: payerName,
        originalAmount: fromCents(shareCents),
        settledAmount: 0,
        createdAt: expense.createdAt,
        sequence: expense.sequence
      });
    }
  }

  // Calculate credit balances
  const finalDebts = debts.map(d => {
    const remaining = toCents(d.originalAmount) - toCents(d.settledAmount);
    if (remaining > 0) {
      creditCents.set(d.toMember, (creditCents.get(d.toMember) || 0) + remaining);
    }
    return d;
  });

  // Assign to members
  const updatedMembers = members.map(m => ({
    ...m,
    accountBalance: m.accountBalance || 0,
    accountCreditBalance: fromCents(creditCents.get(m.name) || 0),
    accountTransactions: m.accountTransactions || []
  }));

  return {
    ...group,
    members: updatedMembers,
    outstandingDebts: finalDebts,
    settlements: []
  };
}

async function run() {
  await client.connect();
  const db = client.db("Tour-Expenditure-Management-Test");
  const collection = db.collection("TeamDB");

  for (const rawGroup of groupsToUpdate) {
    const group = recalculateGroup(rawGroup);
    const { _id, ...dataToUpdate } = group;

    const res = await collection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: dataToUpdate }
    );
    console.log(`Updated ${group.name}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  }

  await client.close();
}

run().catch(console.error);