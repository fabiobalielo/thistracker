import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import next from "next";

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

const nextjsServer = next({
  dev: false,
  conf: {
    distDir: "../.next",
  },
});

const nextjsHandle = nextjsServer.getRequestHandler();

export const nextjsFunc = onRequest(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 60,
  },
  (req, res) => {
    return nextjsServer.prepare().then(() => nextjsHandle(req, res));
  }
);
