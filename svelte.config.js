import adapter from "@sveltejs/adapter-static";

const isProduction = process.env.NODE_ENV === "production";
const repoName = "edupro";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      fallback: "404.html",
    }),
    paths: {
      base: isProduction ? `/${repoName}` : "",
    },
    prerender: {
      handleHttpError: "warn",
    },
  },
};

export default config;
