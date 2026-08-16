import { execFile } from "node:child_process";
import * as cheerio from "cheerio";

function fetchWithCurl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    execFile("curl", ["-s", "-A", userAgent, "-L", url], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

async function testProblem(url: string) {
  const html = await fetchWithCurl(url);
  const $ = cheerio.load(html);
  const title = $(".problem-statement .title").text();
  const bodyLen = $(".problem-statement").children("div").eq(1).text().length;
  console.log(`URL: ${url} -> Title: "${title}", Body length: ${bodyLen}`);
}

async function run() {
  await testProblem("https://codeforces.com/contest/1/problem/A");
  await testProblem("https://codeforces.com/contest/1582/problem/C");
  await testProblem("https://codeforces.com/contest/500/problem/A");
  await testProblem("https://codeforces.com/contest/1900/problem/A");
  await testProblem("https://codeforces.com/problemset/problem/1800/E2");
}

run();
