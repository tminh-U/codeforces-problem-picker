import vm from "node:vm";

let cachedCfCookie = "";

async function fetchCodeforcesHtml(originalUrl: string): Promise<string> {
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  
  let contestUrl = originalUrl;
  const psMatch = originalUrl.match(/\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);
  if (psMatch) {
    contestUrl = `https://codeforces.com/contest/${psMatch[1]}/problem/${psMatch[2]}`;
  }

  const mirrors = ["m1.codeforces.com", "m3.codeforces.com"];

  for (const host of mirrors) {
    const fetchUrl = contestUrl.replace(/codeforces\.com|mirror\.codeforces\.com/, host);
    try {
      if (cachedCfCookie) {
        const res = await fetch(fetchUrl, {
          headers: { "User-Agent": userAgent, "Cookie": cachedCfCookie }
        });
        const html = await res.text();
        if (html.includes("problem-statement")) return html;
      }

      const res = await fetch(fetchUrl, { headers: { "User-Agent": userAgent } });
      const html = await res.text();
      if (html.includes("problem-statement")) return html;

      const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        const cookieJar: Record<string, string> = {};
        const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")];
        rawCookies.filter(Boolean).forEach(c => {
          const [pair] = (c as string).split(";");
          const eqIdx = pair.indexOf("=");
          if (eqIdx !== -1) cookieJar[pair.slice(0, eqIdx).trim()] = pair.slice(eqIdx + 1).trim();
        });

        const sandbox = {
          setTimeout: (fn: Function) => fn(),
          location: { reload: () => {}, href: fetchUrl },
          document: {
            get cookie() {
              return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join("; ");
            },
            set cookie(val: string) {
              const [pair] = val.split(";");
              const eqIdx = pair.indexOf("=");
              if (eqIdx !== -1) cookieJar[pair.slice(0, eqIdx).trim()] = pair.slice(eqIdx + 1).trim();
            }
          },
          window: {}
        };
        sandbox.window = sandbox;

        vm.runInNewContext(scriptMatch[1], sandbox);

        const cookieHeader = Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join("; ");
        const secondRes = await fetch(fetchUrl, {
          headers: { "User-Agent": userAgent, "Cookie": cookieHeader }
        });
        const secondHtml = await secondRes.text();
        if (secondHtml.includes("problem-statement")) {
          cachedCfCookie = cookieHeader;
          return secondHtml;
        }
      }
    } catch (e: any) {
      console.warn(`Lỗi mirror ${host}:`, e?.message || e);
    }
  }

  throw new Error("Không thể tải nội dung đề bài từ mirror Codeforces");
}

async function run() {
  const url = "https://codeforces.com/contest/1582/problem/C";
  console.log("Fetching: " + url);
  const html = await fetchCodeforcesHtml(url);
  console.log("Found problem statement? " + html.includes("problem-statement"));
  console.log("HTML length:", html.length);
}

run();
