import fetch from "node-fetch";
import * as cheerio from "cheerio";

async function run() {
    const url = "https://mirror.codeforces.com/contest/1582/problem/C";
    console.log("Fetching: " + url);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      const html = await response.text();
      const $ = cheerio.load(html);

      // Codeforces problem statement is usually inside <div class="problem-statement">
      let problemStatementHtml = $(".problem-statement").html();
      console.log("Found problem statement? " + !!problemStatementHtml);
      if (!problemStatementHtml) {
          console.log(html.substring(0, 500));
      }
}

run();
