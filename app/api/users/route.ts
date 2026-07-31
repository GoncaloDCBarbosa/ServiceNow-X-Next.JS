import https from "https";

export async function GET() {
  const instance = process.env.SN_INSTANCE!;
  const user = process.env.SN_USER!;
  const password = process.env.SN_PASSWORD!;

  const url = new URL(
    "/api/now/table/sys_user?sysparm_limit=1000",
    instance
  );

  return new Promise<Response>((resolve, reject) => {
    const auth = Buffer.from(`${user}:${password}`).toString("base64");

    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      },
      (res) => {
        let body = "";

        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve(
            new Response(body, {
              status: res.statusCode ?? 500,
              headers: {
                "Content-Type": "application/json",
              },
            })
          );
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}