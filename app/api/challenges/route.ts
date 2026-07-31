const instance = process.env.SN_INSTANCE!;
const user = process.env.SN_USER!;
const password = process.env.SN_PASSWORD!;

export async function GET() {

    const auth = Buffer.from(
        `${user}:${password}`
    ).toString("base64");

    const response = await fetch(
        `${instance}/api/now/table/x_trhrt_trh_plus_challenge?sysparm_limit=20`,
        {
            headers: {
                Authorization: `Basic ${auth}`,
                Accept: "application/json",
            },
        }
    );

    const data = await response.json();

    return Response.json(data);
}