require('dotenv').config()
const path = require("path");
const express = require("express");
const { auth, resolver, protocol } = require("@iden3/js-iden3-auth");
const getRawBody = require("raw-body");
const cors = require("cors");
const http = require('http');
const https = require('https');

//const https = require('https');

const app = express();
const port = 8080;

app.use(express.static("../static"));
app.use(cors());

app.get("/api/ping", (req, res) => {
  var options = {
    hostname: process.env.BB_BACKEND_URL,
    //port: 56649,
    path: `/home/testch`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  var postRequest = https.request(options, (result) => {
    console.log('statusCode:', result.statusCode);
    console.log('headers:', result.headers);

    result.on('data', (d) => {
      console.log(d)
    });
  });

  postRequest.on('error', (e) => {
    console.error(e);
  });
  //postRequest.write(postData);
  postRequest.end();
  const data = {
    status: 'OK'
  }
  return res.status(200).set("Content-Type", "application/json").send(data);
});

app.get("/api/test", (req, res) => {
  console.log("get Auth Request");
  makeAPICall(req, res)
});

app.get("/api/sign-in", (req, res) => {
  console.log("get Auth Request");
  getAuthRequest(req, res);
});

app.post("/api/callback", (req, res) => {
  console.log("callback");
  callback(req, res);
});

app.listen(port, () => {
  console.log("server running on port 8080");
});

// Create a map to store the auth requests and their session IDs
const requestMap = new Map();
const requestMapUserIDs = new Map();

async function makeAPICall(req, res) {
  var postData = JSON.stringify({
    'userGuid': 'A7EC10CB-DEA8-446F-9F48-ED537521A768',
    'token': 'eyJhbGciOiJncm90aDE2IiwiY2lyY3VpdElkIjoiYXV0aFYyIiwiY3JpdCI6WyJjaXJjdWl0SWQiXSwidHlwIjoiYXBwbGljYXRpb24vaWRlbjMtemtwLWpzb24ifQ.eyJpZCI6ImVkYjY3ZmUyLTI2ZDctNDVkZC1hZjM0LTgyYzQzNjBhNzBiYSIsInR5cCI6ImFwcGxpY2F0aW9uL2lkZW4zLXprcC1qc29uIiwidHlwZSI6Imh0dHBzOi8vaWRlbjMtY29tbXVuaWNhdGlvbi5pby9hdXRob3JpemF0aW9uLzEuMC9yZXNwb25zZSIsInRoaWQiOiI1YzE5MTJiZS04NGQ4LTQ1NGEtOWY4MC0wZjRiNmU5OWU2M2QiLCJib2R5Ijp7InNjb3BlIjpbeyJpZCI6MTcxMTM5OTEzNSwiY2lyY3VpdElkIjoiY3JlZGVudGlhbEF0b21pY1F1ZXJ5U2lnVjIiLCJwcm9vZiI6eyJwaV9hIjpbIjQ4NDc5NjE1MzM4NzU4MDQzOTQ5Njk2OTA4MDMyMDAxMjAyNTU2ODcyNjI3NTcxODMzNjIzODUyNzM2MDU1NTUwNjkxMzI4MjQ0MjEiLCIxNzM4NTQxNzg4NTM4MTQwNzEwNzE3NTcyOTYzNzkwMDU1MDc2ODU4NDczMTI4MDQ4NzQ5NjE1Mjc1ODU2MTc1NjM2MDkyMjQyMzMzMSIsIjEiXSwicGlfYiI6W1siNTAzMDk2Mzc0OTUwNDk2ODQzODEyMTczNDA5MjYzMjE0NjgxNzY4MjQ2MjE1NzY1OTQ3NDQxNDI0NTI3MzU1NDMyNTU5MTczMDExMSIsIjI4NDc1NzA2Mzk0MDQzNDc3NjE4OTQzOTYzMTEzOTQxNTYwNDc0NTAzNTgzNzk5MzI1NjkwODg3MzA3MzIzMzM0NTI3NjI2MjYzMTAiXSxbIjU0MzIzNjM3MzM0Njg3NzUzMzkxMzA3NzgxMTY4MjA0Mjg0NjY5MTk0MjA0OTk2MTg0NjEyNTA3NzA3ODQ3ODgxMTM3MTAzNjM3MjUiLCI4NjI2OTE2MjcwMTY2NTc0MDkyNDExNDE2MjA3MTE3MjA3NDA4NjE3ODQwOTMyOTUwOTUwOTMzNzI2MDExODQyODIzNTY3NTc1ODc0Il0sWyIxIiwiMCJdXSwicGlfYyI6WyIyMTU3OTc1ODU4MjM1NzI1NDA0Njc3NjA2NDkxMzI1NTM4NzMxODQyODY2NDM4NDM0MjYyODA0Mzg3NzE1NzExMjAyMTg0ODczMjY0OCIsIjkxODAzMDI2NjUwNzQzMzM0MzY4Mzc2Njk1MjUwODgyMjgwNDA1ODIyNzA3MjkzNDYwNDkwNzMxMDk0NDk0MDI5ODkzNTA0MTcwMTYiLCIxIl0sInByb3RvY29sIjoiZ3JvdGgxNiIsImN1cnZlIjoiYm4xMjgifSwicHViX3NpZ25hbHMiOlsiMSIsIjIyOTgzODczMzE3MDA3NTIwNzIwNDgzMTYxNDIzNzM1MTk3NTI5OTg5NzEwNzU5NTMzNjE5MjU2NTcxODIxNjk1NjQ5OTQ3OTA1IiwiMjAwNDYyNjQwNzgxNDA4MzI1MDA3NjA0Mjg0NjgxNzE0NDYxMDkxNTM0ODg4MjYyOTg5NjE0Mzc3MTc3NzI0MzI0MDc1ODkzMjU2ODQiLCIxNzExMzk5MTM1IiwiMjI1NDIyOTg0MTkwNjc0MzI1ODc0OTc0NDg3NzAyMTU2ODI4OTM2ODY4MjY0MzIxNTcwNjIzNTg1MTY4MjM0NzkwNzI4OTExMzciLCIxIiwiMjAwNDYyNjQwNzgxNDA4MzI1MDA3NjA0Mjg0NjgxNzE0NDYxMDkxNTM0ODg4MjYyOTg5NjE0Mzc3MTc3NzI0MzI0MDc1ODkzMjU2ODQiLCIxNzIxNDE0OTQ0IiwiMjEwNTI3NTYwNzMxNjkxMzMzMTQ2NDA4OTg4MDU4Mzg0NTc0ODUwIiwiMCIsIjEzNzUxMTA2ODQzNzM5OTcxNDgyNjU3NTcxNjA3NDk3OTA2Nzk1MDY2NTYyNzYzMjQzNzk1MzEzNDExNTU2MTk0MTg4MDgyOTkzNTcwIiwiMCIsIjEiLCIxODU4NjEzMzc2ODUxMjIyMDkzNjYyMDU3MDc0NTkxMjk0MDYxOTY3Nzg1NDI2OTI3NDY4OTQ3NTU4NTUwNjY3NTg4MTE5ODg3OTAyNyIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCJdfV19LCJmcm9tIjoiZGlkOmlkZW4zOnByaXZhZG86bWFpbjoyU2tIWEE0WHNVVVkyTm5Uem5acXltc0ZoQUh4R1o2bUVLYVVaeXNLcU4iLCJ0byI6ImRpZDpwb2x5Z29uaWQ6cG9seWdvbjphbW95OjJxVjlRWGRoWFhtTjVzS2pOMVl1ZU1qeGdSYm5KY0VHSzJrR3B2azNjcSJ9.eyJwcm9vZiI6eyJwaV9hIjpbIjkxNjU3Njk5MjAyNTk3MzYyNzgxMzMxMjIyNDQwMzY3ODgyMzg0NjgyMzQzNDE2Mjc5MTY2MTAwNzQ4MzQ5NDcyNDU3MTE1NDM5NDgiLCI2NzAzMDc1MjAyNDUzODMyODYzMTI3NjA2MDkwMzM1Mzk1MTAwMDA1MDUxOTA3NjgwMDQyOTE5NTY4NDA5MDM0MjQ3OTQxODQ5ODE4IiwiMSJdLCJwaV9iIjpbWyI4MzQ2MTc3NTA4NDQ3NTYxMDY0MzUwMjI4MDkzNTY4MzAxNDU3OTIxNDcyMDY1MDUzNDYzMzkyOTQzOTc1Njg1MDE4ODMyNTAzMjUwIiwiMTUxNzQ2NzUzMDMwMjMyODYzOTA3NDg4ODI1MTI5NTU2MDI4ODMwNTQxOTk3MTI2NTEyNjI0Nzk2MzI4NTA3MjU2OTM1Njg2NjU3NSJdLFsiMTE3NzQ0ODg5NTI2NTEzNzQ4NjQyNzEyMjQ3NjY0NzczODA5MjE0OTM0NDk4MjgwMjA4ODkwNTgwMzc1NzgyNjMzMTI5NjMzMzE0MDUiLCIxOTgyMzkzNjY2MjQ5MTI0OTQ5NjA0NTUwNjk5Mzk4MjQ3NTY4MTUwMTY0NjE1NTU3MTg2NTA2Mzk2NzkzNDk4MTc2NDE4MjcyNzI4Il0sWyIxIiwiMCJdXSwicGlfYyI6WyIxODAyMjg1MjU3NzUxOTg5MTYzMjUxNjE2NjQxMDQyMTk1OTQzODMwODg4OTA2NTAxNDQ0NzY4Mzg1MjU0MTQzMDQyOTE1NjA4NDg4IiwiMjI3NDA1NzQ5Nzk0NzM5Mjg2NzkwNjc5NTExODY2ODMwOTI4Njc4Njc5MDYzMzk5MDMzODQyODg2NTY1MjI4OTMwMTg3ODE3Mjg1NiIsIjEiXSwicHJvdG9jb2wiOiJncm90aDE2IiwiY3VydmUiOiJibjEyOCJ9LCJwdWJfc2lnbmFscyI6WyIyMjk4Mzg3MzMxNzAwNzUyMDcyMDQ4MzE2MTQyMzczNTE5NzUyOTk4OTcxMDc1OTUzMzYxOTI1NjU3MTgyMTY5NTY0OTk0NzkwNSIsIjEzOTMzMjI2OTE0NDAyMzA2OTM1MDU2NTU1NzIxMTU4MTQzNjE3MzIzODA0MDkyMzczMzIwOTAzMzI4MzY4OTQxMTc1NzIzMTEwNTI1IiwiMCJdfQ'
  });
  var options = {
    hostname: 'localhost',
    port: 56649,
    path: `/publiccontest/updatePolygonIDToken?userGuid=A7EC10CB-DEA8-446F-9F48-ED537521A768`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  };
  var postRequest = http.request(options, (result) => {
    console.log('statusCode:', result.statusCode);
    console.log('headers:', result.headers);

    result.on('data', (d) => {
      console.log(d)
    });
  });

  postRequest.on('error', (e) => {
    console.error(e);
  });

  postRequest.write(postData);
  postRequest.end();
  return res.status(200).set("Content-Type", "application/json").send();
}

// GetQR returns auth request
async function getAuthRequest(req, res) {
  // Audience is verifier id
  const hostUrl = " https://fc24-185-187-243-42.ngrok-free.app";
  const sessionId = 1;
  const userID = req.query.userID
  const callbackURL = "/api/callback";
  const audience =
    "did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR";

  const uri = `${hostUrl}${callbackURL}?sessionId=${sessionId}&userID=${userID}`;
  console.log(`uri: ${uri}`)
  // Generate request for basic authentication
  const request = auth.createAuthorizationRequest("test flow", audience, uri);

  request.id = "7f38a193-0918-4a48-9fac-36adfdb8b542";
  request.thid = "7f38a193-0918-4a48-9fac-36adfdb8b542";

  // Add request for a specific proof
  const proofRequest = {
    id: 1,
    circuitId: "credentialAtomicQuerySigV2",
    query: {
      allowedIssuers: ["*"],
      type: "KYCAgeCredential",
      context:
        "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
      credentialSubject: {
        birthday: {
          $lt: 20000101,
        },
      },
    },
  };
  const scope = request.body.scope ?? [];
  request.body.scope = [...scope, proofRequest];

  // Store auth request in map associated with session ID
  requestMap.set(`${sessionId}`, request);
  //requestMap.set(`${userID}`, userID);

  return res.status(200).set("Content-Type", "application/json").send(request);
}

// Callback verifies the proof after sign-in callbacks
async function callback(req, res) {
  // Get session ID from request
  const sessionId = req.query.sessionId;
  const userID = req.query.publicContestUserID
  //const contestID= req.query.contestID
  const wallet = req.query.wallet
  console.log(wallet);
  // get JWZ token params from the post request
  const raw = await getRawBody(req);
  const tokenStr = raw.toString().trim();
  console.log(tokenStr);

  const ethURL = "https://polygon-amoy.infura.io/v3/11fbd6b0082849c29d9de9c78099e59e";
  const contractAddress = "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124";
  const keyDIR = "../keys";

  const ethStateResolver = new resolver.EthStateResolver(
    ethURL,
    contractAddress
  );

  const privadoResolver = new resolver.EthStateResolver(
    'https://rpc-mainnet.privado.id',
    '0x975556428F077dB5877Ea2474D783D6C69233742'
  );

  const resolvers = {
    ["polygon:amoy"]: ethStateResolver,
    ["privado:main"]: privadoResolver,
  };

  // EXECUTE VERIFICATION
  const verifier = await auth.Verifier.newVerifier({
    stateResolver: resolvers,
    circuitsDir: path.join(__dirname, keyDIR),
    ipfsGatewayURL: "https://ipfs.io",
  });

  try {
    const opts = {
      AcceptedStateTransitionDelay: 5 * 60 * 1000, // 5 minute
    };
    var authResponse = await verifier.verifyJWZ(tokenStr, opts);

    var postData = JSON.stringify({
      'userGuid': userID,
      'token': tokenStr
    });
    var options = {
      hostname: 'localhost',
      port: 56649,
      path: `/publiccontest/updatePolygonIDToken`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };
    var postRequest = https.request(options, (result) => {
      console.log('statusCode:', result.statusCode);
      console.log('headers:', result.headers);

      result.on('data', (d) => {
        console.log(d)
      });
    });

    postRequest.on('error', (e) => {
      console.error(e);
    });

    postRequest.write(postData);
    postRequest.end();
  } catch (error) {
    console.log(error)
    return res.status(500).send(error);
  }
  console.log('OK')
  return res
    .status(200)
    .set("Content-Type", "application/json")
    .send(authResponse);
}
