// Where the data lives when the page is not at the root of its host (plan PLAN-013 step 13.2): GitHub Pages serves a project site from a sub-folder
// ("/Quest_lab/"), so every address the page builds must start from the page's own base (Vite's BASE_URL), never from "/".

/** The data folder below the page's base: base '/' and '/data/' give '/data/'; base '/Quest_lab/' gives '/Quest_lab/data/'. */
export function dataPath(baseUrl, dataUrlPath) {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return base + dataUrlPath.replace(/^\/+/, '');
}
