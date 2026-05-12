import z from "zod"
import { Tool } from "./tool"

const MAX_SIZE = 50_000

export const BrowserTabTool = Tool.define("open_browser_tab", {
  description:
    "Opens a URL in an INTERNAL browser tab inside the openwork UI — visible to the user right inside the app, not in an external browser window. Use this whenever you want to show the user a web page. Prefer this over webfetch, playwright, or any other browser tool when the goal is to let the user view a page. Returns the page text content and a tab_id.",
  parameters: z.object({
    url: z.string().describe("The URL to open (must start with http:// or https://)"),
  }),
  async execute(params, ctx) {
    if (!params.url.startsWith("http://") && !params.url.startsWith("https://")) {
      throw new Error("URL must start with http:// or https://")
    }

    const id = `browser-tab-${Date.now()}`

    const res = await fetch(params.url, {
      signal: ctx.abort,
      headers: { "User-Agent": "opencode" },
    })

    if (!res.ok) throw new Error(`Request failed with status ${res.status}`)

    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_SIZE)

    return {
      title: params.url,
      output: text,
      metadata: {
        open_browser_tab: true,
        url: params.url,
        tab_id: id,
      },
    }
  },
})
