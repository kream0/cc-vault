import { join } from "path";

export async function handleStaticFile(path: string): Promise<Response> {
  if (path === "/" || path === "/index.html") {
    const indexPath = join(import.meta.dir, "..", "..", "public", "index.html");
    try {
      const file = Bun.file(indexPath);
      const content = await file.text();
      return new Response(content, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (e) {
      return new Response("Failed to load index.html", { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
}
