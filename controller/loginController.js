import fetch from "node-fetch";
import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

const appKey = "DsGV2EVu8pDQHvVs"; // delayed app key
// const sessionToken = "xqLwhmesNsAGen39umXt6Syobyo0+/WoyG1e5NmGpZY="; // token from browser

async function getSessionTokenFromFile() {
    try {
        const filePath = path.join(process.cwd(), "BetfairAuth.json");
        const fileContents = await fs.readFile(filePath, "utf-8");
        const { sessionToken } = JSON.parse(fileContents);
        if (!sessionToken) throw new Error("No session token found in auth.json");
        return sessionToken;
    } catch (err) {
        console.error("Failed to read session token from file:", err.message);
        throw err;
    }
}

export const getSessionToken = async (req, res) => {
    try {
        const username = "u3613129050@gmail.com"; // replace
        const password = "bet365@123"; // replace

        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
         page.setDefaultTimeout(60000); // increase timeout globally (slow VPN)
        page.setDefaultNavigationTimeout(60000);

        await page.goto("https://www.betfair.com/exchange/plus/", {
            waitUntil: "domcontentloaded", // faster + less likely to hang
        });
        // await page.goto("https://www.betfair.com/exchange/plus/", { waitUntil: "networkidle2" });

        // Function to continuously dismiss banner if it appears
        const dismissBanner = async () => {
            const banner = await page.$("#onetrust-banner-sdk, #onetrust-button-group-parent");
            if (banner) {
                console.log("Cookie banner detected — dismissing...");
                const btn = await page.$("#onetrust-reject-all-handler");
                if (btn) {
                    await page.evaluate((b) => b.click(), btn);
                    //   await page.waitForTimeout(500); // wait for banner to disappear
                    await new Promise(resolve => setTimeout(resolve, 100));
                    console.log("Banner dismissed.");
                }
            }
        };

        // Wait for username input & repeatedly check for banner
        await page.waitForSelector("#ssc-liu", { timeout: 20000 });
        await dismissBanner();

        // Type username char-by-char, checking banner in between
        for (const char of username) {
            await page.type("#ssc-liu", char, { delay: 100 });
            await dismissBanner();
        }

        // Type password char-by-char, checking banner in between
        for (const char of password) {
            await page.type("#ssc-lipw", char, { delay: 100 });
            await dismissBanner();
        }

        // Ensure login button is visible and clickable
        const loginButton = await page.$("#ssc-lis");
        if (!loginButton) throw new Error("Login button not found");
        await page.evaluate((btn) => btn.scrollIntoView({ block: "center" }), loginButton);

        // Retry clicking login button if necessary
        let clicked = false;
        for (let i = 0; i < 3; i++) {
            try {
                await page.evaluate((btn) => btn.click(), loginButton);
                clicked = true;
                break;
            } catch {
                console.log("Retrying login click...");
                // await page.waitForTimeout(500);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        if (!clicked) throw new Error("Failed to click login button");
        // await new Promise(resolve => setTimeout(resolve, 1000));
        // // Wait for navigation
        // await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 50000 });
        // await new Promise(resolve => setTimeout(resolve, 500));
        //  await dismissBanner();
 try {
            await Promise.race([
                page.waitForSelector("#ssc-myacc", { timeout: 25000 }).catch(() => null),
                page.waitForSelector(".ssc-logout", { timeout: 25000 }).catch(() => null),
            ]);
            console.log("✅ Login successful (post-login element found).");
        } catch {
            console.warn("⚠️ Could not detect post-login element, continuing anyway...");
        }

        await dismissBanner(); // cleanup again if needed

        // Extract ssoid cookie
        const cookies = await page.cookies();
         await dismissBanner();
        const ssoidCookie = cookies.find((c) => c.name === "ssoid");
         await dismissBanner();
        const sessionToken = ssoidCookie?.value;

        await browser.close();

        if (!sessionToken) throw new Error("Failed to retrieve ssoid from cookies");

        await fs.writeFile("BetfairAuth.json", JSON.stringify({ sessionToken }, null, 2), "utf-8");
        console.log("Session token saved to auth.json");

        res.send({
            message: "Session token retrieved successfully",
            sessionToken,
        });
    } catch (err) {
        console.error("Puppeteer login error:", err.message);
        res.status(500).send("Failed to get session token");
    }
};


export const delayedApiTest = async (req, res) => {
    try {
        // const appKey = "DsGV2EVu8pDQHvVs"; // delayed app key
        // const sessionToken = "xqLwhmesNsAGen39umXt6Syobyo0+/WoyG1e5NmGpZY="; // token from browser
        const sessionToken = await getSessionTokenFromFile();
        const url =
            "https://api.betfair.com/exchange/betting/rest/v1.0/listMarketCatalogue/";

        const body = {
            filter: { eventTypeIds: ["1"] }, // Soccer
            maxResults: 5,
            marketProjection: ["RUNNER_DESCRIPTION", "MARKET_START_TIME"]
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "X-Application": appKey,
                "X-Authentication": sessionToken,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(body)
        });

        const text = await response.text();

        if (!response.ok) {
            console.error("Betfair returned error body:", text);
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const markets = JSON.parse(text);

        res.send({
            message: "Delayed API test successful!",
            marketsCount: markets.length,
            markets
        });
    } catch (err) {
        console.error("Delayed API test error:", err.message);
        res.status(500).send("Delayed API test failed");
    }
};


export const listAllEvents = async (req, res) => {
    try {
        // const appKey = "DsGV2EVu8pDQHvVs"; // your delayed app key
        // const sessionToken = "xqLwhmesNsAGen39umXt6Syobyo0+/WoyG1e5NmGpZY="; // browser token
        const sessionToken = await getSessionTokenFromFile();
        const url = "https://api.betfair.com/exchange/betting/rest/v1.0/listEvents/";

        // Optional: filter can be empty to list all events
        const body = {
            filter: { eventTypeIds: ["4"] },
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "X-Application": appKey,
                "X-Authentication": sessionToken,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(body)
        });

        const text = await response.text();

        if (!response.ok) {
            console.error("Betfair returned error body:", text);
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const events = JSON.parse(text);

        res.send({
            message: "All events fetched successfully",
            eventsCount: events.length,
            events
        });
    } catch (err) {
        console.error("Error fetching events:", err.message);
        res.status(500).send("Failed to fetch events");
    }
};



export const fullFlowMockOrder = async (req, res) => {
    try {
        // 1️⃣ List all events
        // const appKey = "DsGV2EVu8pDQHvVs"; // your delayed app key
        // const sessionToken = "xqLwhmesNsAGen39umXt6Syobyo0+/WoyG1e5NmGpZY="; // browser token
        // Optional: filter can be empty to list all events
        const sessionToken = await getSessionTokenFromFile();
        const body = {
            filter: { eventTypeIds: ["1"] },
        };

        const eventsUrl = "https://api.betfair.com/exchange/betting/rest/v1.0/listEvents/";
        const eventsResponse = await fetch(eventsUrl, {
            method: "POST",
            headers: {
                "X-Application": appKey,
                "X-Authentication": sessionToken,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(body) // no filter to get all events
        });

        const eventsText = await eventsResponse.text();
        if (!eventsResponse.ok) throw new Error(eventsText);
        const eventsData = JSON.parse(eventsText);
        console.log(eventsData)
        // 2️⃣ Find the specific event
        const targetEvent = eventsData.find(e => e.event.name === "Liverpool v Atletico Madrid");
        if (!targetEvent) throw new Error("Event not found");
        const eventId = targetEvent.event.id;
        console.log(eventId)

        // 3️⃣ List markets for this event
        const marketUrl = "https://api.betfair.com/exchange/betting/rest/v1.0/listMarketCatalogue/";
        const marketBody = {
            filter: { eventIds: [eventId] },
            maxResults: 10,
            marketProjection: ["RUNNER_DESCRIPTION", "MARKET_START_TIME"]
        };

        const marketResponse = await fetch(marketUrl, {
            method: "POST",
            headers: {
                "X-Application": appKey,
                "X-Authentication": sessionToken,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(marketBody)
        });

        const marketText = await marketResponse.text();
        if (!marketResponse.ok) throw new Error(marketText);
        const markets = JSON.parse(marketText);

        if (markets.length === 0) throw new Error("No markets found for event");

        const matchOddsMarket = markets.find(m => m.marketName === "Match Odds");
        if (!matchOddsMarket) throw new Error("MATCH_ODDS market not found");
        const marketId = matchOddsMarket.marketId;
        const selectionId = matchOddsMarket.runners[0].selectionId; // first runner in Match Odds
        console.log(marketId, "marketId")


        // 5️⃣ Place a mock order
        const placeOrderUrl = "https://api.betfair.com/exchange/betting/rest/v1.0/placeOrders/";
        // const orderBody = {
        //   marketId: marketId,
        //   instructions: [
        //     {
        //       selectionId: selectionId,
        //       side: "BACK",
        //       orderType: "LIMIT",
        //       limitOrder: {
        //         size: 1.0,
        //         price: 500,
        //         persistenceType: "LAPSE"
        //       }
        //     }
        //   ],
        //   customerRef: "mock-order-001"
        // };

        const orderBody = {
            marketId: marketId, // the MATCH_ODDS market ID
            instructions: [
                {
                    selectionId: selectionId, // runner ID (home/draw/away)
                    side: "LAY",             // BACK or LAY
                    orderType: "MARKET_ON_CLOSE",
                    marketOnCloseOrder: {
                        liability: 10.0         // total stake for LAY, ignored for BACK
                    }
                }
            ],
            customerRef: "mock-market-on-close"
        };

        const orderResponse = await fetch(placeOrderUrl, {
            method: "POST",
            headers: {
                "X-Application": appKey,
                "X-Authentication": sessionToken,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(orderBody)
        });

        const orderText = await orderResponse.text();
        if (!orderResponse.ok) throw new Error(orderText);
        const orderResult = JSON.parse(orderText);

        // ✅ Return full flow result
        res.send({
            message: "Full flow completed successfully (mock order)",
            event: targetEvent,
            //   market: markets[0],
            //   runner: markets[0].runners[0],
            orderResult
        });
    } catch (err) {
        console.error("Full flow error:", err.message);
        res.status(500).send({ error: err.message });
    }
};





export const fullFlowOrder = async (req, res) => {
    try {
        // 1️⃣ List all events
        // const appKey = "DsGV2EVu8pDQHvVs"; // your delayed app key
        // const sessionToken = "xqLwhmesNsAGen39umXt6Syobyo0+/WoyG1e5NmGpZY="; // browser token
        // Optional: filter can be empty to list all events
        const sessionToken = await getSessionTokenFromFile();
        const body = {
            filter: { eventTypeIds: ["4"] },
        };

        const eventsUrl = "https://api.betfair.com/exchange/betting/rest/v1.0/listEvents/";
        const eventsResponse = await fetch(eventsUrl, {
            method: "POST",
            headers: {
                "X-Application": appKey,
                "X-Authentication": sessionToken,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(body) // no filter to get all events
        });

        const eventsText = await eventsResponse.text();
        if (!eventsResponse.ok) throw new Error(eventsText);
        const eventsData = JSON.parse(eventsText);
        console.log(eventsData,"eventsData")
        // 2️⃣ Find the specific event
        const targetEvent = eventsData.find(e => e.event.name === "Barbados Royals W v Guyana Amazon Warriors W");
        if (!targetEvent) throw new Error("Event not found");
        const eventId = targetEvent.event.id;
        console.log(eventId,"eventID")

        // 3️⃣ List markets for this event
        const marketUrl = "https://api.betfair.com/exchange/betting/rest/v1.0/listMarketCatalogue/";
        const marketBody = {
            filter: { eventIds: [eventId] },
            maxResults: 10,
            marketProjection: ["RUNNER_DESCRIPTION", "MARKET_START_TIME"]
        };

        const marketResponse = await fetch(marketUrl, {
            method: "POST",
            headers: {
                "X-Application": appKey,
                "X-Authentication": sessionToken,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(marketBody)
        });

        const marketText = await marketResponse.text();
        if (!marketResponse.ok) throw new Error(marketText);
        const markets = JSON.parse(marketText);

        if (markets.length === 0) throw new Error("No markets found for event");

        const matchOddsMarket = markets.find(m => m.marketName === "Match Odds");
        if (!matchOddsMarket) throw new Error("MATCH_ODDS market not found");
        const marketId = matchOddsMarket.marketId;
        const selectionId = matchOddsMarket.runners[0].selectionId; // first runner in Match Odds
        console.log(marketId, selectionId,  matchOddsMarket.runners[1],"marketId")


        // 5️⃣ Place a mock order
        const placeOrderUrl = "https://api.betfair.com/exchange/betting/rest/v1.0/placeOrders/";
        // const orderBody = {
        //   marketId: marketId,
        //   instructions: [
        //     {
        //       selectionId: selectionId,
        //       side: "BACK",
        //       orderType: "LIMIT",
        //       limitOrder: {
        //         size: 1.0,
        //         price: 500,
        //         persistenceType: "LAPSE"
        //       }
        //     }
        //   ],
        //   customerRef: "mock-order-001"
        // };

        const orderBody = {
            marketId: marketId, // the MATCH_ODDS market ID
            instructions: [
                {
                    selectionId: selectionId, // runner ID (home/draw/away)
                    side: "BACK",             // BACK or LAY
                    orderType: "MARKET_ON_CLOSE",
                    marketOnCloseOrder: {
                        liability: 10.0         // total stake for LAY, ignored for BACK
                    }
                }
            ],
            customerRef: "mock-market-on-close"
        };

        const orderResponse = await fetch(placeOrderUrl, {
            method: "POST",
            headers: {
                "X-Application": appKey,
                "X-Authentication": sessionToken,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(orderBody)
        });

        const orderText = await orderResponse.text();
        if (!orderResponse.ok) throw new Error(orderText);
        const orderResult = JSON.parse(orderText);

        // ✅ Return full flow result
        res.send({
            message: "Full flow completed successfully (mock order)",
            event: targetEvent,
            //   market: markets[0],
            //   runner: markets[0].runners[0],
            orderResult
        });
    } catch (err) {
        console.error("Full flow error:", err.message);
        res.status(500).send({ error: err.message });
    }
};
